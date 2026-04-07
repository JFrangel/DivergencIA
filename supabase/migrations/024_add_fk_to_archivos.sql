-- Migration 024: Add usuario_id (uploader) and optional proyecto_id (owner project) FKs to archivos table
-- Purpose:
--   1. Track who uploaded each file (creator auditing)
--   2. Optional: Link file to owning project for organizational context
-- Impact: Enables file ownership tracking, permission checks, file author notifications

ALTER TABLE archivos
ADD COLUMN usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
ADD COLUMN proyecto_id UUID REFERENCES proyectos(id) ON DELETE SET NULL;

CREATE INDEX idx_archivos_usuario_id ON archivos(usuario_id);
CREATE INDEX idx_archivos_proyecto_id ON archivos(proyecto_id);

COMMENT ON COLUMN archivos.usuario_id IS 'ID of the user who uploaded this file (uploader, auditing)';
COMMENT ON COLUMN archivos.proyecto_id IS 'Optional: Project that owns/organizes this file';
