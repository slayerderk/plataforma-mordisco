'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  LogOut,
  ShieldCheck,
  QrCode,
  Layers,
  MessageCircle,
  Tag,
  DollarSign,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  Sparkles,
  Upload,
  Calendar,
  Pencil,
  Trash2,
  Check,
  X,
  GripVertical,
  Power,
  Plus,
  Save,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, formatDate, getPlanBeneficios, getPlanBeneficiosExtras } from '@/lib/utils';

type PlanForm = {
  id: string | null;
  nombre: string;
  precio: number;
  dias_duracion: number;
  limite_fotos: number;
  orden: number;
  activo: boolean;
  es_destacado: boolean;
  caracteristicas: string[];
};

function planDesdeFila(plan: any): PlanForm {
  return {
    id: plan.id ?? null,
    nombre: plan.nombre ?? '',
    precio: Number(plan.precio ?? 0),
    dias_duracion: Number(plan.dias_duracion ?? 0),
    limite_fotos: Number(plan.limite_fotos ?? 1),
    orden: Number(plan.orden ?? 0),
    activo: Boolean(plan.activo),
    es_destacado: Boolean(plan.es_destacado),
    caracteristicas: getPlanBeneficiosExtras(plan),
  };
}

function validarPlan(plan: PlanForm): string | null {
  if (!plan.nombre.trim()) return 'Ingresa un nombre para cada plan.';
  if (plan.precio < 0 || plan.dias_duracion < 0 || plan.limite_fotos < 1) {
    return 'Revisa el precio, la duración y el límite de fotos.';
  }
  return null;
}

function payloadPlan(plan: PlanForm) {
  return {
    nombre: plan.nombre.trim(),
    precio: Number(plan.precio),
    dias_duracion: Number(plan.dias_duracion),
    limite_fotos: Number(plan.limite_fotos),
    orden: Number(plan.orden),
    activo: Boolean(plan.activo),
    es_destacado: Boolean(plan.es_destacado),
    caracteristicas: getPlanBeneficiosExtras(plan),
  };
}

export default function AdminDashboardPage() {
  const supabase = createClient();
  const router = useRouter();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<'pagos' | 'config' | 'planes' | 'etiquetas'>('pagos');

  // Realtime Notification State
  const [hasNewAlert, setHasNewAlert] = useState(false);

  // Data
  const [pagos, setPagos] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [planesDraft, setPlanesDraft] = useState<PlanForm[]>([]);
  const [planesBase, setPlanesBase] = useState<PlanForm[]>([]);
  const [savingPlanId, setSavingPlanId] = useState<string | null>(null);
  const [savingPlanes, setSavingPlanes] = useState(false);
  const [planStatus, setPlanStatus] = useState<string | null>(null);
  const [etiquetaStatus, setEtiquetaStatus] = useState<string | null>(null);
  const [etiquetas, setEtiquetas] = useState<any[]>([]);
  const [nuevaEtiqueta, setNuevaEtiqueta] = useState('');
  const [editingEtiquetaId, setEditingEtiquetaId] = useState<string | null>(null);
  const [editingEtiquetaNombre, setEditingEtiquetaNombre] = useState('');
  const [draggingEtiquetaId, setDraggingEtiquetaId] = useState<string | null>(null);
  const [dragOverEtiquetaId, setDragOverEtiquetaId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal Voucher View
  const [viewingVoucher, setViewingVoucher] = useState<string | null>(null);

  // QR Upload
  const [uploadingQR, setUploadingQR] = useState(false);

  const planesDirty = useMemo(
    () => JSON.stringify(planesDraft) !== JSON.stringify(planesBase),
    [planesDraft, planesBase]
  );

  // Load Data
  const loadAdminData = async () => {
    setLoading(true);

    const [pagosRes, configRes, planesRes, etqsRes] = await Promise.all([
      supabase
        .from('pagos')
        .select(`
          *,
          anuncio:anuncios(id, titulo, usuario:perfiles(nombre_comercial, telefono)),
          plan:planes(nombre, dias_duracion, precio)
        `)
        .order('created_at', { ascending: false }),
      supabase
        .from('configuracion_admin')
        .select(
          'id, whatsapp_admin, modo_whatsapp, yape_activo, qr_yape_url, plin_activo, qr_plin_url, telefono_pago, titular_pago, peso_max_foto_mb, dias_espera_republicar, logo_url, updated_at'
        )
        .eq('id', 1)
        .single(),
      supabase.from('planes').select('*').order('orden'),
      supabase.from('etiquetas').select('*').order('orden'),
    ]);

    if (pagosRes.data) setPagos(pagosRes.data);
    if (configRes.data) setConfig(configRes.data);
    if (planesRes.data) {
      const planesCargados = planesRes.data.map(planDesdeFila);
      setPlanesDraft(planesCargados);
      setPlanesBase(planesCargados);
    }
    if (etqsRes.data) setEtiquetas(etqsRes.data);

    setLoading(false);
  };

  useEffect(() => {
    loadAdminData();

    // Suscripción Realtime para la Campanita de Nuevos Pagos
    const channelPagos = supabase
      .channel('admin_pagos')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pagos' },
        (payload) => {
          setHasNewAlert(true);
          loadAdminData();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pagos' },
        () => {
          loadAdminData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channelPagos);
    };
  }, []);

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab === 'pagos' || tab === 'config' || tab === 'planes' || tab === 'etiquetas') {
      setActiveTab(tab);
    }
  }, []);

  // Aprobar Pago
  const handleAprobarPago = async (pagoId: string) => {
    const { data, error } = await supabase.rpc('aprobar_pago_con_vigencia', {
      p_pago_id: pagoId,
      p_origen: 'panel_admin',
    });

    if (!error && data?.success) {
      alert(`¡Pago aprobado! Vigencia activa hasta: ${new Date(data.vigente_hasta).toLocaleString('es-PE')}`);
      loadAdminData();
    } else {
      alert('Error al aprobar: ' + (error?.message || data?.message));
    }
  };

  // Rechazar Pago
  const handleRechazarPago = async (pagoId: string) => {
    await supabase.from('pagos').update({ estado: 'rechazado' }).eq('id', pagoId);
    loadAdminData();
  };

  // Switch Yape / Plin en Tiempo Real
  const toggleMetodo = async (metodo: 'yape_activo' | 'plin_activo') => {
    if (!config) return;
    const newVal = !config[metodo];
    setConfig({ ...config, [metodo]: newVal });

    await supabase.from('configuracion_admin').update({ [metodo]: newVal }).eq('id', 1);
  };

  // Cambiar QR de Yape o Plin en Supabase Storage
  const handleUploadQR = async (e: React.ChangeEvent<HTMLInputElement>, tipo: 'yape' | 'plin') => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    setUploadingQR(true);

    try {
      const fileName = `qr-${tipo}-${Date.now()}.png`;
      const { error: uploadErr } = await supabase.storage.from('configuracion').upload(fileName, file, {
        contentType: file.type,
        upsert: true,
      });

      if (uploadErr) throw uploadErr;

      const { data: pubUrl } = supabase.storage.from('configuracion').getPublicUrl(fileName);
      const field = tipo === 'yape' ? 'qr_yape_url' : 'qr_plin_url';

      await supabase.from('configuracion_admin').update({ [field]: pubUrl.publicUrl }).eq('id', 1);

      setConfig({ ...config, [field]: pubUrl.publicUrl });
      alert(`¡QR de ${tipo.toUpperCase()} actualizado en milisegundos!`);
    } catch (err: any) {
      alert('Error al subir QR: ' + err.message);
    } finally {
      setUploadingQR(false);
    }
  };

  // Agregar Etiqueta
  const handleCrearEtiqueta = async (e: React.FormEvent) => {
    e.preventDefault();
    const nombre = nuevaEtiqueta.trim();
    if (!nombre) return;

    const nextOrden = etiquetas.length > 0
      ? Math.max(...etiquetas.map((etq) => etq.orden ?? 0)) + 1
      : 0;

    const { error } = await supabase
      .from('etiquetas')
      .insert({ nombre, activo: true, orden: nextOrden });

    if (error) {
      setEtiquetaStatus(`No se pudo agregar la etiqueta: ${error.message}`);
      return;
    }

    setNuevaEtiqueta('');
    setEtiquetaStatus(`Etiqueta "${nombre}" agregada.`);
    await loadAdminData();
  };

  // Editar Etiqueta
  const handleUpdateEtiqueta = async (id: string) => {
    const nombre = editingEtiquetaNombre.trim();
    if (!nombre) return;

    const { error } = await supabase.from('etiquetas').update({ nombre }).eq('id', id);

    if (error) {
      setEtiquetaStatus(`No se pudo actualizar la etiqueta: ${error.message}`);
      return;
    }

    setEtiquetas((prev) => prev.map((etq) => (etq.id === id ? { ...etq, nombre } : etq)));
    setEditingEtiquetaId(null);
    setEditingEtiquetaNombre('');
    setEtiquetaStatus(`Nombre actualizado a "${nombre}".`);
  };

  // Activar / Desactivar Etiqueta
  const handleToggleEtiqueta = async (etq: any) => {
    const activo = !etq.activo;

    const { error } = await supabase.from('etiquetas').update({ activo }).eq('id', etq.id);

    if (error) {
      setEtiquetaStatus(`No se pudo actualizar la etiqueta: ${error.message}`);
      return;
    }

    setEtiquetas((prev) => prev.map((e) => (e.id === etq.id ? { ...e, activo } : e)));
    setEtiquetaStatus(activo ? `Etiqueta "${etq.nombre}" activada.` : `Etiqueta "${etq.nombre}" desactivada.`);
  };

  // Reordenar Etiquetas (Arrastrar y soltar)
  const handleDragStartEtiqueta = (e: React.DragEvent<HTMLDivElement>, etq: any) => {
    setDraggingEtiquetaId(etq.id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', etq.id);
  };

  const handleDragOverEtiqueta = (e: React.DragEvent<HTMLDivElement>, etq: any) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverEtiquetaId !== etq.id) setDragOverEtiquetaId(etq.id);
  };

  const handleDropEtiqueta = async (e: React.DragEvent<HTMLDivElement>, target: any) => {
    e.preventDefault();
    const sourceId = draggingEtiquetaId || e.dataTransfer.getData('text/plain');
    setDraggingEtiquetaId(null);
    setDragOverEtiquetaId(null);

    if (!sourceId || sourceId === target.id) return;

    const from = etiquetas.findIndex((etq) => etq.id === sourceId);
    const to = etiquetas.findIndex((etq) => etq.id === target.id);
    if (from === -1 || to === -1) return;

    const reordered = [...etiquetas];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);

    const withOrder = reordered.map((etq, index) => ({ ...etq, orden: index }));
    setEtiquetas(withOrder);

    const results = await Promise.all(
      withOrder.map((etq) =>
        supabase.from('etiquetas').update({ orden: etq.orden }).eq('id', etq.id)
      )
    );

    const failed = results.find((result) => result.error);
    if (failed?.error) {
      setEtiquetaStatus(`No se pudo guardar el orden: ${failed.error.message}`);
      await loadAdminData();
      return;
    }

    setEtiquetaStatus('Orden de etiquetas guardado.');
  };

  const handleDragEndEtiqueta = () => {
    setDraggingEtiquetaId(null);
    setDragOverEtiquetaId(null);
  };

  // Eliminar Etiqueta
  const handleDeleteEtiqueta = async (etq: any) => {
    if (!confirm(`¿Eliminar la etiqueta "${etq.nombre}"? También se quitará de los anuncios que la usan.`)) {
      return;
    }

    const { error: linkError } = await supabase
      .from('anuncio_etiquetas')
      .delete()
      .eq('etiqueta_id', etq.id);

    if (linkError) {
      setEtiquetaStatus(`No se pudo quitar la etiqueta de los anuncios: ${linkError.message}`);
      return;
    }

    const { error } = await supabase.from('etiquetas').delete().eq('id', etq.id);

    if (error) {
      setEtiquetaStatus(`No se pudo eliminar la etiqueta: ${error.message}`);
      return;
    }

    setEtiquetas((prev) => prev.filter((e) => e.id !== etq.id));
    setEtiquetaStatus(`Etiqueta "${etq.nombre}" eliminada.`);
    if (editingEtiquetaId === etq.id) {
      setEditingEtiquetaId(null);
      setEditingEtiquetaNombre('');
    }
  };

  const updatePlanField = (index: number, campo: keyof PlanForm, valor: PlanForm[keyof PlanForm]) => {
    setPlanesDraft((prev) =>
      prev.map((plan, i) => (i === index ? ({ ...plan, [campo]: valor } as PlanForm) : plan))
    );
  };

  const handleNuevoPlan = () => {
    const nextOrden = planesDraft.length > 0
      ? Math.max(...planesDraft.map((plan) => plan.orden)) + 1
      : 0;

    setPlanesDraft((prev) => [
      ...prev,
      {
        id: null,
        nombre: '',
        precio: 0,
        dias_duracion: 0,
        limite_fotos: 1,
        orden: nextOrden,
        activo: true,
        es_destacado: false,
        caracteristicas: [],
      },
    ]);
  };

  const handleDescartarPlanNuevo = (index: number) => {
    setPlanesDraft((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGuardarTodos = async () => {
    if (!planesDirty || savingPlanes) return;

    const invalido = planesDraft
      .map((plan) => ({ plan, error: validarPlan(plan) }))
      .find((item) => item.error);

    if (invalido) {
      setPlanStatus(
        `No se pudo guardar "${invalido.plan.nombre || 'Nuevo plan'}": ${invalido.error}`
      );
      return;
    }

    setSavingPlanes(true);
    setPlanStatus(null);

    const results = await Promise.allSettled(
      planesDraft.map(async (plan) => {
        const payload = payloadPlan(plan);
        const { error } = plan.id
          ? await supabase.from('planes').update(payload).eq('id', plan.id)
          : await supabase.from('planes').insert(payload);

        if (error) {
          throw new Error(`${plan.nombre || 'Nuevo plan'}: ${error.message}`);
        }
      })
    );

    const errors = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map((result) =>
        result.reason instanceof Error ? result.reason.message : String(result.reason)
      );

    setSavingPlanes(false);

    if (errors.length > 0) {
      setPlanStatus(`No se pudieron guardar algunos planes: ${errors.join(' | ')}`);
      await loadAdminData();
      return;
    }

    setPlanStatus('Todos los cambios de planes se guardaron correctamente.');
    await loadAdminData();
  };

  const handleTogglePlanActivo = async (index: number) => {
    const plan = planesDraft[index];
    if (!plan.id) return;

    const activo = !plan.activo;
    setSavingPlanId(plan.id);
    setPlanStatus(null);

    setPlanesDraft((prev) =>
      prev.map((item, i) => (i === index ? { ...item, activo } : item))
    );
    setPlanesBase((prev) =>
      prev.map((item) => (item.id === plan.id ? { ...item, activo } : item))
    );

    const { error } = await supabase.from('planes').update({ activo }).eq('id', plan.id);

    setSavingPlanId(null);

    if (error) {
      setPlanStatus(
        `No se pudo ${activo ? 'activar' : 'inactivar'} "${plan.nombre}": ${error.message}`
      );
      await loadAdminData();
      return;
    }

    setPlanStatus(`Plan "${plan.nombre}" ${activo ? 'activado' : 'inactivado'} correctamente.`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
      {/* Lightbox Comprobante */}
      {viewingVoucher && (
        <div
          onClick={() => setViewingVoucher(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-xl max-h-[85vh] bg-dark-950 p-2 rounded-2xl border border-white/20">
            <img src={viewingVoucher} alt="Voucher" className="max-h-[80vh] w-auto object-contain rounded-xl" />
            <button
              onClick={() => setViewingVoucher(null)}
              className="absolute top-4 right-4 px-3 py-1 bg-black/80 text-white rounded-lg text-xs"
            >
              Cerrar (ESC)
            </button>
          </div>
        </div>
      )}

      {/* Admin Header with Notification Bell */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-white/10 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Panel Administrativo Pro</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">Control de pagos, switches en tiempo real, planes y catálogo.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Campanita en tiempo real */}
          <div className="relative">
            <button
              onClick={() => {
                setHasNewAlert(false);
                setActiveTab('pagos');
              }}
              className="p-2.5 rounded-xl bg-dark-900 border border-white/10 text-zinc-300 hover:text-white transition-all relative"
            >
              <Bell className={`w-5 h-5 ${hasNewAlert ? 'text-amber-400 animate-bounce' : ''}`} />
              {hasNewAlert && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
              )}
            </button>
          </div>

          <button
            onClick={loadAdminData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300 border border-white/10 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refrescar</span>
          </button>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace('/login');
              router.refresh();
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400 border border-rose-500/20 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Salir</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs (Sidebar style on desktop, pill bar on mobile) */}
      <div className="flex gap-2 my-6 overflow-x-auto pb-1 text-xs font-bold border-b border-white/5">
        <button
          onClick={() => setActiveTab('pagos')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all ${activeTab === 'pagos'
            ? 'bg-brand-600 text-white shadow-md'
            : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Validación de Pagos ({pagos.filter((p) => p.estado === 'pendiente').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all ${activeTab === 'config'
            ? 'bg-brand-600 text-white shadow-md'
            : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
        >
          <QrCode className="w-4 h-4" />
          <span>Control Pagos</span>
        </button>

        <button
          onClick={() => setActiveTab('planes')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all ${activeTab === 'planes'
            ? 'bg-brand-600 text-white shadow-md'
            : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
        >
          <Layers className="w-4 h-4" />
          <span>Planes & Tarifas</span>
        </button>

        <button
          onClick={() => setActiveTab('etiquetas')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all ${activeTab === 'etiquetas'
            ? 'bg-brand-600 text-white shadow-md'
            : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
        >
          <Tag className="w-4 h-4" />
          <span>Etiquetas (Chips)</span>
        </button>

        <Link
          href="/admin/cupones"
          className="px-4 py-2.5 rounded-xl flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <DollarSign className="w-4 h-4" />
          <span>Cupones</span>
        </Link>

        <Link
          href="/admin/moderacion"
          className="px-4 py-2.5 rounded-xl flex items-center gap-2 text-zinc-400 hover:text-white hover:bg-white/5 transition-all"
        >
          <MessageCircle className="w-4 h-4" />
          <span>Moderación</span>
        </Link>
      </div>

      {/* TAB 1: GESTIÓN DE PAGOS Y ENLACE MÁGICO */}
      {activeTab === 'pagos' && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Comprobantes Recibidos</h2>
            <span className="text-xs text-zinc-400">Total: {pagos.length}</span>
          </div>

          {pagos.length === 0 ? (
            <div className="glass-panel p-12 text-center rounded-2xl text-xs text-zinc-500">
              No hay pagos registrados todavía.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {pagos.map((p) => (
                <div
                  key={p.id}
                  className={`glass-panel p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all ${p.estado === 'pendiente'
                    ? 'border-amber-500/40 bg-amber-500/5'
                    : p.estado === 'aprobado'
                      ? 'border-emerald-500/30'
                      : 'border-white/5 opacity-60'
                    }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Voucher Thumbnail */}
                    <div
                      onClick={() => setViewingVoucher(p.comprobante_url)}
                      className="w-16 h-16 rounded-lg bg-black border border-white/10 overflow-hidden cursor-zoom-in flex-shrink-0"
                    >
                      <img src={p.comprobante_url} alt="Voucher" className="w-full h-full object-cover" />
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{p.anuncio?.titulo || 'Anuncio'}</span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${p.metodo === 'yape'
                            ? 'bg-[#742384]/40 text-[#e79eff] border border-[#742384]'
                            : 'bg-[#00a9e0]/30 text-[#6fe0ff] border border-[#00a9e0]'
                            }`}
                        >
                          {p.metodo}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.estado === 'pendiente'
                            ? 'bg-amber-500/20 text-amber-400'
                            : p.estado === 'aprobado'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                            }`}
                        >
                          {p.estado}
                        </span>
                      </div>

                      <div className="text-xs text-zinc-400 flex items-center gap-3 flex-wrap">
                        <span>
                          Ofertante: <strong className="text-zinc-200">{p.anuncio?.usuario?.nombre_comercial}</strong>
                        </span>
                        <span>
                          Plan: <strong className="text-zinc-200">{p.plan?.nombre}</strong>
                        </span>
                        <span>
                          Monto Esperado: <strong className="text-emerald-400">{formatPrice(p.monto_esperado)}</strong>
                        </span>
                      </div>

                      <div className="text-[11px] text-zinc-500">
                        Fecha: {formatDate(p.created_at)} | ID: <span className="font-mono">{p.id.substring(0, 8)}</span>
                      </div>

                      {/* WhatsApp Magic Link Preview */}
                      {p.estado === 'pendiente' && p.token_aprobacion && (
                        <div className="mt-1">
                          <span className="text-[10px] text-zinc-400 block mb-0.5">
                            Enlace Mágico para WhatsApp (Método 1):
                          </span>
                          <input
                            type="text"
                            readOnly
                            value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/aprobar-pago?token=${p.token_aprobacion}`}
                            className="w-full bg-dark-900 border border-white/10 rounded px-2 py-1 text-[10px] text-zinc-300 font-mono"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => setViewingVoucher(p.comprobante_url)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold flex items-center gap-1 border border-white/10"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver</span>
                    </button>

                    {p.estado === 'pendiente' && (
                      <>
                        <button
                          onClick={() => handleAprobarPago(p.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-md shadow-emerald-600/30"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Aprobar</span>
                        </button>

                        <button
                          onClick={() => handleRechazarPago(p.id)}
                          className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white text-xs font-bold border border-rose-500/30 flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Rechazar</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CONFIGURACIÓN YAPE / PLIN Y ALERTAS WHATSAPP */}
      {activeTab === 'config' && config && (
        <div className="flex flex-col gap-6">
          {/* Card: Configuración de WhatsApp y Alertas Autónomas */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col gap-4">
            <div className="flex items-center gap-2 pb-3 border-b border-white/10">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-bold text-white uppercase">
                Alertas de Pago por WhatsApp (Número Receptor & Bot)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">
                  Tu Celular Receptor para Alertas (WhatsApp Personal) *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={config.whatsapp_admin || ''}
                    onChange={(e) => setConfig({ ...config, whatsapp_admin: e.target.value })}
                    placeholder="Ej. 51935910409"
                    className="flex-1 bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <button
                    onClick={async () => {
                      await supabase
                        .from('configuracion_admin')
                        .update({ whatsapp_admin: config.whatsapp_admin })
                        .eq('id', 1);
                      alert('¡Número de WhatsApp de alertas actualizado!');
                    }}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                  >
                    Guardar
                  </button>
                </div>
                <span className="text-[11px] text-zinc-400 mt-1 block">
                  A este número te llegarán las alertas y el Enlace Mágico de aprobación rápida.
                </span>
              </div>

              <div>
                <label className="text-xs text-zinc-300 font-semibold block mb-1">
                  Modo de Envío de Alertas
                </label>
                <select
                  value={config.modo_whatsapp || 'hibrido'}
                  onChange={async (e) => {
                    const val = e.target.value;
                    setConfig({ ...config, modo_whatsapp: val });
                    await supabase
                      .from('configuracion_admin')
                      .update({ modo_whatsapp: val })
                      .eq('id', 1);
                  }}
                  className="w-full bg-dark-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white"
                >
                  <option value="hibrido">Híbrido (Intenta Autónomo + Botón Directo wa.me)</option>
                  <option value="autonomo">100% Autónomo (Requiere Evolution API)</option>
                  <option value="manual">Manual Directo (Siempre enlace wa.me)</option>
                </select>
                <span className="text-[11px] text-zinc-400 mt-1 block">
                  En modo Híbrido, si Evolution API no responde, nunca se pierde la alerta.
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-dark-900/60 border border-white/5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Evolution API y OTP
              </h4>
              <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                La URL, la API key y el secreto OTP se configuran solo en las variables de entorno
                del servidor. Ya no se guardan ni se leen desde el navegador.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-dark-900/60 border border-white/5">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Espera para republicar anuncios
              </h4>
              <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                Días que un ofertante debe esperar antes de republicar un anuncio aprobado.
              </p>
              <div className="flex gap-2 mt-3">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={config.dias_espera_republicar ?? 0}
                  onChange={(e) => setConfig({ ...config, dias_espera_republicar: Number(e.target.value) })}
                  className="w-28 bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
                />
                <button
                  onClick={async () => {
                    await supabase
                      .from('configuracion_admin')
                      .update({ dias_espera_republicar: config.dias_espera_republicar })
                      .eq('id', 1);
                    alert('Días de espera para republicar actualizados.');
                    loadAdminData();
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>

          {/* Pasarelas QR Yape & Plin */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Yape Manager */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#742384]" />
                  <h3 className="text-sm font-bold text-white uppercase">Pasarela Yape</h3>
                </div>
                <button
                  onClick={() => toggleMetodo('yape_activo')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${config.yape_activo
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}
                >
                  {config.yape_activo ? 'ON (Activo)' : 'OFF (Mantenimiento)'}
                </button>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-40 h-40 bg-white p-2 rounded-xl mb-3 flex items-center justify-center">
                  {config.qr_yape_url ? (
                    <img src={config.qr_yape_url} alt="QR Yape" className="w-full h-full object-contain" />
                  ) : (
                    <QrCode className="w-16 h-16 text-[#742384]" />
                  )}
                </div>

                <label className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingQR ? 'Cambiando...' : 'Cambiar Imagen QR Yape'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadQR(e, 'yape')}
                    disabled={uploadingQR}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Plin Manager */}
            <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col gap-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#00a9e0]" />
                  <h3 className="text-sm font-bold text-white uppercase">Pasarela Plin</h3>
                </div>
                <button
                  onClick={() => toggleMetodo('plin_activo')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${config.plin_activo
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}
                >
                  {config.plin_activo ? 'ON (Activo)' : 'OFF (Mantenimiento)'}
                </button>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-40 h-40 bg-white p-2 rounded-xl mb-3 flex items-center justify-center">
                  {config.qr_plin_url ? (
                    <img src={config.qr_plin_url} alt="QR Plin" className="w-full h-full object-contain" />
                  ) : (
                    <QrCode className="w-16 h-16 text-[#00a9e0]" />
                  )}
                </div>

                <label className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer transition-colors flex items-center gap-1.5">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingQR ? 'Cambiando...' : 'Cambiar Imagen QR Plin'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleUploadQR(e, 'plin')}
                    disabled={uploadingQR}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: GESTIÓN DE PLANES Y LÍMITE DE FOTOS */}
      {activeTab === 'planes' && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-white">Editar tarifas, duración, límites y beneficios</h2>
              <p className="text-[11px] text-zinc-500 mt-1">
                Los cambios se aplican al presionar &quot;Guardar todos los cambios&quot;.
              </p>
            </div>
            <div className="flex items-center gap-2 self-start">
              <button
                type="button"
                onClick={handleGuardarTodos}
                disabled={!planesDirty || savingPlanes}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                {savingPlanes ? 'Guardando...' : 'Guardar todos los cambios'}
              </button>
              <button
                type="button"
                onClick={handleNuevoPlan}
                disabled={savingPlanes}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-40 text-white text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Nuevo plan
              </button>
            </div>
          </div>

          {planStatus && (
            <div
              className={`glass-panel p-3 rounded-xl text-xs ${
                planStatus.startsWith('No se pudo')
                  ? 'text-rose-300 border border-rose-500/30'
                  : 'text-emerald-300 border border-emerald-500/30'
              }`}
            >
              {planStatus}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {planesDraft.map((plan, index) => {
              return (
                <div
                  key={plan.id ?? `nuevo-${index}`}
                  className="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white">
                      {plan.nombre || 'Nuevo plan'}
                    </span>
                    <span className={`text-[10px] font-bold ${plan.activo ? 'text-emerald-400' : 'text-zinc-500'}`}>
                      {plan.activo ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">Nombre del plan</label>
                    <input
                      type="text"
                      value={plan.nombre}
                      onChange={(e) => updatePlanField(index, 'nombre', e.target.value)}
                      className="w-full bg-dark-900 border border-white/10 rounded-lg p-2 text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Precio (PEN S/)</label>
                      <input
                        type="number"
                        min="0"
                        value={plan.precio}
                        onChange={(e) => updatePlanField(index, 'precio', Number(e.target.value))}
                        className="w-full bg-dark-900 border border-white/10 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Duración en días (0 = permanente)</label>
                      <input
                        type="number"
                        min="0"
                        value={plan.dias_duracion}
                        onChange={(e) => updatePlanField(index, 'dias_duracion', Number(e.target.value))}
                        className="w-full bg-dark-900 border border-white/10 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Límite de fotos</label>
                      <input
                        type="number"
                        min="1"
                        value={plan.limite_fotos}
                        onChange={(e) => updatePlanField(index, 'limite_fotos', Number(e.target.value))}
                        className="w-full bg-dark-900 border border-white/10 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Orden</label>
                      <input
                        type="number"
                        value={plan.orden}
                        onChange={(e) => updatePlanField(index, 'orden', Number(e.target.value))}
                        className="w-full bg-dark-900 border border-white/10 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">
                      Beneficios (uno por línea). &quot;Hasta X fotos&quot; se genera automáticamente.
                    </label>
                    <textarea
                      rows={4}
                      value={plan.caracteristicas.join('\n')}
                      onChange={(e) => updatePlanField(index, 'caracteristicas', e.target.value.split('\n'))}
                      className="w-full bg-dark-900 border border-white/10 rounded-lg p-2 text-xs text-white resize-y"
                    />
                  </div>

                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={plan.es_destacado}
                      onChange={(e) => updatePlanField(index, 'es_destacado', e.target.checked)}
                      className="sr-only peer"
                    />
                    <span
                      aria-hidden="true"
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-brand-400 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-dark-950 ${
                        plan.es_destacado ? 'bg-brand-600' : 'bg-white/15'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          plan.es_destacado ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </span>
                    <span className="text-[11px] text-zinc-300 leading-tight">
                      Mostrar insignia <strong className="text-white">&quot;RECOMENDADO VIP&quot;</strong> en la vista pública
                    </span>
                  </label>

                  <div className="rounded-xl bg-dark-900/60 border border-white/10 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">
                      Vista previa en el home
                    </div>
                    {plan.es_destacado && (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-brand-600 text-white text-[9px] font-extrabold tracking-wider uppercase mb-2">
                        Recomendado VIP
                      </span>
                    )}
                    <div className="text-sm font-bold text-white">{plan.nombre || 'Nombre del plan'}</div>
                    <div className="flex items-baseline gap-1 my-1.5">
                      <span className="text-xl font-extrabold text-white">{formatPrice(plan.precio)}</span>
                      <span className="text-[11px] text-zinc-400">
                        {plan.dias_duracion > 0 ? `/ por ${plan.dias_duracion} días` : '/ permanente'}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-300">
                      Límite de fotos: <strong className="text-white">{plan.limite_fotos} fotos</strong>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {getPlanBeneficios(plan).map((beneficio, i) => (
                        <li key={i} className="flex items-center gap-1.5 text-[11px] text-zinc-300">
                          <Check className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                          {beneficio}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 py-2 rounded-lg bg-white/10 text-center text-[11px] font-bold text-white">
                      Publicar con este plan
                    </div>
                  </div>

                  <div className="flex gap-2 mt-auto pt-1">
                    {plan.id ? (
                      <button
                        type="button"
                        disabled={savingPlanId === plan.id}
                        onClick={() => handleTogglePlanActivo(index)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors disabled:opacity-50 ${
                          plan.activo
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20'
                        }`}
                      >
                        {savingPlanId === plan.id
                          ? 'Guardando...'
                          : plan.activo
                            ? 'Inactivar'
                            : 'Activar'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDescartarPlanNuevo(index)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-bold border border-white/10"
                      >
                        Descartar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {planesDraft.length === 0 && (
              <div className="glass-panel p-8 rounded-2xl text-center text-xs text-zinc-500">
                No hay planes creados todavía.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: GESTIÓN DE ETIQUETAS (CHIPS) */}
      {activeTab === 'etiquetas' && (
        <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col gap-4 max-w-xl">
          <div>
            <h2 className="text-base font-bold text-white">Etiquetas Predefinidas para Anunciantes</h2>
            <p className="text-[11px] text-zinc-500 mt-1">
              Arrastra las etiquetas con el mouse para definir el orden en que aparecen.
            </p>
          </div>

          {etiquetaStatus && (
            <div
              className={`rounded-xl p-3 text-xs border ${
                etiquetaStatus.startsWith('No se pudo')
                  ? 'text-rose-300 border-rose-500/30 bg-rose-500/5'
                  : 'text-emerald-300 border-emerald-500/30 bg-emerald-500/5'
              }`}
            >
              {etiquetaStatus}
            </div>
          )}

          <form onSubmit={handleCrearEtiqueta} className="flex gap-2">
            <input
              type="text"
              placeholder="Nueva etiqueta (ej. Factura, Estacionamiento...)"
              value={nuevaEtiqueta}
              onChange={(e) => setNuevaEtiqueta(e.target.value)}
              className="flex-1 bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
            />
            <button type="submit" className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-bold">
              Agregar
            </button>
          </form>

          <div className="flex flex-wrap gap-2 pt-2">
            {etiquetas.length === 0 && (
              <span className="text-xs text-zinc-500">No hay etiquetas creadas todavía.</span>
            )}

            {etiquetas.map((etq) => (
              <div
                key={etq.id}
                draggable={editingEtiquetaId !== etq.id}
                onDragStart={(e) => handleDragStartEtiqueta(e, etq)}
                onDragOver={(e) => handleDragOverEtiqueta(e, etq)}
                onDrop={(e) => handleDropEtiqueta(e, etq)}
                onDragEnd={handleDragEndEtiqueta}
                className={`px-3 py-1.5 rounded-xl bg-white/5 border text-xs text-zinc-200 font-medium flex items-center gap-2 transition-all ${etq.activo ? '' : 'opacity-50'
                  } ${draggingEtiquetaId === etq.id
                    ? 'opacity-40 border-dashed border-white/20'
                    : dragOverEtiquetaId === etq.id
                      ? 'border-brand-500 bg-brand-500/10'
                      : 'border-white/10'
                  }`}
              >
                {editingEtiquetaId === etq.id ? (
                  <>
                    <input
                      type="text"
                      autoFocus
                      value={editingEtiquetaNombre}
                      onChange={(e) => setEditingEtiquetaNombre(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateEtiqueta(etq.id);
                        if (e.key === 'Escape') {
                          setEditingEtiquetaId(null);
                          setEditingEtiquetaNombre('');
                        }
                      }}
                      className="w-40 bg-dark-900 border border-brand-500/50 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateEtiqueta(etq.id)}
                      className="text-emerald-400 hover:text-emerald-300"
                      title="Guardar cambios"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingEtiquetaId(null);
                        setEditingEtiquetaNombre('');
                      }}
                      className="text-zinc-400 hover:text-white"
                      title="Cancelar"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <>
                    <GripVertical className="w-3.5 h-3.5 text-zinc-500 cursor-grab active:cursor-grabbing" />

                    <span>{etq.nombre}</span>
                    {!etq.activo && <span className="text-[9px] text-zinc-500">(inactiva)</span>}

                    <button
                      type="button"
                      onClick={() => handleToggleEtiqueta(etq)}
                      className={etq.activo ? 'text-emerald-400 hover:text-emerald-300' : 'text-zinc-500 hover:text-emerald-400'}
                      title={etq.activo ? 'Desactivar' : 'Activar'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingEtiquetaId(etq.id);
                        setEditingEtiquetaNombre(etq.nombre);
                      }}
                      className="text-zinc-400 hover:text-amber-400"
                      title="Editar nombre"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteEtiqueta(etq)}
                      className="text-zinc-400 hover:text-rose-400"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
