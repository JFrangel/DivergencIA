# DivergencIA — CLAUDE.md

## Stack

- **Frontend**: React 18 + Vite + React Router v6 (NO Next.js — never suggest `"use client"`, App Router, or Server Components)
- **Styling**: Tailwind CSS v4 via `@tailwindcss/vite` plugin — use Tailwind classes, avoid inline styles
- **Animations**: Framer Motion — use `layout`, `AnimatePresence`, spring transitions
- **Backend**: Supabase (Postgres + Auth + Realtime + Edge Functions)
- **AI**: Google Gemini via `@google/generative-ai` (hook: `useAthenia.js`)
- **Email**: Resend via `supabase/functions/send-email` edge function
- **Icons**: `react-icons` (fi, hi, bs, md, etc.)
- **Toasts**: `sonner`
- **Forms**: `react-hook-form` + `zod`
- **Charts**: `recharts`
- **3D**: `@react-three/fiber` + `@react-three/drei`
- **Drag & drop**: `@dnd-kit/*`

## Project structure

```
frontend/src/
  pages/
    app/          # Authenticated pages (Dashboard, Chat, Projects, Calendar, etc.)
    admin/        # AdminPanel.jsx
    public/       # Landing, Login, Register, AuthCallback, JoinRequest
  components/
    admin/        # Admin-specific panels
    chat/         # ChatArea, MessageBubble, CallModal
    dashboard/    # Stats, badges, tasks
    diagrams/     # DiagramEditor, LibraryPickerModal
    ideas/        # IdeaCard, IdeaDetailModal
    layout/       # Sidebar, Navbar, AppShell
    learning/     # TopicCard, SkillTree, TopicForm
    library/      # FileCard, VersionHistory
    members/      # MemberCard, MemberNetwork
    projects/     # ProjectCard, ProjectDetail tabs
    ui/           # Modal, Toast, GlobalSearch, etc.
    visuals/      # 3D / particle effects
  hooks/          # All data hooks (useProjects, useChat, useCall, etc.)
  lib/
    supabase.js   # Supabase client + AREA_COLORS + ESTADO_PROYECTO + PRIORIDAD_COLORES
supabase/
  functions/
    send-email/   # Resend email dispatch (single + batch modes)
    notify-members/ # Broadcast notifications to all active members
  migrations/     # SQL migrations 005–013
```

## Key conventions

- All data access goes through hooks in `src/hooks/` — no direct Supabase calls in components
- Supabase project ID: `bmbgjvmmwwogwecyxezx`
- Auth: magic link (email) — no passwords
- RLS is enabled on all tables
- Page routing: `frontend/src/App.jsx` — React Router v6 `<Routes>`

## Environment variables (frontend)

```
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_GEMINI_API_KEY
VITE_SITE_URL
```

Set in `.env.local` for dev, and in Vercel dashboard for production.

## Database — key tables

| Table | Purpose |
|-------|---------|
| `usuarios` | User profiles (extends Supabase auth.users) |
| `proyectos` | Research projects |
| `ideas` | Ideas linked to projects via `proyecto_id` |
| `nodos` | Groups/communities (`nodo_tipo`: 'grupo') |
| `canales` | Chat channels inside nodos |
| `canal_miembros` | Memberships per canal |
| `mensajes` | Chat messages |
| `eventos` | Calendar events (+ `proyecto_id`, `nodo_id` since migration 008) |
| `temas_aprendizaje` | Learning topics (+ `skills_relacionadas TEXT[]` since migration 009) |
| `archivos` | Library files |
| `versiones_archivo` | File version history (migration 010) |
| `murales` | Collaborative whiteboards |
| `llamadas` | Call records |
| `call_history` | Per-user call history |

## Applied migrations

| File | Status | What it does |
|------|--------|-------------|
| 005_grupo_nodo.sql | ✅ | Nodo/group structure |
| 006_murales.sql | ✅ | Murals table |
| 007_ideas_proyecto_link.sql | ✅ | ideas.proyecto_id FK |
| 008_eventos_proyecto.sql | ✅ | eventos.proyecto_id + nodo_id |
| 009_skills_relacionadas.sql | ✅ | temas_aprendizaje.skills_relacionadas |
| 010_versiones_archivo.sql | ✅ | versiones_archivo table |
| 013_call_history_and_reuniones.sql | ✅ | Call history |

## Edge functions

| Function | Purpose |
|----------|---------|
| `send-email` | Send single or batch emails via Resend. Reads `FROM_EMAIL` and `RESEND_API_KEY` from Supabase secrets. **Current sandbox restriction**: `onboarding@resend.dev` only delivers to the Resend-registered account email — verify a domain to send to anyone. |
| `notify-members` | Notify all active members (broadcast). Uses branded HTML templates. |

## Email fix (pending user action)

Resend sandbox blocks delivery to external addresses. To fix:
1. Verify domain at resend.com/domains
2. Add Supabase secret: `FROM_EMAIL=DivergencIA <noreply@yourdomain.com>`
3. No redeploy needed — function already reads `FROM_EMAIL` env var.

## Deployment

- **Hosting**: Vercel (connect GitHub repo, set env vars above)
- **CI**: `docs/github-ci-workflow.yml` ready — needs GitHub PAT with `workflow` scope to push to `.github/workflows/`
- **Supabase**: Auth magic-link template at `supabase/email-templates/magic-link.html` — paste in Supabase Dashboard → Authentication → Email Templates → Magic Link

## Design system

- Dark-first UI (`bg-zinc-900` / `bg-zinc-800` base)
- Primary accent: `#FC651F` (orange)
- Secondary accents: `#8B5CF6` (purple), `#00D1FF` (cyan), `#22c55e` (green)
- Border radius: `rounded-xl` standard, `rounded-2xl` for cards
- Glassmorphism used sparingly (modals, overlays)
- Fonts: system sans-serif (Tailwind default)

## Important gotchas

- **NOT Next.js** — never add `"use client"`, `generateStaticParams`, or anything Next-specific
- **Tailwind v4** — use utility classes, not inline `style={{}}` when Tailwind covers it
- The `canal_miembros` table has rows for ALL canal types (chats, DMs, grupos) — when counting nodo memberships, filter by `nodo_tipo='grupo'` canales first
- Vite module cache stale errors: `rm -rf node_modules/.vite` then restart dev server
- `sonner` toast: `toast('message', { icon: '🔔' })` for notification feedback
