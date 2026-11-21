-- ==========================================================
-- ORDEN MANUAL DE ETIQUETAS
-- Ejecutar en Supabase SQL Editor antes de usar el arrastre
-- ==========================================================

ALTER TABLE public.etiquetas
  ADD COLUMN IF NOT EXISTS orden integer NOT NULL DEFAULT 0;

-- Inicializa un orden solo si todavía no se ha personalizado
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.etiquetas WHERE orden <> 0) THEN
    WITH ranked AS (
      SELECT id, (ROW_NUMBER() OVER (ORDER BY nombre ASC) - 1)::integer AS position
      FROM public.etiquetas
    )
    UPDATE public.etiquetas e
    SET orden = ranked.position
    FROM ranked
    WHERE e.id = ranked.id;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS etiquetas_orden_idx ON public.etiquetas (orden);
