/**
 * Standalone achievement progress tracker.
 * Writes to the same localStorage keys used by useAchievements,
 * so the React hook picks up changes on next render without needing
 * to pass incrementProgress through the component tree.
 */
import { supabase } from './supabase'
import { ACHIEVEMENT_DEFINITIONS } from '../hooks/useAchievements'

const STORAGE_KEY = 'divergencia_achievements'

function getLocalProgress(userId) {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${userId}`)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function setLocalProgress(userId, progress) {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${userId}`, JSON.stringify(progress))
  } catch {}
}

function getLocalUnlocked(userId) {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_unlocked_${userId}`)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}

function setLocalUnlocked(userId, unlocked) {
  try {
    localStorage.setItem(`${STORAGE_KEY}_unlocked_${userId}`, JSON.stringify(unlocked))
  } catch {}
}

/**
 * Increment (or set absolute value of) progress for a trackKey.
 * Checks achievement thresholds and persists unlocks to Supabase.
 *
 * @param {string} userId
 * @param {string} trackKey  - matches BASE_ACHIEVEMENTS[].trackKey
 * @param {number} amount    - amount to add (default 1)
 * @param {boolean} absolute - if true, only update if amount > current value
 */
export function trackProgress(userId, trackKey, amount = 1, absolute = false) {
  if (!userId || !trackKey) return

  const prev = getLocalProgress(userId)
  const current = prev[trackKey] || 0
  const next = absolute ? Math.max(current, amount) : current + amount
  setLocalProgress(userId, { ...prev, [trackKey]: next })

  // Check for newly unlocked achievements
  const prevUnlocked = getLocalUnlocked(userId)
  const newUnlocks = []

  ACHIEVEMENT_DEFINITIONS.forEach(def => {
    if (def.trackKey === trackKey && next >= def.threshold && !prevUnlocked[def.id]) {
      newUnlocks.push({ def, now: new Date().toISOString() })
      prevUnlocked[def.id] = new Date().toISOString()
    }
  })

  if (newUnlocks.length > 0) {
    setLocalUnlocked(userId, prevUnlocked)
    newUnlocks.forEach(({ def, now }) => {
      // Persist achievement to DB
      supabase.from('logros_usuario').upsert({
        usuario_id: userId,
        logro_id: def.id,
        fecha_obtenido: now,
        progreso: next,
      }, { onConflict: 'usuario_id,logro_id' }).then(() => {}).catch(() => {})

      // Send in-app notification so it appears in the bell regardless of current page
      supabase.from('notificaciones').insert({
        usuario_id: userId,
        tipo: 'logro_desbloqueado',
        titulo: `¡Logro desbloqueado! ${def.badge || '🏆'}`,
        mensaje: `Obtuviste: ${def.label}${def.tier ? ` (${def.tier})` : ''}`,
        leida: false,
        fecha: now,
      }).then(() => {}).catch(() => {})
    })
  }
}
