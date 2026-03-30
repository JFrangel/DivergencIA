-- Migration 011: Privacy & preferences columns for usuarios table
-- Used by Settings.jsx (Privacy tab) and ATHENIA memory toggle

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS perfil_privado      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mostrar_correo      BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS mostrar_actividad   BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS mostrar_en_grafo    BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS athenia_memory      BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.usuarios.perfil_privado    IS 'Si TRUE el perfil no es visible para visitantes';
COMMENT ON COLUMN public.usuarios.mostrar_correo    IS 'Si TRUE el correo aparece en el perfil público';
COMMENT ON COLUMN public.usuarios.mostrar_actividad IS 'Si FALSE se oculta el calendario de actividad';
COMMENT ON COLUMN public.usuarios.mostrar_en_grafo  IS 'Si FALSE el nodo no aparece en el Universo/grafo';
COMMENT ON COLUMN public.usuarios.athenia_memory    IS 'Si FALSE ATHENIA no retiene el historial de conversaciones';
