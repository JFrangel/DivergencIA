-- Migration 022: Add usuario_id (founder) FK to nodos table
-- Purpose: Audit trail - know who founded/created each node/group
-- Impact: Enables founder notifications, node ownership tracking, permission checks

ALTER TABLE nodos
ADD COLUMN usuario_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT;

CREATE INDEX idx_nodos_usuario_id ON nodos(usuario_id);

COMMENT ON COLUMN nodos.usuario_id IS 'ID of the user who created/founded this node (founder, auditing)';
