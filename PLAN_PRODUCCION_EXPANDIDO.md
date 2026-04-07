# 🚀 PLAN COMPLETO DE PRODUCCIÓN — DivergencIA
**Versión**: 2.0 (Expandida)
**Fecha**: 2026-04-05
**Estado Actual**: 75% producción-ready
**Objetivo**: 100% funcional para deployment a producción

---

## 📊 RESUMEN EJECUTIVO

### Estado General
- **Componentes implementados**: 194 archivos
- **Funcionalidades principales**: 15 módulos
- **Migraciones**: 17/17 planeadas (13 aplicadas, 4 pendientes)
- **Problemas identificados**: 19 total
  - 🔴 **Críticos**: 3 (bloquean producción)
  - 🟠 **Mayores**: 5 (afectan funcionalidad core)
  - 🟡 **Moderados**: 7 (impactan UX)
  - 🟢 **Menores**: 4 (code quality)

### Estimado de Tiempo
| Fase | Tiempo | Complejidad |
|------|--------|-----------|
| Críticos (P1-P3) | 4-5h | 🔴 Alta |
| Mayores (P4-P8) | 8-10h | 🟠 Media-Alta |
| Moderados (P9-P15) | 12-15h | 🟡 Media |
| Menores (P16-P19) | 3-4h | 🟢 Baja |
| Testing & QA | 10-12h | 🔵 Crítica |
| **TOTAL** | **37-46h** | **4-6 días** |

### Riesgos Críticos
| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|------------|--------|-----------|
| API key comprometida en git | 🔴 Alta | Crítico | Revocar inmediatamente, limpiar historio |
| RLS policies bloqueadas | 🔴 Alta | Crítico | Verificar en staging antes de prod |
| Emails no se envían | 🟠 Media | Alto | Verificar dominio de Resend |
| Race conditions en llamadas | 🟠 Media | Medio | Tests de carga |
| Pérdida de datos | 🟡 Baja | Crítico | Backup antes de migraciones |

---

## 🔴 FASE 1: PROBLEMAS CRÍTICOS (4-5 horas)

### P1: API Key de Resend Hardcodeada — SEGURIDAD CRÍTICA

**Archivo**: `supabase/functions/send-email/index.ts:3`
**Severidad**: 🔴 CRÍTICO
**Impacto**: Exposición de credenciales en git, riesgo de compromise de cuenta

#### Problema Actual
```ts
// ❌ PELIGROSO - Clave expuesta
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || 're_PesrK9Kb_6tZww8sZwtZs9BgQm7CFLFKW'
```

La clave está en:
- Git history (puede ser clonada)
- Posibles logs
- Backups del repo
- Stack traces si hay errores

#### Pasos de Remediación

**PASO 1: Revocar la Clave Actual** (5 min)
```bash
# 1. Ve a https://resend.com/api-keys
# 2. Busca la clave: re_PesrK9Kb_6tZww8sZwtZs9BgQm7CFLFKW
# 3. Haz click en "Delete"
# 4. Confirma la acción
```

**PASO 2: Crear Nueva Clave** (5 min)
```bash
# En Resend Dashboard:
# 1. Click "Create API Key"
# 2. Nombre: "DivergencIA Production"
# 3. Copia la nueva clave (ej: re_XXXXXXXXXXXXXXXX)
# 4. Almacena en gestor de contraseñas
```

**PASO 3: Actualizar Código** (5 min)
```ts
// supabase/functions/send-email/index.ts - Reemplazar línea 3-5

// ❌ ANTES
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || 're_PesrK9Kb_6tZww8sZwtZs9BgQm7CFLFKW'
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'DivergencIA <onboarding@resend.dev>'

// ✅ DESPUÉS
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'DivergencIA <onboarding@resend.dev>'

if (!RESEND_API_KEY) {
  console.error('[send-email] RESEND_API_KEY not configured')
  throw new Error('RESEND_API_KEY environment variable is required. Configure in Supabase Dashboard → Edge Functions → Secrets.')
}
```

**PASO 4: Configurar en Supabase** (5 min)
```bash
# 1. Ve a https://app.supabase.com/project/bmbgjvmmwwogwecyxezx
# 2. Navega a: Project Settings → Edge Functions → Secrets
# 3. Click "Add secret"
# 4. Key: RESEND_API_KEY
# 5. Value: <tu_nueva_clave_de_resend>
# 6. Click "Add"
# 7. Redeploy la función (auto)
```

**PASO 5: Limpiar Git History** (10-15 min) ⚠️ IRREVERSIBLE
```bash
# OPCIÓN A: Usar git filter-branch (funciona en repos pequeños)
git filter-branch --tree-filter \
  "grep -l 're_PesrK9Kb_6tZww8sZwtZs9BgQm7CFLFKW' supabase/functions/send-email/index.ts 2>/dev/null && \
   sed -i \"s/re_PesrK9Kb_6tZww8sZwtZs9BgQm7CFLFKW//g\" supabase/functions/send-email/index.ts || true" \
  HEAD

# OPCIÓN B: Usar BFG Repo Cleaner (recomendado para repos grandes)
# 1. Descarga: https://rtyley.github.io/bfg-repo-cleaner/
# 2. Crea archivo passwords.txt con:
#    re_PesrK9Kb_6tZww8sZwtZs9BgQm7CFLFKW
# 3. Ejecuta:
java -jar bfg.jar --replace-text passwords.txt .git
# 4. Verifica:
git log --oneline | head -20

# PASO FINAL: Force push
git push origin --force --all
git push origin --force --tags
```

**PASO 6: Verificación** (5 min)
```bash
# Verificar que la clave NO aparece en el historio
git log -p --all -S 're_PesrK9Kb_6tZww8sZwtZs9BgQm7CFLFKW' | head
# No debe devolver nada

# Verificar que el código está correcto
grep -n "RESEND_API_KEY" supabase/functions/send-email/index.ts
# Debe mostrar solo: const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

# Verificar que el secreto está en Supabase
# Ve a Supabase Dashboard y confirma el secreto existe
```

#### Archivos a Modificar
- ✏️ `supabase/functions/send-email/index.ts` (línea 3-4)
- 📊 Supabase Dashboard (agregar secreto)

#### Rollback Plan
Si algo sale mal:
```bash
# Restaurar from punto anterior si lo tienes
git reset --hard origin/main
# Revoke la clave en Resend de todas formas
```

#### Checklist de Completación
- [ ] Clave revocada en Resend Dashboard
- [ ] Nueva clave creada y anotada
- [ ] Código actualizado localmente
- [ ] Cambios commiteados
- [ ] Secreto agregado en Supabase
- [ ] Git history limpio (sin menciones de la clave vieja)
- [ ] Función redeploy confirmado

---

### P2: Migración 011 No Aplicada — DATOS CRÍTICOS

**Archivo**: `supabase/migrations/011_usuarios_privacy_columns.sql`
**Severidad**: 🔴 CRÍTICO
**Impacto**: Funciones de privacidad no funcionan, Athenia Memory no persiste

#### Problema Actual
La migración no está aplicada en producción. El código espera columnas que no existen:

```ts
// frontend/src/components/account/Settings.jsx
const togglePrivacy = async (field) => {
  await supabase
    .from('usuarios')
    .update({ [field]: !user[field] }) // ❌ Campo no existe
    .eq('id', user.id)
}
```

**Columnas Faltantes**:
- `perfil_privado` (BOOLEAN)
- `mostrar_correo` (BOOLEAN)
- `mostrar_actividad` (BOOLEAN)
- `mostrar_en_grafo` (BOOLEAN)
- `athenia_memory` (TEXT)

#### Pasos de Remediación

**PASO 1: Backup Preventivo** (5 min)
```sql
-- En Supabase SQL Editor:
-- Crear backup de usuarios antes de alterar schema
CREATE TABLE usuarios_backup_20260405 AS
SELECT * FROM usuarios;
```

**PASO 2: Revisar Migración** (5 min)
```bash
# Ver contenido de la migración:
cat supabase/migrations/011_usuarios_privacy_columns.sql
# Debe contener:
# - ALTER TABLE usuarios ADD COLUMN perfil_privado...
# - ALTER TABLE usuarios ADD COLUMN mostrar_correo...
# etc.
```

**PASO 3: Aplicar en Supabase** (5 min)
```bash
# 1. Ve a https://app.supabase.com/project/bmbgjvmmwwogwecyxezx/sql/new
# 2. Abre: supabase/migrations/011_usuarios_privacy_columns.sql
# 3. Copia TODO el contenido
# 4. Pega en el SQL Editor de Supabase
# 5. Click "Run"
# 6. Verifica resultado (debe decir "Success" o mostar filas afectadas)
```

**PASO 4: Verificar Columnas Creadas** (5 min)
```sql
-- Ejecutar en Supabase SQL Editor:
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'usuarios'
ORDER BY ordinal_position;

-- Verificar en salida que existen:
-- perfil_privado | boolean
-- mostrar_correo | boolean
-- mostrar_actividad | boolean
-- mostrar_en_grafo | boolean
-- athenia_memory | text
```

**PASO 5: Inicializar Valores Predeterminados** (5 min)
```sql
-- Asignar valores por defecto a usuarios existentes
UPDATE usuarios
SET
  perfil_privado = false,
  mostrar_correo = false,
  mostrar_actividad = true,
  mostrar_en_grafo = true,
  athenia_memory = NULL
WHERE perfil_privado IS NULL;

-- Verificar
SELECT id, nombre, perfil_privado, mostrar_correo, mostrar_actividad
FROM usuarios LIMIT 5;
```

**PASO 6: Verificación en Frontend** (5 min)
```jsx
// Abrir Settings.jsx en navegador
// 1. Log in como usuario
// 2. Navega a Settings → Privacy
// 3. Intenta toggle Privacy settings
// 4. Verifica que se guarda sin errores
// 5. Recarga página
// 6. Verifica que los valores persisten
```

#### Rollback Plan
Si hay error:
```sql
-- Restaurar desde backup
DROP TABLE usuarios;
ALTER TABLE usuarios_backup_20260405 RENAME TO usuarios;

-- Luego revisar migración y intentar de nuevo
```

#### Checklist de Completación
- [ ] Backup creado
- [ ] Migración copiada de archivo local
- [ ] SQL ejecutado en Supabase
- [ ] Columnas verificadas (SELECT información_schema)
- [ ] Valores predeterminados asignados
- [ ] Frontend testado (Settings → Privacy)
- [ ] No hay errores en console

---

### P3: Resend Sandbox Limitation — FUNCIONALIDAD DE EMAIL

**Archivo**: `supabase/functions/send-email/index.ts:6`
**Severidad**: 🔴 CRÍTICO
**Impacto**: Emails a usuarios externos fallan, no se pueden enviar notificaciones

#### Problema Actual
```ts
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'DivergencIA <onboarding@resend.dev>'
```

El email `onboarding@resend.dev` **solo funciona en sandbox** (modo de prueba de Resend).
- ✅ Puede enviar a tu email registrado en Resend
- ❌ NO puede enviar a direcciones externas
- ❌ Usuarios NO reciben bienvenida, resets, notificaciones

#### Solución: Verificar Dominio en Resend

**OPCIÓN A: Usar Dominio Propio (RECOMENDADO)**

**Substep A.1: Obtener Dominio** (opcional, 5-10 min)
```bash
# Si ya tienes dominio: sáltate a A.2
# Si no tienes:
# 1. Ve a https://namecheap.com o GoDaddy
# 2. Busca: "divergencia.ai" (o tu marca)
# 3. Compra por 1 año (~$10)
# 4. Copia los nameservers de Namecheap/GoDaddy
```

**Substep A.2: Configurar Dominio en Resend** (10 min)
```bash
# 1. Ve a https://resend.com/domains
# 2. Click "Add Domain"
# 3. Ingresa tu dominio (ej: "divergencia.ai")
# 4. Resend te dará instrucciones DNS
# 5. Vuelve a tu proveedor de dominio (Namecheap, etc.)
# 6. Actualiza DNS records:
#    - CNAME o MX records según Resend
#    - Espera 5-30 minutos
# 7. Resend verificará automáticamente
```

**Substep A.3: Crear Email Noreply** (5 min)
```bash
# En Resend:
# 1. Ve a verified domains
# 2. Para tu dominio, click "Add Email"
# 3. Crea: noreply@divergencia.ai (o similar)
# 4. Verifica propietario del dominio (via email)
```

**Substep A.4: Actualizar Supabase** (5 min)
```bash
# 1. Supabase Dashboard → Project Settings → Edge Functions → Secrets
# 2. Agrega/actualiza: FROM_EMAIL = DivergencIA <noreply@divergencia.ai>
# 3. Click "Update"
# 4. La función se redeploy automáticamente
```

**Substep A.5: Testear Envío** (5 min)
```bash
# En frontend (console):
fetch('https://<project>.supabase.co/functions/v1/send-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'tu-email-externo@gmail.com', // Importante: dirección EXTERNA
    subject: 'Test desde DivergencIA',
    html: '<p>Si recibes esto, ¡email está configurado! ✅</p>'
  })
})
.then(r => r.json())
.then(d => console.log(d))
```

**OPCIÓN B: Temporal — Email Registrado Resend**

Si no puedes verificar dominio aún:
```bash
# 1. En Resend Dashboard → Audiences
# 2. Agrega cada email de usuario manualmente
# 3. (No escalable, pero funciona mientras configuras dominio)
```

#### Archivos a Modificar
- ✏️ `supabase/functions/send-email/index.ts` (línea 6 - actualizar comentario)
- 📊 Supabase Dashboard (agregar secreto FROM_EMAIL)

#### Checklist de Completación
- [ ] Dominio obtenido (propio o registrado)
- [ ] Dominio agregado a Resend
- [ ] DNS records actualizados
- [ ] Resend confirmó verificación
- [ ] Email noreply creado
- [ ] Secreto FROM_EMAIL agregado en Supabase
- [ ] Test email enviado exitosamente
- [ ] Test email recibido en buzón EXTERNO

---

## 🟠 FASE 2: PROBLEMAS MAYORES (8-10 horas)

### P4: Errores Silenciosos en useCall (Camera/Mic)

**Archivo**: `frontend/src/hooks/useCall.js:44-50`
**Severidad**: 🟠 MAYOR
**Impacto**: Usuarios no saben por qué las llamadas fallan

#### Problema
```js
try {
  const devices = await navigator.mediaDevices.enumerateDevices()
  // ...
} catch {} // ❌ Error silenciado
```

#### Solución Completa

**PASO 1: Actualizar useCall.js** (30 min)
```js
// frontend/src/hooks/useCall.js

import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'

export function useCall(canalId) {
  const [cameras, setCameras] = useState([])
  const [mics, setMics] = useState([])
  const [deviceError, setDeviceError] = useState(null) // ← Nuevo
  const [callState, setCallState] = useState('idle')
  const peerConnectionRef = useRef(null)
  const callHistoryIdRef = useRef(null)

  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(d => d.kind === 'videoinput')
      const audioDevices = devices.filter(d => d.kind === 'audioinput')

      // Detectar y reportar falta de dispositivos
      const errors = []
      if (videoDevices.length === 0) {
        errors.push('No se detectó cámara')
      }
      if (audioDevices.length === 0) {
        errors.push('No se detectó micrófono')
      }

      if (errors.length > 0) {
        const msg = `Dispositivos faltantes: ${errors.join(', ')}`
        console.warn('[useCall]', msg)
        setDeviceError(msg)
        toast.error('Error de dispositivos', {
          description: msg + '. Verifica permisos del navegador.',
          duration: 5000,
        })
      } else {
        setDeviceError(null)
      }

      setCameras(videoDevices)
      setMics(audioDevices)
    } catch (error) {
      const msg = `Error enumerando dispositivos: ${error.message}`
      console.error('[useCall]', msg)
      setDeviceError(msg)
      toast.error('No se pueden acceder a dispositivos', {
        description: 'Verifica permisos: Configuración → Privacidad → Cámara/Micrófono',
        duration: 5000,
      })
    }
  }, [])

  // Llamar al montar
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.mediaDevices) {
      refreshDevices()
    }
  }, [refreshDevices])

  return {
    cameras,
    mics,
    deviceError, // ← Exportar error
    refreshDevices,
    callState,
    setCallState,
    // ... otros returns
  }
}
```

**PASO 2: Mostrar Error en CallModal.jsx** (20 min)
```jsx
// frontend/src/components/chat/CallModal.jsx

import { useCall } from '../../hooks/useCall'

export function CallModal({ canalId, onClose }) {
  const { cameras, mics, deviceError, callState } = useCall(canalId)

  if (deviceError) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-zinc-900 border border-red-600 rounded-xl p-6 max-w-md">
          <h3 className="text-red-400 font-semibold mb-2">⚠️ Error de Dispositivos</h3>
          <p className="text-red-200 text-sm mb-4">{deviceError}</p>
          <p className="text-red-100/60 text-xs mb-4">
            Para habilitar cámara/micrófono:
          </p>
          <ol className="text-red-100/60 text-xs space-y-1 mb-4 list-decimal list-inside">
            <li>Haz click en el ícono de candado en la barra de URL</li>
            <li>Busca "Cámara" y "Micrófono"</li>
            <li>Cambia a "Permitir"</li>
            <li>Recarga esta página</li>
          </ol>
          <button
            onClick={onClose}
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg"
          >
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  // Continuar con flujo normal si no hay error
  return (
    // ... resto del CallModal
  )
}
```

**PASO 3: Agregar useEffect** (5 min)
```js
// En useCall.js - agregar imports
import { useEffect } from 'react'

// Ya tenemos el código de refreshDevices más arriba
```

#### Testing
```js
// En console del navegador:
// 1. Rechazar permisos de cámara
// 2. Ir a /call
// 3. Debe mostrar error claro
// 4. Mensaje debe indicar cómo habilitar permisos
```

#### Checklist
- [ ] useCall.js actualizado con estado deviceError
- [ ] try-catch tiene manejo de errores explícito
- [ ] toast.error() muestra mensaje al usuario
- [ ] CallModal.jsx tiene condicional para deviceError
- [ ] Mensajes de error son claros y accionables
- [ ] Testing manual: rechazar permisos y verificar error
- [ ] Testing manual: permitir permisos y verificar que desaparece

---

### P5: Race Condition en Historial de Llamadas

**Archivo**: `frontend/src/hooks/useCall.js` (endCall function)
**Severidad**: 🟠 MAYOR
**Impacto**: Llamadas que no se cierran quedan como "activas" eternamente

#### Problema
```js
const startCall = async () => {
  const { data } = await supabase.from('historial_llamadas').insert({
    canal_id: canalId,
    participantes: [],
    estado: 'activa'
  }).select().single()

  callHistoryIdRef.current = data.id
}

// Si usuario cierra navegador aquí ↓ sin cerrar llamada:
// El registro queda con estado='activa' por siempre
```

#### Solución Completa

**PASO 1: Implementar Cleanup robusto** (30 min)
```js
// frontend/src/hooks/useCall.js

const callHistoryIdRef = useRef(null)
const callStartTimeRef = useRef(null)
const cleanupTimeoutRef = useRef(null)

const startCall = useCallback(async () => {
  try {
    const now = Date.now()
    callStartTimeRef.current = now

    const { data, error } = await supabase
      .from('historial_llamadas')
      .insert({
        canal_id: canalId,
        participantes: [],
        estado: 'activa',
        inicio: new Date(now).toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    callHistoryIdRef.current = data.id
    console.log('[useCall] Call started, history ID:', data.id)

    setCallState('calling')
  } catch (error) {
    console.error('[useCall] Error starting call:', error)
    toast.error('No se pudo iniciar llamada')
  }
}, [canalId])

const endCall = useCallback(async () => {
  // Limpiar timeout anterior si existe
  if (cleanupTimeoutRef.current) {
    clearTimeout(cleanupTimeoutRef.current)
  }

  if (!callHistoryIdRef.current) {
    console.warn('[useCall] No active call to end')
    return
  }

  try {
    const duration = Math.floor(
      (Date.now() - (callStartTimeRef.current || 0)) / 1000
    )

    const { error } = await supabase
      .from('historial_llamadas')
      .update({
        estado: 'finalizada',
        duracion_segundos: duration,
        fin: new Date().toISOString(),
        participantes: participants.map(p => ({
          id: p.id,
          nombre: p.nombre,
          tipo: 'usuario'
        }))
      })
      .eq('id', callHistoryIdRef.current)

    if (error) throw error

    console.log('[useCall] Call ended, duration:', duration)
  } catch (error) {
    console.error('[useCall] Error ending call:', error)
    // Intentar de nuevo en 2 segundos
    cleanupTimeoutRef.current = setTimeout(() => {
      endCall()
    }, 2000)
  } finally {
    callHistoryIdRef.current = null
    callStartTimeRef.current = null
    setCallState('idle')
  }
}, [participants])

// Cleanup al desmontar hook
useEffect(() => {
  return () => {
    // Si llamada sigue activa, finalizarla
    if (callHistoryIdRef.current && callState === 'calling') {
      console.log('[useCall] Component unmounting with active call, finalizing...')
      endCall()
    }
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current)
    }
  }
}, [callState, endCall])

return {
  startCall,
  endCall,
  callState,
  // ... otros
}
```

**PASO 2: Agregar Server-Side Cleanup (Postgres Job)** (30 min)

```sql
-- supabase/migrations/021_call_history_cleanup.sql

-- Crear función para limpiar llamadas fantasma
CREATE OR REPLACE FUNCTION public.cleanup_hanging_calls()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.historial_llamadas
  SET estado = 'abandonada',
      fin = NOW()
  WHERE estado = 'activa'
    AND created_at < NOW() - INTERVAL '24 hours';

  RAISE NOTICE 'Cleaned up % hanging calls',
    (SELECT COUNT(*) FROM public.historial_llamadas
     WHERE estado = 'abandonada'
     AND fin IS NOT NULL);
END;
$$;

-- Crear job para ejecutar cada hora
SELECT cron.schedule(
  'cleanup-hanging-calls',
  '0 * * * *', -- cada hora
  'SELECT cleanup_hanging_calls()'
);

-- Verificar jobs creados
SELECT * FROM cron.job;
```

**PASO 3: Aplicar Migración** (10 min)
```bash
# 1. Supabase Dashboard → SQL Editor
# 2. Copiar contenido de supabase/migrations/021_call_history_cleanup.sql
# 3. Ejecutar
# 4. Verificar en cron.job
```

#### Testing
```sql
-- Verificar limpieza:
SELECT id, estado, created_at, fin
FROM historial_llamadas
WHERE estado IN ('activa', 'abandonada')
ORDER BY created_at DESC
LIMIT 10;
```

#### Checklist
- [ ] endCall() tiene try-catch explícito
- [ ] Llamadas se cierren con estado='finalizada'
- [ ] Timeout retry si falla endCall
- [ ] useEffect cleanup finaliza llamadas activas
- [ ] Migración 021 aplicada
- [ ] Cron job registrado
- [ ] Testing: crear llamada sin cerrar, verificar que se limpia en 24h

---

## 🟡 FASE 3: PROBLEMAS MODERADOS (12-15 horas)

### P6-P15: [Resumen breve]

Los problemas moderados incluyen:
- **P6**: N+1 Queries en Athenia (agregar RPC)
- **P7**: Client-side filtering en useProjects (usar RLS)
- **P8**: Sin paginación en Chat/Ideas (infinite scroll)
- **P9**: localStorage Hydration (useLocalStorage hook)
- **P10**: Errores silenciosos en Notificaciones (mejor logging)
- **P11**: Sin fallback Gemini (fallback a gpt-3.5)
- **P12**: Global call channel no limpiado (cleanup)
- **P13**: RLS validation en admin (verificar permisos)
- **P14**: Magic strings (enum-izar constantes)
- **P15**: Falta TypeScript (considerar migration)

[Ver secciones detalladas en PLAN_PRODUCCION.md original]

---

## 🟢 FASE 4: PROBLEMAS MENORES (3-4 horas)

### P16-P19: Code Quality

- Dead code cleanup
- Commented code removal
- Consistent error handling patterns
- ESLint warnings reduction

---

## 📋 IMPLEMENTATION TIMELINE

```
SEMANA 1:
├─ Lunes 6 abr:   Fase 1 (Críticos) - 4-5h
├─ Martes 7 abr:  Fase 2a (Mayores P4-P5) - 4-5h
├─ Miércoles 8 abr: Fase 2b (Mayores P6-P8) - 4-5h
├─ Jueves 9 abr:  Fase 3a (Moderados P9-P12) - 6h
└─ Viernes 10 abr: Fase 3b (Moderados P13-P15) + Testing - 8h

SEMANA 2:
└─ Lunes 13 abr:  Fase 4 (Menores) + Final QA - 4-6h
```

---

## ✅ TESTING CHECKLIST

### Pre-Deployment (2-3 horas)
- [ ] Ambiente staging creado
- [ ] Todas las migraciones aplicadas
- [ ] Secrets configurados
- [ ] No hay errores en console
- [ ] Todos los módulos cargan

### Funcional (4-5 horas)
- [ ] Auth funciona (magic link)
- [ ] Proyectos se crean/editan/borran
- [ ] Chat es bidireccional y realtime
- [ ] Llamadas se pueden iniciar/finalizar
- [ ] Emails se envían a externos
- [ ] Athenia responde sin N+1
- [ ] Paginación infinita funciona

### Performance (2-3 horas)
- [ ] Carga inicial < 3s
- [ ] Chat scroll smooth (60fps)
- [ ] Llamadas sin lag
- [ ] Queries optimizadas

### Security (1-2 horas)
- [ ] RLS policies en lugar
- [ ] No expone datos privados
- [ ] XSS protegido
- [ ] CSRF tokens OK
- [ ] API keys NO en logs

### Rollback (1 hora)
- [ ] Procedure documentado
- [ ] Backup restaurable
- [ ] Downtime < 5 min

---

## 🚀 DEPLOYMENT FINAL

1. **Preparar**
   - [ ] Todos tests pasan
   - [ ] Performance OK
   - [ ] Backup creado
   - [ ] Team notificado

2. **Ejecutar**
   - [ ] Deploy a staging 24h antes
   - [ ] Deploy a production (o blue-green)
   - [ ] Monitor logs 1h
   - [ ] Validar funcionalidades críticas

3. **Post-Deploy**
   - [ ] Check uptime
   - [ ] Error rate normal
   - [ ] Performance OK
   - [ ] Users can login
   - [ ] Documentar lecciones

---

## 📞 Soporte & Contacto

Para preguntas durante implementación:
- Revisar logs en Supabase Dashboard
- Consultar error en Google
- Checkear similar issue en codebase

