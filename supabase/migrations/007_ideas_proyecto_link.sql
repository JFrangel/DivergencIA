-- Migration 007: Vincular ideas a proyectos de origen
-- Permite rastrear qué idea originó un proyecto

ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS proyecto_origen_id UUID REFERENCES proyectos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ideas_proyecto_origen ON ideas(proyecto_origen_id);

COMMENT ON COLUMN ideas.proyecto_origen_id IS 'Proyecto que se originó a partir de esta idea (opcional)';
