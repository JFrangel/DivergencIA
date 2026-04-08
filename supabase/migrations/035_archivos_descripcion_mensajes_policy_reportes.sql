-- 1. Añadir descripcion a archivos (faltaba → UPDATE fallaba)
ALTER TABLE public.archivos ADD COLUMN IF NOT EXISTS descripcion TEXT;

-- 2. Fix mensajes DELETE policy: incluir directora además de admin
DROP POLICY IF EXISTS mensajes_delete ON public.mensajes;
CREATE POLICY mensajes_delete ON public.mensajes
  FOR DELETE
  USING (
    autor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid()
        AND u.rol IN ('admin', 'directora')
    )
  );

-- 3. Crear tabla reportes si no existe
CREATE TABLE IF NOT EXISTS public.reportes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_contenido TEXT NOT NULL,
  contenido_id  UUID,
  contenido_texto TEXT,
  razon         TEXT NOT NULL,
  reportado_por UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  estado        TEXT NOT NULL DEFAULT 'pendiente',
  notas_admin   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reportes ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS reportes_insert ON public.reportes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY IF NOT EXISTS reportes_select ON public.reportes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol IN ('admin', 'directora')
    )
  );

CREATE POLICY IF NOT EXISTS reportes_update ON public.reportes
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol IN ('admin', 'directora')
    )
  );

CREATE POLICY IF NOT EXISTS reportes_delete ON public.reportes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = auth.uid() AND u.rol IN ('admin', 'directora')
    )
  );

CREATE INDEX IF NOT EXISTS idx_reportes_estado ON public.reportes(estado);
CREATE INDEX IF NOT EXISTS idx_reportes_reportado_por ON public.reportes(reportado_por);
