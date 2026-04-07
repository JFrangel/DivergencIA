-- Migration 021: Add usuario_id (creator) FK to proyectos table
-- Purpose: Audit trail - know who created each project
-- Impact: Enables creator notifications, permission checks, project ownership tracking

ALTER TABLE proyectos
ADD COLUMN usuario_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT;

CREATE INDEX idx_proyectos_usuario_id ON proyectos(usuario_id);

COMMENT ON COLUMN proyectos.usuario_id IS 'ID of the user who created this project (creator/owner, auditing)';
