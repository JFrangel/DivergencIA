-- Add grupo_nodo column to usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS grupo_nodo TEXT DEFAULT NULL;

-- Valid values: 'fundadores', 'investigadores', 'egresados', 'colaboradores', 'nuevos', 'visitantes'
-- NULL means auto-detect based on rol/es_fundador/fecha_registro
