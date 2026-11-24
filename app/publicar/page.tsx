'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Upload, Sparkles, Check, ArrowRight, ShieldCheck, MapPin, Globe, Image as ImageIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { requireOfertanteSession } from '@/lib/supabase/ofertante';
import { compressImageToWebP, formatPrice } from '@/lib/utils';

export default function PublicarPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 py-12 text-center text-sm text-zinc-400">
          Cargando formulario...
        </div>
      }
    >
      <PublicarContent />
    </Suspense>
  );
}

function PublicarContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get('plan');
  const supabase = createClient();

  // Form State
  const [nombreComercial, setNombreComercial] = useState('');
  const [telefono, setTelefono] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [edad, setEdad] = useState<number | ''>(22);
  const [modalidad, setModalidad] = useState<'presencial' | 'virtual'>('presencial');
  const [permitirComentarios, setPermitirComentarios] = useState(true);

  // UBIGEO
  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [provincias, setProvincias] = useState<any[]>([]);
  const [distritos, setDistritos] = useState<any[]>([]);
  const [selectedDep, setSelectedDep] = useState('');
  const [selectedProv, setSelectedProv] = useState('');
  const [selectedDist, setSelectedDist] = useState('');

  // Tags & Plans
  const [allTags, setAllTags] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [planes, setPlanes] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  // OTP verification
  const [perfilId, setPerfilId] = useState('');
  const [otpEnviado, setOtpEnviado] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpDebugCode, setOtpDebugCode] = useState('');
  const [otpEnviando, setOtpEnviando] = useState(false);
  const [otpVerificando, setOtpVerificando] = useState(false);
  const [telefonoVerificado, setTelefonoVerificado] = useState(false);

  // Photos
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [compressing, setCompressing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadInitial() {
      const [depsRes, tagsRes, planesRes] = await Promise.all([
        supabase.from('departamentos').select('id, name').order('name'),
        supabase.from('etiquetas').select('id, nombre').eq('activo', true).order('orden'),
        supabase.from('planes').select('*').eq('activo', true).order('orden'),
      ]);

      if (depsRes.data) setDepartamentos(depsRes.data);
      if (tagsRes.data) setAllTags(tagsRes.data);
      if (planesRes.data) {
        setPlanes(planesRes.data);
        const planSolicitado = planParam
          ? planesRes.data.find((plan) => plan.id === planParam)
          : undefined;

        if (planSolicitado) {
          setSelectedPlanId(planSolicitado.id);
        } else if (planesRes.data.length > 0) {
          setSelectedPlanId(planesRes.data[0].id);
        }

        if (planParam && !planSolicitado) {
          setErrorMsg('El plan indicado no está disponible; se seleccionó el primero.');
        }
      }
    }
    loadInitial();
  }, []);

  useEffect(() => {
    if (!planParam || planes.length === 0) return;

    const planSolicitado = planes.find((plan) => plan.id === planParam);
    if (planSolicitado) {
      setSelectedPlanId(planSolicitado.id);
      setErrorMsg('');
    }
  }, [planParam, planes]);

  // Cascade Provincias
  useEffect(() => {
    if (!selectedDep) {
      setProvincias([]);
      setSelectedProv('');
      setDistritos([]);
      setSelectedDist('');
      return;
    }
    supabase
      .from('provincias')
      .select('id, name')
      .eq('department_id', selectedDep)
      .order('name')
      .then(({ data }) => {
        if (data) setProvincias(data);
        setSelectedProv('');
      });
  }, [selectedDep]);

  // Cascade Distritos
  useEffect(() => {
    if (!selectedProv) {
      setDistritos([]);
      setSelectedDist('');
      return;
    }
    supabase
      .from('distritos')
      .select('id, name')
      .eq('province_id', selectedProv)
      .order('name')
      .then(({ data }) => {
        if (data) setDistritos(data);
        setSelectedDist('');
      });
  }, [selectedProv]);

  // Selected plan photo limit
  const activePlan = planes.find((p) => p.id === selectedPlanId);
  const photoLimit = activePlan?.limite_fotos || 5;

  useEffect(() => {
    if (photos.length <= photoLimit) return;

    const recortadas = photos.length - photoLimit;
    setPhotos((prev) => prev.slice(0, photoLimit));
    setPhotoPreviews((prev) => prev.slice(0, photoLimit));
    setErrorMsg(
      `Tu plan seleccionado permite un máximo de ${photoLimit} fotos. Se quitaron ${recortadas}.`
    );
  }, [photoLimit]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);

    if (photos.length + files.length > photoLimit) {
      setErrorMsg(`Tu plan seleccionado permite un máximo de ${photoLimit} fotos.`);
      return;
    }

    setCompressing(true);
    setErrorMsg('');

    try {
      const compressedFiles: File[] = [];
      const newPreviews: string[] = [];

      for (const file of files) {
        const webpFile = await compressImageToWebP(file);
        compressedFiles.push(webpFile);
        newPreviews.push(URL.createObjectURL(webpFile));
      }

      setPhotos([...photos, ...compressedFiles]);
      setPhotoPreviews([...photoPreviews, ...newPreviews]);
    } catch (err: any) {
      setErrorMsg('Error al procesar imágenes: ' + err.message);
    } finally {
      setCompressing(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== index));
  };

  const handleEnviarOtp = async () => {
    setErrorMsg('');
    setOtpDebugCode('');
    setOtpEnviando(true);

    try {
      const cleanTel = telefono.replace(/\D/g, '');
      if (cleanTel.length < 9) {
        throw new Error('Ingresa un número de WhatsApp válido.');
      }

      const user = await requireOfertanteSession(supabase, router, '/publicar');
      const response = await fetch('/api/otp/solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telefono: cleanTel,
          nombre: nombreComercial || 'Ofertante Mordisco',
        }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'No se pudo enviar el código OTP.');
      }

      setPerfilId(user.id);
      setTelefonoVerificado(false);
      setOtpEnviado(true);
      setOtpInput('');
      setOtpDebugCode(data.debugCode || '');

      if (data.warning) {
        setErrorMsg(data.warning);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo enviar el código OTP.');
      setOtpEnviado(false);
    } finally {
      setOtpEnviando(false);
    }
  };

  const handleVerificarOtp = async () => {
    setErrorMsg('');

    if (!perfilId) {
      setErrorMsg('Solicita un código antes de verificarlo.');
      return;
    }

    if (!/^\d{6}$/.test(otpInput)) {
      setErrorMsg('Ingresa el código de 6 dígitos.');
      return;
    }

    setOtpVerificando(true);

    try {
      await requireOfertanteSession(supabase, router, '/publicar');
      const response = await fetch('/api/otp/verificar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: otpInput }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.ok) {
        throw new Error(data?.error || 'No se pudo verificar el código.');
      }

      setTelefonoVerificado(true);
      setOtpDebugCode('');
      setOtpInput('');
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo verificar el código.');
    } finally {
      setOtpVerificando(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!titulo.trim() || !descripcion.trim() || !telefono.trim()) {
      setErrorMsg('Por favor completa todos los campos requeridos.');
      return;
    }

    if (modalidad === 'presencial' && !selectedDist) {
      setErrorMsg('Selecciona tu distrito para modalidad presencial.');
      return;
    }

    if (!activePlan) {
      setErrorMsg('Selecciona un plan antes de publicar.');
      return;
    }

    if (!telefonoVerificado || !perfilId) {
      setErrorMsg('Verifica tu WhatsApp con el código OTP antes de publicar.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Usar el perfil ya verificado por OTP
      const authUser = await requireOfertanteSession(supabase, router, '/publicar');
      if (authUser.id !== perfilId) {
        throw new Error('La sesión de verificación cambió. Vuelve a verificar tu WhatsApp.');
      }

      const { data: perfilVerificado } = await supabase
        .from('perfiles')
        .select('telefono_verificado')
        .eq('id', authUser.id)
        .maybeSingle();

      if (!perfilVerificado?.telefono_verificado) {
        throw new Error('WhatsApp no verificado. Solicita y valida el código OTP.');
      }

      const usuarioId = authUser.id;

      // 2. Subir fotos a Supabase Storage
      const uploadedUrls: string[] = [];
      for (const file of photos) {
        const fileName = `${usuarioId}/${Date.now()}-${Math.random().toString(36).substring(7)}.webp`;
        const { error: uploadErr } = await supabase.storage.from('anuncios').upload(fileName, file, {
          contentType: 'image/webp',
          upsert: true,
        });

        if (!uploadErr) {
          const { data: pubUrl } = supabase.storage.from('anuncios').getPublicUrl(fileName);
          uploadedUrls.push(pubUrl.publicUrl);
        }
      }

      // 3. Insertar el anuncio en la base de datos
      const isPaid = activePlan && activePlan.precio > 0;
      const { data: nuevoAnuncio, error: adErr } = await supabase
        .from('anuncios')
        .insert({
          usuario_id: usuarioId,
          titulo,
          descripcion,
          edad: Number(edad) || null,
          modalidad,
          distrito_id: modalidad === 'presencial' ? selectedDist : null,
          permitir_comentarios: permitirComentarios,
          fotos: uploadedUrls.length > 0 ? uploadedUrls : ['/placeholder.jpg'],
          plan_id: selectedPlanId,
          es_vip: false,
          activo: !isPaid,
        })
        .select('id')
        .single();

      if (adErr || !nuevoAnuncio) {
        throw new Error(adErr?.message || 'Error al guardar anuncio');
      }

      // 3.1 Guardar etiquetas seleccionadas
      if (selectedTags.length > 0) {
        const { error: tagsErr } = await supabase.from('anuncio_etiquetas').insert(
          selectedTags.map((etiquetaId) => ({
            anuncio_id: nuevoAnuncio.id,
            etiqueta_id: etiquetaId,
          }))
        );

        if (tagsErr) {
          throw new Error(tagsErr.message || 'Error al guardar las etiquetas del anuncio');
        }
      }

      // 4. Si es plan de pago -> Redirigir a Pasarela Yape/Plin
      if (isPaid) {
        router.push(`/pago/${nuevoAnuncio.id}?plan=${selectedPlanId}`);
      } else {
        // Plan gratuito -> Listo
        router.push(`/anuncio/${nuevoAnuncio.id}`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al publicar anuncio');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 lg:px-8 py-10">
      <div className="text-center mb-8">
        <h1 className="text-2xl md:text-4xl font-extrabold text-white mb-2">Publicar Nuevo Anuncio</h1>
        <p className="text-xs md:text-sm text-zinc-400">
          Completa los datos de tu servicio. Tus fotos se optimizarán automáticamente a alta velocidad.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold mb-6">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        {/* Paso 1: Datos de Contacto y Perfil */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            1. Datos de Contacto
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Nombre Comercial / Apodo *</label>
              <input
                type="text"
                placeholder="Ej. Jessica Glamour / Juan Técnico"
                value={nombreComercial}
                onChange={(e) => setNombreComercial(e.target.value)}
                required
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">WhatsApp de Contacto (Perú) *</label>
              <input
                type="tel"
                placeholder="Ej. 987654321"
                value={telefono}
                onChange={(e) => {
                  setTelefono(e.target.value);
                  setPerfilId('');
                  setOtpEnviado(false);
                  setOtpInput('');
                  setOtpDebugCode('');
                  setTelefonoVerificado(false);
                }}
                required
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-dark-900/60 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className={`w-4 h-4 ${telefonoVerificado ? 'text-emerald-400' : 'text-zinc-400'}`} />
                  Verificación de WhatsApp
                </p>
                <p className="text-[11px] text-zinc-400 mt-1">
                  {telefonoVerificado
                    ? 'Número verificado. Ya puedes publicar tu anuncio.'
                    : 'Recibe un código de 6 dígitos y verifícalo antes de publicar.'}
                </p>
              </div>

              {telefonoVerificado ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold">
                  <Check className="w-4 h-4" />
                  Verificado
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleEnviarOtp}
                  disabled={otpEnviando || !telefono.trim()}
                  className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold transition-all"
                >
                  {otpEnviando ? 'Enviando...' : otpEnviado ? 'Reenviar código' : 'Enviar código'}
                </button>
              )}
            </div>

            {otpEnviado && !telefonoVerificado && (
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="Código de 6 dígitos"
                  className="flex-1 bg-dark-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm tracking-[0.3em] text-white placeholder-zinc-500 placeholder:tracking-normal focus:outline-none focus:border-brand-500"
                />
                <button
                  type="button"
                  onClick={handleVerificarOtp}
                  disabled={otpVerificando || otpInput.length !== 6}
                  className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold transition-all"
                >
                  {otpVerificando ? 'Verificando...' : 'Verificar'}
                </button>
              </div>
            )}

            {otpDebugCode && !telefonoVerificado && (
              <p className="mt-3 text-[11px] text-amber-400 font-semibold">
                Modo desarrollo sin Evolution API. Código:{' '}
                <span className="font-mono tracking-widest">{otpDebugCode}</span>
              </p>
            )}
          </div>
        </div>

        {/* Paso 2: Detalles del Anuncio */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">2. Contenido del Anuncio</h2>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">Título Llamativo *</label>
            <input
              type="text"
              placeholder="Ej. Masajes Terapéuticos y Relajación VIP en Miraflores"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              required
              className="w-full bg-dark-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Edad *</label>
              <input
                type="number"
                min={18}
                max={99}
                value={edad}
                onChange={(e) => setEdad(Number(e.target.value) || '')}
                required
                className="w-full bg-dark-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Modalidad de Servicio *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setModalidad('presencial')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${modalidad === 'presencial'
                    ? 'bg-brand-600 border-brand-500 text-white'
                    : 'bg-dark-900 border-white/10 text-zinc-400'
                    }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Presencial
                </button>
                <button
                  type="button"
                  onClick={() => setModalidad('virtual')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${modalidad === 'virtual'
                    ? 'bg-brand-600 border-brand-500 text-white'
                    : 'bg-dark-900 border-white/10 text-zinc-400'
                    }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  100% Virtual
                </button>
              </div>
            </div>
          </div>

          {/* UBIGEO Dropdowns if Presencial */}
          {modalidad === 'presencial' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-xl bg-dark-900 border border-white/5">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Departamento</label>
                <select
                  value={selectedDep}
                  onChange={(e) => setSelectedDep(e.target.value)}
                  className="w-full bg-dark-950 border border-white/10 rounded-lg p-2 text-xs text-white"
                >
                  <option value="">Selecciona Departamento</option>
                  {departamentos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Provincia</label>
                <select
                  value={selectedProv}
                  onChange={(e) => setSelectedProv(e.target.value)}
                  disabled={!selectedDep}
                  className="w-full bg-dark-950 border border-white/10 rounded-lg p-2 text-xs text-white disabled:opacity-40"
                >
                  <option value="">Selecciona Provincia</option>
                  {provincias.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">Distrito *</label>
                <select
                  value={selectedDist}
                  onChange={(e) => setSelectedDist(e.target.value)}
                  disabled={!selectedProv}
                  className="w-full bg-dark-950 border border-white/10 rounded-lg p-2 text-xs text-white disabled:opacity-40"
                >
                  <option value="">Selecciona Distrito</option>
                  {distritos.map((dist) => (
                    <option key={dist.id} value={dist.id}>
                      {dist.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">Descripción Completa *</label>
            <textarea
              rows={4}
              placeholder="Detalla tus tarifas, servicios ofrecidos, horarios de atención..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              required
              className="w-full bg-dark-900 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
            />
          </div>

          {/* Tags / Botoncitos creados por admin */}
          {allTags.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Características Rápidas (Toca para seleccionar):
              </label>
              <div className="flex flex-wrap gap-2">
                {allTags.map((tag) => {
                  const isSel = selectedTags.includes(tag.id);
                  return (
                    <button
                      type="button"
                      key={tag.id}
                      onClick={() => {
                        if (isSel) {
                          setSelectedTags(selectedTags.filter((t) => t !== tag.id));
                        } else {
                          setSelectedTags([...selectedTags, tag.id]);
                        }
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${isSel
                        ? 'bg-brand-600 border-brand-500 text-white shadow-sm'
                        : 'bg-dark-900 border-white/10 text-zinc-400 hover:text-white'
                        }`}
                    >
                      {tag.nombre}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Toggle comentarios */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-zinc-300 font-medium">¿Permitir comentarios en tu anuncio?</span>
            <button
              type="button"
              onClick={() => setPermitirComentarios(!permitirComentarios)}
              className={`w-11 h-6 rounded-full transition-colors relative ${permitirComentarios ? 'bg-brand-600' : 'bg-dark-800'
                }`}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transition-transform ${permitirComentarios ? 'translate-x-6' : 'translate-x-1'
                  }`}
              />
            </button>
          </div>
        </div>

        {/* Paso 3: Subida y Optimización de Fotos */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-brand-500" />
              3. Galería de Fotos
            </h2>
            <span className="text-xs text-zinc-400 font-medium">
              {photos.length} / {photoLimit} fotos permitidas
            </span>
          </div>

          <p className="text-[11px] text-zinc-400">
            Las fotos se comprimen en tu navegador a formato WebP ultraligero sin perder nitidez.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {photoPreviews.map((src, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group">
                <img src={src} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white text-[10px] hover:bg-rose-600 transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}

            {photos.length < photoLimit && (
              <label className="aspect-square rounded-xl border-2 border-dashed border-white/20 hover:border-brand-500 flex flex-col items-center justify-center cursor-pointer transition-colors text-center p-2">
                <Upload className="w-6 h-6 text-zinc-400 mb-1" />
                <span className="text-[11px] text-zinc-300 font-medium">
                  {compressing ? 'Optimizando...' : 'Subir Foto'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  disabled={compressing}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* Paso 4: Selección de Plan */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col gap-4">
          <h2 className="text-sm font-bold text-white uppercase tracking-wider">4. Selecciona tu Plan de Visibilidad</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {planes.map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              return (
                <div
                  key={plan.id}
                  onClick={() => {
                    setSelectedPlanId(plan.id);
                    setErrorMsg('');
                    router.replace(`/publicar?plan=${encodeURIComponent(plan.id)}`, {
                      scroll: false,
                    });
                  }}
                  className={`cursor-pointer rounded-xl p-4 border transition-all ${isSelected
                    ? 'border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/20'
                    : 'border-white/10 bg-dark-900/60 hover:border-white/20'
                    }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white">{plan.nombre}</span>
                    {isSelected && <Check className="w-4 h-4 text-brand-500" />}
                  </div>
                  <div className="text-xl font-extrabold text-white mb-2">{formatPrice(plan.precio)}</div>
                  <div className="text-[11px] text-zinc-400 mb-3">
                    {plan.dias_duracion > 0 ? `Vigencia: ${plan.dias_duracion} días` : 'Gratuito permanente'}
                  </div>
                  <div className="text-[11px] text-zinc-300 font-medium">Hasta {plan.limite_fotos} fotos</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || compressing}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-rose-600 hover:from-brand-500 hover:to-rose-500 text-white font-extrabold text-base shadow-xl shadow-brand-600/30 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
        >
          {submitting ? (
            <span>Guardando anuncio y optimizando...</span>
          ) : activePlan && activePlan.precio > 0 ? (
            <>
              <span>Continuar al Pago con Yape / Plin</span>
              <ArrowRight className="w-5 h-5" />
            </>
          ) : (
            <>
              <span>Publicar Anuncio Gratis Ahora</span>
              <Sparkles className="w-5 h-5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
