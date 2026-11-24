'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Eye, MessageCircle, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatPrice, formatDate } from '@/lib/utils';

type Tab = 'anuncios' | 'pagos' | 'visitas' | 'comentarios';

export default function OfertantePage() {
  const supabase = createClient();
  const [tab, setTab] = useState<Tab>('anuncios');
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [anuncios, setAnuncios] = useState<any[]>([]);
  const [pagos, setPagos] = useState<any[]>([]);
  const [visitas, setVisitas] = useState<any[]>([]);
  const [comentarios, setComentarios] = useState<any[]>([]);
  const [republishing, setRepublishing] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || user.is_anonymous) return;
    setUserId(user.id);

    const { data: ads } = await supabase
      .from('anuncios')
      .select('*, distrito:distritos(name), plan:planes(nombre, precio, dias_duracion, es_destacado)')
      .eq('usuario_id', user.id)
      .order('created_at', { ascending: false });

    const ownAds = ads || [];
    setAnuncios(ownAds);

    if (ownAds.length > 0) {
      const ids = ownAds.map((ad: any) => ad.id);
      const { data: paymentRows } = await supabase
        .from('pagos')
        .select('*, plan:planes(nombre, precio), cupon:cupones(codigo)')
        .in('anuncio_id', ids)
        .order('created_at', { ascending: false });
      setPagos(paymentRows || []);

      const { data: visitRows } = await supabase.rpc('listar_visitas_ofertante', { p_limite: 100 });
      setVisitas(visitRows || []);

      const { data: commentRows } = await supabase
        .from('comentarios')
        .select('*, anuncio:anuncios!inner(id, titulo, usuario_id), usuario:perfiles(nombre_comercial)')
        .in('anuncio_id', ids)
        .order('created_at', { ascending: false });
      setComentarios(commentRows || []);
    } else {
      setPagos([]);
      setVisitas([]);
      setComentarios([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const handleRepublish = async (adId: string) => {
    setRepublishing(adId);
    setMessage('');
    const { data, error } = await supabase.rpc('republicar_anuncio', { p_anuncio_id: adId });
    if (error || !data?.ok) {
      setMessage(data?.error === 'en_espera'
        ? `Debes esperar ${data?.dias_restantes || 0} dia(s) para republicar.`
        : data?.error || error?.message || 'No se pudo republicar.');
    } else {
      setMessage('Anuncio republicado y vigencia renovada.');
      await load();
    }
    setRepublishing(null);
  };

  const handleToggleComment = async (commentId: string, activo: boolean) => {
    await supabase.from('comentarios').update({ activo: !activo }).eq('id', commentId);
    await load();
  };

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from('comentarios').delete().eq('id', commentId);
    await load();
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-zinc-400">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
        Cargando panel...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-8">
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" />
        <span>Volver al inicio</span>
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-1">Mi panel de ofertante</h1>
        <p className="text-xs text-zinc-400">Gestiona tus anuncios, pagos, visitas y comentarios.</p>
      </div>

      {message && <p className="mb-4 text-xs text-zinc-300">{message}</p>}

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {(['anuncios', 'pagos', 'visitas', 'comentarios'] as Tab[]).map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-colors ${
              tab === item ? 'bg-brand-600 text-white' : 'bg-white/5 text-zinc-400 hover:text-white'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'anuncios' && (
        <div className="grid gap-4">
          {anuncios.length === 0 ? (
            <div className="glass-panel p-8 rounded-2xl text-center text-zinc-400 text-sm">
              Aun no tienes anuncios publicados.
            </div>
          ) : (
            anuncios.map((ad) => (
              <div key={ad.id} className="glass-panel p-4 rounded-xl border border-white/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-white">{ad.titulo}</h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      {ad.activo ? 'Activo' : 'Inactivo'} · {ad.vigente_hasta ? `Vigente hasta ${formatDate(ad.vigente_hasta)}` : 'Sin vigencia'} · {ad.total_vistas || 0} vistas · {ad.total_likes || 0} likes
                    </p>
                  </div>
                  <button
                    onClick={() => handleRepublish(ad.id)}
                    disabled={republishing === ad.id}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-bold"
                  >
                    <RefreshCw className={`w-4 h-4 ${republishing === ad.id ? 'animate-spin' : ''}`} />
                    Republicar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'pagos' && (
        <div className="grid gap-3">
          {pagos.length === 0 ? (
            <div className="glass-panel p-8 rounded-2xl text-center text-zinc-400 text-sm">Sin pagos registrados.</div>
          ) : (
            pagos.map((pago) => (
              <div key={pago.id} className="glass-panel p-4 rounded-xl border border-white/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-white">{pago.plan?.nombre || 'Plan'} · {formatPrice(Number(pago.monto_esperado || 0))}</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      {pago.estado || 'pendiente'} · {pago.metodo} · {formatDate(pago.created_at)}{pago.cupon?.codigo ? ` · cupon ${pago.cupon.codigo}` : ''}
                    </p>
                  </div>
                  {pago.comprobante_url && (
                    <a href={pago.comprobante_url} target="_blank" rel="noreferrer" className="text-xs text-brand-400 hover:text-brand-300">
                      Ver comprobante
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'visitas' && (
        <div className="grid gap-3">
          {visitas.length === 0 ? (
            <div className="glass-panel p-8 rounded-2xl text-center text-zinc-400 text-sm">Sin visitas registradas.</div>
          ) : (
            visitas.map((visita) => (
              <div key={visita.id} className="glass-panel p-4 rounded-xl border border-white/10 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white">{visita.anuncio_titulo || 'Anuncio'}</p>
                  <p className="text-xs text-zinc-400 mt-1">
                    {visita.visitante_nombre || 'Invitado'} · {formatDate(visita.created_at)}
                  </p>
                </div>
                <Eye className="w-4 h-4 text-zinc-500" />
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'comentarios' && (
        <div className="grid gap-3">
          {comentarios.length === 0 ? (
            <div className="glass-panel p-8 rounded-2xl text-center text-zinc-400 text-sm">Sin comentarios.</div>
          ) : (
            comentarios.map((comentario) => (
              <div key={comentario.id} className="glass-panel p-4 rounded-xl border border-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-zinc-500 mb-1">
                      {comentario.usuario?.nombre_comercial || 'Usuario'} · {formatDate(comentario.created_at)}
                    </p>
                    <p className="text-sm text-zinc-200 whitespace-pre-line">{comentario.contenido}</p>
                    <p className="text-[10px] mt-2 text-zinc-500">{comentario.activo ? 'Visible' : 'Oculto'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleComment(comentario.id, comentario.activo)}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-zinc-300"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteComment(comentario.id)}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-400"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
