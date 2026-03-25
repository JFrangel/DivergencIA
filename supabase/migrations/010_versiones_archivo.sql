-- Version history for library files
CREATE TABLE IF NOT EXISTS versiones_archivo (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archivo_id    UUID NOT NULL REFERENCES archivos(id) ON DELETE CASCADE,
  version       INTEGER NOT NULL DEFAULT 1,
  url           TEXT NOT NULL,
  tamanio_bytes BIGINT,
  nota          TEXT,
  autor_id      UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_versiones_archivo ON versiones_archivo(archivo_id, version DESC);

-- RLS
ALTER TABLE versiones_archivo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "versiones_visible_miembros" ON versiones_archivo
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND activo = true)
  );

CREATE POLICY "versiones_insert_autenticado" ON versiones_archivo
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
