-- Migration 045: Fix proyectos RLS to include directora role
-- Bug: proyectos_update only allowed 'admin', not 'directora'
-- Frontend defines isAdmin = rol IN ('admin','directora') so both roles need DB access

-- Fix UPDATE: allow creador OR admin/directora
DROP POLICY IF EXISTS "proyectos_update" ON public.proyectos;
CREATE POLICY "proyectos_update" ON public.proyectos
  FOR UPDATE
  USING (
    (creador_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.rol IN ('admin', 'directora')
    )
  );

-- Fix DELETE: allow creador OR admin/directora (previously only admin)
DROP POLICY IF EXISTS "proyectos_delete" ON public.proyectos;
CREATE POLICY "proyectos_delete" ON public.proyectos
  FOR DELETE
  USING (
    (creador_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.rol IN ('admin', 'directora')
    )
  );
