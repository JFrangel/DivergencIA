-- Add usuario_id (creator) to ideas table
ALTER TABLE ideas
ADD COLUMN usuario_id UUID REFERENCES usuarios(id) ON DELETE RESTRICT;

-- Create index for performance
CREATE INDEX idx_ideas_usuario_id ON ideas(usuario_id);

-- Add comment for clarity
COMMENT ON COLUMN ideas.usuario_id IS 'ID of the user who created this idea (auditing, permissions, notifications)';
