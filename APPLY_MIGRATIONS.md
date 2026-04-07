# How to Apply Migrations to Supabase

## Option 1: Using Supabase Dashboard (Manual, Safe)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project (`DivergencIA`)
3. Navigate to **SQL Editor**
4. For each migration file below, **copy the SQL content** and run it in order:

### Phase 1 (CRITICAL — Notifications Fix)
```bash
✅ 019_add_usuario_fk_to_ideas.sql
✅ 020_add_usuario_fk_to_eventos.sql
```

**Status**: These files already exist and are ready to apply.

### Phase 2 (HIGH PRIORITY — Creator Auditing)
```bash
✅ 021_add_usuario_fk_to_proyectos.sql
✅ 022_add_usuario_fk_to_nodos.sql
✅ 023_add_fk_to_canales.sql
✅ 024_add_fk_to_archivos.sql
✅ 025_add_fk_to_murales.sql
```

**Status**: These files have been created and are ready to apply.

---

## Option 2: Using Supabase CLI (Automated)

If you have the Supabase CLI installed (`supabase` command available):

```bash
# 1. Navigate to project root
cd D:\proyects\DivergencIA

# 2. Link to your Supabase project (if not already linked)
supabase link

# 3. Apply pending migrations
supabase db push

# 4. Verify migrations applied
supabase db pull  # This will show current state
```

---

## Order of Application

**CRITICAL**: Apply migrations in this EXACT order:

1. `019_add_usuario_fk_to_ideas.sql`
2. `020_add_usuario_fk_to_eventos.sql`
3. `021_add_usuario_fk_to_proyectos.sql`
4. `022_add_usuario_fk_to_nodos.sql`
5. `023_add_fk_to_canales.sql`
6. `024_add_fk_to_archivos.sql`
7. `025_add_fk_to_murales.sql`

**Why order matters**: Later migrations may depend on earlier ones (e.g., 023 assumes 022 is applied).

---

## Verification Checklist

After applying migrations, verify in **Supabase Dashboard → Table Editor**:

- [ ] `ideas` table has `usuario_id` column
- [ ] `eventos` table has `usuario_id` column
- [ ] `proyectos` table has `usuario_id` column
- [ ] `nodos` table has `usuario_id` column
- [ ] `canales` table has `usuario_id` AND `nodo_id` columns
- [ ] `archivos` table has `usuario_id` AND `proyecto_id` columns
- [ ] `murales` table has `usuario_id` AND `proyecto_id` columns

Each should have corresponding indexes (idx_*_usuario_id, etc.)

---

## Testing After Migrations

### Test 1: Create Idea + Check Notifications
1. Go to Ideas page
2. Create a new idea
3. Open another browser/incognito window as different user
4. Verify notification appears in **NotificationCenter** (bell icon)
5. Verify notification type is `idea_nueva` ✨
6. Click notification → should navigate to `/ideas`

### Test 2: Create Event + Check Notifications
1. Go to Calendar page
2. Create a new event
3. Open NotificationCenter as different user
4. Verify notification appears
5. Verify notification type is `evento_proximo` 📅
6. Click notification → should navigate to `/calendar`

### Test 3: Verify RLS Policies Work
1. Create a project/note/idea
2. Try to access as different user → should work if RLS allows
3. Try to delete as non-creator → should fail if enforced

---

## Rollback (If Needed)

If a migration breaks something, you can rollback in Supabase Dashboard:

1. Go to **Migrations** tab (if available)
2. Click **Rollback** on the problematic migration

Or drop columns manually:
```sql
ALTER TABLE ideas DROP COLUMN usuario_id;
ALTER TABLE eventos DROP COLUMN usuario_id;
-- etc.
```

---

## Support

If migrations fail:

1. **Check for NULL constraint violations**:
   - Migration 024 requires `archivos.usuario_id` to be NOT NULL
   - If archivos already has rows with NULL uploader, migration fails
   - Solution: Run this first:
     ```sql
     UPDATE archivos SET usuario_id = auth.users(id) WHERE usuario_id IS NULL;
     -- Then manually assign a default user or backfill
     ```

2. **Check for duplicate rows**:
   - Foreign key constraints prevent orphaned rows
   - If a row references a deleted usuario, migration fails

3. **Check index conflicts**:
   - If an index with the same name exists, migration fails
   - Solution: Drop old index first, then run migration

---

## What These Migrations Enable

After all migrations are applied, you'll have:

✅ **Creator auditing** — Know who created every resource
✅ **Notification routing** — Notify creators of changes
✅ **Permission enforcement** — Can restrict edits to creators
✅ **Relationship integrity** — Foreign keys prevent orphaned data
✅ **Performance** — Indexes speed up queries by creator

---

## Next Steps (After Migrations)

1. ✅ Apply migrations (Phase 1 + 2)
2. ⏳ Update hooks to capture usuario_id when creating:
   - [ ] Proyectos (`useProjects.js`)
   - [ ] Nodos (`useNodos.js`)
   - [ ] Canales (in `useChat.js` or similar)
   - [ ] Archivos (`useLibrary.js`)
   - [ ] Murales (`useMurales.js` or similar)
3. ⏳ Add notifications for these create actions
4. ⏳ Test end-to-end workflows
