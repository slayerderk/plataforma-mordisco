-- ==========================================================
-- SCRIPT DE SEGURIDAD: ROW LEVEL SECURITY (RLS)
-- ==========================================================

-- 1. Activar RLS en todas las tablas
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provincias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distritos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etiquetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracion_admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cupones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anuncios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anuncio_etiquetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

-- 2. Políticas de lectura pública para catálogos y configuración
DROP POLICY IF EXISTS "Lectura pública departamentos" ON public.departamentos;
CREATE POLICY "Lectura pública departamentos" ON public.departamentos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lectura pública provincias" ON public.provincias;
CREATE POLICY "Lectura pública provincias" ON public.provincias FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lectura pública distritos" ON public.distritos;
CREATE POLICY "Lectura pública distritos" ON public.distritos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lectura pública planes activos" ON public.planes;
CREATE POLICY "Lectura pública planes activos" ON public.planes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lectura pública etiquetas" ON public.etiquetas;
CREATE POLICY "Lectura pública etiquetas" ON public.etiquetas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lectura pública configuración" ON public.configuracion_admin;
CREATE POLICY "Lectura pública configuración" ON public.configuracion_admin FOR SELECT USING (true);

DROP POLICY IF EXISTS "Lectura pública cupones activos" ON public.cupones;
CREATE POLICY "Lectura pública cupones activos" ON public.cupones FOR SELECT USING (activo = true);

-- 3. Políticas para Anuncios
DROP POLICY IF EXISTS "Lectura pública anuncios activos" ON public.anuncios;
CREATE POLICY "Lectura pública anuncios activos" ON public.anuncios FOR SELECT USING (activo = true);

DROP POLICY IF EXISTS "Ofertantes gestionan sus anuncios" ON public.anuncios;
CREATE POLICY "Ofertantes gestionan sus anuncios" ON public.anuncios FOR ALL TO authenticated
USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "Lectura pública anuncio etiquetas" ON public.anuncio_etiquetas;
CREATE POLICY "Lectura pública anuncio etiquetas" ON public.anuncio_etiquetas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Ofertantes gestionan sus etiquetas de anuncio" ON public.anuncio_etiquetas;
CREATE POLICY "Ofertantes gestionan sus etiquetas de anuncio" ON public.anuncio_etiquetas FOR ALL TO authenticated
USING (anuncio_id IN (SELECT id FROM public.anuncios WHERE usuario_id = auth.uid()))
WITH CHECK (anuncio_id IN (SELECT id FROM public.anuncios WHERE usuario_id = auth.uid()));

-- 4. Políticas para Perfiles
DROP POLICY IF EXISTS "Lectura pública básica perfiles" ON public.perfiles;
CREATE POLICY "Lectura pública básica perfiles" ON public.perfiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Usuarios editan su propio perfil" ON public.perfiles;
CREATE POLICY "Usuarios editan su propio perfil" ON public.perfiles FOR ALL TO authenticated
USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 5. Políticas para Pagos
DROP POLICY IF EXISTS "Ofertantes ven y crean sus pagos" ON public.pagos;
CREATE POLICY "Ofertantes ven y crean sus pagos" ON public.pagos FOR SELECT TO authenticated
USING (anuncio_id IN (SELECT id FROM public.anuncios WHERE usuario_id = auth.uid()));

DROP POLICY IF EXISTS "Ofertantes insertan sus pagos" ON public.pagos;
CREATE POLICY "Ofertantes insertan sus pagos" ON public.pagos FOR INSERT TO authenticated
WITH CHECK (anuncio_id IN (SELECT id FROM public.anuncios WHERE usuario_id = auth.uid()));
