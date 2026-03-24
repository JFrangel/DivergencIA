# Biblioteca — Mejoras y Fixes (2026-03-22)

## Resumen

Refactorización completa del módulo Biblioteca (`/library`). Se pasó de un grid básico a un sistema completo de gestión de archivos con previsualizaciones ricas, control de visibilidad, edición inline y favoritos anclados.

---

## Fixes Críticos

### Imágenes no se cargaban
- **Causa:** El bucket `archivos` de Supabase Storage tenía `public = false`, por lo que las URLs públicas generadas con `getPublicUrl()` eran inaccesibles.
- **Fix:** `UPDATE storage.buckets SET public = true WHERE id = 'archivos'`

### Error al eliminar archivos (path incorrecto)
- **Causa:** `url.split('/archivos/')[1]` fallaba con la estructura de URL real de Supabase (`/object/public/archivos/...`).
- **Fix:** Función `extractPath()` con marcador `/object/public/archivos/` + `decodeURIComponent` + strip de query params.

### Tags no se mostraban
- **Causa:** `Library.jsx` usaba `f.etiquetas` pero la columna en DB se llama `tags`.
- **Fix:** Normalización a `f.tags || []` en todos los componentes.

---

## Nuevas Features

### A. Sistema de Visibilidad de Archivos
**Migración SQL:**
```sql
ALTER TABLE archivos ADD COLUMN IF NOT EXISTS visibilidad TEXT DEFAULT 'todos';
ALTER TABLE archivos ADD COLUMN IF NOT EXISTS visibilidad_usuarios UUID[] DEFAULT '{}';
```

**Opciones de visibilidad:**
| Valor | Descripción |
|-------|-------------|
| `todos` | Cualquier persona con acceso |
| `miembros` | Todos los miembros del semillero |
| `seleccionados` | Solo los miembros que elijas (picker con lista) |
| `fundadores` | Solo miembros fundadores |
| `privado` | Solo tú y los admins |

**Admin bypass:** El hook `useLibrary` detecta si el usuario tiene `rol = 'admin'` o `'directora'` y omite el filtro de visibilidad — ven todos los archivos.

**`VisibilidadPanel`:** Panel en el modal de preview (solo para el dueño y admins). Al seleccionar "Miembros específicos", carga automáticamente hasta 50 miembros activos como checklist con filtro de búsqueda inline.

### B. Tarjetas Simétricas (FileCard)
Todas las tarjetas tienen header fijo de `h-36`:
- **Imágenes:** Thumbnail con `object-cover`, escala en hover, fallback a icono en error.
- **Otros tipos:** Fondo coloreado (`${color}10`) con icono grande centrado (40px, 40% opacidad).
- Badge de tipo en top-left, botón de favorito en top-right.
- Badge de visibilidad bajo el nombre del archivo.

### C. Upload con Configuración de Visibilidad
`FileUploadZone` rediseñado con:
- Límite de 50 MB con toast de error por archivo que lo supere.
- Selector de visibilidad (4 opciones) antes de subir.
- Cola de archivos con preview de nombre/tamaño y botón de quitar.

### D. Favoritos
- Almacenados en `localStorage` bajo clave `divergencia_lib_favorites`.
- Botón estrella en cada tarjeta y en el modal de preview.
- Toggle "Solo favoritos" en la barra de filtros (con contador).
- **Anclado al inicio:** Los favoritos aparecen primero en "Todos los archivos" independientemente del orden de sort seleccionado.

### E. Ordenamiento y Filtros
- Sort: Más recientes, más antiguos, nombre A-Z / Z-A, mayor tamaño, más descargados.
- Filtro por tipo (select dropdown).
- Búsqueda por nombre **o etiquetas**.
- Filter por tags (chips seleccionables, generados dinámicamente de los archivos cargados).
- Sección "Esta semana" al inicio cuando no hay filtros activos.

### F. Acciones con Feedback
- **Copiar enlace:** `navigator.clipboard.writeText()` con fallback a `execCommand('copy')`. Toast `'Enlace copiado'`.
- **Descargar:** Anchor element con atributo `download` para forzar descarga. Toast `'Descargando...'`.
- **Eliminar:** Toast de confirmación (`toast()` con `action/cancel`) antes de borrar. No se elimina sin confirmar.
- **Editar archivo:** Botón lápiz (dueño + admin) abre `FileEditModal` para cambiar nombre, descripción y tags.

### G. Edición Inline de Archivos de Texto
Para archivos de código/texto/markdown, el dueño puede editar el contenido directamente en el preview:
- Botón "Editar" en el header del preview de código.
- Cambia de vista read-only (pre con syntax highlight) a textarea editable.
- "Guardar" hace re-upload al mismo path en Supabase Storage con `upsert: true`.
- Función `updateContent(id, url, text)` en `useLibrary`.

### H. Comentarios en Archivos
- `CommentSection archivoId={file.id}` montado dentro del modal de preview.
- Migración: `ALTER TABLE comentarios ADD COLUMN IF NOT EXISTS archivo_id UUID REFERENCES archivos(id) ON DELETE CASCADE`.
- `useComentarios` extendido para aceptar `archivoId`.

---

## Previsualizaciones Soportadas

### Con contenido real

| Categoría | Extensiones | Descripción |
|-----------|------------|-------------|
| **Imagen** | `.png .jpg .jpeg .gif .webp .svg .bmp .ico .tiff .avif .heic` | Visor con lightbox fullscreen al hacer clic |
| **PDF** | `.pdf` | iframe embebido + link "Abrir en nueva pestaña" |
| **Video** | `.mp4 .webm .ogg .mov .avi .mkv` | Reproductor HTML5 nativo con controles |
| **Audio** | `.mp3 .wav .ogg .flac .aac .m4a` | Reproductor HTML5 con visualización de nombre |
| **CSV/TSV** | `.csv .tsv .jsonl .ndjson` | Tabla con header + primeras 20 filas, contadores |
| **Código** | `.js .jsx .ts .tsx .py .json .css .html .yml .sql .sh .go .rs .java .kt .dart .c .cpp .rb .php .tex .xml .graphql .proto .srt .vtt...` | Syntax highlighting por lenguaje, editable (dueño) |
| **Texto plano** | `.txt .log .ini .cfg .conf .rst .nfo` | Vista de texto con contador de líneas, editable (dueño) |
| **Markdown** | `.md .markdown .rst` | Renderizado HTML: headers, listas, código, links, imágenes, blockquotes, bold/italic |
| **Jupyter Notebook** | `.ipynb` | Celdas con tipo (code/markdown), número de ejecución, outputs (texto, errores, imágenes base64). Hasta 30 celdas. |
| **Fuentes** | `.ttf .otf .woff .woff2` | Preview de la fuente con texto de muestra a distintos tamaños |

### Con tarjeta de descarga (no previewable en browser)

| Categoría | Extensiones |
|-----------|------------|
| **Excel** | `.xls .xlsx .xlsm .ods` |
| **Word** | `.doc .docx .odt .rtf` |
| **Presentación** | `.ppt .pptx .odp` |
| **Archivo comprimido** | `.zip .rar .7z .tar .gz .bz2 .xz` |
| **Modelo 3D** | `.obj .stl .glb .gltf .fbx .dae .ply .3ds` |

---

## Migraciones SQL Aplicadas

```sql
-- 1. Columna de roles múltiples en miembros_proyecto
ALTER TABLE miembros_proyecto ALTER COLUMN rol_equipo DROP NOT NULL;
ALTER TABLE miembros_proyecto ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{}';

-- 2. Comentarios en archivos y visibilidad
ALTER TABLE comentarios ADD COLUMN IF NOT EXISTS archivo_id UUID REFERENCES archivos(id) ON DELETE CASCADE;
ALTER TABLE archivos ADD COLUMN IF NOT EXISTS visibilidad TEXT DEFAULT 'todos';
ALTER TABLE archivos ADD COLUMN IF NOT EXISTS visibilidad_usuarios UUID[] DEFAULT '{}';

-- 3. Bucket público
UPDATE storage.buckets SET public = true WHERE id = 'archivos';
```

---

## Hooks Actualizados

### `useLibrary`
```js
return {
  files, loading, uploading,
  refetch,      // recargar manualmente
  upload,       // subir archivo con metadatos y visibilidad
  remove,       // eliminar archivo y del storage
  incrementDescargas,
  updateFile,         // cambiar nombre, descripción, tags
  updateVisibilidad,  // cambiar visibilidad y usuarios específicos
  updateContent,      // re-subir contenido de texto al storage (upsert)
}
```

### `useComentarios`
Acepta `{ avanceId, ideaId, proyectoId, archivoId }` — cualquier combinación para filtrar comentarios por entidad.

---

## Archivos Modificados

| Archivo | Cambio |
|---------|--------|
| `hooks/useLibrary.js` | Visibilidad, admin bypass, updateFile, updateContent |
| `hooks/useComentarios.js` | Soporte archivoId |
| `pages/app/Library.jsx` | Sort, favoritos anclados, FileEditModal, updateContent |
| `components/library/FileCard.jsx` | Header simétrico, visibilidad badge, edit button, copy/delete feedback |
| `components/library/FilePreview.jsx` | +12 categorías preview, VisibilidadPanel con checklist, edición inline, comentarios |
| `components/library/FileUploadZone.jsx` | Límite 50MB, selector visibilidad |
| `components/ui/CommentSection.jsx` | Prop archivoId |
