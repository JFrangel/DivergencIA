-- ══════════════════════════════════════════════════════════════
-- Migration 040: RPC para notificar a todos los miembros
--                cuando se publica una nueva versión del changelog
-- Applied via MCP.
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.notify_all_changelog(
  p_novedad_id UUID,
  p_version    TEXT,
  p_titulo     TEXT
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, referencia_id, leida, fecha)
  SELECT
    id,
    'changelog',
    '🚀 Nueva versión ' || p_version,
    p_titulo,
    p_novedad_id,
    false,
    NOW()
  FROM public.usuarios
  WHERE rol IS DISTINCT FROM 'invitado'
  ON CONFLICT DO NOTHING;
END;
$$;
