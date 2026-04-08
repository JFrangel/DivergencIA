-- 1. Add DELETE policy to versiones_archivo (was blocking file deletion)
DROP POLICY IF EXISTS versiones_delete ON public.versiones_archivo;
CREATE POLICY versiones_delete ON public.versiones_archivo
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.archivos a
      WHERE a.id = versiones_archivo.archivo_id
        AND a.subido_por = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid()
        AND u.rol IN ('admin', 'directora')
    )
  );

-- 2. Add UPDATE policy to versiones_archivo (defensive)
DROP POLICY IF EXISTS versiones_update ON public.versiones_archivo;
CREATE POLICY versiones_update ON public.versiones_archivo
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid()
        AND u.rol IN ('admin', 'directora')
    )
  );

-- 3. Add storage DELETE policy for archivos bucket
DROP POLICY IF EXISTS archivos_auth_delete ON storage.objects;
CREATE POLICY archivos_auth_delete ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'archivos'
    AND auth.role() = 'authenticated'
  );

-- 4. Fix archivos_update WITH CHECK explicitly
DROP POLICY IF EXISTS archivos_update ON public.archivos;
CREATE POLICY archivos_update ON public.archivos
  FOR UPDATE
  USING (
    subido_por = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid() AND rol IN ('admin', 'directora')
    )
  )
  WITH CHECK (
    subido_por = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE id = auth.uid() AND rol IN ('admin', 'directora')
    )
  );
