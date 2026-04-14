-- Migration 044: RLS DELETE policy para ideas
-- Sin esta política, RLS bloqueaba silenciosamente todo DELETE en la tabla ideas

CREATE POLICY ideas_delete ON ideas
  FOR DELETE
  USING (
    autor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
        AND usuarios.rol IN ('admin', 'directora')
    )
  );
