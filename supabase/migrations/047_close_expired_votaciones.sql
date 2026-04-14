-- Migration 047: Auto-close expired idea votaciones
-- When fecha_limite_votacion passes:
--   votos_favor > votos_contra  → estado = 'aprobada'
--   otherwise                   → estado = 'descartada'
-- Notifies the idea author of the result.

CREATE OR REPLACE FUNCTION public.close_expired_idea_votaciones()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rec        RECORD;
  new_estado TEXT;
  closed     integer := 0;
BEGIN
  FOR rec IN
    SELECT id, titulo, autor_id, votos_favor, votos_contra
    FROM public.ideas
    WHERE estado = 'votacion'
      AND fecha_limite_votacion IS NOT NULL
      AND fecha_limite_votacion < NOW()
  LOOP
    -- Determine result
    IF (rec.votos_favor IS NOT NULL AND rec.votos_contra IS NOT NULL
        AND rec.votos_favor > rec.votos_contra) THEN
      new_estado := 'aprobada';
    ELSE
      new_estado := 'descartada';
    END IF;

    -- Update idea estado
    UPDATE public.ideas
    SET estado = new_estado
    WHERE id = rec.id;

    -- Notify the author
    IF rec.autor_id IS NOT NULL THEN
      INSERT INTO public.notificaciones (usuario_id, tipo, titulo, mensaje, referencia_id, leida, fecha)
      VALUES (
        rec.autor_id,
        CASE new_estado WHEN 'aprobada' THEN 'idea_nueva' ELSE 'solicitudes' END,
        CASE new_estado
          WHEN 'aprobada' THEN '✅ Tu idea fue aprobada'
          ELSE '❌ Tu idea no fue aprobada'
        END,
        CASE new_estado
          WHEN 'aprobada' THEN 'La votación de "' || rec.titulo || '" cerró con resultado positivo.'
          ELSE 'La votación de "' || rec.titulo || '" cerró sin mayoría a favor.'
        END,
        rec.id,
        false,
        NOW()
      );
    END IF;

    closed := closed + 1;
  END LOOP;

  RETURN closed;
END;
$$;

GRANT EXECUTE ON FUNCTION public.close_expired_idea_votaciones() TO authenticated;
GRANT EXECUTE ON FUNCTION public.close_expired_idea_votaciones() TO service_role;

-- Schedule via pg_cron if available (runs every 30 minutes)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'close-expired-votaciones',
      '*/30 * * * *',
      'SELECT public.close_expired_idea_votaciones()'
    );
  END IF;
END $$;
