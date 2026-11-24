'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, MapPin, Globe, Sparkles, Filter, ChevronRight, CheckCircle2, Layers } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import AdCard from '@/components/AdCard';
import { formatPrice, getPlanBeneficios } from '@/lib/utils';

export default function HomePage() {
  const supabase = createClient();

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [modalidadFilter, setModalidadFilter] = useState<'todos' | 'presencial' | 'virtual'>('todos');
  const [selectedDep, setSelectedDep] = useState('');
  const [selectedProv, setSelectedProv] = useState('');
  const [selectedDist, setSelectedDist] = useState('');
  const [selectedEtiqueta, setSelectedEtiqueta] = useState<string | null>(null);

  // Data from Supabase
  const [departamentos, setDepartamentos] = useState<any[]>([]);
  const [provincias, setProvincias] = useState<any[]>([]);
  const [distritos, setDistritos] = useState<any[]>([]);
  const [etiquetas, setEtiquetas] = useState<any[]>([]);
  const [planes, setPlanes] = useState<any[]>([]);
  const [anuncios, setAnuncios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial Data Load (Departamentos, Etiquetas, Planes, Anuncios)
  useEffect(() => {
    async function initData() {
      setLoading(true);

      const [depsRes, etqsRes, planesRes, adsRes] = await Promise.all([
        supabase.from('departamentos').select('id, name').order('name'),
        supabase.from('etiquetas').select('id, nombre').eq('activo', true).order('orden'),
        supabase.from('planes').select('*').eq('activo', true).order('orden'),
        supabase
          .from('anuncios')
          .select(`
            *,
            distrito:distritos(name),
            usuario:perfiles(telefono_verificado),
            anuncio_etiquetas(etiqueta_id, etiquetas(nombre))
          `)
          .eq('activo', true)
          .or(`vigente_hasta.is.null,vigente_hasta.gte.${new Date().toISOString()}`)
          .order('es_vip', { ascending: false })
          .order('ultima_republicacion', { ascending: false }),
      ]);

      if (depsRes.data) setDepartamentos(depsRes.data);
      if (etqsRes.data) setEtiquetas(etqsRes.data);
      if (planesRes.data) setPlanes(planesRes.data);
      if (adsRes.data) setAnuncios(adsRes.data);

      setLoading(false);
    }

    initData();
  }, []);

  // Cascade Provincias when Departamento changes
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
        setDistritos([]);
        setSelectedDist('');
      });
  }, [selectedDep]);

  // Cascade Distritos when Provincia changes
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

  // Client-side Filtering
  const filteredAnuncios = anuncios.filter((ad) => {
    // 1. Modalidad
    if (modalidadFilter === 'presencial' && ad.modalidad !== 'presencial') return false;
    if (modalidadFilter === 'virtual' && ad.modalidad !== 'virtual') return false;

    // 2. Ubicación (si seleccionó distrito)
    if (selectedDist && ad.modalidad === 'presencial' && ad.distrito_id !== selectedDist) {
      return false;
    }

    // 3. Etiqueta seleccionada
    if (selectedEtiqueta) {
      const etiquetasAd = (ad.anuncio_etiquetas || []).map((rel: any) => rel.etiqueta_id);
      if (!etiquetasAd.includes(selectedEtiqueta)) return false;
    }

    // 4. Palabra clave
    if (searchTerm.trim()) {
      const matchText = (ad.titulo + ' ' + ad.descripcion).toLowerCase();
      if (!matchText.includes(searchTerm.toLowerCase())) return false;
    }

    return true;
  });

  return (
    <div className="flex flex-col gap-10">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-12 px-4 lg:px-8 border-b border-white/5 bg-gradient-to-b from-dark-900/60 via-dark-950 to-dark-950">
        <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Directorio de Servicios & Talento en Perú</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white max-w-3xl leading-tight mb-4">
            Encuentra o Publica Servicios con{' '}
            <span className="bg-gradient-to-r from-brand-500 via-rose-500 to-amber-400 bg-clip-text text-transparent">
              Activación Inmediata
            </span>
          </h1>

          <p className="text-sm md:text-base text-zinc-400 max-w-2xl mb-8 leading-relaxed">
            Explora anuncios presenciales por distritos de todo el Perú o servicios virtuales a nivel nacional con contacto directo por WhatsApp y Telegram.
          </p>

          {/* Main Search Filter Box */}
          <div className="w-full max-w-4xl glass-panel p-4 md:p-5 rounded-2xl shadow-2xl flex flex-col gap-4">
            {/* Search Input & Modality Switch */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-5 h-5 text-zinc-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="¿Qué servicio o persona estás buscando?..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-dark-900 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              {/* Modality Selector Buttons */}
              <div className="flex items-center bg-dark-900 p-1 rounded-xl border border-white/10">
                <button
                  onClick={() => setModalidadFilter('todos')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    modalidadFilter === 'todos' ? 'bg-brand-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setModalidadFilter('presencial')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                    modalidadFilter === 'presencial' ? 'bg-brand-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Presencial
                </button>
                <button
                  onClick={() => setModalidadFilter('virtual')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                    modalidadFilter === 'virtual' ? 'bg-brand-600 text-white shadow-sm' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Virtual
                </button>
              </div>
            </div>

            {/* UBIGEO Dropdowns (Visible when presencial or todos) */}
            {modalidadFilter !== 'virtual' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-white/5">
                {/* Departamento */}
                <select
                  value={selectedDep}
                  onChange={(e) => setSelectedDep(e.target.value)}
                  className="bg-dark-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="">Todos los Departamentos</option>
                  {departamentos.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>

                {/* Provincia */}
                <select
                  value={selectedProv}
                  onChange={(e) => setSelectedProv(e.target.value)}
                  disabled={!selectedDep}
                  className="bg-dark-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-brand-500 disabled:opacity-40"
                >
                  <option value="">Todas las Provincias</option>
                  {provincias.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                {/* Distrito */}
                <select
                  value={selectedDist}
                  onChange={(e) => setSelectedDist(e.target.value)}
                  disabled={!selectedProv}
                  className="bg-dark-900 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-zinc-200 focus:outline-none focus:border-brand-500 disabled:opacity-40"
                >
                  <option value="">Todos los Distritos</option>
                  {distritos.map((dist) => (
                    <option key={dist.id} value={dist.id}>
                      {dist.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Tags Pills Bar */}
            {etiquetas.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-2">
                <span className="text-[11px] font-semibold text-zinc-400 mr-1">Etiquetas:</span>
                {etiquetas.map((etq) => (
                  <button
                    key={etq.id}
                    onClick={() =>
                      setSelectedEtiqueta(selectedEtiqueta === etq.id ? null : etq.id)
                    }
                    className={`px-2.5 py-1 rounded-full text-xs transition-all ${
                      selectedEtiqueta === etq.id
                        ? 'bg-brand-600 text-white font-bold'
                        : 'bg-white/5 hover:bg-white/10 text-zinc-300'
                    }`}
                  >
                    {etq.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Anuncios Feed Section */}
      <section className="max-w-7xl mx-auto px-4 lg:px-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Anuncios Disponibles
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-400 text-xs font-bold">
              {filteredAnuncios.length}
            </span>
          </div>
          <Link
            href="/publicar"
            className="text-xs font-semibold text-brand-500 hover:text-brand-400 flex items-center gap-1"
          >
            <span>Publicar mi servicio</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs text-zinc-400">Cargando anuncios...</p>
          </div>
        ) : filteredAnuncios.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl text-center max-w-lg mx-auto">
            <Layers className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">No hay anuncios con estos filtros</h3>
            <p className="text-xs text-zinc-400 mb-6">Prueba cambiando el distrito o la modalidad de búsqueda.</p>
            <button
              onClick={() => {
                setSearchTerm('');
                setModalidadFilter('todos');
                setSelectedDep('');
                setSelectedProv('');
                setSelectedDist('');
                setSelectedEtiqueta(null);
              }}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
            >
              Restablecer filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filteredAnuncios.map((ad) => (
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
                etiquetas={(ad.anuncio_etiquetas || []).flatMap((rel: any) =>
                  rel.etiquetas?.nombre ? [rel.etiquetas.nombre] : []
                )}
                created_at={ad.created_at}
              />
            ))}
          </div>
        )}
      </section>

      {/* Cuadro Comparativo de Planes (Para el Anunciante) */}
      <section id="planes" className="max-w-7xl mx-auto px-4 lg:px-8 pt-10 pb-6 w-full">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <span className="text-xs font-bold uppercase tracking-wider text-brand-500 mb-1 block">
            Monetización & Publicidad
          </span>
          <h2 className="text-2xl md:text-4xl font-extrabold text-white mb-3">
            Elige el Plan Ideal para tu Anuncio
          </h2>
          <p className="text-xs md:text-sm text-zinc-400">
            Comienza gratis o activa la máxima visibilidad en los primeros lugares con pago directo a Yape o Plin.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {planes.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl p-6 flex flex-col justify-between glass-panel transition-all ${
                plan.es_destacado
                  ? 'border-brand-500/50 shadow-xl shadow-brand-500/10 scale-100 md:scale-105 bg-dark-900/90'
                  : 'border-white/10'
              }`}
            >
              <div>
                {plan.es_destacado && (
                  <span className="inline-block px-3 py-1 rounded-full bg-brand-600 text-white text-[10px] font-extrabold tracking-wider uppercase mb-3">
                    Recomendado VIP
                  </span>
                )}
                <h3 className="text-xl font-bold text-white mb-1">{plan.nombre}</h3>
                <div className="flex items-baseline gap-1 my-4">
                  <span className="text-3xl font-extrabold text-white">{formatPrice(plan.precio)}</span>
                  <span className="text-xs text-zinc-400">
                    {plan.dias_duracion > 0 ? `/ por ${plan.dias_duracion} días` : '/ permanente'}
                  </span>
                </div>

                <div className="text-xs text-zinc-300 font-medium mb-4 pb-3 border-b border-white/10">
                  Límite de fotos: <span className="font-bold text-white">{plan.limite_fotos} fotos</span>
                </div>

                {/* Benefits List */}
                <ul className="space-y-2.5 text-xs text-zinc-300 mb-6">
                  {getPlanBeneficios(plan).map((item, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={`/publicar?plan=${encodeURIComponent(plan.id)}`}
                className={`w-full py-3 rounded-xl font-bold text-xs text-center transition-all ${
                  plan.es_destacado
                    ? 'bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/30'
                    : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
              >
                Publicar con este plan
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
