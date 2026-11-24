'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Heart, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { ensureAnonymousSession } from '@/lib/supabase/anonymous';
import AdCard from '@/components/AdCard';

export default function FavoritosPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [anuncios, setAnuncios] = useState<any[]>([]);

  useEffect(() => {
    async function loadFavorites() {
      setLoading(true);

      const user = await ensureAnonymousSession(supabase).catch(() => null);
      if (!user) {
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from('favoritos')
        .select(`
          created_at,
          anuncio:anuncios(
            *,
            distrito:distritos(name),
            usuario:perfiles(telefono_verificado),
            anuncio_etiquetas(etiqueta_id, etiquetas(nombre))
          )
        `)
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false });

      const mapped = (data || [])
        .map((item: any) => item.anuncio)
        .filter(Boolean)
        .map((ad: any) => ({
          ...ad,
          etiquetas: (ad.anuncio_etiquetas || []).flatMap((rel: any) =>
            rel.etiquetas?.nombre ? [rel.etiquetas.nombre] : []
          ),
        }));

      setAnuncios(mapped);
      setLoading(false);
    }

    loadFavorites();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Volver al inicio</span>
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-1">Mis favoritos</h1>
        <p className="text-xs text-zinc-400">
          Anuncios que guardaste para revisar después.
        </p>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-3" />
          <p className="text-xs text-zinc-400">Cargando favoritos...</p>
        </div>
      ) : anuncios.length === 0 ? (
        <div className="glass-panel p-12 rounded-2xl text-center max-w-lg mx-auto">
          <Heart className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-white mb-1">Aún no tienes favoritos</h2>
          <p className="text-xs text-zinc-400">
            Usa el botón “Guardar” en un anuncio para agregarlo aquí.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {anuncios.map((ad) => (
            <AdCard
              key={ad.id}
              id={ad.id}
              titulo={ad.titulo}
              edad={ad.edad}
              modalidad={ad.modalidad}
              distrito_nombre={ad.distrito?.name}
              fotos={ad.fotos || []}
              es_vip={ad.es_vip}
              total_likes={ad.total_likes}
              telefono_verificado={ad.usuario?.telefono_verificado ?? false}
              etiquetas={ad.etiquetas}
              created_at={ad.created_at}
            />
          ))}
        </div>
      )}
    </div>
  );
}
