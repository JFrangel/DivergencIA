-- Migration 015: Custom user groups
-- Allows admins/directors to define additional groups beyond the hardcoded ones

CREATE TABLE IF NOT EXISTS public.grupos_personalizados (
  clave       TEXT PRIMARY KEY,
  label       TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#8B5CF6',
  icono       TEXT NOT NULL DEFAULT '👥',
  creado_por  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.grupos_personalizados ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY "grupos_lectura_publica" ON public.grupos_personalizados
  FOR SELECT USING (true);

-- Only admin/directora can insert/update/delete
CREATE POLICY "grupos_admin_write" ON public.grupos_personalizados
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.rol IN ('admin', 'directora')
    )
  );
