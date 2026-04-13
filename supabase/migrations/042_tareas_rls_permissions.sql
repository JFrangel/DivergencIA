-- Add RLS policies for tareas table to enforce project membership
-- Only project members and admins can create, update, or delete tasks

-- Enable RLS on tareas if not already enabled
ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;

-- Policy: Allow SELECT for authenticated users (they can see all tasks for now)
CREATE POLICY "anyone_can_read_tareas" ON public.tareas
  FOR SELECT
  USING (true);

-- Policy: Only project members and admins can INSERT tasks
CREATE POLICY "solo_miembros_crean_tareas" ON public.tareas
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      -- User is an active member of the project
      EXISTS (
        SELECT 1 FROM public.miembros_proyecto
        WHERE proyecto_id = tareas.proyecto_id
          AND usuario_id = auth.uid()
          AND activo = true
      )
      -- OR user is the project creator
      OR EXISTS (
        SELECT 1 FROM public.proyectos
        WHERE id = tareas.proyecto_id
          AND creador_id = auth.uid()
      )
      -- OR user is admin or directora
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE id = auth.uid()
          AND rol IN ('admin', 'directora')
      )
    )
  );

-- Policy: Only project members and admins can UPDATE tasks
CREATE POLICY "solo_miembros_editan_tareas" ON public.tareas
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- User is an active member of the project
      EXISTS (
        SELECT 1 FROM public.miembros_proyecto
        WHERE proyecto_id = tareas.proyecto_id
          AND usuario_id = auth.uid()
          AND activo = true
      )
      -- OR user is the project creator
      OR EXISTS (
        SELECT 1 FROM public.proyectos
        WHERE id = tareas.proyecto_id
          AND creador_id = auth.uid()
      )
      -- OR user is admin or directora
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE id = auth.uid()
          AND rol IN ('admin', 'directora')
      )
    )
  );

-- Policy: Only project members and admins can DELETE tasks
CREATE POLICY "solo_miembros_borran_tareas" ON public.tareas
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- User is an active member of the project
      EXISTS (
        SELECT 1 FROM public.miembros_proyecto
        WHERE proyecto_id = tareas.proyecto_id
          AND usuario_id = auth.uid()
          AND activo = true
      )
      -- OR user is the project creator
      OR EXISTS (
        SELECT 1 FROM public.proyectos
        WHERE id = tareas.proyecto_id
          AND creador_id = auth.uid()
      )
      -- OR user is admin or directora
      OR EXISTS (
        SELECT 1 FROM public.usuarios
        WHERE id = auth.uid()
          AND rol IN ('admin', 'directora')
      )
    )
  );
