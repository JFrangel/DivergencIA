-- Migration 026: Add FK constraint canales.nodo_id → nodos(id)
-- Applied directly to Supabase via MCP in a previous session.
-- This file exists for documentation/repo consistency only.
-- 5 orphaned canales (nodo_id pointing to deleted nodos) were NULLed
-- before adding the constraint.

UPDATE public.canales
SET nodo_id = NULL
WHERE nodo_id IS NOT NULL
  AND nodo_id NOT IN (SELECT id FROM public.nodos);

ALTER TABLE public.canales
  ADD CONSTRAINT canales_nodo_id_fkey
  FOREIGN KEY (nodo_id) REFERENCES public.nodos(id) ON DELETE SET NULL;
