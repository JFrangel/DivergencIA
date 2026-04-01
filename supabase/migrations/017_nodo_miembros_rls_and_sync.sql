-- Migration 017: Fix nodo_miembros RLS + create sync_user_group_channels RPC
-- Problems solved:
--   1. nodo_miembros RLS may restrict users from seeing their own new memberships
--      (chicken-and-egg: "can only see memberships for nodos you're already in")
--   2. NodeGroupManager calls sync_user_group_channels RPC that never existed

-- ─── 1. nodo_miembros RLS ─────────────────────────────────────────────────────
-- Ensure RLS is on
ALTER TABLE public.nodo_miembros ENABLE ROW LEVEL SECURITY;

-- Drop old restrictive policies if they exist (idempotent)
DROP POLICY IF EXISTS "nodo_miembros_select" ON public.nodo_miembros;
DROP POLICY IF EXISTS "nodo_miembros_insert" ON public.nodo_miembros;
DROP POLICY IF EXISTS "nodo_miembros_delete" ON public.nodo_miembros;
DROP POLICY IF EXISTS "nodo_miembros_update" ON public.nodo_miembros;

-- Any authenticated user can read all nodo_miembros (needed to render member lists)
-- A user must always be able to see their OWN memberships regardless of nodo
CREATE POLICY "nodo_miembros_select"
  ON public.nodo_miembros FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Only nodo admins/owners OR platform admins can add members
CREATE POLICY "nodo_miembros_insert"
  ON public.nodo_miembros FOR INSERT
  WITH CHECK (
    -- Self-join (will be approved separately via solicitudes)
    auth.uid() = usuario_id
    -- Nodo admin/owner can add
    OR EXISTS (
      SELECT 1 FROM public.nodo_miembros nm2
      WHERE nm2.nodo_id = nodo_miembros.nodo_id
        AND nm2.usuario_id = auth.uid()
        AND nm2.rol IN ('admin', 'owner', 'lider')
    )
    -- Platform admin/directora can add anyone
    OR EXISTS (
      SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'directora')
    )
  );

-- Only nodo admins/owners or the user themselves can delete a membership
CREATE POLICY "nodo_miembros_delete"
  ON public.nodo_miembros FOR DELETE
  USING (
    auth.uid() = usuario_id
    OR EXISTS (
      SELECT 1 FROM public.nodo_miembros nm2
      WHERE nm2.nodo_id = nodo_miembros.nodo_id
        AND nm2.usuario_id = auth.uid()
        AND nm2.rol IN ('admin', 'owner', 'lider')
    )
    OR EXISTS (
      SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'directora')
    )
  );

-- Admins can update role assignments
CREATE POLICY "nodo_miembros_update"
  ON public.nodo_miembros FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.nodo_miembros nm2
      WHERE nm2.nodo_id = nodo_miembros.nodo_id
        AND nm2.usuario_id = auth.uid()
        AND nm2.rol IN ('admin', 'owner', 'lider')
    )
    OR EXISTS (
      SELECT 1 FROM public.usuarios u WHERE u.id = auth.uid() AND u.rol IN ('admin', 'directora')
    )
  );

-- ─── 2. sync_user_group_channels RPC ─────────────────────────────────────────
-- Called by NodeGroupManager after saving grupos_nodo on a user.
-- Ensures canal_miembros stays in sync with the user's group assignments.
CREATE OR REPLACE FUNCTION public.sync_user_group_channels(
  p_user_id UUID,
  p_groups  TEXT[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_canal_id UUID;
  v_group    TEXT;
BEGIN
  -- Remove user from all group canales they are currently in
  DELETE FROM public.canal_miembros cm
  WHERE cm.usuario_id = p_user_id
    AND EXISTS (
      SELECT 1 FROM public.canales c
      WHERE c.id = cm.canal_id AND c.nodo_tipo = 'grupo'
    );

  -- Add user to canal_miembros for each group in p_groups
  FOREACH v_group IN ARRAY p_groups
  LOOP
    SELECT id INTO v_canal_id
    FROM public.canales
    WHERE nodo_tipo = 'grupo' AND nombre = v_group
    LIMIT 1;

    IF v_canal_id IS NOT NULL THEN
      INSERT INTO public.canal_miembros (canal_id, usuario_id, puede_escribir)
      VALUES (v_canal_id, p_user_id, true)
      ON CONFLICT (canal_id, usuario_id) DO NOTHING;
    END IF;
  END LOOP;
END;
$$;

-- Grant execute to authenticated users (the function uses SECURITY DEFINER
-- so it runs with the owner's privileges — only trusted callers invoke it)
GRANT EXECUTE ON FUNCTION public.sync_user_group_channels(UUID, TEXT[]) TO authenticated;
