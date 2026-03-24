# DivergencIA — Architecture

## Tech Stack
- **Frontend**: React 18 + Vite, Tailwind CSS v4, Framer Motion
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **State**: React Context (AuthContext), custom hooks per domain
- **Routing**: React Router v6 with lazy loading
- **Charts**: Recharts
- **Graphs**: React Flow (@xyflow/react)
- **DnD**: @dnd-kit/core + @dnd-kit/sortable
- **Forms**: react-hook-form + Zod validation
- **Icons**: react-icons (Feather set)
- **Animations**: framer-motion
- **Toasts**: react-hot-toast

## Directory Structure
```
frontend/src/
├── components/
│   ├── dashboard/     # Widget components (Welcome, Activity, Events, etc.)
│   ├── diagrams/      # DiagramEditor (React Flow based)
│   ├── graph/         # UniversalGraph, GraphControls
│   ├── ideas/         # IdeaCard, IdeaMergeModal, VotingSystem
│   ├── layout/        # Navbar, Sidebar, TopBar, GuestBanner
│   ├── learning/      # TopicCard, TopicDetail, LearningPath, LearningStatsBar
│   ├── library/       # FileUploadZone, ResourceCard
│   ├── members/       # MemberCard, MemberNetwork
│   ├── nexus/         # ATHENIA_Shell, RoadmapTimeline
│   ├── profile/       # ProfileHero, SkillTree, ActivityCalendar
│   ├── projects/      # ProjectKanban, MetricsEditor, FileAttachments
│   ├── ui/            # Avatar, Badge, Modal, Spinner, Input, etc.
│   └── workflow/      # WorkflowEditor
├── context/           # AuthContext
├── hooks/             # useProjects, useIdeas, useMembers, useRoadmap, etc.
├── lib/               # supabase client, utils, constants
├── pages/
│   ├── admin/         # AdminPanel
│   ├── app/           # Dashboard, Projects, Ideas, Learning, Calendar, etc.
│   └── public/        # Landing, Login, Register
├── router/            # Route definitions
└── styles/            # index.css (Tailwind + CSS variables)
```

## Database Tables (Supabase)
| Table | Purpose |
|-------|---------|
| `usuarios` | User profiles (nombre, rol, carrera, bio, foto_url, etc.) |
| `proyectos` | Research projects with workflow_data |
| `tareas` | Kanban tasks linked to projects |
| `ideas` | Innovation ideas with voting |
| `votos` | Idea votes per user |
| `temas` | Learning topics with sections |
| `eventos` | Calendar events |
| `archivos` | Library file metadata |
| `diagramas` | User diagrams (React Flow JSON) |
| `avances` | Project progress entries |
| `notificaciones` | User notifications |
| `roadmap_fases` | Roadmap phases with milestones |
| `contacto` | Contact form submissions |

## Storage Buckets
| Bucket | Access | Purpose |
|--------|--------|---------|
| `avatars` | public | Profile photos and banners |
| `archivos` | auth | Library files |
| `avance-attachments` | auth | Project progress attachments |

## Authentication
- Email + Password only (no OAuth/magic link yet)
- Roles: `miembro` (default), `admin`
- Boolean flag: `es_fundador`
- Session managed by Supabase Auth

## Theming
- CSS custom properties: `--c-primary`, `--c-secondary`, `--c-accent`, `--c-bg-*`, `--c-text-*`
- 6 themes defined in ThemeContext: default, ocean, forest, sunset, midnight, sakura
- ~405 hardcoded hex colors still need migration to CSS vars

## Deployment
- **Vercel**: `frontend/vercel.json` configured for SPA
- **Netlify**: `.netlify` in gitignore
- **Supabase Auth URLs**: Must update Site URL and Redirect URLs per deployment target
```
Site URL: https://your-domain.vercel.app
Redirect URLs: https://your-domain.vercel.app/**
```
