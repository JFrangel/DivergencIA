-- ══════════════════════════════════════════════════════════════
-- Migration 038: Timeline de actividad del semillero
-- Applied via MCP. Triggers auto-insert entries for:
--   proyectos (INSERT + estado UPDATE), avances (INSERT),
--   ideas (estado → 'aprobada'), eventos (INSERT),
--   nodos (estado → 'activo'), archivos (INSERT)
-- ══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.timeline_eventos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo             TEXT NOT NULL,
  titulo           TEXT NOT NULL,
  descripcion      TEXT,
  icono            TEXT,
  referencia_id    UUID,
  referencia_tabla TEXT,
  usuario_id       UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  proyecto_id      UUID REFERENCES public.proyectos(id) ON DELETE CASCADE,
  nodo_id          UUID REFERENCES public.nodos(id) ON DELETE SET NULL,
  metadata         JSONB DEFAULT '{}',
  es_publico       BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_created_at  ON public.timeline_eventos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeline_tipo         ON public.timeline_eventos(tipo);
CREATE INDEX IF NOT EXISTS idx_timeline_usuario_id   ON public.timeline_eventos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_timeline_proyecto_id  ON public.timeline_eventos(proyecto_id);

ALTER TABLE public.timeline_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY timeline_select ON public.timeline_eventos
  FOR SELECT USING (es_publico = true AND auth.uid() IS NOT NULL);

CREATE POLICY timeline_insert ON public.timeline_eventos
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Helper (SECURITY DEFINER bypasses RLS so triggers can insert)
CREATE OR REPLACE FUNCTION public.tl_insert(
  p_tipo TEXT, p_titulo TEXT, p_descripcion TEXT,
  p_icono TEXT, p_ref_id UUID, p_ref_tabla TEXT,
  p_usuario_id UUID, p_proyecto_id UUID, p_nodo_id UUID,
  p_metadata JSONB
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.timeline_eventos(
    tipo, titulo, descripcion, icono,
    referencia_id, referencia_tabla,
    usuario_id, proyecto_id, nodo_id, metadata
  ) VALUES (
    p_tipo, p_titulo, p_descripcion, p_icono,
    p_ref_id, p_ref_tabla,
    p_usuario_id, p_proyecto_id, p_nodo_id, p_metadata
  );
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;

-- Proyecto nuevo
CREATE OR REPLACE FUNCTION public.tl_on_proyecto_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.tl_insert(
    'proyecto_nuevo', 'Nuevo proyecto: ' || NEW.titulo,
    SUBSTRING(COALESCE(NEW.descripcion,'') FROM 1 FOR 160),
    '🔬', NEW.id, 'proyectos', NEW.creador_id, NEW.id, NULL,
    jsonb_build_object('area', NEW.area, 'estado', NEW.estado)
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS tl_proyecto_insert ON public.proyectos;
CREATE TRIGGER tl_proyecto_insert AFTER INSERT ON public.proyectos FOR EACH ROW EXECUTE FUNCTION public.tl_on_proyecto_insert();

-- Proyecto estado → completado/pausado
CREATE OR REPLACE FUNCTION public.tl_on_proyecto_estado()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado AND NEW.estado IN ('completado','pausado') THEN
    PERFORM public.tl_insert(
      'proyecto_estado', 'Proyecto ' || NEW.estado || ': ' || NEW.titulo,
      NULL, '📋', NEW.id, 'proyectos', NEW.creador_id, NEW.id, NULL,
      jsonb_build_object('estado_anterior', OLD.estado, 'estado_nuevo', NEW.estado)
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS tl_proyecto_estado ON public.proyectos;
CREATE TRIGGER tl_proyecto_estado AFTER UPDATE OF estado ON public.proyectos FOR EACH ROW EXECUTE FUNCTION public.tl_on_proyecto_estado();

-- Avance publicado
CREATE OR REPLACE FUNCTION public.tl_on_avance_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_titulo TEXT;
BEGIN
  SELECT titulo INTO v_titulo FROM public.proyectos WHERE id = NEW.proyecto_id;
  PERFORM public.tl_insert(
    'avance', 'Avance en ' || COALESCE(v_titulo, 'proyecto'),
    COALESCE(SUBSTRING(NEW.descripcion FROM 1 FOR 160), NEW.titulo),
    '📈', NEW.id, 'avances', NEW.autor_id, NEW.proyecto_id, NULL,
    jsonb_build_object('avance_titulo', NEW.titulo)
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS tl_avance_insert ON public.avances;
CREATE TRIGGER tl_avance_insert AFTER INSERT ON public.avances FOR EACH ROW EXECUTE FUNCTION public.tl_on_avance_insert();

-- Idea estado → 'aprobada'
CREATE OR REPLACE FUNCTION public.tl_on_idea_aprobada()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado AND NEW.estado = 'aprobada' THEN
    PERFORM public.tl_insert(
      'idea_aprobada', 'Idea aprobada: ' || NEW.titulo,
      SUBSTRING(COALESCE(NEW.descripcion,'') FROM 1 FOR 160),
      '💡', NEW.id, 'ideas', NEW.autor_id, NEW.proyecto_id, NULL,
      jsonb_build_object('votos_favor', NEW.votos_favor, 'tags', NEW.tags)
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS tl_idea_aprobada ON public.ideas;
CREATE TRIGGER tl_idea_aprobada AFTER UPDATE OF estado ON public.ideas FOR EACH ROW EXECUTE FUNCTION public.tl_on_idea_aprobada();

-- Evento creado
CREATE OR REPLACE FUNCTION public.tl_on_evento_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.tl_insert(
    'evento_creado', 'Evento: ' || NEW.titulo,
    COALESCE(NEW.descripcion, ''),
    '📅', NEW.id, 'eventos', NEW.creado_por, NEW.proyecto_id, NEW.nodo_id,
    jsonb_build_object('fecha', NEW.fecha, 'tipo', NEW.tipo)
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS tl_evento_insert ON public.eventos;
CREATE TRIGGER tl_evento_insert AFTER INSERT ON public.eventos FOR EACH ROW EXECUTE FUNCTION public.tl_on_evento_insert();

-- Nodo estado → 'activo'
CREATE OR REPLACE FUNCTION public.tl_on_nodo_estado()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.estado IS DISTINCT FROM NEW.estado AND NEW.estado = 'activo' THEN
    PERFORM public.tl_insert(
      'nodo_aprobado', 'Nuevo grupo: ' || NEW.nombre,
      COALESCE(NEW.descripcion, ''),
      '🏛️', NEW.id, 'nodos', NEW.creado_por, NULL, NEW.id,
      jsonb_build_object('color', NEW.color)
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS tl_nodo_estado ON public.nodos;
CREATE TRIGGER tl_nodo_estado AFTER UPDATE OF estado ON public.nodos FOR EACH ROW EXECUTE FUNCTION public.tl_on_nodo_estado();

-- Archivo subido
CREATE OR REPLACE FUNCTION public.tl_on_archivo_insert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  PERFORM public.tl_insert(
    'archivo_subido', 'Archivo: ' || NEW.nombre,
    NULL, '📎', NEW.id, 'archivos', NEW.subido_por, NEW.proyecto_id, NULL,
    jsonb_build_object('tipo', NEW.tipo, 'tamanio_bytes', NEW.tamanio_bytes)
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS tl_archivo_insert ON public.archivos;
CREATE TRIGGER tl_archivo_insert AFTER INSERT ON public.archivos FOR EACH ROW EXECUTE FUNCTION public.tl_on_archivo_insert();
