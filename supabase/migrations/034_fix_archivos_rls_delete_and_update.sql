-- Fix archivos RLS: add DELETE policy + fix UPDATE to allow admins/directora

-- 1. Add DELETE policy (uploader can delete their own, admins/directora can delete any)
CREATE POLICY archivos_delete ON public.archivos
  FOR DELETE
  USING (
    subido_por = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid() AND rol IN ('admin', 'directora')
    )
  );

-- 2. Fix UPDATE policy to also allow admins/directora (current policy only allows uploader)
DROP POLICY IF EXISTS archivos_update ON public.archivos;

CREATE POLICY archivos_update ON public.archivos
  FOR UPDATE
  USING (
    subido_por = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid() AND rol IN ('admin', 'directora')
    )
  );
