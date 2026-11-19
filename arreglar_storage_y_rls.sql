-- ==========================================================
-- POLÍTICAS DE ACCESO PARA SUPABASE STORAGE Y CONFIGURACIÓN
-- ==========================================================

-- 1. BUCKET "configuracion" (Para imágenes de QR de Yape, Plin y Logo)
-- Nota: Upsert requiere SELECT + INSERT + UPDATE en storage.objects
DROP POLICY IF EXISTS "Permitir lectura de configuracion" ON storage.objects;
CREATE POLICY "Permitir lectura de configuracion"
ON storage.objects FOR SELECT
USING (bucket_id = 'configuracion');

DROP POLICY IF EXISTS "Permitir subida a configuracion" ON storage.objects;
CREATE POLICY "Permitir subida a configuracion"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'configuracion');

DROP POLICY IF EXISTS "Permitir actualizacion en configuracion" ON storage.objects;
CREATE POLICY "Permitir actualizacion en configuracion"
ON storage.objects FOR UPDATE
USING (bucket_id = 'configuracion')
WITH CHECK (bucket_id = 'configuracion');

-- 2. BUCKET "anuncios" (Para fotos de los anuncios)
DROP POLICY IF EXISTS "Permitir lectura de anuncios" ON storage.objects;
CREATE POLICY "Permitir lectura de anuncios"
ON storage.objects FOR SELECT
USING (bucket_id = 'anuncios');

DROP POLICY IF EXISTS "Permitir subida a anuncios" ON storage.objects;
CREATE POLICY "Permitir subida a anuncios"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'anuncios');

DROP POLICY IF EXISTS "Permitir actualizacion en anuncios" ON storage.objects;
CREATE POLICY "Permitir actualizacion en anuncios"
ON storage.objects FOR UPDATE
USING (bucket_id = 'anuncios')
WITH CHECK (bucket_id = 'anuncios');

-- 3. BUCKET "comprobantes" (Para capturas de pago Yape/Plin)
DROP POLICY IF EXISTS "Permitir lectura de comprobantes" ON storage.objects;
CREATE POLICY "Permitir lectura de comprobantes"
ON storage.objects FOR SELECT
USING (bucket_id = 'comprobantes');

DROP POLICY IF EXISTS "Permitir subida a comprobantes" ON storage.objects;
CREATE POLICY "Permitir subida a comprobantes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'comprobantes');

DROP POLICY IF EXISTS "Permitir actualizacion en comprobantes" ON storage.objects;
CREATE POLICY "Permitir actualizacion en comprobantes"
ON storage.objects FOR UPDATE
USING (bucket_id = 'comprobantes')
WITH CHECK (bucket_id = 'comprobantes');

-- 4. TABLA public.configuracion_admin (Permitir lectura y actualización de switches y QR URLs)
DROP POLICY IF EXISTS "Permitir lectura configuracion_admin" ON public.configuracion_admin;
CREATE POLICY "Permitir lectura configuracion_admin"
ON public.configuracion_admin FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Permitir actualizacion configuracion_admin" ON public.configuracion_admin;
CREATE POLICY "Permitir actualizacion configuracion_admin"
ON public.configuracion_admin FOR UPDATE
USING (true)
WITH CHECK (true);
