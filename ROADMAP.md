# DivergencIA — ROADMAP v1.x

> Plan de desarrollo priorizado. Se marca ✅ cuando está en producción, 🔄 cuando está en progreso.

---

## ✅ v1.0.0 — Plataforma base (completado)

### Infraestructura & BD
- [x] Supabase Auth (magic link + Google OAuth)
- [x] RLS habilitado en todas las tablas
- [x] Realtime subscriptions para mensajes y notificaciones
- [x] Migrations 001–033 aplicadas
- [x] Optimización Disk IO: REPLICA IDENTITY DEFAULT en 5 tablas
- [x] Índices críticos: notificaciones(usuario_id, leida), nodo_miembros(usuario_id), eventos(fecha)
- [x] Columna `notificaciones.titulo` (fix crítico de notifs silenciosas)
- [x] Tabla `novedades_version` para changelog
- [x] Tabla `galeria_eventos` para blog/galería del semillero
- [x] FKs con CASCADE correctos en versiones_archivo, votos_ideas, comentarios, mensajes
- [x] FKs completos en solicitudes_proyecto (usuario_id, respondida_por)

### Frontend
- [x] React 18 + Vite + React Router v6
- [x] Tailwind v4 + Framer Motion + dark-first UI
- [x] Sidebar y Navbar con nombre/logo dinámico desde admin
- [x] Barrido completo de hardcodes "DivergencIA"/"ATHENIA"
- [x] Sistema de temas (ThemeContext)

### Módulos operativos
- [x] Proyectos: CRUD, Kanban, avances, solicitudes de membresía
- [x] Ideas: votación, fusión, edición, eliminación
- [x] Chat: canales, DMs, grupos, nodo-channels, realtime
- [x] Videollamadas WebRTC (audio/video, screen share, reacciones)
- [x] A.T.H.E.N.I.A: IA con Gemini 1.5 Pro + memoria por usuario
- [x] Aprendizaje: temas, secciones, quizzes, learning path
- [x] Árbol de habilidades dinámico (por área + proyectos + temas)
- [x] Sistema de logros: 1068 achievements en 6 tiers
- [x] Biblioteca digital: archivos, versiones, categorías
- [x] Murales colaborativos (whiteboard)
- [x] Diagrams editor (draw.io-like)
- [x] Calendario con eventos de proyectos y nodos
- [x] Universo (grafo de miembros/proyectos/ideas)
- [x] Roadmap público
- [x] Notificaciones en tiempo real + campana
- [x] Panel Admin: usuarios, solicitudes, nodos pendientes, moderación, config

### Admin
- [x] Nombre y logo de plataforma configurable
- [x] Changelog de versiones (escritura y publicación)
- [x] Broadcast de mensajes a todos los miembros
- [x] Gestión de nodos: aprobar, rechazar, administrar
- [x] Solicitudes de ingreso al semillero
- [x] Solicitudes de ingreso a nodos (fix FK hint)

---

## 🔄 v1.1.0 — Fixes & Experiencia (en progreso)

### ✅ Fixes completados en esta fase
- [x] **Biblioteca — editar archivo** — formulario no sincronizaba (useState → useEffect con file.id)
- [x] **Biblioteca — eliminar archivo** — fallaba por FK en versiones_archivo; ahora elimina versiones antes del archivo principal
- [x] **Biblioteca — admin puede eliminar** — canDelete ahora incluye isAdmin
- [x] **Logros — notificación "undefined"** — `def.label` no existe; corregido a `def.name` + `def.tierLabel`
- [x] **Nodo join requests** — notificaciones a admins usaban caché; ahora query directa a nodo_miembros en requestJoinNodo

### 🔴 Fixes bloqueantes pendientes
- [ ] **Llamadas — link de invitación** — el link `/chat?canal=X` no une a llamada en curso; falta leer estado activo desde BD y mostrar banner "Unirse"

### 🟡 Landing mejorada
- [ ] **Fundadores desde BD** — fetch `usuarios` donde `es_fundador=true`, mostrar foto real, carrusel si >4
- [ ] **Galería de eventos** — nueva sección en Landing con cards tipo blog + modal de detalle
- [ ] **Más animaciones** — parallax en mouse sobre floating pills, hover 3D en feature cards, ticker de stats
- [ ] **Link Docs** en Navbar y footer → `https://docs.athenia.ai/bienvenida`

### 🟡 Admin
- [ ] **GaleriaManager** — panel para subir fotos de eventos/reuniones con descripción y publicación
- [ ] **Tab Galería** en AdminPanel

### 🟡 Red de miembros
- [ ] Nodo central más grande con logo de plataforma
- [ ] Fundadores con corona/estrella dorada y tamaño mayor
- [ ] Admins con badge de escudo
- [ ] Conexiones con grosor variable según actividad

### 🟡 Llamadas
- [ ] Estado `activa` en `historial_llamadas` al iniciar
- [ ] Banner "📞 Llamada en curso · N participantes · Unirse" en ChatArea
- [ ] ChannelList: icono pulsante en canales con llamada activa
- [ ] CallModal: countdown de duración, mejora UI participantes

---

## 📋 v1.2.0 — Línea de Tiempo & Colaboración

### Línea de tiempo cronológica
> Conectada con **todo lo que sucede en el semillero**: proyectos, ideas, avances, eventos, logros, miembros nuevos, nodos aprobados. Excluye: mensajes de chat (privacidad), datos internos de admin.

- [ ] **Tabla `timeline_eventos`** en BD — columnas: `tipo`, `titulo`, `descripcion`, `referencia_id`, `referencia_tabla`, `usuario_id`, `nodo_id`, `proyecto_id`, `es_publico`, `created_at`
- [ ] **Hook `useTimeline`** — fetch paginado con filtros por tipo/proyecto/nodo, realtime subscription
- [ ] **Triggers automáticos** — insertar en timeline cuando:
  - Se crea/actualiza un proyecto (estado cambia)
  - Se publica un avance de proyecto
  - Se aprueba una idea
  - Se crea un evento de calendario
  - Se desbloquea un logro destacado (tier ≥ oro)
  - Se aprueba un nodo
  - Un nuevo miembro es aceptado
  - Se sube un archivo a la biblioteca
- [ ] **Página `/timeline`** — feed vertical cronológico, filtros por tipo, búsqueda, infinite scroll
- [ ] **Widget en Dashboard** — últimas 5 entradas del timeline del usuario/semillero
- [ ] **Timeline por proyecto** — tab en ProjectDetail mostrando historia del proyecto

### Colaboración avanzada
- [ ] Comentarios en proyectos y avances
- [ ] Menciones (@usuario) en chat con notificación
- [ ] Reacciones con emoji en mensajes (ya hay en llamadas, extender a chat)
- [ ] Búsqueda global mejorada (proyectos + ideas + miembros + archivos)
- [ ] Filtros avanzados en banco de ideas
- [ ] Export de proyectos a PDF/markdown
- [ ] Integración con Google Scholar / Semantic Scholar para papers

---

## 📋 v1.3.0 — Onboarding & Comunidad

- [ ] Tour guiado para nuevos miembros (tooltips + steps)
- [ ] Perfil público mejorado con portafolio de proyectos
- [ ] Sistema de mentoría: emparejar estudiantes con investigadores senior
- [ ] Eventos del semillero con RSVP y recordatorio
- [ ] Newsletter automático semanal con resumen de actividad

---

## 📋 v2.0.0 — Multi-semillero & IA avanzada

- [ ] Multi-tenant: varios semilleros en la misma plataforma
- [ ] URL personalizable por semillero (`{semillero}.athenia.ai`)
- [ ] A.T.H.E.N.I.A v2: análisis de papers, sugerencia de colaboradores, detección de duplicados en ideas
- [ ] Grafo de conocimiento semántico (embeddings de papers + proyectos)
- [ ] Integración con repositorios de código (GitHub/GitLab)
- [ ] API pública para integración con herramientas externas

---

## 🔧 Deuda técnica

- [ ] Tests unitarios en hooks críticos (useIdeas, useProjects, useCall)
- [ ] Tests E2E (Playwright) para flujos de Auth y Chat
- [ ] Migrar a Supabase Storage para archivos (actualmente URLs externas)
- [ ] PWA: service worker + offline básico + install prompt
- [ ] Performance: virtualización de listas largas (react-virtual)
- [ ] Accesibilidad: aria-labels, navegación por teclado, alto contraste

---

## 🌐 Infraestructura & Dominio

- [ ] Dominio: migrar URL de proyecto a `athenia.ai`
  - [ ] Configurar en Vercel dashboard
  - [ ] Actualizar `VITE_SITE_URL` en variables de entorno
  - [ ] Actualizar redirect URLs en Supabase Auth
  - [ ] Actualizar `FROM_EMAIL` en Resend para dominio verificado
- [ ] CI/CD: push workflow a `.github/workflows/ci.yml` (requiere PAT con scope `workflow`)
- [ ] CDN para assets estáticos (imágenes de galería → Supabase Storage)

---

## 📌 Notas del equipo

- Stack: React 18 + Vite + Tailwind v4 + Framer Motion + Supabase + Gemini
- **Nunca** usar `"use client"`, Next.js App Router, ni SSR — es Vite puro
- Hooks regla: siempre antes de cualquier `return` condicional
- Icons: verificar nombre antes de usar (`FiLightbulb` no existe → usar `HiLightBulb`)
- `npm install` siempre con `--legacy-peer-deps`
- Migraciones: aplicar con MCP Supabase, luego crear archivo `.sql` local para doc
- Achievement fields: usar `def.name` (no `def.label`) y `def.tierLabel` (no `def.tier`)

---

*Última actualización: v1.1.0 — Abril 2026*
