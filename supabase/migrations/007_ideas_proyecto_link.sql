-- Migration 007: Vincular ideas a proyectos
-- Permite asociar una idea al proyecto al que pertenece o que la originó
-- NOTA: el campo en BD se llama proyecto_id (ya existe como FK a proyectos.id)

ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS proyecto_id UUID REFERENCES proyectos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ideas_proyecto ON ideas(proyecto_id);

COMMENT ON COLUMN ideas.proyecto_id IS 'Proyecto al que está vinculada esta idea (opcional)';
