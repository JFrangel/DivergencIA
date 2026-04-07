# DivergencIA — Complete Database Relationships Analysis

## ✅ FK Relationships Already in Place

### Ideas Table
- `autor_id` → `usuarios(id)` (original author, formal FK)
- `proyecto_origen_id` → `proyectos(id)` (project that originated from this idea)
- `usuario_id` → `usuarios(id)` **[NEW — Migration 019]** (creator for auditing/notifications)

### Eventos Table
- `proyecto_id` → `proyectos(id)` (associated project)
- `nodo_id` → `nodos(id)` (associated group/node)
- `canal_id` → `canales(id)` (for auto-call meetings)
- `usuario_id` → `usuarios(id)` **[NEW — Migration 020]** (creator for auditing/notifications)

### Historial Llamadas Table
- `canal_id` → `canales(id)` (call happened in this channel)
- `iniciador_id` → `usuarios(id)` (user who initiated the call)

### Reunion Invitados Table
- `evento_id` → `eventos(id)` (which event)
- `usuario_id` → `usuarios(id)` (invited user)

### Nodo Solicitudes Table
- `nodo_id` → `nodos(id)` (join request for which node)
- `usuario_id` → `usuarios(id)` (who requested to join)
- `respondido_por` → `usuarios(id)` (who approved/rejected)

### Logros Usuario Table
- `usuario_id` → `usuarios(id)` (user's achievement)

---

## ⚠️ FK Relationships PROBABLY MISSING (need verification)

These columns likely exist but MAY NOT have formal FK constraints:

### Canal Miembros Table
- `canal_id` → `canales(id)` **[LIKELY]**
- `usuario_id` → `usuarios(id)` **[LIKELY]**

### Votos Ideas Table
- `usuario_id` → `usuarios(id)` **[LIKELY]**
- `idea_id` → `ideas(id)` **[LIKELY]**

### Mensajes Table (Chat)
- `usuario_id` → `usuarios(id)` **[CHECK]**
- `canal_id` → `canales(id)` **[CHECK]**
- May also have `mensaje_respondido_id` → `mensajes(id)` for thread replies **[CHECK]**

### Versiones Archivo Table
- `archivo_id` → `archivos(id)` **[CHECK]**
- `usuario_id` → `usuarios(id)` **[CHECK]** (who created this version)

---

## ❌ FK Relationships DEFINITELY MISSING (Creator auditing)

These tables NEED to link back to their creator for auditing & notifications:

### Proyectos Table
- **MISSING**: `usuario_id` → `usuarios(id)` (who created this project)
- **Impact**: Can't audit who owns projects, can't send "creator" notifications
- **Migration needed**: Add usuario_id FK + index

### Nodos Table
- **MISSING**: `usuario_id` → `usuarios(id)` (primary creator/founder)
- **Impact**: Can't determine if creator can delete nodo, can't send creator notifications
- **Migration needed**: Add usuario_id FK + index

### Canales Table
- **MISSING**: `usuario_id` → `usuarios(id)` (who created channel)
- **MISSING**: `nodo_id` → `nodos(id)` (which nodo does this channel belong to)
- **Impact**: Can't track channel ownership, can't enforce permission model
- **Migration needed**: Add both usuario_id and nodo_id FKs + indexes

### Archivos Table (Library)
- **MISSING**: `usuario_id` → `usuarios(id)` (who uploaded)
- **MISSING**: `proyecto_id` → `proyectos(id)` (optional — which project owns this file)
- **Impact**: Can't track file authors, can't enforce edit permissions
- **Migration needed**: Add usuario_id FK + optional proyecto_id FK + indexes

### Murales Table (Whiteboards)
- **MISSING**: `usuario_id` → `usuarios(id)` (who created)
- **MISSING**: `proyecto_id` → `proyectos(id)` (optional — which project)
- **Impact**: Can't track mural ownership, can't send creator notifications
- **Migration needed**: Add usuario_id FK + optional proyecto_id FK + indexes

### Mensajes Table (Chat messages)
- **MISSING (likely)**: `usuario_id` → `usuarios(id)` (who sent message)
- **MISSING (likely)**: `canal_id` → `canales(id)` (which channel)
- **Impact**: Can't enforce who can read/delete messages, can't track message author
- **Migration needed**: Verify both exist; if not, add with FK constraints

---

## 🚨 Critical Missing FK for Recent Migrations

### Solicitudes Proyecto Table (Migration 016b)
- Need to verify structure:
  - `proyecto_id` → `proyectos(id)` **[CHECK]**
  - `usuario_id` → `usuarios(id)` **[CHECK]**
  - `respondido_por` → `usuarios(id)` **[CHECK]**

### Grupos Personalizados Table (Migration 015)
- Need to verify structure and relationships

---

## 📋 Priority Implementation Order

### Phase 1 (CRITICAL — already in progress)
1. ✅ Migration 019: `ideas.usuario_id` → `usuarios(id)`
2. ✅ Migration 020: `eventos.usuario_id` → `usuarios(id)`
3. ⏳ **APPLY THESE IN SUPABASE IMMEDIATELY**

### Phase 2 (HIGH PRIORITY — Creator auditing)
1. Migration 021: `proyectos.usuario_id` → `usuarios(id)`
2. Migration 022: `nodos.usuario_id` → `usuarios(id)`
3. Migration 023: `canales.usuario_id` → `usuarios(id)` + `canales.nodo_id` → `nodos(id)`
4. Migration 024: `archivos.usuario_id` → `usuarios(id)` + optional `archivos.proyecto_id`
5. Migration 025: `murales.usuario_id` → `usuarios(id)` + optional `murales.proyecto_id`

### Phase 3 (VERIFICATION)
1. Verify `canal_miembros` has proper FKs
2. Verify `votos_ideas` has proper FKs
3. Verify `mensajes` has proper FKs
4. Verify `versiones_archivo` has proper FKs
5. Verify Migration 016b `solicitudes_proyecto` structure
6. Verify Migration 015 `grupos_personalizados` structure

---

## 📊 Relationship Map (Visual)

```
usuarios (root)
├── ideas (autor_id, usuario_id) ✅
├── eventos (usuario_id) ✅
├── proyectos (usuario_id) ❌
├── nodos (usuario_id) ❌
├── canales (usuario_id, nodo_id) ❌
├── archivos (usuario_id, proyecto_id) ❌
├── murales (usuario_id, proyecto_id) ❌
├── logros_usuario (usuario_id) ✅
├── nodo_solicitudes (usuario_id, respondido_por) ✅
└── historial_llamadas (iniciador_id) ✅

proyectos
├── ideas (proyecto_origen_id) ✅
├── eventos (proyecto_id) ✅
├── archivos (proyecto_id) ❌
└── murales (proyecto_id) ❌

nodos
├── eventos (nodo_id) ✅
├── nodo_miembros (nodo_id) [assumed ✅]
├── nodo_solicitudes (nodo_id) ✅
└── canales (nodo_id) ❌

canales
├── canal_miembros (canal_id) [assumed ✅]
├── mensajes (canal_id) [assumed ✅]
├── eventos (canal_id) ✅
└── historial_llamadas (canal_id) ✅

ideas
├── votos_ideas (idea_id) [assumed ✅]
└── reunion_invitados [NOT linked — issue?]

eventos
└── reunion_invitados (evento_id) ✅
```

---

## Next Action

**STEP 1**: Apply Migrations 019 & 020 in Supabase Dashboard:
- Go to Supabase → SQL Editor
- Run 019_add_usuario_fk_to_ideas.sql
- Run 020_add_usuario_fk_to_eventos.sql

**STEP 2**: Verify in Supabase → Table Editor:
- Select `ideas` table → check if `usuario_id` column exists
- Select `eventos` table → check if `usuario_id` column exists

**STEP 3**: Test frontend notifications:
- Create test idea → verify all users get notification
- Create test event → verify all users get notification
