-- Migration 028: Fix nodos RLS policies to include 'directora' role
-- Applied directly to Supabase via MCP in a previous session.
-- This file exists for documentation/repo consistency only.
-- Previously only 'admin' role could see pending nodos in AdminPanel;
-- 'directora' role was excluded from the policy.

DROP POLICY IF EXISTS "Admins can see all nodos" ON public.nodos;

CREATE POLICY "Admins and directoras can see all nodos"
  ON public.nodos FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM public.usuarios WHERE rol IN ('admin', 'directora')
    )
    OR estado = 'activo'
    OR creado_por = auth.uid()
  );
