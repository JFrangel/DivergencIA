-- Add usuario_id (organizer) to eventos table
ALTER TABLE eventos
ADD COLUMN usuario_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT;

-- Create index for performance
CREATE INDEX idx_eventos_usuario_id ON eventos(usuario_id);

-- Add comment for clarity
COMMENT ON COLUMN eventos.usuario_id IS 'ID of the user who created/organized this event (auditing, permissions, notifications)';
