-- Add estado column to nodos table for approval workflow
-- NEW NODOS WILL REQUIRE ADMIN APPROVAL BEFORE BECOMING VISIBLE

ALTER TABLE nodos ADD COLUMN IF NOT EXISTS estado TEXT DEFAULT 'pendiente_aprobacion';

-- Add constraint for valid estados
ALTER TABLE nodos ADD CONSTRAINT nodos_estado_check
  CHECK (estado IN ('pendiente_aprobacion', 'activo', 'archivado'))
  NOT DEFERRABLE INITIALLY IMMEDIATE;

-- Index for filtering by estado
CREATE INDEX IF NOT EXISTS idx_nodos_estado ON nodos(estado);

-- RLS: Only show active nodos to regular members, but admins and creators can see pending
-- (RLS policy to be added in application code if needed)

-- Migrate existing nodos: set all current active nodos to 'activo' estado
UPDATE nodos SET estado = 'activo' WHERE activo = true AND estado = 'pendiente_aprobacion';
