-- Migration 016b: Project join requests
-- Members can request to join a project; project owners/admins can approve or reject

CREATE TABLE IF NOT EXISTS public.solicitudes_proyecto (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proyecto_id   UUID NOT NULL REFERENCES public.proyectos(id) ON DELETE CASCADE,
  usuario_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mensaje       TEXT,
  estado        TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aprobada','rechazada')),
  respondida_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (proyecto_id, usuario_id)
);

ALTER TABLE public.solicitudes_proyecto ENABLE ROW LEVEL SECURITY;

-- Anyone can see their own requests
CREATE POLICY "sp_ver_propias" ON public.solicitudes_proyecto
  FOR SELECT USING (auth.uid() = usuario_id);

-- Project owners/admins can see all requests for their projects
CREATE POLICY "sp_ver_como_lider" ON public.solicitudes_proyecto
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.miembros_proyecto mp
      WHERE mp.proyecto_id = solicitudes_proyecto.proyecto_id
        AND mp.usuario_id = auth.uid()
        AND mp.rol_equipo IN ('lider', 'admin')
        AND mp.activo = true
    )
  );

-- Platform admins/directors can see all
CREATE POLICY "sp_admin_all" ON public.solicitudes_proyecto
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol IN ('admin','directora'))
  );

-- Authenticated users can insert their own request
CREATE POLICY "sp_insert_propia" ON public.solicitudes_proyecto
  FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- Project leaders and admins can update (approve/reject)
CREATE POLICY "sp_update_lider" ON public.solicitudes_proyecto
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.miembros_proyecto mp
      WHERE mp.proyecto_id = solicitudes_proyecto.proyecto_id
        AND mp.usuario_id = auth.uid()
        AND mp.rol_equipo IN ('lider', 'admin')
        AND mp.activo = true
    )
    OR EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND rol IN ('admin','directora'))
  );

-- Add to realtime publication
ALTER TABLE public.solicitudes_proyecto REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'solicitudes_proyecto'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.solicitudes_proyecto;
  END IF;
END $$;
