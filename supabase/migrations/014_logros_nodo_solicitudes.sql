-- Migration 014: logros_usuario table + nodo_solicitudes table
-- Apply in Supabase Dashboard → SQL Editor

-- ─── 1. logros_usuario — achievement progress per user ─────────────────────
CREATE TABLE IF NOT EXISTS public.logros_usuario (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  logro_id        TEXT NOT NULL,
  fecha_obtenido  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  progreso        INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT logros_usuario_unique UNIQUE (usuario_id, logro_id)
);

ALTER TABLE public.logros_usuario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "logros_usuario_select" ON public.logros_usuario
  FOR SELECT USING (auth.uid() = usuario_id);

CREATE POLICY "logros_usuario_insert" ON public.logros_usuario
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "logros_usuario_update" ON public.logros_usuario
  FOR UPDATE USING (auth.uid() = usuario_id);

-- ─── 2. nodo_solicitudes — join requests for research nodes ────────────────
CREATE TABLE IF NOT EXISTS public.nodo_solicitudes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nodo_id         UUID NOT NULL REFERENCES public.nodos(id) ON DELETE CASCADE,
  usuario_id      UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  estado          TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobada','rechazada')),
  mensaje         TEXT,
  respondido_por  UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT nodo_solicitudes_unique UNIQUE (nodo_id, usuario_id)
);

ALTER TABLE public.nodo_solicitudes ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests + nodo admins/owners can see requests for their nodos
CREATE POLICY "nodo_solicitudes_select" ON public.nodo_solicitudes
  FOR SELECT USING (
    auth.uid() = usuario_id
    OR EXISTS (
      SELECT 1 FROM public.nodo_miembros nm
      WHERE nm.nodo_id = nodo_solicitudes.nodo_id
        AND nm.usuario_id = auth.uid()
        AND nm.rol IN ('admin', 'owner')
    )
    OR EXISTS (
      SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'directora')
    )
  );

CREATE POLICY "nodo_solicitudes_insert" ON public.nodo_solicitudes
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "nodo_solicitudes_update" ON public.nodo_solicitudes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.nodo_miembros nm
      WHERE nm.nodo_id = nodo_solicitudes.nodo_id
        AND nm.usuario_id = auth.uid()
        AND nm.rol IN ('admin', 'owner')
    )
    OR EXISTS (
      SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'directora')
    )
  );

-- ─── 3. Ensure eventos.estado exists and has a default ────────────────────
ALTER TABLE public.eventos
  ADD COLUMN IF NOT EXISTS estado TEXT NOT NULL DEFAULT 'programado';

-- If the column already exists without a default, set it
DO $$ BEGIN
  ALTER TABLE public.eventos ALTER COLUMN estado SET DEFAULT 'programado';
EXCEPTION WHEN others THEN NULL;
END $$;

-- ─── 4. Ensure ideas.estado has a default ──────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.ideas ALTER COLUMN estado SET DEFAULT 'votacion';
EXCEPTION WHEN others THEN NULL;
END $$;
