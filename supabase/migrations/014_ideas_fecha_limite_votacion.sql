-- Migration 014: Add missing columns to ideas and votos_ideas
-- fecha_limite_votacion was referenced in frontend code but never added to the DB

ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS fecha_limite_votacion TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN ideas.fecha_limite_votacion IS 'Fecha límite para votar en esta idea. NULL = sin límite.';

CREATE INDEX IF NOT EXISTS idx_ideas_fecha_limite ON ideas(fecha_limite_votacion)
  WHERE fecha_limite_votacion IS NOT NULL;

-- votos_ideas was missing created_at (used in getVoteDetails ORDER BY created_at)
ALTER TABLE votos_ideas
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
