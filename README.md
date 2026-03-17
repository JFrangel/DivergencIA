# DivergencIA — Semillero de Investigación en IA

<div align="center">

![DivergencIA](https://img.shields.io/badge/DivergencIA-Semillero%20IA-FC651F?style=for-the-badge&logo=lightning&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)
![Three.js](https://img.shields.io/badge/Three.js-3D-000000?style=flat-square&logo=three.js)
![Tailwind](https://img.shields.io/badge/Tailwind-v4-38BDF8?style=flat-square&logo=tailwindcss)

**Plataforma digital del semillero universitario de investigación en Inteligencia Artificial.**

*Donde la inteligencia converge.*

</div>

---

## Descripcion

DivergencIA es un mini campus virtual premium que centraliza proyectos, ideas, personas y conocimiento del semillero de investigacion en IA. Construido con estetica **Cyber-Research** (glassmorphism + neon + 3D selectivo).

### Funcionalidades principales

- **Dashboard** — Metricas en tiempo real, feed de actividad, TimelinePulse animado
- **Proyectos** — CRUD completo, Kanban de tareas (drag & drop), Workflow Builder visual
- **Banco de Ideas** — Proponer, votar, comentar ideas de investigacion
- **Biblioteca** — Subida de archivos, tags, versionado
- **Directorio de Miembros** — Perfiles con SkillTree, heatmap de actividad, logros
- **Universo** — Grafo interactivo con React Flow + D3-force (miembros, proyectos, ideas)
- **A.T.H.E.N.I.A** — Terminal IA con Gemini 1.5, comandos del sistema, analisis multimodal
- **Panel Admin** — Gestion de usuarios, solicitudes, eventos, mensajes de contacto, reportes
- **Modo Zen** — Experiencia inmersiva 3D con audio ambiente y ejercicios de respiracion
- **Roadmap** — Fases del semillero con milestones desde la BD
- **Configuracion** — Cuenta, seguridad, notificaciones, temas, privacidad, exportar datos

---

## Stack Tecnologico

| Capa | Tecnologia |
|------|-----------|
| Frontend | React 18 + Vite |
| Estilos | Tailwind CSS v4 |
| Animaciones | Framer Motion + GSAP |
| 3D | Three.js + React Three Fiber + Drei |
| Grafos | React Flow v11 + D3-force |
| Drag & Drop | @dnd-kit |
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| IA | Google Gemini 1.5 Flash |
| Forms | react-hook-form + Zod |
| Charts | Recharts |
| Tablas | @tanstack/react-table |
| Deploy | Vercel |

---

## Instalacion

```bash
# Clonar repositorio
git clone https://github.com/tu-org/DivergencIA.git
cd DivergencIA/frontend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Supabase y Gemini

# Ejecutar en desarrollo
npm run dev
```

### Variables de entorno requeridas

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_GEMINI_API_KEY=AIza...
```

---

## Estructura del Proyecto

```
frontend/src/
  components/
    ui/          -- Sistema de diseno base (Button, Card, Input, etc.)
    layout/      -- AppLayout, Sidebar, TopBar, Navbar
    visuals/     -- 3D backgrounds (ImmersiveBackground, ParticleCore)
    graph/       -- Grafo universal (React Flow + custom nodes)
    workflow/    -- Workflow Builder (React Flow editor)
    nexus/       -- ATHENIA terminal IA
    dashboard/   -- Widgets del dashboard
    projects/    -- Componentes de proyectos
    ideas/       -- Banco de ideas
    library/     -- Biblioteca de archivos
    profile/     -- Perfiles (SkillTree, ActivityCalendar)
    admin/       -- Panel de administracion
  pages/
    public/      -- Landing, Login, Register, JoinRequest
    app/         -- Dashboard, Projects, Ideas, Library, etc.
    admin/       -- AdminPanel
  context/       -- AuthContext, ThemeContext, ZenContext, NotifContext
  hooks/         -- useProjects, useIdeas, useComentarios, etc.
  lib/           -- supabase.js, gemini.js, utils.js
  router/        -- React Router config + guards
  styles/        -- index.css (variables CSS, glass, neon)
```

---

## Base de Datos

Supabase PostgreSQL con:
- 18 tablas (usuarios, proyectos, ideas, votos, avances, tareas, archivos, comentarios, logros, notificaciones, eventos, contacto, etc.)
- Storage buckets: avatars (publico), archivos (auth), avance-attachments (auth)
- Row Level Security (RLS) en todas las tablas
- Triggers automaticos para logros, conteo de votos, perfiles
- Realtime subscriptions para actividad en vivo

---

## Sistema de Temas

5 temas visuales disponibles: DivergencIA (default), Oceano, Bosque, Atardecer, Cyber.
Cambia colores dinamicamente via CSS custom properties.

---

## Credenciales de Prueba

| Rol | Email | Password |
|-----|-------|----------|
| Admin/Fundador | admin@divergencia.com | Admin2026! |
| Miembro (NLP) | maria@divergencia.com | Member2026! |
| Miembro (Vision) | carlos@divergencia.com | Admin2026! |
| Miembro (Datos) | ana@divergencia.com | Admin2026! |

---

## Contribuir

Ver [CONTRIBUTING.md](./CONTRIBUTING.md) para guias de contribucion.

---

## Licencia

Proyecto privado del Semillero DivergencIA. Todos los derechos reservados.
