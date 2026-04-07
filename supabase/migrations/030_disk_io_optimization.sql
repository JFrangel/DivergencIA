-- Migration 030: Disk IO Optimization
-- Reverts REPLICA IDENTITY FULL set by migration 016.
-- FULL writes the entire row to WAL on every UPDATE — extremely expensive
-- for high-traffic tables like notificaciones (mark-as-read) and mensajes.
-- DEFAULT uses only the primary key, which is sufficient for realtime
-- subscriptions (INSERT/UPDATE/DELETE events still fire correctly).

ALTER TABLE public.notificaciones REPLICA IDENTITY DEFAULT;
ALTER TABLE public.mensajes        REPLICA IDENTITY DEFAULT;
ALTER TABLE public.nodo_miembros   REPLICA IDENTITY DEFAULT;
ALTER TABLE public.canal_miembros  REPLICA IDENTITY DEFAULT;
ALTER TABLE public.nodos           REPLICA IDENTITY DEFAULT;

-- Missing indexes for frequent queries that currently do full table scans
CREATE INDEX IF NOT EXISTS idx_notif_usuario_leida   ON public.notificaciones(usuario_id, leida);
CREATE INDEX IF NOT EXISTS idx_notif_fecha           ON public.notificaciones(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_nodo_miembros_usuario ON public.nodo_miembros(usuario_id);
CREATE INDEX IF NOT EXISTS idx_eventos_fecha         ON public.eventos(fecha);
CREATE INDEX IF NOT EXISTS idx_solicitudes_proy_est  ON public.solicitudes_proyecto(proyecto_id, estado);
CREATE INDEX IF NOT EXISTS idx_nodo_solic_estado     ON public.nodo_solicitudes(nodo_id, estado);
