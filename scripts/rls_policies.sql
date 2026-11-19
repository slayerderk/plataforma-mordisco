-- ==============================================================================
-- POLÍTICAS DE SEGURIDAD (RLS) - PLATAFORMA MORDISCO
-- ==============================================================================
-- NOTA PARA DESARROLLO:
-- Mientras estés en fase de prototipado o pruebas, puedes mantener RLS desactivado.
-- Este archivo contiene las políticas listas y optimizadas según las mejores prácticas
-- de Supabase (usando `(SELECT auth.uid())` y cláusulas `TO`).
--
-- Puedes ejecutarlo directamente desde Supabase SQL Editor o cuando decidas activarlo.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. CATÁLOGOS PÚBLICOS (Lectura libre para cualquiera, modificación solo admin/service)
-- ------------------------------------------------------------------------------

-- Departamentos, Provincias y Distritos
ALTER TABLE public.departamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura publica de departamentos" ON public.departamentos;
CREATE POLICY "Lectura publica de departamentos" 
  ON public.departamentos FOR SELECT 
  TO public 
  USING (true);

ALTER TABLE public.provincias ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura publica de provincias" ON public.provincias;
CREATE POLICY "Lectura publica de provincias" 
  ON public.provincias FOR SELECT 
  TO public 
  USING (true);

ALTER TABLE public.distritos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura publica de distritos" ON public.distritos;
CREATE POLICY "Lectura publica de distritos" 
  ON public.distritos FOR SELECT 
  TO public 
  USING (true);

-- Planes y Etiquetas activas
ALTER TABLE public.planes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura publica de planes activos" ON public.planes;
CREATE POLICY "Lectura publica de planes activos" 
  ON public.planes FOR SELECT 
  TO public 
  USING (activo = true);

ALTER TABLE public.etiquetas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura publica de etiquetas activas" ON public.etiquetas;
CREATE POLICY "Lectura publica de etiquetas activas" 
  ON public.etiquetas FOR SELECT 
  TO public 
  USING (activo = true);

-- Configuración pública general (Yape/Plin, logos, etc.)
ALTER TABLE public.configuracion_admin ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lectura publica de configuracion" ON public.configuracion_admin;
CREATE POLICY "Lectura publica de configuracion" 
  ON public.configuracion_admin FOR SELECT 
  TO public 
  USING (true);

-- ------------------------------------------------------------------------------
-- 2. PERFILES (public.perfiles)
-- ------------------------------------------------------------------------------
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede consultar perfiles públicos comerciales (ej. ver nombre de quien publica)
DROP POLICY IF EXISTS "Lectura publica de perfiles" ON public.perfiles;
CREATE POLICY "Lectura publica de perfiles" 
  ON public.perfiles FOR SELECT 
  TO public 
  USING (true);

-- Un usuario autenticado solo puede insertar su propio registro de perfil
DROP POLICY IF EXISTS "Usuarios insertan su propio perfil" ON public.perfiles;
CREATE POLICY "Usuarios insertan su propio perfil" 
  ON public.perfiles FOR INSERT 
  TO authenticated 
  WITH CHECK ((SELECT auth.uid()) = id);

-- Un usuario autenticado solo puede actualizar su propio perfil
DROP POLICY IF EXISTS "Usuarios actualizan su propio perfil" ON public.perfiles;
CREATE POLICY "Usuarios actualizan su propio perfil" 
  ON public.perfiles FOR UPDATE 
  TO authenticated 
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

-- ------------------------------------------------------------------------------
-- 3. ANUNCIOS (public.anuncios)
-- ------------------------------------------------------------------------------
ALTER TABLE public.anuncios ENABLE ROW LEVEL SECURITY;

-- Público: Cualquiera puede ver anuncios activos (o el dueño puede ver los suyos inactivos)
DROP POLICY IF EXISTS "Lectura de anuncios" ON public.anuncios;
CREATE POLICY "Lectura de anuncios" 
  ON public.anuncios FOR SELECT 
  TO public 
  USING (activo = true OR (SELECT auth.uid()) = usuario_id);

-- Autenticados: Crear anuncios asociados a su propio usuario
DROP POLICY IF EXISTS "Crear anuncios propios" ON public.anuncios;
CREATE POLICY "Crear anuncios propios" 
  ON public.anuncios FOR INSERT 
  TO authenticated 
  WITH CHECK ((SELECT auth.uid()) = usuario_id);

-- Autenticados: Actualizar únicamente sus propios anuncios
DROP POLICY IF EXISTS "Actualizar anuncios propios" ON public.anuncios;
CREATE POLICY "Actualizar anuncios propios" 
  ON public.anuncios FOR UPDATE 
  TO authenticated 
  USING ((SELECT auth.uid()) = usuario_id)
  WITH CHECK ((SELECT auth.uid()) = usuario_id);

-- Autenticados: Eliminar/Dar de baja sus propios anuncios
DROP POLICY IF EXISTS "Eliminar anuncios propios" ON public.anuncios;
CREATE POLICY "Eliminar anuncios propios" 
  ON public.anuncios FOR DELETE 
  TO authenticated 
  USING ((SELECT auth.uid()) = usuario_id);

-- ------------------------------------------------------------------------------
-- 4. ETIQUETAS DE ANUNCIOS (public.anuncio_etiquetas)
-- ------------------------------------------------------------------------------
ALTER TABLE public.anuncio_etiquetas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura publica de etiquetas de anuncios" ON public.anuncio_etiquetas;
CREATE POLICY "Lectura publica de etiquetas de anuncios" 
  ON public.anuncio_etiquetas FOR SELECT 
  TO public 
  USING (true);

DROP POLICY IF EXISTS "Gestionar etiquetas de anuncios propios" ON public.anuncio_etiquetas;
CREATE POLICY "Gestionar etiquetas de anuncios propios" 
  ON public.anuncio_etiquetas FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.anuncios 
      WHERE anuncios.id = anuncio_etiquetas.anuncio_id 
        AND anuncios.usuario_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.anuncios 
      WHERE anuncios.id = anuncio_etiquetas.anuncio_id 
        AND anuncios.usuario_id = (SELECT auth.uid())
    )
  );

-- ------------------------------------------------------------------------------
-- 5. CUPONES (public.cupones)
-- ------------------------------------------------------------------------------
ALTER TABLE public.cupones ENABLE ROW LEVEL SECURITY;

-- Solo lectura de cupones válidos y vigentes para validación en el checkout
DROP POLICY IF EXISTS "Lectura de cupones activos" ON public.cupones;
CREATE POLICY "Lectura de cupones activos" 
  ON public.cupones FOR SELECT 
  TO authenticated 
  USING (activo = true);

-- ------------------------------------------------------------------------------
-- 6. PAGOS (public.pagos)
-- ------------------------------------------------------------------------------
ALTER TABLE public.pagos ENABLE ROW LEVEL SECURITY;

-- El usuario dueño del anuncio puede ver sus propios pagos
DROP POLICY IF EXISTS "Ver pagos propios" ON public.pagos;
CREATE POLICY "Ver pagos propios" 
  ON public.pagos FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM public.anuncios 
      WHERE anuncios.id = pagos.anuncio_id 
        AND anuncios.usuario_id = (SELECT auth.uid())
    )
  );

-- El usuario dueño del anuncio puede registrar un pago
DROP POLICY IF EXISTS "Crear pago para anuncio propio" ON public.pagos;
CREATE POLICY "Crear pago para anuncio propio" 
  ON public.pagos FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.anuncios 
      WHERE anuncios.id = pagos.anuncio_id 
        AND anuncios.usuario_id = (SELECT auth.uid())
    )
  );

-- ==============================================================================
-- DESACTIVAR RLS (Para volver al modo libre en desarrollo si lo necesitas):
-- ==============================================================================
-- ALTER TABLE public.departamentos DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.provincias DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.distritos DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.planes DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.etiquetas DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.configuracion_admin DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.perfiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.anuncios DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.anuncio_etiquetas DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.cupones DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.pagos DISABLE ROW LEVEL SECURITY;
