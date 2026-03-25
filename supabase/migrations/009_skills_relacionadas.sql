-- Add skills_relacionadas to learning topics
-- When a user completes a topic, these skills are auto-added to their profile
ALTER TABLE temas_aprendizaje
  ADD COLUMN IF NOT EXISTS skills_relacionadas TEXT[] DEFAULT '{}';

COMMENT ON COLUMN temas_aprendizaje.skills_relacionadas IS
  'Skills that are automatically added to the user profile upon topic completion';
