-- Migration 008: Vincular eventos de calendario a proyectos y nodos

ALTER TABLE eventos
  ADD COLUMN IF NOT EXISTS proyecto_id UUID REFERENCES proyectos(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nodo_id UUID REFERENCES nodos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_eventos_proyecto ON eventos(proyecto_id);
CREATE INDEX IF NOT EXISTS idx_eventos_nodo ON eventos(nodo_id);

COMMENT ON COLUMN eventos.proyecto_id IS 'Proyecto asociado al evento (opcional)';
COMMENT ON COLUMN eventos.nodo_id IS 'Nodo/grupo asociado al evento (opcional)';
