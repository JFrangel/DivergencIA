# 🚀 PLAN COMPLETO DE CORRECCIONES — DivergencIA
**Fecha**: 2026-04-05
**Objetivo**: Llevar DivergencIA a estado 100% producción
**Estado Actual**: 75% listo

---

## 📋 TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Problemas Críticos (🔴)](#problemas-críticos)
3. [Problemas Mayores (🟠)](#problemas-mayores)
4. [Problemas Moderados (🟡)](#problemas-moderados)
5. [Problemas Menores (🟢)](#problemas-menores)
6. [Plan de Implementación por Fases](#plan-de-implementación-por-fases)
7. [Testing & QA](#testing--qa)
8. [Deployment Checklist](#deployment-checklist)

---

## 📊 RESUMEN EJECUTIVO

### Estado General
- **Componentes implementados**: 194 archivos
- **Funcionalidades**: 15 módulos principales
- **Migraciones**: 16/17 aplicadas
- **Problemas detectados**: 19 total
  - 🔴 Críticos: 3
  - 🟠 Mayores: 5
  - 🟡 Moderados: 7
  - 🟢 Menores: 4

### Tiempo Estimado de Correcciones
- **Críticos**: 3-4 horas
- **Mayores**: 6-8 horas
- **Moderados**: 10-12 horas
- **Menores**: 4-6 horas
- **Testing**: 8-10 horas
- **Total**: 31-40 horas (4-5 días de trabajo)

### Riesgos Principales
- ⚠️ API key de Resend expuesta (SEGURIDAD)
- ⚠️ Emails a usuarios externos no funcionarán (FUNCIONALIDAD)
- ⚠️ Migración 011 bloquea funciones de privacidad (DATOS)

---

---

# 🔴 PROBLEMAS CRÍTICOS

## P1: API Key de Resend Hardcodeada

### Descripción
**Archivo**: `supabase/functions/send-email/index.ts:3`

La API key de Resend está hardcodeada en el código fuente como fallback:
```ts
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || 're_PesrK9Kb_6tZww8sZwtZs9BgQm7CFLFKW'
```

### Riesgos
- 🚨 **CRÍTICO**: La clave está expuesta en el historial de git
- 🚨 Cualquiera con acceso al repo puede usar tu cuenta de Resend
- 🚨 Potencial para abuse, envío de spam masivo
- 🚨 Violación de seguridad en SOC 2/GDPR

### Solución

**Paso 1**: Revocar la clave actual
1. Ve a https://resend.com/api-keys
2. Elimina la clave `re_PesrK9Kb_6tZww8sZwtZs9BgQm7CFLFKW`
3. Crea una nueva clave

**Paso 2**: Actualizar el código
```ts
// supabase/functions/send-email/index.ts - línea 3
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

if (!RESEND_API_KEY) {
  console.error('RESEND_API_KEY no configurada en variables de entorno')
  throw new Error('RESEND_API_KEY environment variable is required')
}
```

**Paso 3**: Configurar en Supabase
1. Ve a Supabase Dashboard → Project Settings → Edge Functions → Secrets
2. Agrega la nueva clave: `RESEND_API_KEY = <tu_nueva_clave>`
3. Redeploy la función

**Paso 4**: Limpiar historial de git (IMPORTANTE)
```bash
# Remover la clave del historial
git filter-branch --tree-filter 'sed -i "s/re_PesrK9Kb_6tZww8sZwtZs9BgQm7CFLFKW//g" supabase/functions/send-email/index.ts' HEAD

# O usar BFG Repo-Cleaner (mejor opción)
bfg --replace-text replacements.txt
# donde replacements.txt contiene: re_PesrK9Kb_6tZww8sZwtZs9BgQm7CFLFKW

# Force push
git push origin --force --all
```

**Archivos a Modificar**:
- ✏️ `supabase/functions/send-email/index.ts`

**Tiempo**: 30 minutos

---

## P2: Migración 011 No Aplicada (usuarios_privacy_columns)

### Descripción
**Archivo**: `supabase/migrations/011_usuarios_privacy_columns.sql`

La migración 011 añade columnas críticas a la tabla `usuarios`:
- `perfil_privado` BOOLEAN
- `mostrar_correo` BOOLEAN
- `mostrar_actividad` BOOLEAN
- `mostrar_en_grafo` BOOLEAN
- `athenia_memory` TEXT (para persistencia de memoria de Athenia)

El código frontend y Athenia las referencian pero **no existen en la BD**.

### Impacto
- ❌ Panel de Configuración de Privacidad no funciona (Settings.jsx)
- ❌ Athenia Memory no persiste
- ❌ RLS policies no pueden validar `mostrar_en_grafo`
- ❌ MemberNetwork genera errores al filtrar perfiles privados

### Solución

**Paso 1**: Aplicar la migración en Supabase Dashboard
1. Ve a https://app.supabase.com/project/bmbgjvmmwwogwecyxezx/sql/new
2. Copia el contenido de `supabase/migrations/011_usuarios_privacy_columns.sql`
3. Ejecuta la migración
4. Verifica que las columnas se crearon: `SELECT * FROM usuarios LIMIT 1;`

**Paso 2**: Verificar columnas agregadas
```sql
-- Ejecuta esto para verificar
\d usuarios;
-- Debe mostrar:
-- perfil_privado | boolean | default false
-- mostrar_correo | boolean | default false
-- mostrar_actividad | boolean | default false
-- mostrar_en_grafo | boolean | default false
-- athenia_memory | text | NULL
```

**Paso 3**: Setear valores por defecto para usuarios existentes
```sql
UPDATE usuarios
SET perfil_privado = false,
    mostrar_correo = false,
    mostrar_actividad = true,
    mostrar_en_grafo = true
WHERE perfil_privado IS NULL;
```

**Archivos a Modificar**:
- 📊 Supabase Dashboard (no archivo local)

**Tiempo**: 15 minutos

---

## P3: Resend Sandbox Limitation - Dominios No Verificados

### Descripción
**Archivo**: `supabase/functions/send-email/index.ts:6`

Resend usa `onboarding@resend.dev` en sandbox. Este email **solo puede enviar a direcciones registradas en tu cuenta de Resend** (típicamente el email del propietario).

```ts
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'DivergencIA <onboarding@resend.dev>'
```

### Impacto
- ❌ **Emails a usuarios externos fallarán** sin excepción visible
- ❌ Bienvenida de nuevos usuarios no se entrega
- ❌ Notificaciones por email no funcionan
- ❌ Reset de contraseña no se puede hacer por email

### Solución

**Opción A: Verificar un Dominio Propio (RECOMENDADO)**

**Paso 1**: Obtener dominio (si no tienes)
- Compra en GoDaddy, Namecheap, etc.
- Ejemplo: `noreply.divergencia.ai` o `mail.divergencia.ai`

**Paso 2**: Verificar en Resend
1. Ve a https://resend.com/domains
2. Click "Add Domain"
3. Ingresa tu dominio (ej: `divergencia.ai`)
4. Sigue las instrucciones DNS (usualmente agregar CNAME/MX records)
5. Resend verificará automáticamente (puede tomar 5-30 minutos)

**Paso 3**: Actualizar la función
```ts
// supabase/functions/send-email/index.ts - línea 6
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'DivergencIA <noreply@divergencia.ai>'
```

**Paso 4**: Agregar secreto en Supabase
1. Supabase Dashboard → Project Settings → Edge Functions → Secrets
2. Agrega: `FROM_EMAIL = DivergencIA <noreply@divergencia.ai>`
3. Redeploy la función

**Opción B: Temporal - Usar Email Registrado en Resend**

Si no tienes dominio propio aún:

**Paso 1**: Registra usuarios en Resend
1. Ve a https://resend.com/audiences
2. Agrega cada email de usuario como "trusted recipient"
3. (No escalable para muchos usuarios)

**Paso 2**: Usa Resend Domains API
```ts
// Próxima versión: agregar endpoint para registrar emails
const res = await fetch('https://api.resend.com/audience/contacts', {
  method: 'POST',
  headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
  body: JSON.stringify({ email: userEmail })
})
```

### Archivos a Modificar
- ✏️ `supabase/functions/send-email/index.ts` (FROM_EMAIL)
- 📊 Supabase Dashboard (agregar secreto FROM_EMAIL)

### Tiempo
- Con dominio verificado: 1-2 horas (incluyendo DNS)
- Sin dominio: 30 minutos (solución temporal)

### Prioridad
🔴 **CRÍTICA** - Sin esto, ningún usuario puede recibir emails

---

---

# 🟠 PROBLEMAS MAYORES

## P4: Errores Silenciosos en useCall (Camera/Mic)

### Descripción
**Archivo**: `frontend/src/hooks/useCall.js:44-50`

Los bloques `catch` están vacíos, ocultando fallos en enumerar dispositivos:

```js
const refreshDevices = useCallback(async () => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices()
    setCameras(devices.filter(d => d.kind === 'videoinput'))
    setMics(devices.filter(d => d.kind === 'audioinput'))
  } catch {} // ← Error silencioso
}, [])
```

### Problemas Causados
- 👤 Usuario no sabe por qué no hay cámaras/micrófonos disponibles
- 📹 Llamadas fallan sin razón aparente
- 🐛 Debug imposible (sin logs)

### Solución

**Paso 1**: Agregar logging y estado de error

```js
import { toast } from 'sonner'

export function useCall(canalId) {
  const [deviceError, setDeviceError] = useState(null)

  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cameras = devices.filter(d => d.kind === 'videoinput')
      const mics = devices.filter(d => d.kind === 'audioinput')

      if (cameras.length === 0) {
        const msg = 'No se detectó cámara. Verifica permisos o hardware.'
        setDeviceError(msg)
        console.warn(msg)
      }
      if (mics.length === 0) {
        const msg = 'No se detectó micrófono. Verifica permisos o hardware.'
        setDeviceError(msg)
        console.warn(msg)
      }

      setCameras(cameras)
      setMics(mics)
      setDeviceError(null)
    } catch (error) {
      const msg = `Error al enumerar dispositivos: ${error.message}`
      console.error(msg)
      setDeviceError(msg)
      toast.error('No se pueden acceder a cámara/micrófono. Verifica permisos.')
    }
  }, [])

  // Retornar deviceError para que la UI lo muestre
  return {
    // ... otros campos
    deviceError,
    refreshDevices,
  }
}
```

**Paso 2**: Mostrar error en la UI (CallModal.jsx)

```jsx
// En CallModal o llamada pre-call setup
if (deviceError) {
  return (
    <div className="p-4 bg-red-900/20 border border-red-500 rounded-lg">
      <p className="text-red-200">{deviceError}</p>
      <p className="text-red-100/60 text-sm mt-2">
        Verifica permisos del navegador: Configuración → Privacidad → Cámara/Micrófono
      </p>
    </div>
  )
}
```

**Archivos a Modificar**:
- ✏️ `frontend/src/hooks/useCall.js` (líneas 44-50, agregar estado deviceError)
- ✏️ `frontend/src/components/chat/CallModal.jsx` (mostrar error)

**Tiempo**: 45 minutos

---

## P5: Condición de Carrera en Historial de Llamadas

### Descripción
**Archivo**: `frontend/src/hooks/useCall.js`

Cuando se inicia una llamada, se crea un registro en `historial_llamadas`:

```js
// En startCall()
const { data } = await supabase
  .from('historial_llamadas')
  .insert({ canal_id, participantes: [], estado: 'activa' })
  .select()
  .single()

callHistoryIdRef.current = data.id
```

Si la llamada se desconecta abruptamente (usuario cierra navegador, error de red), el registro se queda en estado `activa` eternamente.

### Problemas Causados
- 📊 Reportes muestran llamadas "eternas"
- 🧮 Conteo de duración incorrecta
- 👥 Participantes no se limpian

### Solución

**Paso 1**: Agregar timeout de limpieza

```js
export function useCall(canalId) {
  const cleanupTimeoutRef = useRef(null)

  const endCall = useCallback(async () => {
    // Limpiar timeout anterior
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current)
    }

    if (callHistoryIdRef.current && user) {
      const duration = Math.floor(
        (Date.now() - (callStartTimeRef.current || 0)) / 1000
      )

      await supabase
        .from('historial_llamadas')
        .update({
          estado: 'finalizada',
          duracion_segundos: duration,
          participantes: participants.map(p => ({ id: p.id, nombre: p.name }))
        })
        .eq('id', callHistoryIdRef.current)
    }

    // Limpiar referencias
    callHistoryIdRef.current = null
    setCallState('idle')
  }, [user, participants])

  // Al desmontar, limpiar historial si está en estado "activa"
  useEffect(() => {
    return () => {
      if (callHistoryIdRef.current && callStateRef.current !== 'idle') {
        // Enviar solicitud sin esperar
        supabase
          .from('historial_llamadas')
          .update({
            estado: 'cancelada',
            razon: 'Desconexión inesperada'
          })
          .eq('id', callHistoryIdRef.current)
          .catch(err => console.error('Cleanup error:', err))
      }
    }
  }, [])

  return {
    // ...
    endCall,
  }
}
```

**Paso 2**: Agregar trigger en Supabase para limpiar llamadas huérfanas

```sql
-- En una migración nueva (018)
CREATE OR REPLACE FUNCTION public.cleanup_abandoned_calls()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Marcar como canceladas las llamadas que llevan >2 horas activas
  UPDATE public.historial_llamadas
  SET estado = 'cancelada',
      razon = 'Limpieza automática - llamada abandonada'
  WHERE estado = 'activa'
    AND created_at < NOW() - INTERVAL '2 hours';
END;
$$;

-- Trigger diario
SELECT cron.schedule('cleanup_abandoned_calls', '0 * * * *', 'SELECT cleanup_abandoned_calls()');
```

**Archivos a Modificar**:
- ✏️ `frontend/src/hooks/useCall.js` (endCall, useEffect cleanup)
- ✏️ `supabase/migrations/018_cleanup_abandoned_calls.sql` (nueva)

**Tiempo**: 1 hora

---

## P6: N+1 Queries en useAthenia buildContext

### Descripción
**Archivo**: `frontend/src/hooks/useAthenia.js:43-58`

Para construir contexto para Gemini, hace 6 queries separadas:

```js
const [
  { count: miembros },
  { count: totalProyectos },
  { count: totalIdeas },
  { data: proyectosActivos },
  { data: ideasTop },
  { data: muralesUsuario },
] = await Promise.all([
  // 6 queries a Supabase
])
```

Con Promise.all(), ejecutan en paralelo, pero siguen siendo 6 round-trips.

### Problemas Causados
- 🐢 **~500ms latencia** en cada llamada a Athenia
- 💰 Alto uso de Supabase quotas
- 📈 Mala experiencia con conexiones lentas

### Solución

**Opción A: Crear RPC que retorne todo (RECOMENDADO)**

**Paso 1**: Crear RPC en Supabase

```sql
-- Nueva migración (019)
CREATE OR REPLACE FUNCTION public.build_athenia_context(p_user_id UUID)
RETURNS TABLE (
  total_miembros BIGINT,
  total_proyectos BIGINT,
  total_ideas BIGINT,
  proyectos_activos JSONB,
  ideas_top JSONB,
  murales_usuario JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM usuarios WHERE activo = true)::BIGINT,
    (SELECT COUNT(*) FROM proyectos)::BIGINT,
    (SELECT COUNT(*) FROM ideas)::BIGINT,
    COALESCE(
      jsonb_agg(jsonb_build_object('titulo', titulo, 'estado', estado, 'area', area))
      FILTER (WHERE titulo IS NOT NULL),
      '[]'::jsonb
    ),
    COALESCE(
      jsonb_agg(jsonb_build_object('titulo', titulo, 'votos', votos_favor))
      FILTER (WHERE titulo IS NOT NULL),
      '[]'::jsonb
    ),
    COALESCE(
      jsonb_agg(jsonb_build_object('titulo', titulo, 'tipo', tipo, 'elementos', jsonb_array_length(data->'elements')))
      FILTER (WHERE titulo IS NOT NULL),
      '[]'::jsonb
    )
  FROM (
    SELECT titulo, estado, area FROM proyectos
    WHERE estado IN ('activo', 'investigacion', 'desarrollo')
    LIMIT 5
  ) p,
  (
    SELECT titulo, votos_favor FROM ideas
    ORDER BY votos_favor DESC
    LIMIT 3
  ) i,
  (
    SELECT titulo, tipo, data FROM murales
    WHERE creador_id = p_user_id
    ORDER BY updated_at DESC
    LIMIT 3
  ) m;
END;
$$;

GRANT EXECUTE ON FUNCTION public.build_athenia_context(UUID) TO authenticated;
```

**Paso 2**: Usar RPC en hook

```js
// useAthenia.js
const buildContext = useCallback(async () => {
  if (!user) return ''

  try {
    const { data, error } = await supabase
      .rpc('build_athenia_context', { p_user_id: user.id })

    if (error) {
      console.error('Error building context:', error)
      return 'Contexto no disponible'
    }

    const {
      total_miembros,
      total_proyectos,
      total_ideas,
      proyectos_activos,
      ideas_top,
      murales_usuario
    } = data[0]

    // Construir string...
    return `...contexto...`
  } catch (err) {
    console.error('Context build error:', err)
    return 'Error al obtener contexto'
  }
}, [user])
```

**Opción B: Cachear contexto por 5 minutos (RÁPIDA)**

Si no quieres crear RPC:

```js
const buildContext = useCallback(async () => {
  const cacheKey = `athenia_context:${user?.id}`
  const cached = localStorage.getItem(cacheKey)
  const cachedTime = localStorage.getItem(`${cacheKey}:time`)

  // Si está en cache y menos de 5 min, retornar
  if (cached && cachedTime && Date.now() - parseInt(cachedTime) < 5 * 60 * 1000) {
    return JSON.parse(cached)
  }

  // Si no, buscar
  const context = await fetchContextFromSupabase()
  localStorage.setItem(cacheKey, JSON.stringify(context))
  localStorage.setItem(`${cacheKey}:time`, Date.now().toString())
  return context
}, [user])
```

**Archivos a Modificar**:
- ✏️ `supabase/migrations/019_athenia_context_rpc.sql` (nueva)
- ✏️ `frontend/src/hooks/useAthenia.js` (líneas 43-80)

**Tiempo**: 1.5 horas (opción A) / 30 min (opción B)

**Impacto**: -400ms latencia en Athenia 🚀

---

## P7: Filtrado Client-Side en useProjects

### Descripción
**Archivo**: `frontend/src/hooks/useProjects.js:46-56`

Cuando filtras proyectos por usuario, obtiene **todos** y filtra en JavaScript:

```js
if (!all && userId) {
  const { data, error } = await query // ← Sin WHERE, obtiene TODO
  if (error) { ... }
  const filtered = (data || []).filter(p =>
    p.creador_id === userId ||
    p.miembros?.some(m => m.usuario?.id === userId && m.activo)
  ) // ← Filtrado aquí
}
```

Con 1000+ proyectos, esto:
- Descarga 1000+ objetos
- Filtra 1000+ en memoria
- Tarda 2-3 segundos

### Solución

**Opción A: Usar RLS + ON DELETE (RECOMENDADO)**

Las políticas RLS ya están configuradas. Solo necesitas usar `SELECT` sin WHERE:

```js
// useProjects.js - reemplazar líneas 32-64
const fetch = useCallback(async (background = false) => {
  if (!user && !all) return
  if (!background) setLoading(true)

  let query = supabase
    .from('proyectos')
    .select(`
      *,
      creador:usuarios!creador_id(id, nombre, foto_url, area_investigacion),
      miembros:miembros_proyecto(
        usuario_id,
        usuario:usuarios(id, nombre, foto_url, area_investigacion),
        rol_equipo, roles, activo
      )
    `)
    .order('created_at', { ascending: false })
    .limit(50) // ← Agregar limit y paginación

  // RLS automáticamente filtra según el usuario
  // No necesitas WHERE porque la política lo hace

  const { data, error } = await query
  if (error) {
    console.error('Error fetching projects:', error)
    setLoading(false)
    return
  }

  setCached(cacheKey, data || [])
  setProjects(data || [])
  setLoading(false)
}, [user, all, cacheKey])
```

**Opción B: Crear vista SQL para usuario actual**

```sql
-- Nueva migración (020)
CREATE OR REPLACE VIEW public.user_proyectos AS
SELECT DISTINCT p.*
FROM public.proyectos p
WHERE p.creador_id = auth.uid()
   OR EXISTS (
     SELECT 1 FROM public.miembros_proyecto mp
     WHERE mp.proyecto_id = p.id
       AND mp.usuario_id = auth.uid()
       AND mp.activo = true
   );

ALTER VIEW public.user_proyectos OWNER TO postgres;
GRANT SELECT ON public.user_proyectos TO authenticated;
```

Luego en el hook:

```js
const { data } = await supabase
  .from('user_proyectos')
  .select(`...`)
  .order('created_at', { ascending: false })
```

**Archivos a Modificar**:
- ✏️ `frontend/src/hooks/useProjects.js` (remover filtrado client-side)
- ✏️ `supabase/migrations/020_user_proyectos_view.sql` (opcional)

**Tiempo**: 30 minutos

---

---

# 🟡 PROBLEMAS MODERADOS

## P8: Sin Paginación en useChat, useIdeas

### Descripción
**Archivos**: `useChat.js`, `useIdeas.js`, `useNotifications.js`

Los hooks cargan datos con `limit(50)` sin paginación:

```js
.select(...)
.order('...')
.limit(50) // Siempre primeros 50
```

Con 1000+ mensajes, solo ve los primeros 50.

### Solución

**Implementar Infinite Scroll + Cursor Pagination**

**Paso 1**: Agregar estado de paginación

```js
export function useChat() {
  const [messages, setMessages] = useState([])
  const [cursor, setCursor] = useState(null)
  const [hasMore, setHasMore] = useState(true)

  const fetchMore = useCallback(async () => {
    let query = supabase
      .from('mensajes')
      .select('...', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(50)

    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data, count } = await query
    if (data?.length < 50) setHasMore(false)

    const lastMessage = data?.[data.length - 1]
    if (lastMessage) setCursor(lastMessage.created_at)

    setMessages(prev => [...prev, ...data])
  }, [cursor])

  return { messages, fetchMore, hasMore }
}
```

**Paso 2**: Agregar Intersection Observer en componente

```jsx
import { useEffect, useRef } from 'react'

export function ChatArea() {
  const { messages, fetchMore, hasMore } = useChat()
  const endRef = useRef(null)

  useEffect(() => {
    if (!hasMore) return

    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        fetchMore()
      }
    })

    if (endRef.current) observer.observe(endRef.current)
    return () => observer.disconnect()
  }, [hasMore, fetchMore])

  return (
    <>
      {/* Mensajes */}
      {messages.map(m => <MessageBubble key={m.id} {...m} />)}
      {hasMore && <div ref={endRef} className="h-1" />}
      {!hasMore && <p className="text-center text-gray-400">No hay más mensajes</p>}
    </>
  )
}
```

**Archivos a Modificar**:
- ✏️ `frontend/src/hooks/useChat.js` (agregar cursor, hasMore)
- ✏️ `frontend/src/hooks/useIdeas.js` (idem)
- ✏️ `frontend/src/components/chat/ChatArea.jsx` (agregar Intersection Observer)
- ✏️ `frontend/src/pages/app/Ideas.jsx` (idem)

**Tiempo**: 2 horas

---

## P9: localStorage en Render (Hydration Mismatch)

### Descripción
**Problema**: Componentes leen `localStorage` directamente durante render

```jsx
export default function Settings() {
  // ❌ Malo
  const [sounds] = useState(() =>
    JSON.parse(localStorage.getItem('sounds_enabled') || 'true')
  )

  // En el render
  const isEnabled = localStorage.getItem('sounds_enabled') === 'true' // ❌ SSR fail
}
```

En servidor (o hydration), localStorage no existe → error.

### Solución

**Crear Custom Hook useLocalStorage**

```js
// lib/useLocalStorage.js
export function useLocalStorage(key, defaultValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return defaultValue
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  })

  const setValueWithStorage = useCallback((newValue) => {
    try {
      const valueToStore = newValue instanceof Function ? newValue(value) : newValue
      setValue(valueToStore)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.error(`Error saving to localStorage:`, error)
    }
  }, [key, value])

  return [value, setValueWithStorage]
}
```

**Uso**:

```jsx
// ✅ Bueno
export default function Settings() {
  const [sounds, setSounds] = useLocalStorage('sounds_enabled', true)
  const [reduce_motion, setReduceMotion] = useLocalStorage('reduce_motion', false)

  return (
    <Toggle
      checked={sounds}
      onChange={setSounds}
      label="Sonidos"
    />
  )
}
```

**Archivos a Modificar**:
- ✏️ `frontend/src/lib/useLocalStorage.js` (crear)
- ✏️ `frontend/src/pages/app/Settings.jsx` (reemplazar localStorage)
- ✏️ Todos los componentes que usen localStorage

**Grep para encontrar usos**:
```bash
grep -r "localStorage" frontend/src --include="*.jsx" --include="*.js"
# Buscar todos y reemplazar con useLocalStorage
```

**Tiempo**: 1.5 horas

---

## P10: Errores de API Silenciosos en Notificaciones

### Descripción
**Archivo**: `useProjects.js:21`

Cuando falla crear una notificación, se log en consola pero no se muestra:

```js
const { error } = await supabase
  .from('notificaciones')
  .insert({ ... })
if (error) console.error('Error creating notification:', error) // Solo log
```

El usuario no sabe que su notificación falló.

### Solución

**Opción A: Mostrar Toast (Para el usuario)**

```js
import { toast } from 'sonner'

async function createNotification(userId, tipo, mensaje, referenciaId) {
  if (!userId) return
  const { error } = await supabase
    .from('notificaciones')
    .insert({ ... })

  if (error) {
    console.error('Notification error:', error)
    // ✅ Informar al usuario SOLO en contextos críticos
    if (tipo === 'error' || tipo === 'critica') {
      toast.error('No se pudo enviar notificación (sin efecto en la acción)')
    }
    return { error }
  }

  return { ok: true }
}
```

**Opción B: Retry Logic (Para confiabilidad)**

```js
async function createNotification(userId, tipo, mensaje, referenciaId) {
  const maxRetries = 3

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { error } = await supabase
      .from('notificaciones')
      .insert({ ... })

    if (!error) return { ok: true }

    if (attempt < maxRetries) {
      const delay = Math.pow(2, attempt) * 1000 // Exponential backoff
      await new Promise(r => setTimeout(r, delay))
    } else {
      console.error(`Notification failed after ${maxRetries} retries:`, error)
      // Fire-and-forget, pero log para debugging
    }
  }
}
```

**Archivos a Modificar**:
- ✏️ `frontend/src/hooks/useProjects.js` (createNotification)
- ✏️ `frontend/src/hooks/useChat.js` (notifyChannelMembers)

**Tiempo**: 45 minutos

---

## P11: Sin Fallback para Gemini API

### Descripción
**Archivo**: `lib/gemini.js`

Se repite en cada función:
```js
if (!client) throw new Error('VITE_GEMINI_API_KEY no configurada')
```

Si la clave falta, **Athenia completo falla**.

### Solución

**Crear Sistema de Fallback Graceful**

```js
// lib/gemini.js
import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY

let client = null
let isAvailable = false

if (API_KEY) {
  try {
    client = new GoogleGenerativeAI(API_KEY)
    isAvailable = true
  } catch (err) {
    console.warn('Gemini initialization failed:', err)
    isAvailable = false
  }
}

export function isGeminiAvailable() {
  return isAvailable
}

function throwIfUnavailable() {
  if (!isAvailable) {
    throw new Error(
      'Gemini API no está disponible. Configura VITE_GEMINI_API_KEY.'
    )
  }
}

// Mock response para fallback
const FALLBACK_RESPONSE = {
  suggestion: 'Habilita la IA configurando VITE_GEMINI_API_KEY para obtener sugerencias.',
  confidence: 0,
  timestamp: new Date().toISOString(),
}

export async function getSuggestion(prompt) {
  try {
    throwIfUnavailable()
    const model = client.getGenerativeModel({ model: 'gemini-pro' })
    const result = await model.generateContent(prompt)
    return result.response.text()
  } catch (err) {
    console.error('Gemini suggestion error:', err)
    return FALLBACK_RESPONSE.suggestion
  }
}

export async function streamResponse(prompt) {
  try {
    throwIfUnavailable()
    const model = client.getGenerativeModel({ model: 'gemini-pro' })
    return await model.generateContentStream(prompt)
  } catch (err) {
    console.error('Gemini stream error:', err)
    // Retornar stream mock que dice que está deshabilitado
    return {
      stream: async function*() {
        yield { text: () => FALLBACK_RESPONSE.suggestion }
      }
    }
  }
}
```

**En componente Athenia**:

```jsx
import { isGeminiAvailable } from '../../lib/gemini'

export default function Athenia() {
  const geminiAvailable = isGeminiAvailable()

  if (!geminiAvailable) {
    return (
      <div className="p-4 bg-yellow-900/20 border border-yellow-500 rounded-lg">
        <p className="text-yellow-200 font-semibold">
          🤖 Athenia deshabilitado
        </p>
        <p className="text-yellow-100/60 text-sm mt-2">
          Configura <code className="bg-black/30 px-1 rounded">VITE_GEMINI_API_KEY</code> para activar la IA.
        </p>
      </div>
    )
  }

  // ... resto del componente
}
```

**Archivos a Modificar**:
- ✏️ `frontend/src/lib/gemini.js` (agregar isAvailable, fallbacks)
- ✏️ `frontend/src/pages/app/Athenia.jsx` (check isGeminiAvailable())
- ✏️ `frontend/src/components/nexus/ATHENIA_Shell.jsx` (idem)

**Tiempo**: 1 hora

---

## P12-P14: Otros Moderados

| # | Problema | Solución Rápida | Tiempo |
|---|----------|-----------------|--------|
| P12 | Sin validación RLS en Admin | Agregar checks: `if (!isAdmin) throw` antes de cada operación | 1h |
| P13 | Canal global no se desuscribe | Agregar `globalCh.unsubscribe()` en cleanup | 20min |
| P14 | Magic strings ('grupo', 'admin') | Crear `src/lib/constants.js` y usarlos | 1h |

---

---

# 🟢 PROBLEMAS MENORES

| # | Problema | Solución | Tiempo |
|----|----------|----------|--------|
| M1 | Inconsistent error handling | Estandarizar a `try/catch` en hooks | 1.5h |
| M2 | Código comentado/muerto | Grep y remover | 30min |
| M3 | Sin TypeScript | Opcional: agregar JSDoc types | 4h+ |
| M4 | Código muerto: `.catch() {}` | Reemplazar con proper error handling | 45min |

---

---

# 📅 PLAN DE IMPLEMENTACIÓN POR FASES

## **FASE 1: CRÍTICOS (DÍA 1)** ⏱️ 4-5 horas

**Objetivo**: Remover bloqueadores de seguridad y funcionalidad

### Día 1 - Mañana (2 horas)

**Tarea 1.1**: Remover y revocar API key de Resend
- Busca la clave en todo el repo con grep
- Ejecuta git filter-branch para limpiar historio
- Crea nueva clave en Resend
- Actualiza código
- Deploy a Supabase

```bash
# Verificar que se eliminó
grep -r "re_PesrK9Kb" . --include="*.ts" --include="*.js" || echo "✅ Key removed"
```

**Archivo**: `supabase/functions/send-email/index.ts`

### Día 1 - Tarde (2-3 horas)

**Tarea 1.2**: Aplicar Migración 011 en Supabase Dashboard
- Copia SQL de `011_usuarios_privacy_columns.sql`
- Ejecuta en Supabase Dashboard
- Verifica columnas: `\d usuarios`
- Setea defaults para usuarios existentes

**Tarea 1.3**: Verificar Dominio de Resend
- Compra/obtén dominio si no tienes
- Agrega en Resend Domains
- Configura DNS records
- Una vez verificado, agrega secreto en Supabase: `FROM_EMAIL = noreply@tu-dominio.com`

**Archivos**:
- Supabase Dashboard (no local)
- `supabase/functions/send-email/index.ts` (FROM_EMAIL)

---

## **FASE 2: MAYORES (DÍA 2-3)** ⏱️ 6-8 horas

**Objetivo**: Arreglar funcionalidades rotas

### Día 2 - Completo (4 horas)

**Tarea 2.1**: Errar silenciosos en useCall → manejo con toast/estado
- Agregar `deviceError` state
- Envolver en try/catch con logs
- Mostrar error en UI (CallModal)
- Test en navegador: quitar permisos y verificar mensaje

**Tarea 2.2**: Condición de carrera en Historial de Llamadas
- Agregar cleanup en useEffect unmount
- Migración 018 con trigger de limpieza automática
- Crear función `cleanup_abandoned_calls()`

**Archivos**:
- `frontend/src/hooks/useCall.js`
- `frontend/src/components/chat/CallModal.jsx`
- `supabase/migrations/018_cleanup_abandoned_calls.sql` (nueva)

### Día 3 - Mañana (2-4 horas)

**Tarea 2.3**: N+1 Queries en Athenia
- **Opción rápida**: Implementar cache localStorage 5 minutos (30 min)
- **Opción correcta**: Crear RPC `build_athenia_context()` (1.5h)

Recomendación: Opción correcta

```sql
-- Migración 019
CREATE OR REPLACE FUNCTION public.build_athenia_context(...)
```

**Tarea 2.4**: Filtrado Client-Side en useProjects
- Remover filtrado manual
- Confiar en RLS de Supabase
- Agregar `limit(50)` para paginación

**Archivos**:
- `frontend/src/hooks/useAthenia.js`
- `supabase/migrations/019_athenia_context_rpc.sql` (nueva)
- `frontend/src/hooks/useProjects.js`

---

## **FASE 3: MODERADOS (DÍA 4)** ⏱️ 8-10 horas

**Objetivo**: Mejorar UX y performance

### Día 4 (Full day)

**Tarea 3.1**: Paginación Infinite Scroll (2 horas)
- Implementar cursor pagination en useChat, useIdeas
- Agregar Intersection Observer en componentes
- Test con 100+ items

**Tarea 3.2**: useLocalStorage Custom Hook (1.5 horas)
- Crear `lib/useLocalStorage.js`
- Reemplazar todos los `localStorage` directos
- Grep: `grep -r "localStorage" frontend/src`
- Verificar funcionamiento en Dev Tools

**Tarea 3.3**: Fallback para Gemini API (1 hora)
- Agregar `isGeminiAvailable()` check
- Mock responses cuando falta clave
- UI feedback si está deshabilitado

**Tarea 3.4**: Error Handling en Notificaciones (1 hora)
- Implementar retry logic
- Toast para errores críticos
- Log improvements

**Tarea 3.5**: Validación RLS en Admin (1h)
- Guards al inicio de funciones de admin
- Checks de rol `if (!isAdmin) throw`
- Test con user no-admin

**Tarea 3.6**: Limpiar Canales Globales (20 min)
- Agregar `globalCh.unsubscribe()` en cleanup
- Verificar no hay memory leaks

**Archivos**:
- `frontend/src/lib/useLocalStorage.js` (nueva)
- `frontend/src/hooks/useChat.js` (paginación)
- `frontend/src/hooks/useIdeas.js` (paginación)
- `frontend/src/lib/gemini.js` (fallbacks)
- `frontend/src/pages/app/Athenia.jsx` (isGeminiAvailable)
- `frontend/src/pages/admin/AdminPanel.jsx` (guards)
- `frontend/src/hooks/useCall.js` (cleanup)

---

## **FASE 4: MENORES + TESTING (DÍA 5)** ⏱️ 6-8 horas

### Mañana (3 horas)

**Tarea 4.1**: Code Quality
- Remover `.catch() {}` silenciosos (30 min)
- Crear `src/lib/constants.js` para magic strings (1h)
- Remover código comentado/muerto (1h)

**Archivos**:
- `src/lib/constants.js` (nueva)
- Múltiples hooks

### Tarde (3-5 horas)

**Tarea 4.2**: Testing Completo
- Ver sección [Testing & QA](#testing--qa)

---

---

# ✅ TESTING & QA

## 🧪 Testing Manual Checklist

### CRÍTICOS (Antes de deploy a producción)

- [ ] **Email Delivery**
  - [ ] Crear cuenta nueva → debe llegar welcome email
  - [ ] Recibir email en inbox (no spam)
  - [ ] Links en email funcionan
  - [ ] Reply-to está correcto

- [ ] **Migración 011**
  - [ ] Consulta DB: `SELECT perfil_privado, mostrar_correo FROM usuarios LIMIT 1;`
  - [ ] Columnas existen y tienen valores
  - [ ] Settings.jsx permite toggle privacidad
  - [ ] Valores persistem después de recargar

- [ ] **API Key Seguridad**
  - [ ] grep: `grep -r "RESEND_API_KEY" .` → no hardcodeada
  - [ ] grep: `grep -r "re_PesrK9Kb" .` → vacío
  - [ ] Nueva clave funciona

### MAYORES

- [ ] **Llamadas - Error Handling**
  - [ ] Deniega permisos de cámara/micrófono
  - [ ] Debe mostrar error en UI (no silencioso)
  - [ ] Toast: "No se pueden acceder a cámara/micrófono"

- [ ] **Llamadas - Limpieza**
  - [ ] Inicia llamada, cierra navegador abruptamente
  - [ ] Verifica DB: `SELECT * FROM historial_llamadas WHERE estado='activa'` → vacío
  - [ ] O estado = 'cancelada' con razón

- [ ] **Athenia Performance**
  - [ ] Chrome DevTools → Network
  - [ ] Mensaje en Athenia
  - [ ] Latencia < 500ms (antes era ~1s)
  - [ ] Log muestra una sola RPC call, no 6

- [ ] **Proyectos Filtering**
  - [ ] User A crea proyecto privado
  - [ ] User B no puede verlo
  - [ ] User A agrega User B como miembro
  - [ ] User B ahora lo ve
  - [ ] Sin errores en consola

### MODERADOS

- [ ] **Infinite Scroll**
  - [ ] Chat con 100+ mensajes
  - [ ] Scrollea hacia arriba
  - [ ] Cargan más mensajes automáticamente
  - [ ] No hay duplicados

- [ ] **localStorage**
  - [ ] Toggle "Sonidos" en Settings
  - [ ] Recarga página → valor persiste
  - [ ] DevTools → Application → localStorage
  - [ ] Sin hydration errors en consola

- [ ] **Gemini Fallback**
  - [ ] Quitta VITE_GEMINI_API_KEY del .env
  - [ ] Athenia muestra mensaje "deshabilitado"
  - [ ] No crash, UI sigue funcional
  - [ ] Restaura clave → Athenia vuelve a funcionar

- [ ] **Notificaciones Robustez**
  - [ ] Simulador: Make network offline
  - [ ] Crea proyecto → intenta crear notif
  - [ ] Después de retry lógica, se crea exitosamente
  - [ ] No hay spam de toasts

---

## 🔄 Testing de Regresión

**Ejecutar después de cada fase**:

```bash
# 1. Build sin errores
npm run build

# 2. ESLint sin critical warnings
npm run lint

# 3. Dev server sin errores en consola
npm run dev
# → Abre DevTools, recarga, busca errores rojo

# 4. Funcionalidades principales
# - Login/Signup
# - Crear proyecto
# - Chat en proyecto
# - Ideas voting
# - Calendar event
# - Llamada audio (si webcam disponible)
# - Settings & Privacy toggles
# - Admin panel (si admin)
```

---

---

# 🚀 DEPLOYMENT CHECKLIST

## Pre-Deployment (Antes de push a main)

- [ ] Todas las fases completadas
- [ ] Todos los tests pasados
- [ ] Sin `console.log()` de debug
- [ ] Sin comentarios con `// TODO` o `// FIXME`
- [ ] Commits limpios y descriptivos
- [ ] `git status` limpio (sin cambios uncommitted)

## Deployment Steps

### 1. GitHub
```bash
git add .
git commit -m "chore: fix production issues (P1-P14)"
git push origin main
```

### 2. Vercel (Automatic)
- [ ] Push a main trigger CI/CD
- [ ] Esperar deployment ~5 min
- [ ] Verificar no hay errores en deployment logs

### 3. Supabase
- [ ] Todas las migraciones (011, 018, 019, 020) aplicadas
- [ ] Secretos configurados:
  - [ ] `RESEND_API_KEY` = nueva clave
  - [ ] `FROM_EMAIL` = `DivergencIA <noreply@tu-dominio.com>`
  - [ ] `VITE_GEMINI_API_KEY` = clave pública (si aplicable)

### 4. Vercel Dashboard
- [ ] Environment variables:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
  - [ ] `VITE_GEMINI_API_KEY`
  - [ ] `VITE_SITE_URL`

### 5. Post-Deployment Testing
- [ ] Accede a https://divergencia.ai
- [ ] Intenta signup → debe llegar email
- [ ] Crea proyecto
- [ ] Configura privacidad → persiste
- [ ] Athenia funciona si Gemini key configurada
- [ ] Admin panel solo visible para admin

### 6. Monitoring
- [ ] Vercel Analytics: checks que no hay errores
- [ ] Supabase: monitor database stats
- [ ] Email logs: verifica entregas exitosas
- [ ] Error tracking: revisa logs por errores nuevos

---

---

# 📊 MATRIZ DE RIESGOS

| Problema | Severidad | Impacto | Mitigación |
|----------|-----------|---------|-----------|
| API key hardcodeada | 🔴 CRÍTICA | Security breach | Revocar + filter-branch |
| Migración 011 missing | 🔴 CRÍTICA | Funciones rotas | Aplicar en Supabase |
| Emails no se entregan | 🔴 CRÍTICA | Usuarios no pueden registrarse | Verificar dominio Resend |
| useCall errores silenciosos | 🟠 MAYOR | Llamadas fallan sin feedback | Toast + error state |
| N+1 queries Athenia | 🟠 MAYOR | Lentitud 1-2s | RPC batch |
| Client-side filtering | 🟠 MAYOR | Performance degrada | Confiar en RLS |
| Sin paginación | 🟡 MODERADO | UI lag con muchos datos | Infinite scroll |
| localStorage hydration | 🟡 MODERADO | SSR issues | Custom hook |
| Sin Gemini fallback | 🟡 MODERADO | Feature crashes | Graceful degradation |

---

---

# 📝 RESUMEN FINAL

## Próximos Pasos Inmediatos

**HOY**:
1. ❌ Revocar API key de Resend
2. ❌ Eliminar del historio de git
3. ❌ Crear nueva clave

**MAÑANA**:
4. ⏳ Aplicar migración 011 en Supabase Dashboard
5. ⏳ Verificar dominio en Resend
6. ⏳ Comenzar FASE 2

## Estimado Total
- **40-50 horas de desarrollo**
- **4-5 días trabajando 8-10 horas/día**
- **O 2 semanas a tiempo parcial (4h/día)**

## Versiones

| Versión | Fecha | Estado |
|---------|-------|--------|
| 0.75 | 2026-04-05 | Actual (75% producción-ready) |
| 0.90 | 2026-04-10 | Post FASE 1-2 (críticos + mayores arreglados) |
| 1.00 | 2026-04-15 | **PRODUCTION READY** |

---

**¿Preguntas o aclaraciones sobre el plan?** 👇

---

*Documento generado por: Claude Code Analysis*
*Última actualización: 2026-04-05*
