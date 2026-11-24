'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  QrCode,
  Upload,
  CheckCircle2,
  Clock,
  Sparkles,
  Tag,
  ShieldCheck,
  AlertCircle,
  Copy,
  ArrowRight,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { requireOfertanteSession } from '@/lib/supabase/ofertante';
import { formatPrice } from '@/lib/utils';

export default function PagoPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-zinc-400">Cargando pasarela de pago...</div>}>
      <PagoContent />
    </Suspense>
  );
}

function PagoContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const anuncioId = params?.anuncioId as string;
  const planParam = searchParams.get('plan');
  const supabase = createClient();

  // State
  const [anuncio, setAnuncio] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [metodo, setMetodo] = useState<'yape' | 'plin'>('yape');

  // Cupones
  const [codigoCupon, setCodigoCupon] = useState('');
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);
  const [cuponAplicado, setCuponAplicado] = useState<any>(null);
  const [cuponError, setCuponError] = useState('');

  // Voucher
  const [voucherFile, setVoucherFile] = useState<File | null>(null);
  const [voucherPreview, setVoucherPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pagoRegistrado, setPagoRegistrado] = useState<any>(null);
  const [waNotifUrl, setWaNotifUrl] = useState<string | null>(null);
  const [autoSent, setAutoSent] = useState(false);

  // Realtime Modal
  const [modalAprobado, setModalAprobado] = useState(false);
  const [fechaVencimiento, setFechaVencimiento] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || user.is_anonymous) {
        router.replace(`/login?mode=register&next=${encodeURIComponent(`/pago/${anuncioId}`)}`);
        return;
      }

      // 1. Cargar anuncio
      const { data: adData } = await supabase
        .from('anuncios')
        .select('id, titulo, plan_id, usuario_id, usuario:perfiles(nombre_comercial, telefono)')
        .eq('id', anuncioId)
        .single();

      if (adData) {
        if (adData.usuario_id !== user.id) {
          router.replace('/');
          return;
        }
        setAnuncio(adData);
      }

      // 2. Cargar plan
      const targetPlanId = planParam || adData?.plan_id;
      if (targetPlanId) {
        const { data: planData } = await supabase
          .from('planes')
          .select('*')
          .eq('id', targetPlanId)
          .single();
        if (planData) setPlan(planData);
      }

      // 3. Cargar configuración de pagos (Yape / Plin / QR)
      const { data: configData } = await supabase
        .from('configuracion_admin')
        .select(
          'id, qr_yape_url, qr_plin_url, telefono_pago, titular_pago, yape_activo, plin_activo, logo_url, peso_max_foto_mb, dias_espera_republicar, updated_at'
        )
        .eq('id', 1)
        .single();

      if (configData) {
        setConfig(configData);
        if (!configData.yape_activo && configData.plin_activo) {
          setMetodo('plin');
        }
      }
    }

    loadData();

    // 4. Suscripción en Tiempo Real a la configuración (switches Yape/Plin)
    const channelConfig = supabase
      .channel('realtime_config')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'configuracion_admin' },
        (payload) => {
          setConfig(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelConfig);
    };
  }, [anuncioId, planParam]);

  // 5. Suscripción en Tiempo Real al Pago (cuando el admin aprueba)
  useEffect(() => {
    if (!pagoRegistrado?.id) return;

    const channelPago = supabase
      .channel(`pago_${pagoRegistrado.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pagos',
          filter: `id=eq.${pagoRegistrado.id}`,
        },
        async (payload) => {
          if (payload.new.estado === 'aprobado') {
            // Obtener fecha de vigencia del anuncio
            const { data: updatedAd } = await supabase
              .from('anuncios')
              .select('vigente_hasta')
              .eq('id', anuncioId)
              .single();

            if (updatedAd?.vigente_hasta) {
              setFechaVencimiento(
                new Date(updatedAd.vigente_hasta).toLocaleString('es-PE', {
                  dateStyle: 'full',
                  timeStyle: 'medium',
                })
              );
            }
            setModalAprobado(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelPago);
    };
  }, [pagoRegistrado?.id, anuncioId]);

  // Cálculo de Precios
  const precioOriginal = Number(plan?.precio || 0);
  const descuentoFijo = Number(cuponAplicado?.monto_fijo_descuento || 0);
  const montoDescuento =
    descuentoFijo > 0
      ? Math.min(precioOriginal, descuentoFijo)
      : (precioOriginal * descuentoPorcentaje) / 100;
  const precioFinal = Math.max(0, precioOriginal - montoDescuento);

  // Validar Cupón
  const handleValidarCupon = async () => {
    setCuponError('');
    if (!codigoCupon.trim()) return;

    const { data: cupon, error } = await supabase
      .from('cupones')
      .select('*')
      .eq('codigo', codigoCupon.trim().toUpperCase())
      .eq('activo', true)
      .maybeSingle();

    if (error || !cupon) {
      setCuponError('Cupón inválido o no existe.');
      return;
    }

    if (cupon.fecha_expiracion && new Date(cupon.fecha_expiracion).getTime() < Date.now()) {
      setCuponError('Este cupón ya expiró.');
      return;
    }

    if (
      cupon.usos_maximos != null &&
      Number(cupon.usos_actuales || 0) >= Number(cupon.usos_maximos)
    ) {
      setCuponError('Este cupón ya alcanzó su límite de usos.');
      return;
    }

    if (!cupon.porcentaje_descuento && !cupon.monto_fijo_descuento) {
      setCuponError('Este cupón no tiene un descuento válido.');
      return;
    }

    setCuponAplicado(cupon);
    setDescuentoPorcentaje(Number(cupon.porcentaje_descuento || 0));
  };

  const handleVoucherSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setVoucherFile(file);
      setVoucherPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmitVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voucherFile) {
      alert('Por favor selecciona la captura de tu comprobante de pago.');
      return;
    }

    setSubmitting(true);

    try {
      const user = await requireOfertanteSession(supabase, router, `/pago/${anuncioId}`);

      // 1. Subir voucher a bucket 'comprobantes'
      const fileName = `${user.id}/${anuncioId}/${Date.now()}-${voucherFile.name}`;
      const { error: uploadErr } = await supabase.storage
        .from('comprobantes')
        .upload(fileName, voucherFile, { upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('comprobantes').getPublicUrl(fileName);

      // 2. Insertar orden de pago en tabla pagos
      const { data: nuevoPago, error: pagoErr } = await supabase
        .from('pagos')
        .insert({
          anuncio_id: anuncioId,
          plan_id: plan.id,
          cupon_id: cuponAplicado?.id || null,
          metodo,
          monto_esperado: precioFinal,
          comprobante_url: urlData.publicUrl,
          estado: 'pendiente',
        })
        .select('*')
        .single();

      if (pagoErr || !nuevoPago) throw pagoErr;

      setPagoRegistrado(nuevoPago);

      const notifResponse = await fetch('/api/notificar-pago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pagoId: nuevoPago.id }),
      });
      const notifData = await notifResponse.json().catch(() => null);

      if (notifData?.success) {
        setAutoSent(true);
      } else if (notifData?.fallbackUrl) {
        setWaNotifUrl(notifData.fallbackUrl);
      }

      setSubmitting(false);
    } catch (err: any) {
      alert('Error al registrar pago: ' + err.message);
      setSubmitting(false);
    }
  };

  const copyNumber = () => {
    navigator.clipboard.writeText(config?.telefono_pago || '999999999');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-8 py-10">
      {/* Realtime Success Modal */}
      {modalAprobado && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel p-8 rounded-3xl max-w-md w-full border border-emerald-500/50 shadow-2xl shadow-emerald-500/20 text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/40">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-1 block">
              ¡Pago Verificado en Tiempo Real!
            </span>
            <h2 className="text-2xl font-extrabold text-white mb-2">¡Felicidades por tu Plan VIP!</h2>
            <p className="text-xs text-zinc-300 leading-relaxed mb-4">
              Tu anuncio ya está activo y visible en los primeros lugares de la plataforma.
            </p>

            <div className="p-3.5 rounded-xl bg-dark-900 border border-white/10 mb-6 text-left">
              <span className="text-[11px] text-zinc-400 font-semibold block uppercase">Vigencia Oficial:</span>
              <span className="text-sm font-bold text-emerald-400">{fechaVencimiento || '23:59:59 garantizadas'}</span>
            </div>

            <button
              onClick={() => router.push(`/anuncio/${anuncioId}`)}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-transform active:scale-95"
            >
              Ver mi Anuncio Destacado
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-8">
        <span className="text-xs font-bold uppercase tracking-wider text-brand-500 mb-1 block">
          Pasarela Segura Yape & Plin
        </span>
        <h1 className="text-2xl md:text-4xl font-extrabold text-white mb-2">Completar Pago de Activación</h1>
        <p className="text-xs md:text-sm text-zinc-400">
          Escanea el código QR, realiza tu transferencia y sube tu comprobante.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        {/* Left: QR Display & Payment Method */}
        <div className="md:col-span-7 flex flex-col gap-4">
          {/* Method Selector Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1.5 rounded-xl bg-dark-900 border border-white/10">
            <button
              onClick={() => setMetodo('yape')}
              disabled={!config?.yape_activo}
              className={`py-2.5 rounded-lg text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                metodo === 'yape'
                  ? 'bg-[#742384] text-white shadow-lg'
                  : 'text-zinc-400 hover:text-white disabled:opacity-30'
              }`}
            >
              <span>YAPE</span>
              {!config?.yape_activo && <span className="text-[9px] text-zinc-500">(Mantenimiento)</span>}
            </button>

            <button
              onClick={() => setMetodo('plin')}
              disabled={!config?.plin_activo}
              className={`py-2.5 rounded-lg text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                metodo === 'plin'
                  ? 'bg-[#00a9e0] text-white shadow-lg'
                  : 'text-zinc-400 hover:text-white disabled:opacity-30'
              }`}
            >
              <span>PLIN</span>
              {!config?.plin_activo && <span className="text-[9px] text-zinc-500">(Mantenimiento)</span>}
            </button>
          </div>

          {/* QR Code Container */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center border border-white/10">
            <div className="relative w-52 h-52 bg-white rounded-2xl p-2.5 mb-4 shadow-xl flex items-center justify-center">
              {metodo === 'yape' ? (
                config?.qr_yape_url ? (
                  <img src={config.qr_yape_url} alt="QR Yape" className="w-full h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-800 text-center p-3">
                    <QrCode className="w-16 h-16 text-[#742384] mb-2" />
                    <span className="text-xs font-bold">QR Yape Oficial</span>
                  </div>
                )
              ) : config?.qr_plin_url ? (
                <img src={config.qr_plin_url} alt="QR Plin" className="w-full h-full object-contain" />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-800 text-center p-3">
                  <QrCode className="w-16 h-16 text-[#00a9e0] mb-2" />
                  <span className="text-xs font-bold">QR Plin Oficial</span>
                </div>
              )}
            </div>

            <span className="text-xs text-zinc-400 font-medium mb-1">Titular de la cuenta:</span>
            <span className="text-sm font-bold text-white mb-3">
              {config?.titular_pago || 'Administración Mordisco'}
            </span>

            {/* Copy Number Widget */}
            <div className="flex items-center gap-2 bg-dark-900 border border-white/10 px-3 py-1.5 rounded-xl">
              <span className="text-xs font-bold text-zinc-300">
                {config?.telefono_pago || '999999999'}
              </span>
              <button
                onClick={copyNumber}
                className="text-[11px] font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                {copied ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Summary & Upload Voucher */}
        <div className="md:col-span-5 flex flex-col gap-5">
          {/* Order Summary */}
          <div className="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col gap-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Resumen de tu Orden</h3>
            <div className="flex items-center justify-between text-xs text-zinc-300 pb-2 border-b border-white/10">
              <span>Plan Seleccionado:</span>
              <span className="font-bold text-white">{plan?.nombre || 'Destacado'}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-300 pb-2 border-b border-white/10">
              <span>Precio Original:</span>
              <span>{formatPrice(precioOriginal)}</span>
            </div>

            {descuentoPorcentaje > 0 && (
              <div className="flex items-center justify-between text-xs text-emerald-400 pb-2 border-b border-white/10 font-medium">
                <span>Descuento Cupón ({descuentoPorcentaje}%):</span>
                <span>-{formatPrice(montoDescuento)}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm font-extrabold text-white pt-1">
              <span>Monto Total a Yapear / Plinear:</span>
              <span className="text-lg text-emerald-400">{formatPrice(precioFinal)}</span>
            </div>

            {/* Coupon Box */}
            <div className="pt-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Código de Cupón"
                  value={codigoCupon}
                  onChange={(e) => setCodigoCupon(e.target.value)}
                  className="flex-1 bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white uppercase placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                />
                <button
                  type="button"
                  onClick={handleValidarCupon}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
                >
                  Aplicar
                </button>
              </div>
              {cuponError && <p className="text-[11px] text-rose-400 mt-1">{cuponError}</p>}
              {cuponAplicado && (
                <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Cupón {cuponAplicado.codigo} aplicado con éxito
                </p>
              )}
            </div>
          </div>

          {/* Upload Voucher or Pending Message */}
          {pagoRegistrado ? (
            <div className="glass-panel p-6 rounded-2xl border border-brand-500/40 text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center mb-1 animate-pulse">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">¡Comprobante Recibido con Éxito!</h3>
              <p className="text-xs text-zinc-300 leading-relaxed max-w-sm">
                Tu pago está siendo procesado en segundo plano. En unos minutos se activará tu anuncio con vigencia garantizada hasta las 23:59:59.
              </p>

              {autoSent && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Alerta enviada automáticamente al WhatsApp del Administrador</span>
                </div>
              )}

              {waNotifUrl && (
                <a
                  href={waNotifUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.01]"
                >
                  <span>📲 Notificar al Administrador por WhatsApp</span>
                </a>
              )}

              <div className="p-2.5 rounded-xl bg-dark-900 border border-white/10 text-xs text-zinc-400 w-full flex items-center justify-between">
                <span>ID de Pago: </span>
                <span className="font-mono text-white text-[11px]">{pagoRegistrado.id.substring(0, 8)}</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmitVoucher} className="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col gap-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-brand-500" />
                Adjuntar Comprobante
              </h3>

              {voucherPreview ? (
                <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10">
                  <img src={voucherPreview} alt="Comprobante" className="w-full h-full object-contain bg-black" />
                  <button
                    type="button"
                    onClick={() => {
                      setVoucherFile(null);
                      setVoucherPreview(null);
                    }}
                    className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/80 text-white text-[11px]"
                  >
                    Cambiar
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-white/20 hover:border-brand-500 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors text-center">
                  <Upload className="w-8 h-8 text-zinc-400 mb-2" />
                  <span className="text-xs font-semibold text-white mb-1">
                    Sube la captura de pantalla de Yape o Plin
                  </span>
                  <span className="text-[11px] text-zinc-500">JPG, PNG o WebP</span>
                  <input type="file" accept="image/*" onChange={handleVoucherSelect} required className="hidden" />
                </label>
              )}

              <button
                type="submit"
                disabled={submitting || !voucherFile}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-brand-600 to-rose-600 hover:from-brand-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-brand-600/30 transition-transform active:scale-95 disabled:opacity-40"
              >
                {submitting ? 'Enviando comprobante...' : 'Confirmar y Enviar Comprobante'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
