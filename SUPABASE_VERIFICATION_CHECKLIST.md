# Supabase Database Verification Checklist

**Before applying any migrations**, verify the current state of your database.

Go to: **Supabase Dashboard → Your Project → Table Editor**

---

## ✅ PHASE 1: Critical Tables (Notifications Fix)

### Table: `ideas`
**Current columns you should see**:
- [ ] `id` (UUID, primary key)
- [ ] `titulo` (text)
- [ ] `descripcion` (text)
- [ ] `autor_id` (UUID, FK to usuarios)
- [ ] `created_at` (timestamp)
- [ ] `votos_favor` (integer)
- [ ] `votos_contra` (integer)

**NEW columns that SHOULD NOT exist yet** (will be added by migration 019):
- [ ] ❌ `usuario_id` (UUID, FK to usuarios) — **IF THIS EXISTS, migration 019 already applied**
- [ ] ❌ `idx_ideas_usuario_id` (index)

**Action**:
- If `usuario_id` does NOT exist → Need to apply migration 019
- If `usuario_id` DOES exist → Skip to next table

---

### Table: `eventos`
**Current columns you should see**:
- [ ] `id` (UUID, primary key)
- [ ] `titulo` (text)
- [ ] `fecha` (timestamp)
- [ ] `lugar` (text)
- [ ] `created_at` (timestamp)
- [ ] `proyecto_id` (UUID, FK to proyectos)
- [ ] `nodo_id` (UUID, FK to nodos)
- [ ] `canal_id` (UUID, FK to canales)
- [ ] `creado_por` (UUID, FK to usuarios)

**NEW columns that SHOULD NOT exist yet** (will be added by migration 020):
- [ ] ❌ `usuario_id` (UUID, FK to usuarios) — **IF THIS EXISTS, migration 020 already applied**
- [ ] ❌ `idx_eventos_usuario_id` (index)

**Action**:
- If `usuario_id` does NOT exist → Need to apply migration 020
- If `usuario_id` DOES exist → Skip to next section

---

## ⚠️ PHASE 2: Creator Auditing Tables

### Table: `proyectos`
**Columns you should see**:
- [ ] `id` (UUID, primary key)
- [ ] `nombre` (text)
- [ ] `descripcion` (text)
- [ ] `created_at` (timestamp)

**NEW columns that SHOULD NOT exist yet** (will be added by migration 021):
- [ ] ❌ `usuario_id` (UUID, FK to usuarios)
- [ ] ❌ `idx_proyectos_usuario_id` (index)

**Status**: Will be added in Phase 2

---

### Table: `nodos`
**Columns you should see**:
- [ ] `id` (UUID, primary key)
- [ ] `nombre` (text)
- [ ] `descripcion` (text)
- [ ] `nodo_tipo` (text)
- [ ] `created_at` (timestamp)

**NEW columns that SHOULD NOT exist yet** (will be added by migration 022):
- [ ] ❌ `usuario_id` (UUID, FK to usuarios)
- [ ] ❌ `idx_nodos_usuario_id` (index)

**Status**: Will be added in Phase 2

---

### Table: `canales`
**Columns you should see**:
- [ ] `id` (UUID, primary key)
- [ ] `nombre` (text)
- [ ] `descripcion` (text)
- [ ] `created_at` (timestamp)

**NEW columns that SHOULD NOT exist yet** (will be added by migration 023):
- [ ] ❌ `usuario_id` (UUID, FK to usuarios)
- [ ] ❌ `nodo_id` (UUID, FK to nodos)
- [ ] ❌ `idx_canales_usuario_id` (index)
- [ ] ❌ `idx_canales_nodo_id` (index)

**Status**: Will be added in Phase 2

---

### Table: `archivos`
**Columns you should see**:
- [ ] `id` (UUID, primary key)
- [ ] `nombre` (text)
- [ ] `ruta_almacenamiento` (text)
- [ ] `created_at` (timestamp)
- [ ] `tamaño_kb` (integer)

**NEW columns that SHOULD NOT exist yet** (will be added by migration 024):
- [ ] ❌ `usuario_id` (UUID, FK to usuarios) — **REQUIRED NOT NULL**
- [ ] ❌ `proyecto_id` (UUID, FK to proyectos, nullable)
- [ ] ❌ `idx_archivos_usuario_id` (index)
- [ ] ❌ `idx_archivos_proyecto_id` (index)

**⚠️ IMPORTANT**: Migration 024 adds `usuario_id` as NOT NULL. If archivos has rows with NULL uploader, migration will fail. May need backfill first.

**Status**: Will be added in Phase 2

---

### Table: `murales`
**Columns you should see**:
- [ ] `id` (UUID, primary key)
- [ ] `nombre` (text)
- [ ] `contenido` (jsonb)
- [ ] `created_at` (timestamp)

**NEW columns that SHOULD NOT exist yet** (will be added by migration 025):
- [ ] ❌ `usuario_id` (UUID, FK to usuarios)
- [ ] ❌ `proyecto_id` (UUID, FK to proyectos, nullable)
- [ ] ❌ `idx_murales_usuario_id` (index)
- [ ] ❌ `idx_murales_proyecto_id` (index)

**Status**: Will be added in Phase 2

---

## 📋 Summary

After checking all tables above, fill in:

**Phase 1 Status**:
- [ ] ideas.usuario_id exists? YES / NO / UNCLEAR
- [ ] eventos.usuario_id exists? YES / NO / UNCLEAR

**Phase 2 Status**:
- [ ] proyectos.usuario_id exists? YES / NO
- [ ] nodos.usuario_id exists? YES / NO
- [ ] canales.usuario_id & nodo_id exist? YES / NO
- [ ] archivos.usuario_id & proyecto_id exist? YES / NO
- [ ] murales.usuario_id & proyecto_id exist? YES / NO

---

## Next Steps

### If Phase 1 columns DON'T exist:
1. Go to **SQL Editor** in Supabase
2. Copy content from `019_add_usuario_fk_to_ideas.sql`
3. Paste and run in SQL Editor
4. Repeat for `020_add_usuario_fk_to_eventos.sql`
5. Refresh Table Editor to verify

### If Phase 1 columns ALREADY exist:
- Great! Migrations were already applied
- Check if notifications are working (create idea/event and verify NotificationCenter)
- If not working, may need to check frontend code

### If Phase 2 columns DON'T exist:
1. Prepare Phase 2 migrations (021-025)
2. Run them in order in SQL Editor
3. Update frontend hooks to capture usuario_id
4. Add notifications for these create actions

---

## Visual Reference

**What good FK looks like in Supabase**:

```sql
-- Supabase shows this as:
COLUMN usuario_id | UUID | (FK -> usuarios.id) | DEFAULT: null | NOT NULL: false

-- With index:
INDEX idx_ideas_usuario_id | USING btree | (usuario_id) | enabled: true
```

**Common issues**:
- FK shows as gray/inactive → RLS policy may be hiding it
- No index → table queries will be slow
- FK says "ON DELETE CASCADE" but comments say "RESTRICT" → verify in SQL definition
