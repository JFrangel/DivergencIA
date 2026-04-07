-- Migration 023: Add usuario_id (creator) and nodo_id (parent group) FKs to canales table
-- Purpose:
--   1. Track who created each channel
--   2. Link channels to their parent node/group for permission enforcement
-- Impact: Enables channel ownership tracking, permission model, creator notifications

ALTER TABLE canales
ADD COLUMN usuario_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
ADD COLUMN nodo_id UUID REFERENCES nodos(id) ON DELETE CASCADE;

CREATE INDEX idx_canales_usuario_id ON canales(usuario_id);
CREATE INDEX idx_canales_nodo_id ON canales(nodo_id);

COMMENT ON COLUMN canales.usuario_id IS 'ID of the user who created this channel (channel owner, auditing)';
COMMENT ON COLUMN canales.nodo_id IS 'ID of the parent node/group this channel belongs to';
