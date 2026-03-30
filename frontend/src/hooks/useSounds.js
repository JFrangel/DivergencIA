import { useCallback, useRef, useSyncExternalStore } from 'react'

/* ────────────────────────── localStorage helpers ────────────────────────── */
const STORAGE_KEY_ENABLED = 'divergencia_sound_enabled'
const STORAGE_KEY_VOLUME  = 'divergencia_sound_volume'

function getEnabled() {
  try { return localStorage.getItem(STORAGE_KEY_ENABLED) !== 'false' }
  catch { return true }
}
function getVolume() {
  try {
    const v = parseFloat(localStorage.getItem(STORAGE_KEY_VOLUME))
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.3
  } catch { return 0.3 }
}

/* ─── Tiny pub/sub so all hook instances stay in sync ─────────────────── */
const listeners = new Set()
function subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb) }
function emit() { listeners.forEach(fn => fn()) }

let _enabled = getEnabled()
let _volume  = getVolume()

function setEnabled(v) {
  _enabled = v
  try { localStorage.setItem(STORAGE_KEY_ENABLED, String(v)) } catch {}
  emit()
}
function setVolume(v) {
  _volume = Math.max(0, Math.min(1, v))
  try { localStorage.setItem(STORAGE_KEY_VOLUME, String(_volume)) } catch {}
  emit()
}

/* ─── AudioContext singleton ─────────────────────────────────────────── */
let ctx = null
function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (ctx.state === 'suspended') ctx.resume()
  return ctx
}

/* ─── Sound generators ───────────────────────────────────────────────── */

function playTone(freq, duration, type = 'sine', vol = 1) {
  const ac  = getCtx()
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.value = freq
  gain.gain.setValueAtTime(vol * _volume, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration)
  osc.connect(gain).connect(ac.destination)
  osc.start(ac.currentTime)
  osc.stop(ac.currentTime + duration)
}

function playSweep(startFreq, endFreq, duration, type = 'sine') {
  const ac  = getCtx()
  const osc = ac.createOscillator()
  const gain = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(startFreq, ac.currentTime)
  osc.frequency.linearRampToValueAtTime(endFreq, ac.currentTime + duration)
  gain.gain.setValueAtTime(_volume, ac.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration)
  osc.connect(gain).connect(ac.destination)
  osc.start(ac.currentTime)
  osc.stop(ac.currentTime + duration)
}

const SOUNDS = {
  click() {
    playTone(800, 0.05, 'sine', 0.6)
  },

  success() {
    playSweep(440, 880, 0.2, 'sine')
  },

  error() {
    playSweep(440, 220, 0.2, 'sawtooth')
  },

  notification() {
    const ac = getCtx()
    const t  = ac.currentTime
    // fundamental
    const o1 = ac.createOscillator(); const g1 = ac.createGain()
    o1.type = 'sine'; o1.frequency.value = 880
    g1.gain.setValueAtTime(0.4 * _volume, t)
    g1.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
    o1.connect(g1).connect(ac.destination)
    o1.start(t); o1.stop(t + 0.4)
    // harmonic
    const o2 = ac.createOscillator(); const g2 = ac.createGain()
    o2.type = 'sine'; o2.frequency.value = 1320
    g2.gain.setValueAtTime(0.2 * _volume, t)
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.35)
    o2.connect(g2).connect(ac.destination)
    o2.start(t); o2.stop(t + 0.35)
  },

  achievement() {
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.3, 'sine', 0.5), i * 80)
    })
  },

  hover() {
    playTone(1200, 0.025, 'sine', 0.15)
  },

  levelUp() {
    const notes = [440, 554.37, 659.25, 880, 1108.73, 1318.5] // A4 C#5 E5 A5 C#6 E6
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.18, 'triangle', 0.45), i * 70)
    })
  },
}

/* ─── Hook ───────────────────────────────────────────────────────────── */
export default function useSounds() {
  const enabled = useSyncExternalStore(subscribe, () => _enabled)
  const volume  = useSyncExternalStore(subscribe, () => _volume)

  const playSound = useCallback((name) => {
    if (!_enabled) return
    const fn = SOUNDS[name]
    if (fn) {
      try { fn() } catch (e) { console.warn('Sound play error:', e) }
    }
  }, [])

  const toggleEnabled = useCallback(() => setEnabled(!_enabled), [])

  return {
    playSound,
    enabled,
    volume,
    setEnabled,
    setVolume,
    toggleEnabled,
  }
}
