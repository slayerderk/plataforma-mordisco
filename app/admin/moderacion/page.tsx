'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Power, Trash2, ShieldCheck, RefreshCw, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function ModeracionAdminPage() {
  const supabase = createClient();
  const router = useRouter();
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadComentarios = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('comentarios')
      .select(`
        *,
        anuncio:anuncios(titulo),
        usuario:perfiles(nombre_comercial)
      `)
      .order('created_at', { ascending: false });
    if (data) setComentarios(data);
    setLoading(false);
  };

  useEffect(() => {
    loadComentarios();
  }, []);

  const toggleActivo = async (comentario: any) => {
    await supabase
      .from('comentarios')
      .update({ activo: !comentario.activo })
      .eq('id', comentario.id);
    await loadComentarios();
  };

  const eliminar = async (id: string) => {
    await supabase.from('comentarios').delete().eq('id', id);
    await loadComentarios();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-white/10 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-extrabold text-white tracking-tight">Panel Administrativo Pro</h1>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">Moderación de comentarios y contenido.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadComentarios}
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
        <Link href="/admin/cupones" className="px-4 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all">
          Cupones
        </Link>
        <span className="px-4 py-2.5 rounded-xl bg-brand-600 text-white shadow-md">
          Moderación
        </span>
      </div>

      <h1 className="text-2xl font-extrabold text-white mb-6">Moderación de comentarios</h1>

      {loading ? (
        <p className="text-xs text-zinc-400">Cargando comentarios...</p>
      ) : comentarios.length === 0 ? (
        <p className="text-xs text-zinc-400">No hay comentarios registrados.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {comentarios.map((comentario) => (
            <div
              key={comentario.id}
              className="glass-panel p-4 rounded-xl border border-white/10 flex flex-col md:flex-row md:items-start justify-between gap-3"
            >
              <div className="flex-1">
                <p className="text-xs text-zinc-500 mb-1">
                  {comentario.usuario?.nombre_comercial || 'Usuario'} ·{' '}
                  {comentario.anuncio?.titulo || 'Anuncio'} ·{' '}
                  {new Date(comentario.created_at).toLocaleString('es-PE')}
                </p>
                <p className="text-sm text-zinc-200 whitespace-pre-line">{comentario.contenido}</p>
                <p className="text-[10px] mt-2 text-zinc-500">
                  {comentario.activo ? 'Visible' : 'Oculto'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleActivo(comentario)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300"
                >
                  <Power className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => eliminar(comentario.id)}
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
