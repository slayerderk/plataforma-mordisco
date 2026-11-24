'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Power, ShieldCheck, RefreshCw, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type CuponForm = {
  codigo: string;
  porcentaje_descuento: string;
  monto_fijo_descuento: string;
  usos_maximos: string;
  fecha_expiracion: string;
  activo: boolean;
};

export default function CuponesAdminPage() {
  const supabase = createClient();
  const router = useRouter();
  const [cupones, setCupones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [form, setForm] = useState<CuponForm>({
    codigo: '',
    porcentaje_descuento: '',
    monto_fijo_descuento: '',
    usos_maximos: '',
    fecha_expiracion: '',
    activo: true,
  });

  const loadCupones = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('cupones')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setCupones(data);
    setLoading(false);
  };

  useEffect(() => {
    loadCupones();
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.codigo.trim()) {
      setStatus('Ingresa un código para el cupón.');
      return;
    }

    const { error } = await supabase.from('cupones').insert({
      codigo: form.codigo.trim().toUpperCase(),
      porcentaje_descuento: form.porcentaje_descuento
        ? Number(form.porcentaje_descuento)
        : null,
      monto_fijo_descuento: form.monto_fijo_descuento
        ? Number(form.monto_fijo_descuento)
        : null,
      usos_maximos: form.usos_maximos ? Number(form.usos_maximos) : null,
      fecha_expiracion: form.fecha_expiracion || null,
      activo: form.activo,
    });

    if (error) {
      setStatus(`No se pudo crear el cupón: ${error.message}`);
      return;
    }

    setForm({
      codigo: '',
      porcentaje_descuento: '',
      monto_fijo_descuento: '',
      usos_maximos: '',
      fecha_expiracion: '',
      activo: true,
    });
    setStatus('Cupón creado correctamente.');
    await loadCupones();
  };

  const toggleActivo = async (cupon: any) => {
    await supabase
      .from('cupones')
      .update({ activo: !cupon.activo })
      .eq('id', cupon.id);
    await loadCupones();
  };

  const eliminar = async (id: string) => {
    await supabase.from('cupones').delete().eq('id', id);
    await loadCupones();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-white/10 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Panel Administrativo Pro</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">Gestión de cupones y promociones.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadCupones}
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

      <div className="flex gap-2 my-6 overflow-x-auto pb-1 text-xs font-bold border-b border-white/5">
        <Link href="/admin?tab=pagos" className="px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
          Validación de Pagos
        </Link>
        <Link href="/admin?tab=config" className="px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
          Control Pagos
        </Link>
        <Link href="/admin?tab=planes" className="px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
          Planes & Tarifas
        </Link>
        <Link href="/admin?tab=etiquetas" className="px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
          Etiquetas (Chips)
        </Link>
        <span className="px-4 py-2.5 rounded-xl bg-brand-600 text-white shadow-md">
          Cupones
        </span>
        <Link href="/admin/moderacion" className="px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
          Moderación
        </Link>
      </div>

      <h1 className="text-2xl font-extrabold text-white mb-6">Gestión de cupones</h1>

      <form
        onSubmit={handleCreate}
        className="glass-panel p-5 rounded-2xl border border-white/10 mb-6 grid grid-cols-1 md:grid-cols-6 gap-3"
      >
        <input
          value={form.codigo}
          onChange={(e) => setForm({ ...form, codigo: e.target.value })}
          placeholder="Código"
          className="bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
        />
        <input
          value={form.porcentaje_descuento}
          onChange={(e) => setForm({ ...form, porcentaje_descuento: e.target.value })}
          placeholder="% descuento"
          type="number"
          className="bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
        />
        <input
          value={form.monto_fijo_descuento}
          onChange={(e) => setForm({ ...form, monto_fijo_descuento: e.target.value })}
          placeholder="Monto fijo"
          type="number"
          className="bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
        />
        <input
          value={form.usos_maximos}
          onChange={(e) => setForm({ ...form, usos_maximos: e.target.value })}
          placeholder="Usos máximos"
          type="number"
          className="bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
        />
        <input
          value={form.fecha_expiracion}
          onChange={(e) => setForm({ ...form, fecha_expiracion: e.target.value })}
          type="datetime-local"
          className="bg-dark-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
        />
        <button
          type="submit"
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold"
        >
          <Plus className="w-4 h-4" />
          Crear
        </button>
      </form>

      {status && <p className="text-xs text-zinc-300 mb-4">{status}</p>}

      {loading ? (
        <p className="text-xs text-zinc-400">Cargando cupones...</p>
      ) : cupones.length === 0 ? (
        <p className="text-xs text-zinc-400">No hay cupones creados.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {cupones.map((cupon) => (
            <div
              key={cupon.id}
              className="glass-panel p-4 rounded-xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div>
                <p className="text-sm font-bold text-white">{cupon.codigo}</p>
                <p className="text-xs text-zinc-400">
                  {cupon.porcentaje_descuento
                    ? `${cupon.porcentaje_descuento}%`
                    : cupon.monto_fijo_descuento
                      ? `S/ ${Number(cupon.monto_fijo_descuento).toFixed(2)}`
                      : 'Sin descuento'}{' '}
                  · usos: {cupon.usos_actuales || 0}/{cupon.usos_maximos || '∞'} ·{' '}
                  {cupon.fecha_expiracion
                    ? new Date(cupon.fecha_expiracion).toLocaleString('es-PE')
                    : 'sin expiración'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActivo(cupon)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300"
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => eliminar(cupon.id)}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
