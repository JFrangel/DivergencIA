-- Migration 029: Add titulo column to notificaciones
-- Without this column, ALL notification inserts that include `titulo`
-- fail silently (.catch(() => {})), meaning users never receive:
--   - Nodo join request alerts
--   - Approval/rejection results
--   - Project join request alerts
--   - New event / new idea notifications
ALTER TABLE public.notificaciones ADD COLUMN IF NOT EXISTS titulo TEXT;
