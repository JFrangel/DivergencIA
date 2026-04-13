# DivergencIA — Release Notes v2.0

> Período: Sprint de entrega final  
> Commits: `d76ecf1` → `830af9d`

---

## ✅ Bugs corregidos

| Área | Problema | Solución |
|------|----------|----------|
| **Kanban** | Arrastrar tarea no cambiaba el estado | `handleDragEnd` usaba estado ya actualizado por `handleDragOver`. Ahora guarda el estado original en `dragStartEstado` ref al iniciar el drag |
| **Diagramas (ProjectDetail)** | Lienzo negro, nodos no se veían al agregarlos | Reemplazado `setCenter` por `fitView()` con 80 ms de delay; también se llama `fitView` al cargar un diagrama guardado |
| **Email** | Links apuntaban a `https://divergencia.app` (hardcoded) | `emailTemplates.js` ahora usa `import.meta.env.VITE_SITE_URL` |
| **Email (nombre)** | Llegaban como "divergencia" | Inherente a Gmail SMTP: cambia el nombre en Google Account → Personal Info → Nombre a "DivergencIA" |
| **Cronología** | Sin margen entre fases y feed de actividad | `ActivityFeed` envuelto en `<div className="mt-6">` |
| **Secciones de aprendizaje** | Imágenes mostraban alt text "Contenido visual" | `ImageSection` detecta URLs inválidas y muestra placeholder con ícono; `onError` oculta `<img>` fallidas |

---

## 🆕 Funcionalidades añadidas

### Aprendizaje — Constructor de temas visual
- **Quiz**: editor visual de preguntas (pregunta, 4 opciones, respuesta correcta, explicación). No más JSON a mano.
- **Tarjetas (Flashcards)**: editor frente/reverso, agregar/eliminar tarjetas. Renderizadas con animación flip en TopicDetail.
- **Imagen**: campo URL con preview en vivo.
- **Video**: campo URL con embed de YouTube o `<video>` para URL directa.
- **Presentación (nuevo tipo)**: soporta:
  - Google Slides (auto-convierte URL a embed)
  - Canva, Miro, Prezi, OneDrive (iframe genérico)
  - **Carrusel de diapositivas**: pega múltiples URLs de imagen (una por línea) → prev/next con dots

### Editar sección — constructores visuales
- Al pulsar "Editar sección" desde TopicDetail, el modal ahora muestra el mismo constructor visual según el tipo (quiz, tarjetas, imagen, video, presentación)
- **Generar con IA**: botón para quiz y tarjetas que llama a Gemini y rellena el builder automáticamente

### Logros — Sonido al desbloquear
- Al obtener un logro, suena `achievement()` (acorde C-E-G-C)
- Logros de tier platino/diamante/legendario suenan `levelUp()` (escala ascendente)
- Respeta la configuración `sounds_enabled` del usuario

### ATHENIA — Lenguaje natural mejorado
- Detección de temas existentes por coincidencia de keywords (no solo substring)
- Acronismos cortos como "LLM", "NLP", "IA" se detectan aunque estén enterrados en una frase larga
- Muestra hasta 3 temas relacionados con categoría + instrucciones claras

### Ideas derivadas
- `parent_id` en tabla `ideas` (migración aplicada)
- UI en `IdeaDetailModal`: sección "Ideas derivadas", breadcrumb de idea padre, formulario para crear idea hija

### Timeline fusionado en Cronología
- Timeline desaparecido del navbar
- `ActivityFeed` integrado al final de `CronologiaView` en Roadmap

### Reduce Motion — ON por defecto
- `localStorage.getItem('reduce_motion') !== 'false'` → activo a menos que el usuario lo desactive explícitamente
- Mejora el rendimiento en dispositivos lentos

---

## ⚙ Stack y requisitos de servidor

Para desplegar la plataforma completa, un servidor universitario debería tener:

| Recurso | Mínimo recomendado |
|---------|-------------------|
| CPU | 4 cores (x86_64) |
| RAM | 8 GB |
| Almacenamiento | 50 GB SSD |
| OS | Ubuntu 22.04 LTS |
| Red | Puerto 80/443 abierto, IP pública o dominio |

**Software requerido:**
- Nginx (servidor web / reverse proxy)
- Node.js 20 LTS (para build de frontend y posible SSR)
- Docker + Docker Compose (para aislar servicios)
- PostgreSQL 15+ (si se quiere self-host la BD en lugar de Supabase)
- Certbot (SSL gratuito vía Let's Encrypt)

**Servicios externos que el servidor NO necesita correr (ya son managed):**
- Supabase: base de datos, auth, realtime, edge functions
- Vercel: hosting del frontend (gratuito)
- Google Gemini API: IA (API key)
- Gmail SMTP o Resend: emails

**Si quieren self-hosteau TODO en el servidor universitario:**
- Supabase Self-Hosted via Docker: ~4 GB RAM extra
- Se necesitaría dominio propio + certificado SSL
- Recomendado mínimo: **8 cores, 16 GB RAM, 100 GB SSD** para producción compartida con varios proyectos

---

## 📌 Pendiente (acciones manuales en Supabase/Vercel)

| Acción | Dónde |
|--------|-------|
| Cambiar nombre Gmail a "DivergencIA" | Google Account → Personal Info |
| Verificar dominio en Resend | resend.com/domains → agregar secret `FROM_EMAIL` |
| Configurar env vars en Vercel | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GEMINI_API_KEY`, `VITE_SITE_URL` |
| Aplicar migration `011_usuarios_privacy_columns.sql` | Supabase Dashboard → SQL Editor |
