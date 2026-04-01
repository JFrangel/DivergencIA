-- Migration 016: Enable realtime + REPLICA IDENTITY FULL for key tables
-- Required for postgres_changes subscriptions to deliver full row data
-- on UPDATE and DELETE events.

-- Notifications need full row data for UPDATE (mark-read) and DELETE
ALTER TABLE public.notificaciones REPLICA IDENTITY FULL;

-- Nodos & memberships need full row data for realtime sync
ALTER TABLE public.nodos REPLICA IDENTITY FULL;
ALTER TABLE public.nodo_miembros REPLICA IDENTITY FULL;

-- Canal members (for chat/realtime presence)
ALTER TABLE public.canal_miembros REPLICA IDENTITY FULL;

-- Add tables to supabase_realtime publication (idempotent)
DO $$
BEGIN
  -- notificaciones
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'notificaciones'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notificaciones;
  END IF;

  -- nodos
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'nodos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.nodos;
  END IF;

  -- nodo_miembros
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'nodo_miembros'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.nodo_miembros;
  END IF;

  -- nodo_solicitudes
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'nodo_solicitudes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.nodo_solicitudes;
  END IF;
END $$;
