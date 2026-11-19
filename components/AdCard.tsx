'use client';

import React from 'react';
import Link from 'next/link';
import { Heart, MapPin, Globe, Sparkles, ShieldCheck, Image as ImageIcon } from 'lucide-react';

export interface AdCardProps {
  id: string;
  titulo: string;
  edad?: number | null;
  modalidad: 'presencial' | 'virtual';
  distrito_nombre?: string | null;
  fotos: string[];
  es_vip?: boolean | null;
  total_likes?: number;
  telefono_verificado?: boolean;
  etiquetas?: string[];
  created_at: string;
}

export default function AdCard({
  id,
  titulo,
  edad,
  modalidad,
  distrito_nombre,
  fotos,
  es_vip,
  total_likes = 0,
  telefono_verificado = true,
  etiquetas = [],
}: AdCardProps) {
  const mainPhoto = fotos && fotos.length > 0 ? fotos[0] : '/placeholder.jpg';

  return (
    <Link
      href={`/anuncio/${id}`}
      className={`group relative rounded-2xl overflow-hidden glass-card hover:border-white/20 transition-all duration-300 flex flex-col hover:-translate-y-1 hover:shadow-xl ${
        es_vip ? 'border-amber-500/30 shadow-amber-500/5' : 'border-white/5'
      }`}
    >
      {/* Image Thumbnail Container */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-dark-900">
        <img
          src={mainPhoto}
          alt={titulo}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Gradient Overlay for Text Readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/20 to-transparent" />

        {/* Badges Top Bar */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5 flex-wrap">
            {es_vip && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 text-black text-[11px] font-extrabold shadow-lg shadow-amber-500/30">
                <Sparkles className="w-3.5 h-3.5 fill-black" />
                VIP
              </span>
            )}
            {edad && (
              <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-[11px] font-bold">
                {edad} años
              </span>
            )}
          </div>

          {/* Photo Count */}
          {fotos && fotos.length > 1 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-[11px]">
              <ImageIcon className="w-3 h-3" />
              {fotos.length}
            </span>
          )}
        </div>

        {/* Location Badge Bottom Left on Photo */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-200 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10">
            {modalidad === 'virtual' ? (
              <>
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span>100% Virtual</span>
              </>
            ) : (
              <>
                <MapPin className="w-3.5 h-3.5 text-brand-500" />
                <span className="truncate max-w-[130px]">{distrito_nombre || 'Presencial'}</span>
              </>
            )}
          </div>

          {/* Likes indicator */}
          <div className="flex items-center gap-1 text-xs font-semibold text-rose-300 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>{total_likes}</span>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="text-base font-bold text-white group-hover:text-brand-500 transition-colors line-clamp-1">
              {titulo}
            </h3>
            {telefono_verificado && (
              <span title="WhatsApp Verificado por OTP">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              </span>
            )}
          </div>

          {/* Tags Chips */}
          {etiquetas && etiquetas.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
              {etiquetas.slice(0, 2).map((etq, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[10px] text-zinc-300 font-medium"
                >
                  {etq}
                </span>
              ))}
              {etiquetas.length > 2 && (
                <span className="text-[10px] text-zinc-400 font-medium">+{etiquetas.length - 2}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
