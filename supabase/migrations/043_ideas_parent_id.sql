-- Add parent_id column to ideas table for idea hierarchy/derivation
ALTER TABLE public.ideas ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.ideas(id) ON DELETE SET NULL;

-- Create index for efficient parent-child queries
CREATE INDEX IF NOT EXISTS idx_ideas_parent_id ON public.ideas(parent_id);

-- Create index for efficient child queries
CREATE INDEX IF NOT EXISTS idx_ideas_parent_proyecto ON public.ideas(parent_id, proyecto_id);
