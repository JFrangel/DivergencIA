-- Migration 041: add metricas column to proyectos
-- Stores project-level metrics (accuracy, progress, custom KPIs) as JSONB array
ALTER TABLE public.proyectos ADD COLUMN IF NOT EXISTS metricas jsonb DEFAULT '[]'::jsonb;
