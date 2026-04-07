-- Migration 027: Activate all pending_approval nodos
-- Applied directly to Supabase via MCP in a previous session.
-- This file exists for documentation/repo consistency only.
-- All research nodes were stuck in 'pendiente_aprobacion' state and
-- not showing in the Nodos page for non-admin users.

UPDATE public.nodos
SET estado = 'activo'
WHERE estado = 'pendiente_aprobacion';
