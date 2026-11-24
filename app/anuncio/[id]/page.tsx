'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Heart,
  MessageCircle,
  Send,
  MapPin,
  Globe,
  ShieldCheck,
  Calendar,
  Sparkles,
  ArrowLeft,
  Eye,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ensureAnonymousSession } from '@/lib/supabase/anonymous';
import { normalizarTelefonoPeru } from '@/lib/whatsapp';
import PhotoLightbox from '@/components/PhotoLightbox';

export default function AnuncioDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const supabase = createClient();

  const [anuncio, setAnuncio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState(0);
  const [hasLiked, setHasLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function fetchAd() {
      if (!id) return;

      const { data, error } = await supabase
        .from('anuncios')
        .select(`
          *,
          distrito:distritos(name, provincia:provincias(name, departamento:departamentos(name))),
          usuario:perfiles(nombre_comercial, telefono, telefono_verificado, created_at),
          anuncio_etiquetas(etiquetas(nombre))
        `)
        .eq('id', id)
        .single();

      if (!error && data) {
        setAnuncio(data);
        setLikes(data.total_likes || 0);

        // Registrar visita y actualizar contador
        supabase
          .rpc('registrar_visita_anuncio', { p_anuncio_id: id })
          .then();

        // Cargar interacciones del usuario autenticado (sesión anónima incluida)
        const user = await ensureAnonymousSession(supabase).catch(() => null);
        if (user) {
          const [likeRes, favoriteRes, commentsRes] = await Promise.all([
            supabase
              .from('anuncio_likes')
              .select('id')
              .eq('anuncio_id', id)
              .eq('usuario_id', user.id)
              .maybeSingle(),
            supabase
              .from('favoritos')
              .select('id')
              .eq('anuncio_id', id)
              .eq('usuario_id', user.id)
              .maybeSingle(),
            supabase
              .from('comentarios')
              .select('id, contenido, created_at, usuario:perfiles(nombre_comercial)')
              .eq('anuncio_id', id)
              .eq('activo', true)
              .order('created_at', { ascending: true }),
          ]);

          setHasLiked(Boolean(likeRes.data));
          setIsFavorite(Boolean(favoriteRes.data));
          if (commentsRes.data) setComments(commentsRes.data);
        } else {
          const { data: publicComments } = await supabase
            .from('comentarios')
            .select('id, contenido, created_at, usuario:perfiles(nombre_comercial)')
            .eq('anuncio_id', id)
            .eq('activo', true)
            .order('created_at', { ascending: true });
          if (publicComments) setComments(publicComments);
        }
      }
      setLoading(false);
    }

    fetchAd();
  }, [id]);

  const handleLike = async () => {
    if (!anuncio || likeLoading) return;
    setLikeLoading(true);

    try {
      const user = await ensureAnonymousSession(supabase);
      const { data, error } = await supabase.rpc('toggle_anuncio_like', {
        p_anuncio_id: id,
      });

      if (error || !data?.ok) {
        throw new Error(data?.error || error?.message || 'No se pudo registrar el like.');
      }

      setHasLiked(Boolean(data.liked));
      const { data: updated } = await supabase
        .from('anuncios')
        .select('total_likes')
        .eq('id', id)
        .single();
      if (updated) setLikes(updated.total_likes || 0);
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo registrar el like.');
    } finally {
      setLikeLoading(false);
    }
  };

  const handleFavorite = async () => {
    if (!anuncio || favoriteLoading) return;
    setFavoriteLoading(true);

    try {
      await ensureAnonymousSession(supabase);
      const { data, error } = await supabase.rpc('toggle_favorito', {
        p_anuncio_id: id,
      });

      if (error || !data?.ok) {
        throw new Error(data?.error || error?.message || 'No se pudo guardar el favorito.');
      }

      setIsFavorite(Boolean(data.favorito));
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo guardar el favorito.');
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newComment.trim() || commentSubmitting) return;

    setCommentSubmitting(true);
    try {
      const user = await ensureAnonymousSession(supabase);
      const { data, error } = await supabase
        .from('comentarios')
        .insert({
          anuncio_id: id,
          usuario_id: user.id,
          contenido: newComment.trim(),
        })
        .select('id, contenido, created_at, usuario:perfiles(nombre_comercial)')
        .single();

      if (error || !data) {
        throw new Error(error?.message || 'No se pudo publicar el comentario.');
      }

      setComments((prev) => [...prev, data]);
      setNewComment('');
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo publicar el comentario.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const trackClick = async (tipo: 'whatsapp' | 'telegram') => {
    if (!anuncio) return;
    if (tipo === 'whatsapp') {
      supabase
        .from('anuncios')
        .update({ total_clics_whatsapp: (anuncio.total_clics_whatsapp || 0) + 1 })
        .eq('id', id)
        .then();
    } else {
      supabase
        .from('anuncios')
        .update({ total_clics_telegram: (anuncio.total_clics_telegram || 0) + 1 })
        .eq('id', id)
        .then();
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-zinc-400 text-sm">Cargando anuncio...</p>
      </div>
    );
  }

  if (!anuncio) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold text-white mb-3">Anuncio no encontrado</h2>
        <p className="text-zinc-400 text-sm mb-6">El anuncio puede haber expirado o fue retirado.</p>
        <Link href="/" className="px-5 py-2.5 rounded-xl bg-brand-600 text-white font-medium text-sm">
          Volver a explorar
        </Link>
      </div>
    );
  }

  const telefonoContacto = anuncio.usuario?.telefono || '999999999';
  const waPhone = normalizarTelefonoPeru(telefonoContacto);
  const mensajePredeterminado = encodeURIComponent(
    `¡Hola ${anuncio.usuario?.nombre_comercial || ''}! Vi tu anuncio en Mordisco: "${anuncio.titulo}" y quisiera consultar por tus servicios.`
  );
  const waUrl = `https://wa.me/${waPhone}?text=${mensajePredeterminado}`;
  const tgUrl = `https://t.me/share/url?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}&text=${mensajePredeterminado}`;

  const fotos = anuncio.fotos && anuncio.fotos.length > 0 ? anuncio.fotos : ['/placeholder.jpg'];
  const diasAntiguedad = Math.max(
    1,
    Math.floor((Date.now() - new Date(anuncio.usuario?.created_at || anuncio.created_at).getTime()) / (1000 * 60 * 60 * 24))
  );
  const etiquetasAnuncio: string[] = (anuncio.anuncio_etiquetas || [])
    .map((rel: any) => rel.etiquetas?.nombre)
    .filter((nombre: any): nombre is string => Boolean(nombre));

  return (
    <div className="max-w-5xl mx-auto px-4 lg:px-8 py-6">
      {/* Back button */}
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al listado</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Photo Gallery */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {/* Main Photo Banner */}
          <div
            onClick={() => {
              setActivePhotoIdx(0);
              setLightboxOpen(true);
            }}
            className="relative aspect-[4/5] md:aspect-[4/4] rounded-2xl overflow-hidden cursor-zoom-in bg-dark-900 border border-white/10 group"
          >
            <img
              src={fotos[0]}
              alt={anuncio.titulo}
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium text-xs gap-1.5 bg-black/40 backdrop-blur-[2px]">
              <span>Toca para ver en pantalla completa</span>
            </div>
            {anuncio.es_vip && (
              <span className="absolute top-3 left-3 flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500 text-black text-xs font-black shadow-lg">
                <Sparkles className="w-3.5 h-3.5 fill-black" />
                DESTACADO VIP
              </span>
            )}
          </div>

          {/* Thumbnails list */}
          {fotos.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {fotos.map((f: string, i: number) => (
                <div
                  key={i}
                  onClick={() => {
                    setActivePhotoIdx(i);
                    setLightboxOpen(true);
                  }}
                  className="aspect-square rounded-xl overflow-hidden cursor-pointer border border-white/10 hover:border-brand-500 transition-all"
                >
                  <img src={f} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Details & Actions */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Header Title & Location */}
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {anuncio.modalidad === 'virtual' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
                  <Globe className="w-3.5 h-3.5" />
                  100% Virtual (Todo el Perú)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold">
                  <MapPin className="w-3.5 h-3.5" />
                  {anuncio.distrito?.name || 'Presencial'} ({anuncio.distrito?.provincia?.departamento?.name || 'Perú'})
                </span>
              )}
              {anuncio.edad && (
                <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-white text-xs font-bold">
                  {anuncio.edad} años
                </span>
              )}
              {etiquetasAnuncio.map((etiqueta, idx) => (
                <span
                  key={`${etiqueta}-${idx}`}
                  className="px-2.5 py-1 rounded-md bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold"
                >
                  {etiqueta}
                </span>
              ))}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight mb-2">
              {anuncio.titulo}
            </h1>

            <div className="flex items-center gap-4 text-xs text-zinc-400 pb-4 border-b border-white/10">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> {anuncio.total_vistas || 1} vistas
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-rose-500" /> {likes} likes
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Actualizado recientemente
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="glass-panel p-4 rounded-xl border border-white/10">
            <h3 className="text-xs uppercase tracking-wider font-bold text-zinc-400 mb-2">Descripción del Servicio</h3>
            <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-line">{anuncio.descripcion}</p>
          </div>

          {/* Trust Box (Caja de Confianza OTP y Antigüedad) */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/40 via-dark-900 to-dark-900 border border-emerald-500/30 shadow-lg shadow-emerald-950/20 flex flex-col gap-2.5">
            <div className={`flex items-center gap-2 font-bold text-sm ${anuncio.usuario?.telefono_verificado ? 'text-emerald-400' : 'text-zinc-300'}`}>
              <ShieldCheck className={`w-5 h-5 ${anuncio.usuario?.telefono_verificado ? 'text-emerald-400' : 'text-zinc-400'}`} />
              <span>{anuncio.usuario?.telefono_verificado ? 'PERFIL Y CONTACTO VERIFICADO' : 'PERFIL DEL OFERTANTE'}</span>
            </div>
            <ul className="space-y-1.5 text-xs text-zinc-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${anuncio.usuario?.telefono_verificado ? 'text-emerald-400' : 'text-zinc-500'}`} />
                <span>
                  {anuncio.usuario?.telefono_verificado
                    ? 'WhatsApp validado con código OTP de 6 dígitos'
                    : 'Contacto pendiente de verificación por WhatsApp'}
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Miembro activo en la plataforma hace {diasAntiguedad} días</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Respuesta directa y sin intermediarios</span>
              </li>
            </ul>
          </div>

          {/* Action Buttons: WhatsApp & Telegram */}
          <div className="flex flex-col gap-3">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick('whatsapp')}
              className="flex items-center justify-center gap-2.5 w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <MessageCircle className="w-5 h-5 fill-white" />
              <span>Contactar por WhatsApp</span>
            </a>

            <div className="grid grid-cols-2 gap-3">
              <a
                href={tgUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackClick('telegram')}
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-medium text-xs transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Telegram</span>
              </a>

              <button
                onClick={handleLike}
                disabled={likeLoading}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all text-xs font-semibold ${
                  hasLiked
                    ? 'bg-rose-500/20 border-rose-500 text-rose-400'
                    : 'bg-white/5 border-white/10 text-zinc-300 hover:border-rose-500 hover:text-rose-400'
                }`}
              >
                <Heart className={`w-4 h-4 ${hasLiked ? 'fill-rose-500 text-rose-500' : ''}`} />
                <span>{likeLoading ? 'Guardando...' : hasLiked ? 'Te gustó' : 'Dar Me Gusta'}</span>
              </button>

              <button
                onClick={handleFavorite}
                disabled={favoriteLoading}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border transition-all text-xs font-semibold ${
                  isFavorite
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                    : 'bg-white/5 border-white/10 text-zinc-300 hover:border-amber-500 hover:text-amber-400'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? 'fill-amber-500 text-amber-500' : ''}`} />
                <span>{favoriteLoading ? 'Guardando...' : isFavorite ? 'Guardado' : 'Guardar'}</span>
              </button>
            </div>
          </div>

          {/* Comments Section (Controlled by permitir_comentarios) */}
          {anuncio.permitir_comentarios ? (
            <div className="glass-panel p-4 rounded-xl border border-white/10 mt-2">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                Comentarios & Reseñas ({comments.length})
              </h3>
              <form onSubmit={handleComment} className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="Escribe un comentario respetuoso..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 bg-dark-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                />
                <button
                  type="submit"
                  disabled={commentSubmitting || !newComment.trim()}
                  className="px-3 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold"
                >
                  {commentSubmitting ? 'Enviando...' : 'Enviar'}
                </button>
              </form>
              {errorMsg && (
                <p className="mb-3 text-xs text-rose-400">{errorMsg}</p>
              )}
              {comments.length === 0 ? (
                <p className="text-xs text-zinc-500 italic">Aún no hay comentarios. Sé el primero.</p>
              ) : (
                <div className="space-y-2">
                  {comments.map((comment) => (
                    <div key={comment.id} className="p-2.5 rounded-lg bg-white/5 text-xs text-zinc-300">
                      <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-zinc-500">
                        <span>{comment.usuario?.nombre_comercial || 'Usuario'}</span>
                        <span>{new Date(comment.created_at).toLocaleString('es-PE')}</span>
                      </div>
                      <p className="whitespace-pre-line">{comment.contenido}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-white/5 border border-white/5 text-center text-xs text-zinc-500 italic">
              El anunciante ha desactivado los comentarios para esta publicación.
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      <PhotoLightbox
        photos={fotos}
        initialIndex={activePhotoIdx}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  );
}
