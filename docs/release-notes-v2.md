# DivergencIA — Plataforma del Semillero de Investigación en IA
## Documentación de entrega v2.0

> Fecha: Abril 2026  
> Proyecto: Semillero universitario de investigación en inteligencia artificial  
> Stack: React 18 + Vite · Supabase (Postgres + Auth + Realtime) · Google Gemini · Vercel

---

## Descripción general

**DivergencIA** (también conocida como ATHENIA) es una plataforma web completa para la gestión colaborativa de semilleros universitarios de investigación en IA. Centraliza en un solo lugar la gestión de proyectos, banco de ideas, aprendizaje estructurado, comunicación en tiempo real, y un asistente de IA integrado.

---

## Módulos de la plataforma

### 1. Dashboard
- Panel principal con estadísticas del semillero en tiempo real: miembros activos, proyectos, ideas, tareas pendientes
- Feed de actividad reciente: commits conceptuales, tareas completadas, logros obtenidos
- Widget de tareas personales pendientes con acceso directo
- Widget de timeline con últimos eventos del sistema
- Sistema de **logros/gamificación**: badges por participación, investigación, colaboración — con sonido al desbloquear

### 2. Proyectos
- Creación y gestión de proyectos de investigación con área, estado y descripción
- **Tablero Kanban** con arrastre entre columnas: `Pendiente → En progreso → Revisión → Completada`
- Gestión de **miembros del proyecto**: roles, invitaciones, aprobaciones
- **Métricas automáticas**: porcentaje de avance calculado desde tareas completadas
- **Avances** (commits de investigación): registro de hitos con descripción
- **Diagramas** integrados (ReactFlow): diagramas de clase, flujo, entidad-relación, conceptuales y más — con nodos personalizados
- **Biblioteca de archivos** del proyecto con historial de versiones
- Editor de **métricas personalizadas** para indicadores específicos del proyecto

### 3. Ideas
- Banco de ideas vinculadas a proyectos
- Sistema de **votación** (votos a favor / en contra) para priorizar ideas
- **Ideas derivadas** (padre-hijo): crear ideas hijas desde una idea existente, con breadcrumb al padre
- Modal de detalle con descripción completa, estado, historial y sección de ideas derivadas
- Filtros por estado, área y proyecto

### 4. Aprendizaje
- **Temas de aprendizaje** organizados por categoría (ML, NLP, Vision, Datos) y nivel (básico, intermedio, avanzado)
- Cada tema tiene secciones de múltiples tipos:
  - **Texto**: markdown enriquecido con imágenes inline
  - **Código**: bloque con resaltado de sintaxis
  - **Quiz**: preguntas de opción múltiple con verificación y navegación entre preguntas (si hay varias)
  - **Tarjetas (Flashcards)**: frente/reverso con animación flip y navegación prev/next
  - **Imagen**: campo URL con preview y placeholder de error
  - **Video**: embed automático de YouTube o reproductor HTML5 para URL directa
  - **Presentaciones**: Google Slides (auto-embed), Canva, Miro, Prezi, OneDrive, o carrusel de imágenes con prev/next y dots
- **Constructor visual** al crear un tema: sin JSON manual, campos intuitivos por tipo de sección
- **Editar sección** desde el detalle del tema: mismo constructor visual con botón **"Generar con IA"** para quiz y tarjetas (usando Google Gemini)
- **Árbol de habilidades** (SkillTree) que mapea temas completados a skills del investigador
- Seguimiento de progreso: temas completados, porcentaje por categoría

### 5. Nodos / Grupos
- Comunidades internas dentro del semillero (grupos de investigación, áreas, proyectos especiales)
- Solicitud de ingreso al nodo con flujo de aprobación por admin/directora
- Canales de chat dentro de cada nodo
- Membresías y roles por nodo

### 6. Chat y Comunicación
- **Canales grupales** en tiempo real (Supabase Realtime WebSocket)
- **Mensajes directos** entre miembros
- **Llamadas de audio/video** peer-to-peer (WebRTC con señalización por Supabase Realtime)
- Historial de llamadas con participantes
- Notificaciones de mensajes no leídos
- Soporte para imágenes y archivos en mensajes

### 7. Roadmap y Cronología
- **Fases del semillero**: definición de etapas con fechas y descripción
- **Hitos**: puntos de control dentro de las fases
- **Cronología** visual de proyectos y miembros por fase
- **Feed de actividad** (Timeline) integrado: registro automático de acciones del sistema (proyectos creados, tareas completadas, ideas añadidas, etc.)

### 8. Calendario
- Eventos del semillero y académicos
- Vinculación de eventos con proyectos o nodos
- Vista mensual con indicadores visuales por día

### 9. Biblioteca
- Repositorio centralizado de archivos del semillero
- **Historial de versiones** por archivo (subir versión nueva sin perder anteriores)
- Filtros por tipo (PDF, imagen, código, presentación, etc.)
- Control de **visibilidad**: público, miembros del semillero, o usuarios específicos
- Descarga y vista previa

### 10. Murales
- Pizarrones colaborativos con elementos: títulos, stickies, textos, etiquetas, formas, checklists, links
- **ATHENIA sugiere layouts** con un comando: `/mural sugerir <tema>` genera un layout con JSON listo para importar
- Análisis de murales existentes con IA: `/mural analizar` describe estructura y elementos faltantes
- Persistencia en base de datos, acceso por proyecto o usuario

### 11. Red de Miembros
- **Grafo de conexiones** visual entre miembros del semillero (3D con Three.js)
- Perfil de cada miembro: bio, habilidades, proyectos, logros, estadísticas
- Filtros por área de investigación y rol

### 12. ATHENIA — Asistente IA
Asistente de inteligencia artificial integrado con Google Gemini, con dos modos de interacción:

**Lenguaje natural** (conversación directa):
- Responde preguntas técnicas de IA/ML: transformers, RAG, difusión, NLP, Computer Vision, MLOps, RL, LLMs, etc.
- Sugiere papers de arXiv con contexto: autores, relevancia, año
- Conecta preguntas del usuario con proyectos e ideas del semillero actual
- Genera hipótesis de investigación y formula preguntas de investigación delimitadas
- Reconoce temas existentes en la plataforma para evitar duplicados
- Detecta acrónimos técnicos (LLM, NLP, IA, RAG) incluso en frases largas

**Comandos del terminal** (`/comando`):
| Comando | Función |
|---------|---------|
| `/help` | Lista todos los comandos disponibles |
| `/status` | Estadísticas actuales del semillero |
| `/members` | Lista de miembros activos |
| `/projects` | Proyectos en curso |
| `/ideas` | Ideas del banco con votos |
| `/tasks` | Tareas pendientes del usuario |
| `/roadmap` | Fases y hitos del semillero |
| `/mural sugerir <tema>` | Genera layout de mural con IA |
| `/mural analizar` | Analiza el último mural del usuario |
| `/buscar <tema>` | Busca en papers y datasets sugeridos |
| `/conectar "<A>" "<B>"` | Analiza conexión semántica entre dos temas |
| `/imagen` | Analiza imagen de pizarrón o diapositiva |
| `/crear-tema` | Crea un tema de aprendizaje (admin/directora) |
| `/crear-proyecto` | Crea un proyecto (admin/directora) |
| `/crear-idea` | Añade una idea al banco |
| `/anuncio <mensaje>` | Envía anuncio al semillero (admin/directora) |

### 13. Notificaciones
- Notificaciones en tiempo real (campana): nuevas ideas, tareas asignadas, aprobaciones, anuncios, logros
- **Notificaciones por email** (vía Resend): bienvenida, magic link de autenticación, invitaciones
- **Novedades de versión** (changelog): modal automático al iniciar sesión cuando hay una versión nueva, con comparación IA entre versiones
- Preferencias de notificación por tipo, configurables por el usuario

### 14. Panel de Administración
- Gestión de usuarios: roles (admin, directora, investigador, estudiante), activación/desactivación
- Configuración de la plataforma: nombre del semillero, descripción, área principal
- Gestión de nodos y miembros del semillero
- Publicación de novedades de versión (changelog)
- Vista de solicitudes de ingreso pendientes

### 15. Autenticación y Privacidad
- **Magic link** (sin contraseña): el usuario recibe un enlace por email para iniciar sesión
- Configuración de privacidad por usuario: perfil privado/público, mostrar correo, mostrar en grafo, compartir actividad
- **Preferencias de accesibilidad**: reduce motion (animaciones reducidas, activo por defecto), sounds enabled

---

## Arquitectura técnica

| Capa | Tecnología | Función |
|------|-----------|---------|
| Frontend | React 18 + Vite + React Router v6 | SPA (Single Page Application) |
| Estilos | Tailwind CSS v4 + Framer Motion | UI dark-first + animaciones |
| Backend/DB | Supabase (Postgres + Auth + Realtime) | Base de datos, autenticación, WebSockets |
| Edge Functions | Supabase Deno Functions | Envío de emails, broadcasts |
| IA | Google Gemini 2.5 Flash Lite | ATHENIA, quiz/flashcards IA, análisis de imágenes |
| Hosting | Vercel (CDN global) | Deploy automático desde GitHub |
| Emails | Resend | Emails transaccionales y notificaciones |
| 3D | Three.js (@react-three/fiber) | Grafo de miembros, efectos visuales |
| Drag & Drop | @dnd-kit | Kanban de tareas |
| Diagramas | ReactFlow | Editor de diagramas UML y conceptuales |

---

## Costo operativo (producción)

| Servicio | Plan | Costo |
|---------|------|-------|
| Vercel | Hobby | **Gratis** |
| Supabase | Free tier | **Gratis** hasta 500 MB BD / 1 GB Storage |
| Google Gemini API | Pay-per-use | ~$0.04 / 1M tokens (uso muy bajo) |
| Resend | Free tier | **Gratis** hasta 3,000 emails/mes |
| **Total estimado** | Fase semillero (<50 usuarios) | **~$0/mes** |

---

## Estado actual — Sprint de entrega

### Fixes aplicados en v2.0
| Área | Bug | Solución |
|------|-----|---------|
| Kanban | Arrastrar tarea no guardaba el estado | `dragStartEstado` ref guarda estado original al iniciar drag |
| Diagramas | Lienzo negro al agregar nodos | `fitView()` con 80ms delay reemplaza `setCenter` |
| Email | Links apuntaban a URL incorrecta | Usa `VITE_SITE_URL` env var en lugar de URL hardcoded |
| Cronología | Sin margen entre fases y actividad | `ActivityFeed` envuelto en `<div className="mt-6">` |
| Imágenes | Mostraban "Contenido visual" aunque fallaran | `ImageSection` detecta URLs inválidas y muestra placeholder |
| React Hooks | `useState` después de returns condicionales | Movido al top de función en `FlashcardsSection` y `PresentacionSection` |
| Quiz | No soportaba array de preguntas (generado por IA) | `QuizSection` ahora maneja arrays con navegación entre preguntas |
| ATHENIA | Respondía con sugerencias de mural en preguntas técnicas | System prompt separado: mural solo si se menciona explícitamente |

### Funcionalidades nuevas en v2.0
- Constructor visual de secciones de aprendizaje (quiz, tarjetas, imagen, video, presentaciones)
- Sección tipo "Presentación": Google Slides, Canva, Miro, Prezi, carrusel de imágenes
- Quiz multi-pregunta con navegación
- Sonido al obtener un logro (con distinción por tier)
- ATHENIA reconoce temas existentes antes de crear duplicados

---

## Acciones manuales pendientes

| Acción | Dónde |
|--------|-------|
| Renombrar proyecto en Vercel a "athenia" | Vercel Dashboard → Settings → General |
| Configurar `VITE_SITE_URL=https://athenia.vercel.app` | Vercel → Environment Variables |
| Verificar dominio de envío en Resend | resend.com/domains → agregar secreto `FROM_EMAIL` en Supabase |
| Aplicar `011_usuarios_privacy_columns.sql` si no está | Supabase Dashboard → SQL Editor |

---

## Recomendaciones de infraestructura

### Opción 1: Servicios externos gestionados (Recomendado - Costo: ~$0/mes)

**Para semillero activo (<50 usuarios):**
- **Frontend**: Vercel (Hobby plan) → gratis, CDN global, CI/CD automático
- **Base de datos + Auth + WebSockets**: Supabase (Free tier) → gratis, postgres, realtime
- **IA**: Google Gemini API → pay-per-use (~$0.04 / 1M tokens)
- **Emails**: Resend → gratis (3,000 emails/mes)
- **NO necesita servidor propio** ✅

### Opción 2: Servidor dedicado (Si universidad requiere hosting local)

**Configuración mínima recomendada:**

| Recurso | Cantidad | Propósito |
|---------|----------|----------|
| **CPU** | 4 cores | Node.js frontend + modelos ligeros locales |
| **RAM** | 8 GB | Aplicación React + caché de sesiones |
| **SSD** | 50 GB | Sistema operativo + aplicación + logs |
| **OS** | Ubuntu 22.04 LTS | Linux estable para servidor |

**Stack en servidor local:**
```
- Nginx (reverse proxy + SSL)
- Node.js 20 LTS (servir React build)
- Docker (opcional, contenedores para aplicaciones)
- PostgreSQL 15 (si no usan Supabase externo)
```

**Recursos por módulo de la plataforma:**

| Módulo | CPU | RAM | Almacenamiento | Ubicación |
|--------|-----|-----|-----------------|-----------|
| Dashboard + UI | ← ligero → | ← ligero → | 100 MB | Vercel / Nginx |
| Proyectos + Kanban | ← ligero → | ← ligero → | 500 MB | Vercel / Nginx |
| Ideas + votación | ← ligero → | ← ligero → | 200 MB | Vercel / Nginx |
| Aprendizaje + temas | ← ligero → | ← ligero → | 2 GB | Vercel / Nginx + Storage |
| Chat en tiempo real | ← moderado → | ← moderado → | 500 MB | Supabase Realtime |
| Videollamadas WebRTC | ← ligero (P2P) → | ← ligero → | ← ninguno → | Navegadores + TURN server |
| ATHENIA IA | ← ninguno (cloud) → | ← ninguno → | ← ninguno → | Google Gemini API |
| Biblioteca de archivos | ← ligero → | ← ligero → | **10-100 GB** | Storage (Supabase / local) |
| Murales colaborativos | ← ligero → | ← ligero → | 1 GB | Supabase Realtime |
| Base de datos | **requiere servidor** | ← significativo → | ← variable → | PostgreSQL 15+ |

### Opción 3: Servidor robusto (Si universidad crece o aloja más proyectos)

**Configuración escalable:**

| Recurso | Cantidad | Propósito |
|---------|----------|----------|
| **CPU** | 8+ cores | Más usuarios simultáneos, procesamiento local |
| **RAM** | 16-32 GB | Base de datos + caché + sesiones concurrentes |
| **SSD** | 200+ GB | BD grande + archivos del semillero |
| **Backup** | 200 GB | Redundancia de datos |

**Stack adicional:**
```
- Redis (caché de sesiones + Realtime opcional)
- PostgreSQL 15+ con replicación
- Prometheus + Grafana (monitoreo)
- Nginx + Load Balancer (múltiples instancias)
```

### Recomendación final para la dirección del semillero

✅ **Usar Vercel + Supabase** (opciones 1) — la plataforma está optimizada para esta arquitectura serverless
- Cero costo inicial
- Escalabilidad automática
- Mantenimiento mínimo
- Si en el futuro necesitan hosting local → migrar a opción 2/3 es sencillo

⚠️ **Si la universidad requiere hosting 100% local:**
- Mínimo opción 2 (4 cores, 8 GB RAM) — suficiente para el semillero
- Opción 3 recomendada si planean más de 200 usuarios o proyectos grandes con modelos IA locales
