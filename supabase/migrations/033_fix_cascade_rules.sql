-- Migration 033: Fix cascade rules on FK constraints
-- Applied via MCP. Ensures deletes propagate correctly and don't leave orphans.

-- mensajes.archivo_id: SET NULL when file deleted (message still shows, file ref nulled)
ALTER TABLE public.mensajes
  DROP CONSTRAINT IF EXISTS mensajes_archivo_id_fkey;
ALTER TABLE public.mensajes
  ADD CONSTRAINT mensajes_archivo_id_fkey
    FOREIGN KEY (archivo_id) REFERENCES public.archivos(id) ON DELETE SET NULL;

-- comentarios: cascade when parent idea/avance/proyecto deleted
ALTER TABLE public.comentarios
  DROP CONSTRAINT IF EXISTS comentarios_avance_id_fkey;
ALTER TABLE public.comentarios
  ADD CONSTRAINT comentarios_avance_id_fkey
    FOREIGN KEY (avance_id) REFERENCES public.avances(id) ON DELETE CASCADE;

ALTER TABLE public.comentarios
  DROP CONSTRAINT IF EXISTS comentarios_idea_id_fkey;
ALTER TABLE public.comentarios
  ADD CONSTRAINT comentarios_idea_id_fkey
    FOREIGN KEY (idea_id) REFERENCES public.ideas(id) ON DELETE CASCADE;

ALTER TABLE public.comentarios
  DROP CONSTRAINT IF EXISTS comentarios_proyecto_id_fkey;
ALTER TABLE public.comentarios
  ADD CONSTRAINT comentarios_proyecto_id_fkey
    FOREIGN KEY (proyecto_id) REFERENCES public.proyectos(id) ON DELETE CASCADE;
