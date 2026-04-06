-- Migration 018: Disk IO Optimization
-- Fixes high Disk IO caused by:
--   1. REPLICA IDENTITY FULL on high-traffic tables (bloats WAL on every UPDATE)
--   2. Missing indexes causing full table scans
--   3. No cleanup of old notifications accumulating on disk

-- ─── 1. Revert REPLICA IDENTITY FULL → DEFAULT on tables that don't need it ──
-- FULL writes the entire old row to WAL on every UPDATE.
-- For notificaciones: mark-as-read fires dozens of UPDATEs → massive WAL IO.
-- We only need REPLICA IDENTITY DEFAULT (primary key in old record is enough).

ALTER TABLE public.notificaciones  REPLICA IDENTITY DEFAULT;
ALTER TABLE public.nodos           REPLICA IDENTITY DEFAULT;
ALTER TABLE public.nodo_miembros   REPLICA IDENTITY DEFAULT;
ALTER TABLE public.canal_miembros  REPLICA IDENTITY DEFAULT;

-- solicitudes_proyecto and nodo_solicitudes: keep DEFAULT too
ALTER TABLE public.solicitudes_proyecto REPLICA IDENTITY DEFAULT;
ALTER TABLE public.nodo_solicitudes     REPLICA IDENTITY DEFAULT;

-- ─── 2. Indexes on notificaciones ────────────────────────────────────────────
-- Most queried table: fetched per user, filtered by leida, ordered by fecha

CREATE INDEX IF NOT EXISTS idx_notif_user_fecha
  ON public.notificaciones (usuario_id, fecha DESC);

CREATE INDEX IF NOT EXISTS idx_notif_user_leida
  ON public.notificaciones (usuario_id, leida)
  WHERE leida = false;  -- partial index: only unread rows

-- ─── 3. Indexes on nodo_miembros ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_nodo_miembros_usuario
  ON public.nodo_miembros (usuario_id);

CREATE INDEX IF NOT EXISTS idx_nodo_miembros_nodo
  ON public.nodo_miembros (nodo_id);

-- ─── 4. Indexes on canal_miembros ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_canal_miembros_usuario
  ON public.canal_miembros (usuario_id);

CREATE INDEX IF NOT EXISTS idx_canal_miembros_canal
  ON public.canal_miembros (canal_id);

-- ─── 5. Indexes on mensajes (chat) ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mensajes_canal_fecha
  ON public.mensajes (canal_id, created_at DESC);

-- ─── 6. Indexes on eventos ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_eventos_fecha
  ON public.eventos (fecha);

CREATE INDEX IF NOT EXISTS idx_eventos_creador
  ON public.eventos (creado_por);

-- ─── 7. Indexes on logros_usuario ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_logros_usuario
  ON public.logros_usuario (usuario_id);

-- ─── 8. Indexes on solicitudes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_solicitudes_proyecto_usuario
  ON public.solicitudes_proyecto (usuario_id);

CREATE INDEX IF NOT EXISTS idx_solicitudes_proyecto_proyecto
  ON public.solicitudes_proyecto (proyecto_id, estado);

CREATE INDEX IF NOT EXISTS idx_nodo_solicitudes_usuario
  ON public.nodo_solicitudes (usuario_id);

-- ─── 9. Auto-cleanup old read notifications ──────────────────────────────────
-- Prevents the notificaciones table from growing unbounded.
-- Deletes notifications that are read AND older than 60 days.

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.notificaciones
  WHERE leida = true
    AND fecha < NOW() - INTERVAL '60 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Schedule via pg_cron if available (Supabase Pro has it).
-- If not available, this function can be called manually or via a webhook.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-old-notifications',
      '0 3 * * *',   -- 3am every day
      'SELECT public.cleanup_old_notifications()'
    );
  END IF;
END $$;
