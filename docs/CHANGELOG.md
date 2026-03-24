# DivergencIA — Changelog

## [2026-03-18] Massive Platform Iteration

### Build Status: PASSING (1946 modules, 534ms, 0 errors)

### All Features Completed & Verified

**Core Fixes**
- [x] **Universo Graph Draggable** — Fixed ReactFlow remount issue, nodes now draggable with controlled state
- [x] **Kanban Drag & Drop** — Tasks persist to Supabase on drag, priority color indicators, assignee avatars
- [x] **Diagrams Editing** — Double-click to edit nodes, delete key removes nodes/edges, diagram delete button
- [x] **Workflows Editing** — Double-click edit modal, undo (Ctrl+Z, 30-step history), node deletion
- [x] **Library File Preview** — FilePreview component with PDF embed, image lightbox, code syntax, download
- [x] **Calendar Event Editing** — Edit/delete events with admin controls
- [x] **Project Team Fix** — TeamSection component, proper member rendering with error handling
- [x] **Registration Bug** — carrera and area_investigacion now saved on signup

**New Pages & Sections**
- [x] **Arcade** (`/arcade`) — 8 retro games: Snake, Pong, Memory Cards, Typing Speed, Space Invaders, Racing, Platformer, Breakout
- [x] **Personal Workspace** (`/workspace`) — Notes (rich text editor), Snippets (code/text), Files (upload to Supabase)
- [x] **Mural/Canvas Board** (`/mural`) — Sticky notes, text cards, images, freehand drawing, zoom/pan, auto-save
- [x] **Notification Center** (`/notificaciones`) — Full page with filters, admin broadcast form
- [x] **Zen Mode** (`/zen`) — 5 breathing patterns, 7 ambient sounds, Pomodoro timer, stats tracking

**Enhanced Features**
- [x] **Graph Layout Modes** — Force, Radial, and Tree layouts with BFS algorithms
- [x] **Profile Image/Banner Upload** — Avatar and banner upload to Supabase `avatars` bucket
- [x] **Dynamic Banners** — 6 canvas animations: Dino Run, Space Flight, Ocean Waves, Matrix Rain, Particle Swarm, City Skyline
- [x] **Roadmap Auto-Update** — Milestone completion auto-transitions phase estado, progress rings and bars
- [x] **Learning Interactivity** — Progress tracking (Supabase + localStorage), stats bar, grid/path view, quiz feedback
- [x] **Learning Admin Editing** — Admin/directora can edit sections, reorder, add/delete topics
- [x] **Skill Tree** — Connected to learning progress and project contributions, data-driven levels
- [x] **Member Network** — SVG node graph with area clustering, inter-group connections, admin drag
- [x] **Achievements System** — 12 achievements across 5 categories (Aprendizaje, Ideas, Proyectos, Social, Arcade)
- [x] **Roles Expansion** — 6 roles: invitado, miembro, egresado, colaborador, admin, directora
- [x] **Ideas Detail Modal** — Full expansion with description, voting, comments, tags, related ideas
- [x] **Ideas Voting Timer** — fecha_limite_votacion with countdown, closed voting state
- [x] **Ideas Merge Selection** — Choose method: Combinar, Absorber, Nueva síntesis
- [x] **Notifications System** — NotificationBell in TopBar, dropdown, admin broadcasts, real-time
- [x] **Sound System** — Web Audio API sounds (click, success, error, notification, achievement), SoundToggle
- [x] **More Diagram Types** — 14 node types across 5 categories: Class, Flowchart, ER, Sequence, Mind Map
- [x] **Personalized Email Templates** — 6 branded HTML templates: bienvenida, evento, idea aprobada, tarea, resumen semanal, broadcast

**Infrastructure**
- [x] **Documentation** — docs/CHANGELOG, docs/ARCHITECTURE, docs/DEPLOY
- [x] **Edge Functions** — send-email + notify-members (Supabase)
- [x] **Magic Link Login** — Email-based passwordless authentication
- [x] **DB Schema Updates** — banner_url, titulo, website_url columns
- [x] **TopBar Route Labels** — All 19 routes properly labeled in breadcrumb
- [x] **Notification Route** — `/notificaciones` with "Ver todas" link from bell dropdown

### Sidebar Navigation (Complete)
```
PRINCIPAL:     Dashboard, Proyectos, Ideas, Biblioteca, Aprendizaje
COMUNIDAD:     Miembros, Universo, Roadmap, Calendario
IA:            A.T.H.E.N.I.A
PERSONAL:      Mi Espacio
HERRAMIENTAS:  Diagramas, Mural, Arcade
ADMIN:         Panel Admin
BOTTOM:        Tema, Modo Zen, Configuración, Mi Perfil, Cerrar sesión
```

### Known Issues (Non-blocking)
- [ ] ~405 hardcoded theme colors still need CSS variable migration
- [ ] React style property warnings on Landing page (backgroundPosition/backgroundSize)
- [ ] THREE.Clock deprecation warnings (should use THREE.Timer)
- [ ] Large chunk sizes (AdminPanel 431KB, react-three-fiber 871KB) — code splitting recommended
