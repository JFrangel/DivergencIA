-- Safe consolidated version of migrations 021-025.
-- Skips columns that already exist (canales.nodo_id, archivos.proyecto_id).

-- 021: proyectos.usuario_id (creator audit trail)
ALTER TABLE public.proyectos
  ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_proyectos_usuario_id ON public.proyectos(usuario_id);

-- 022: nodos.usuario_id (founder audit trail)
ALTER TABLE public.nodos
  ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_nodos_usuario_id ON public.nodos(usuario_id);

-- 023: canales.usuario_id (creator audit trail — nodo_id already added in 026)
ALTER TABLE public.canales
  ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_canales_usuario_id ON public.canales(usuario_id);

-- 024: archivos.usuario_id (uploader alias — nullable, backfill from subido_por)
--       proyecto_id already exists, skip.
ALTER TABLE public.archivos
  ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL;
UPDATE public.archivos SET usuario_id = subido_por WHERE usuario_id IS NULL AND subido_por IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_archivos_usuario_id ON public.archivos(usuario_id);

-- 025: murales.usuario_id + proyecto_id
ALTER TABLE public.murales
  ADD COLUMN IF NOT EXISTS usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL;
ALTER TABLE public.murales
  ADD COLUMN IF NOT EXISTS proyecto_id UUID REFERENCES public.proyectos(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_murales_usuario_id  ON public.murales(usuario_id);
CREATE INDEX IF NOT EXISTS idx_murales_proyecto_id ON public.murales(proyecto_id);
