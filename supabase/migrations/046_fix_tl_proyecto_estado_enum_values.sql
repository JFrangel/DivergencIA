-- Migration 046: Fix tl_on_proyecto_estado trigger using invalid enum values
-- Bug: trigger checked NEW.estado IN ('completado','pausado') but those values
-- don't exist in the estado_proyecto enum. Valid values are 'finalizado' and 'pausa'.
-- This caused every UPDATE on proyectos to fail with:
--   22P02: invalid input value for enum estado_proyecto: "completado"

CREATE OR REPLACE FUNCTION public.tl_on_proyecto_estado()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado AND NEW.estado IN ('finalizado', 'pausa') THEN
    PERFORM public.tl_insert(
      'proyecto_estado',
      'Proyecto ' || NEW.estado || ': ' || NEW.titulo,
      NULL, '📋', NEW.id, 'proyectos',
      NEW.creador_id, NEW.id, NULL,
      jsonb_build_object('estado_anterior', OLD.estado, 'estado_nuevo', NEW.estado)
    );
  END IF;
  RETURN NEW;
END;
$$;
