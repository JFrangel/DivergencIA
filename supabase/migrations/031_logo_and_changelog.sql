-- Migration 031: Add logo_url to configuracion_plataforma + create novedades_version table
-- Applied directly to Supabase via MCP.

-- Logo URL for platform branding (configurable from AdminPanel)
ALTER TABLE public.configuracion_plataforma
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Changelog / release notes table
-- Admin creates entries; users see a popup on login if they haven't seen the latest version.
CREATE TABLE IF NOT EXISTS public.novedades_version (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version      TEXT NOT NULL,
  titulo       TEXT NOT NULL,
  contenido    TEXT NOT NULL,
  fecha        TIMESTAMPTZ NOT NULL DEFAULT now(),
  publicado    BOOLEAN NOT NULL DEFAULT false,
  creado_por   UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.novedades_version ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage novedades"
  ON public.novedades_version
  FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM public.usuarios WHERE rol IN ('admin','directora'))
  );

CREATE POLICY "Anyone reads published novedades"
  ON public.novedades_version
  FOR SELECT
  USING (publicado = true);
