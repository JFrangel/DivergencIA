-- Migration 025: Add usuario_id (creator) and optional proyecto_id (parent project) FKs to murales table
-- Purpose:
--   1. Track who created each mural/whiteboard
--   2. Optional: Link mural to parent project
-- Impact: Enables mural ownership tracking, creator notifications, permission checks

ALTER TABLE murales
ADD COLUMN usuario_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
ADD COLUMN proyecto_id UUID REFERENCES proyectos(id) ON DELETE SET NULL;

CREATE INDEX idx_murales_usuario_id ON murales(usuario_id);
CREATE INDEX idx_murales_proyecto_id ON murales(proyecto_id);

COMMENT ON COLUMN murales.usuario_id IS 'ID of the user who created this mural (creator, auditing)';
COMMENT ON COLUMN murales.proyecto_id IS 'Optional: Project this mural belongs to';
