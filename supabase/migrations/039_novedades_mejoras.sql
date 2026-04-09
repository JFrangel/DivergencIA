-- ══════════════════════════════════════════════════════════════
-- Migration 039: Mejoras al sistema de changelog
-- - ai_comparacion column on novedades_version
-- - novedades_vistas table for per-user seen tracking (replaces localStorage)
-- - save_ai_comparacion RPC (SECURITY DEFINER, writes only if NULL)
-- Applied via MCP.
-- ══════════════════════════════════════════════════════════════

-- 1. Add AI comparison column
ALTER TABLE public.novedades_version
  ADD COLUMN IF NOT EXISTS ai_comparacion TEXT;

-- 2. Per-user seen tracking table
CREATE TABLE IF NOT EXISTS public.novedades_vistas (
  usuario_id  UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  novedad_id  UUID NOT NULL REFERENCES public.novedades_version(id) ON DELETE CASCADE,
  visto_en    TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (usuario_id, novedad_id)
);

ALTER TABLE public.novedades_vistas ENABLE ROW LEVEL SECURITY;

CREATE POLICY novedades_vistas_select ON public.novedades_vistas
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY novedades_vistas_insert ON public.novedades_vistas
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY novedades_vistas_delete ON public.novedades_vistas
  FOR DELETE USING (auth.uid() = usuario_id);

-- 3. SECURITY DEFINER RPC: save AI comparison only if not already set
--    Any authenticated user can trigger this (first-one-wins, no re-generation per session)
CREATE OR REPLACE FUNCTION public.save_ai_comparacion(
  p_novedad_id UUID,
  p_comparacion TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.novedades_version
  SET ai_comparacion = p_comparacion
  WHERE id = p_novedad_id
    AND ai_comparacion IS NULL
    AND publicado = true;
END;
$$;
