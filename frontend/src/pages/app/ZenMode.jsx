import { lazy, Suspense, useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiX, FiVolume2, FiVolumeX, FiWind, FiClock, FiMusic,
  FiFeather, FiHeart, FiChevronDown, FiChevronUp,
  FiPlay, FiPause, FiRotateCcw, FiSkipForward,
  FiBarChart2, FiSettings, FiZap, FiAward, FiTrendingUp,
} from 'react-icons/fi'
import { useZen } from '../../context/ZenContext'
import Button from '../../components/ui/Button'

const ImmersiveBackground = lazy(() => import('../../components/visuals/ImmersiveBackground'))

/* ================================================================
   CONSTANTS
   ================================================================ */

const ACTIVITIES = [
  { id: 'breathing', label: 'Respirar', icon: FiWind },
  { id: 'pomodoro', label: 'Pomodoro', icon: FiClock },
  { id: 'sounds', label: 'Sonidos', icon: FiMusic },
  { id: 'quotes', label: 'Frases', icon: FiFeather },
  { id: 'meditation', label: 'Meditar', icon: FiHeart },
  { id: 'stats', label: 'Stats', icon: FiBarChart2 },
]

/* ================================================================
   STATS HELPER — localStorage persistence
   ================================================================ */

const STATS_KEY = 'zen_stats'

function getStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY)
    if (!raw) return { totalMinutes: 0, sessions: 0, streakDays: 0, bestStreak: 0, lastDate: null, dailyLog: {} }
    const parsed = JSON.parse(raw)
    // Ensure bestStreak field exists for backward compatibility
    if (typeof parsed.bestStreak !== 'number') parsed.bestStreak = parsed.streakDays || 0
    return parsed
  } catch {
    return { totalMinutes: 0, sessions: 0, streakDays: 0, bestStreak: 0, lastDate: null, dailyLog: {} }
  }
}

function saveStats(stats) {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)) } catch {}
}

function recordSession(durationMinutes) {
  const stats = getStats()
  const today = new Date().toISOString().slice(0, 10)

  stats.totalMinutes = (stats.totalMinutes || 0) + durationMinutes
  stats.sessions = (stats.sessions || 0) + 1

  // daily log
  if (!stats.dailyLog) stats.dailyLog = {}
  stats.dailyLog[today] = (stats.dailyLog[today] || 0) + durationMinutes

  // streak calculation
  if (stats.lastDate !== today) {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yStr = yesterday.toISOString().slice(0, 10)
    if (stats.lastDate === yStr) {
      stats.streakDays = (stats.streakDays || 0) + 1
    } else if (stats.lastDate !== today) {
      stats.streakDays = 1
    }
    stats.lastDate = today
  }
  // Track best streak
  if (!stats.bestStreak || stats.streakDays > stats.bestStreak) {
    stats.bestStreak = stats.streakDays
  }

  saveStats(stats)
  return stats
}

/* ================================================================
   1. BREATHING EXERCISE — multiple patterns with countdown
   ================================================================ */

const BREATHING_PATTERNS = {
  '4-7-8': {
    name: '4-7-8 Relajante',
    description: 'Relaja el sistema nervioso',
    phases: [
      { label: 'Inhala', duration: 4, scale: 1.35 },
      { label: 'Sostén', duration: 7, scale: 1.35 },
      { label: 'Exhala', duration: 8, scale: 1 },
    ],
  },
  box: {
    name: 'Respiración Cuadrada',
    description: 'Equilibra cuerpo y mente',
    phases: [
      { label: 'Inhala', duration: 4, scale: 1.35 },
      { label: 'Sostén', duration: 4, scale: 1.35 },
      { label: 'Exhala', duration: 4, scale: 1 },
      { label: 'Pausa', duration: 4, scale: 1 },
    ],
  },
  calm: {
    name: 'Calma Profunda',
    description: 'Exhala larga para calmar',
    phases: [
      { label: 'Inhala', duration: 5, scale: 1.35 },
      { label: 'Sostén', duration: 3, scale: 1.35 },
      { label: 'Exhala', duration: 7, scale: 1 },
      { label: 'Pausa', duration: 2, scale: 1 },
    ],
  },
  energize: {
    name: 'Energizante',
    description: 'Activa cuerpo y mente',
    phases: [
      { label: 'Inhala', duration: 2, scale: 1.4 },
      { label: 'Exhala', duration: 2, scale: 1 },
    ],
  },
  '5-5': {
    name: 'Coherencia',
    description: 'Sincroniza corazón y mente',
    phases: [
      { label: 'Inhala', duration: 5, scale: 1.35 },
      { label: 'Exhala', duration: 5, scale: 1 },
    ],
  },
}

function BreathingExercise() {
  const [patternKey, setPatternKey] = useState('4-7-8')
  const [running, setRunning] = useState(true)
  const [cycles, setCycles] = useState(0)
  const pattern = BREATHING_PATTERNS[patternKey]
  const PHASES = pattern.phases
  const TOTAL = PHASES.reduce((a, p) => a + p.duration, 0)

  const [phase, setPhase] = useState(0)

  useEffect(() => {
    if (!running) return
    setPhase(0)
    setCycles(0)
    const interval = setInterval(() => {
      setPhase(prev => {
        const next = prev + 0.05
        if (next >= TOTAL) {
          setCycles(c => c + 1)
          return 0
        }
        return next
      })
    }, 50)
    return () => clearInterval(interval)
  }, [patternKey, TOTAL, running])

  // derive current phase index and countdown
  let acc = 0
  let currentIdx = 0
  let phaseElapsed = 0
  for (let i = 0; i < PHASES.length; i++) {
    if (phase < acc + PHASES[i].duration) {
      currentIdx = i
      phaseElapsed = phase - acc
      break
    }
    acc += PHASES[i].duration
  }
  const current = PHASES[currentIdx]
  const countdown = Math.ceil(current.duration - phaseElapsed)
  const phaseProgress = phaseElapsed / current.duration

  // Track minutes for stats
  useEffect(() => {
    if (!running) return
    const statsInterval = setInterval(() => {
      recordSession(1)
    }, 60000)
    return () => clearInterval(statsInterval)
  }, [running])

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Pattern selector */}
      <div className="flex gap-2 flex-wrap justify-center max-w-md">
        {Object.entries(BREATHING_PATTERNS).map(([key, p]) => (
          <button
            key={key}
            onClick={(e) => { e.stopPropagation(); setPatternKey(key) }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-300 border cursor-pointer ${
              patternKey === key
                ? 'bg-white/10 border-[var(--c-primary)]/40 text-white/80'
                : 'bg-white/[0.03] border-white/[0.06] text-white/30 hover:text-white/50 hover:border-white/10'
            }`}
            title={p.description}
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Circle with countdown */}
      <div className="relative flex items-center justify-center w-[260px] h-[260px]">
        {/* Outer glow */}
        <motion.div
          className="absolute rounded-full w-[240px] h-[240px] bg-[radial-gradient(circle,_rgba(252,101,31,0.08)_0%,_transparent_70%)]"
          animate={{ scale: current.scale, opacity: current.scale > 1 ? 0.8 : 0.3 }}
          transition={{ duration: current.duration, ease: 'easeInOut' }}
        />

        {/* Progress ring SVG */}
        <svg className="absolute inset-0 -rotate-90" width="260" height="260" viewBox="0 0 260 260">
          <circle cx="130" cy="130" r="110" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="2" />
          <motion.circle
            cx="130" cy="130" r="110" fill="none"
            stroke="var(--c-primary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 110}
            strokeDashoffset={2 * Math.PI * 110 * (1 - phaseProgress)}
            className="drop-shadow-[0_0_8px_var(--c-primary)]"
          />
        </svg>

        {/* Ring 1 */}
        <motion.div
          className="absolute rounded-full border border-[var(--c-primary)]/15 w-[180px] h-[180px]"
          animate={{ scale: current.scale }}
          transition={{ duration: current.duration, ease: 'easeInOut' }}
        />
        {/* Ring 2 */}
        <motion.div
          className="absolute rounded-full border border-[var(--c-secondary)]/10 w-[150px] h-[150px]"
          animate={{ scale: current.scale * 0.95 }}
          transition={{ duration: current.duration, ease: 'easeInOut', delay: 0.1 }}
        />
        {/* Core */}
        <motion.div
          className="rounded-full flex flex-col items-center justify-center w-[110px] h-[110px] bg-gradient-to-br from-[var(--c-primary)]/15 to-[var(--c-secondary)]/15 border border-[var(--c-primary)]/20"
          animate={{ scale: current.scale }}
          transition={{ duration: current.duration, ease: 'easeInOut' }}
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={`${patternKey}-${currentIdx}`}
              className="text-white/50 text-sm font-light tracking-wider"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
            >
              {current.label}
            </motion.span>
          </AnimatePresence>
          <span className="text-white/70 text-2xl font-mono font-light mt-0.5">
            {countdown}
          </span>
        </motion.div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={(e) => { e.stopPropagation(); setRunning(r => !r) }}
          className="p-2.5 rounded-full bg-[var(--c-primary)]/10 border border-[var(--c-primary)]/25 text-[var(--c-primary)]/70 hover:text-[var(--c-primary)] transition-colors cursor-pointer"
        >
          {running ? <FiPause size={18} /> : <FiPlay size={18} />}
        </button>
      </div>

      <div className="flex items-center gap-4 text-white/15 text-xs tracking-widest uppercase">
        <span>{pattern.phases.map(p => p.duration).join(' · ')} seg</span>
        <span className="w-px h-3 bg-white/10" />
        <span>{cycles} {cycles === 1 ? 'ciclo' : 'ciclos'}</span>
      </div>
    </div>
  )
}

/* ================================================================
   2. POMODORO TIMER — configurable intervals
   ================================================================ */

const PRESETS = [
  { label: '25/5', work: 25, break: 5 },
  { label: '50/10', work: 50, break: 10 },
  { label: '15/3', work: 15, break: 3 },
  { label: '90/20', work: 90, break: 20 },
]

function PomodoroTimer() {
  const [preset, setPreset] = useState(0)
  const [showConfig, setShowConfig] = useState(false)
  const WORK_SECONDS = PRESETS[preset].work * 60
  const BREAK_SECONDS = PRESETS[preset].break * 60

  const [isWork, setIsWork] = useState(true)
  const [seconds, setSeconds] = useState(WORK_SECONDS)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)
  const startTimeRef = useRef(null)

  const total = isWork ? WORK_SECONDS : BREAK_SECONDS
  const progress = 1 - seconds / total
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60

  // Update seconds when preset changes
  useEffect(() => {
    setRunning(false)
    setSeconds(isWork ? PRESETS[preset].work * 60 : PRESETS[preset].break * 60)
  }, [preset])

  // gentle bell sound
  const playBell = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 528
      gain.gain.setValueAtTime(0.15, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 1.5)
    } catch {}
  }, [])

  useEffect(() => {
    if (!running) return
    if (seconds <= 0) {
      playBell()
      if (isWork) {
        const workMin = PRESETS[preset].work
        recordSession(workMin)
        setSessions(s => s + 1)
        setIsWork(false)
        setSeconds(BREAK_SECONDS)
      } else {
        setIsWork(true)
        setSeconds(WORK_SECONDS)
      }
      setRunning(false)
      return
    }
    const t = setTimeout(() => setSeconds(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [running, seconds, isWork, playBell, WORK_SECONDS, BREAK_SECONDS, preset])

  const reset = () => { setRunning(false); setSeconds(isWork ? WORK_SECONDS : BREAK_SECONDS) }
  const skip = () => {
    setRunning(false)
    if (isWork) {
      setIsWork(false)
      setSeconds(BREAK_SECONDS)
    } else {
      setIsWork(true)
      setSeconds(WORK_SECONDS)
    }
  }

  // SVG progress ring
  const R = 95
  const C = 2 * Math.PI * R

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Preset selector + config toggle */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          {PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={(e) => { e.stopPropagation(); setPreset(i); setShowConfig(false) }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all duration-300 border cursor-pointer ${
                preset === i && !showConfig
                  ? 'bg-white/10 border-[var(--c-primary)]/40 text-white/80'
                  : 'bg-white/[0.03] border-white/[0.06] text-white/30 hover:text-white/50 hover:border-white/10'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={(e) => { e.stopPropagation(); setShowConfig(s => !s) }}
            className={`p-1.5 rounded-full border transition-all cursor-pointer ${
              showConfig
                ? 'bg-white/10 border-[var(--c-primary)]/40 text-[var(--c-primary)]/80'
                : 'bg-white/[0.03] border-white/[0.06] text-white/20 hover:text-white/50'
            }`}
            title="Configurar intervalos"
          >
            <FiSettings size={12} />
          </button>
        </div>

        {/* Custom interval config */}
        <AnimatePresence>
          {showConfig && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-white/30 uppercase tracking-wider">Trabajo</span>
                <input
                  type="number" min={1} max={120}
                  defaultValue={PRESETS[preset].work}
                  onChange={e => {
                    const val = Math.max(1, Math.min(120, parseInt(e.target.value) || 25))
                    PRESETS[preset] = { ...PRESETS[preset], work: val, label: `${val}/${PRESETS[preset].break}` }
                    setRunning(false)
                    setSeconds(val * 60)
                  }}
                  className="w-12 text-center text-xs text-white bg-white/[0.06] border border-white/[0.1] rounded-lg py-1 outline-none focus:border-[var(--c-primary)]/40"
                />
                <span className="text-white/20 text-xs">min</span>
              </div>
              <span className="text-white/10">/</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-white/30 uppercase tracking-wider">Descanso</span>
                <input
                  type="number" min={1} max={60}
                  defaultValue={PRESETS[preset].break}
                  onChange={e => {
                    const val = Math.max(1, Math.min(60, parseInt(e.target.value) || 5))
                    PRESETS[preset] = { ...PRESETS[preset], break: val, label: `${PRESETS[preset].work}/${val}` }
                  }}
                  className="w-12 text-center text-xs text-white bg-white/[0.06] border border-white/[0.1] rounded-lg py-1 outline-none focus:border-[var(--c-primary)]/40"
                />
                <span className="text-white/20 text-xs">min</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative w-[230px] h-[230px] flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" width="230" height="230" viewBox="0 0 230 230">
          <circle cx="115" cy="115" r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
          <motion.circle
            cx="115" cy="115" r={R} fill="none"
            stroke={isWork ? 'var(--c-primary)' : 'var(--c-secondary)'}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
            className={isWork ? 'drop-shadow-[0_0_6px_var(--c-primary)]' : 'drop-shadow-[0_0_6px_var(--c-secondary)]'}
            transition={{ duration: 0.5 }}
          />
        </svg>
        <div className="text-center z-10">
          <div className="text-white/80 text-4xl font-mono font-light tracking-wider">
            {String(minutes).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </div>
          <div className={`text-xs tracking-widest uppercase mt-1 ${isWork ? 'text-[var(--c-primary)]/60' : 'text-[var(--c-secondary)]/60'}`}>
            {isWork ? 'Enfoque' : 'Descanso'}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={(e) => { e.stopPropagation(); reset() }}
          className="p-2 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white/60 transition-colors cursor-pointer"
        >
          <FiRotateCcw size={16} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setRunning(r => !r) }}
          className={`p-3 rounded-full border transition-all cursor-pointer ${
            isWork
              ? 'bg-[var(--c-primary)]/10 border-[var(--c-primary)]/30 text-[var(--c-primary)]'
              : 'bg-[var(--c-secondary)]/10 border-[var(--c-secondary)]/30 text-[var(--c-secondary)]'
          }`}
        >
          {running ? <FiPause size={20} /> : <FiPlay size={20} />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); skip() }}
          className="p-2 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/30 hover:text-white/60 transition-colors cursor-pointer"
        >
          <FiSkipForward size={16} />
        </button>
      </div>

      {/* Session dots */}
      <div className="flex items-center gap-2">
        {Array.from({ length: Math.min(sessions, 8) }).map((_, i) => (
          <div key={i} className="w-2 h-2 rounded-full bg-[var(--c-primary)]/50" />
        ))}
        {sessions === 0 && (
          <p className="text-white/15 text-xs tracking-widest">Sin sesiones aún</p>
        )}
        {sessions > 0 && (
          <span className="text-white/20 text-xs tracking-widest ml-1">
            {sessions} {sessions === 1 ? 'sesión' : 'sesiones'}
          </span>
        )}
      </div>
    </div>
  )
}

/* ================================================================
   3. AMBIENT SOUNDSCAPES — Web Audio API generated
   ================================================================ */

const SOUNDSCAPES = [
  { id: 'rain', label: 'Lluvia', emoji: '\u{1F327}' },
  { id: 'ocean', label: 'Oc\éano', emoji: '\u{1F30A}' },
  { id: 'forest', label: 'Bosque', emoji: '\u{1F333}' },
  { id: 'fire', label: 'Fuego', emoji: '\u{1F525}' },
  { id: 'wind', label: 'Viento', emoji: '\u{1F32C}' },
  { id: 'whitenoise', label: 'Blanco', emoji: '\u{2601}' },
  { id: 'brownnoise', label: 'Marr\ón', emoji: '\u{1F3B6}' },
  { id: 'binaural', label: 'Binaural', emoji: '\u{1F9E0}' },
  { id: 'lofi', label: 'Lo-fi', emoji: '\u{1F3B5}' },
]

function createSoundscape(ctx, type, gainNode) {
  const nodes = []

  if (type === 'rain') {
    const bufferSize = 2 * ctx.sampleRate
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let lastOut = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      data[i] = (lastOut + (0.02 * white)) / 1.02
      lastOut = data[i]
      data[i] *= 3.5
    }
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'highpass'
    filter.frequency.value = 800
    const filter2 = ctx.createBiquadFilter()
    filter2.type = 'lowpass'
    filter2.frequency.value = 6000
    source.connect(filter)
    filter.connect(filter2)
    filter2.connect(gainNode)
    source.start()
    nodes.push(source)
  }

  if (type === 'ocean') {
    const bufferSize = 2 * ctx.sampleRate
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let lastOut = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      data[i] = (lastOut + (0.02 * white)) / 1.02
      lastOut = data[i]
      data[i] *= 3.5
    }
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 500
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.08
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 300
    lfo.connect(lfoGain)
    lfoGain.connect(filter.frequency)
    lfo.start()
    source.connect(filter)
    filter.connect(gainNode)
    source.start()
    nodes.push(source, lfo)
  }

  if (type === 'forest') {
    const freqs = [174, 196, 220]
    freqs.forEach(f => {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = f
      const g = ctx.createGain()
      g.gain.value = 0.08
      const lfo = ctx.createOscillator()
      lfo.type = 'sine'
      lfo.frequency.value = 0.03 + Math.random() * 0.06
      const lg = ctx.createGain()
      lg.gain.value = 0.04
      lfo.connect(lg)
      lg.connect(g.gain)
      lfo.start()
      osc.connect(g)
      g.connect(gainNode)
      osc.start()
      nodes.push(osc, lfo)
    })
    const chirp = ctx.createOscillator()
    chirp.type = 'sine'
    chirp.frequency.value = 2400
    const cg = ctx.createGain()
    cg.gain.value = 0.015
    const cLfo = ctx.createOscillator()
    cLfo.type = 'square'
    cLfo.frequency.value = 2.5
    const cLg = ctx.createGain()
    cLg.gain.value = 0.015
    cLfo.connect(cLg)
    cLg.connect(cg.gain)
    cLfo.start()
    chirp.connect(cg)
    cg.connect(gainNode)
    chirp.start()
    nodes.push(chirp, cLfo)
  }

  if (type === 'lofi') {
    const chords = [261.63, 329.63, 392, 493.88]
    chords.forEach((f, i) => {
      const osc = ctx.createOscillator()
      osc.type = 'triangle'
      osc.frequency.value = f * 0.5
      osc.detune.value = (Math.random() - 0.5) * 15
      const g = ctx.createGain()
      g.gain.value = 0.06
      const lfo = ctx.createOscillator()
      lfo.type = 'sine'
      lfo.frequency.value = 0.1 + i * 0.05
      const lg = ctx.createGain()
      lg.gain.value = 0.03
      lfo.connect(lg)
      lg.connect(g.gain)
      lfo.start()
      osc.connect(g)
      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 800
      g.connect(filter)
      filter.connect(gainNode)
      osc.start()
      nodes.push(osc, lfo)
    })
  }

  if (type === 'whitenoise') {
    const bufferSize = 2 * ctx.sampleRate
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 10000
    source.connect(filter)
    filter.connect(gainNode)
    source.start()
    nodes.push(source)
  }

  if (type === 'brownnoise') {
    const bufferSize = 2 * ctx.sampleRate
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let lastOut = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      data[i] = (lastOut + (0.02 * white)) / 1.02
      lastOut = data[i]
      data[i] *= 3.5
    }
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = 400
    source.connect(filter)
    filter.connect(gainNode)
    source.start()
    nodes.push(source)
  }

  if (type === 'fire') {
    // Crackling fire: filtered noise bursts + warm low drone
    const bufferSize = 2 * ctx.sampleRate
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    let lastOut = 0
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1
      data[i] = (lastOut + (0.02 * white)) / 1.02
      lastOut = data[i]
      data[i] *= 3.5
    }
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = 1200
    bp.Q.value = 0.8
    const lfo = ctx.createOscillator()
    lfo.type = 'sawtooth'
    lfo.frequency.value = 0.3
    const lfoG = ctx.createGain()
    lfoG.gain.value = 800
    lfo.connect(lfoG)
    lfoG.connect(bp.frequency)
    lfo.start()
    source.connect(bp)
    bp.connect(gainNode)
    source.start()
    // warm low drone
    const drone = ctx.createOscillator()
    drone.type = 'sine'
    drone.frequency.value = 80
    const dg = ctx.createGain()
    dg.gain.value = 0.06
    const dLfo = ctx.createOscillator()
    dLfo.type = 'sine'
    dLfo.frequency.value = 0.05
    const dLg = ctx.createGain()
    dLg.gain.value = 0.03
    dLfo.connect(dLg)
    dLg.connect(dg.gain)
    dLfo.start()
    drone.connect(dg)
    dg.connect(gainNode)
    drone.start()
    // crackle layer
    const crackBuf = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const crackData = crackBuf.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      crackData[i] = Math.random() > 0.997 ? (Math.random() * 2 - 1) * 0.8 : 0
    }
    const crackSrc = ctx.createBufferSource()
    crackSrc.buffer = crackBuf
    crackSrc.loop = true
    const crackFilter = ctx.createBiquadFilter()
    crackFilter.type = 'highpass'
    crackFilter.frequency.value = 2000
    const crackGain = ctx.createGain()
    crackGain.gain.value = 0.4
    crackSrc.connect(crackFilter)
    crackFilter.connect(crackGain)
    crackGain.connect(gainNode)
    crackSrc.start()
    nodes.push(source, lfo, drone, dLfo, crackSrc)
  }

  if (type === 'binaural') {
    // Binaural beats: two sine oscillators with slight frequency offset (10Hz alpha waves)
    const baseFreq = 200
    const beatFreq = 10 // alpha waves for relaxation
    const oscL = ctx.createOscillator()
    oscL.type = 'sine'
    oscL.frequency.value = baseFreq
    const oscR = ctx.createOscillator()
    oscR.type = 'sine'
    oscR.frequency.value = baseFreq + beatFreq
    const gL = ctx.createGain()
    gL.gain.value = 0.15
    const gR = ctx.createGain()
    gR.gain.value = 0.15
    // Create stereo panner for left/right channels
    const panL = ctx.createStereoPanner()
    panL.pan.value = -1
    const panR = ctx.createStereoPanner()
    panR.pan.value = 1
    oscL.connect(gL)
    gL.connect(panL)
    panL.connect(gainNode)
    oscR.connect(gR)
    gR.connect(panR)
    panR.connect(gainNode)
    oscL.start()
    oscR.start()
    // Add a soft pad underneath
    const pad = ctx.createOscillator()
    pad.type = 'sine'
    pad.frequency.value = 100
    const padG = ctx.createGain()
    padG.gain.value = 0.04
    pad.connect(padG)
    padG.connect(gainNode)
    pad.start()
    nodes.push(oscL, oscR, pad)
  }

  if (type === 'wind') {
    // Filtered noise with slow LFO modulation for wind gusts
    const bufferSize = 2 * ctx.sampleRate
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1
    }
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.loop = true
    const bandpass = ctx.createBiquadFilter()
    bandpass.type = 'bandpass'
    bandpass.frequency.value = 600
    bandpass.Q.value = 0.5
    const lfo = ctx.createOscillator()
    lfo.type = 'sine'
    lfo.frequency.value = 0.15
    const lfoGain = ctx.createGain()
    lfoGain.gain.value = 400
    lfo.connect(lfoGain)
    lfoGain.connect(bandpass.frequency)
    lfo.start()
    source.connect(bandpass)
    bandpass.connect(gainNode)
    source.start()
    nodes.push(source, lfo)
  }

  return nodes
}

function AmbientSoundscapes() {
  const ctxRef = useRef(null)
  const [active, setActive] = useState({})
  const activeRef = useRef({})
  const [volume, setVolume] = useState(0.5)

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume().catch(() => {})
    }
    return ctxRef.current
  }, [])

  const stopSound = useCallback((entry) => {
    if (!entry) return
    const ctx = ctxRef.current
    if (ctx && entry.gain) {
      try { entry.gain.gain.setValueAtTime(0, ctx.currentTime) } catch {}
    }
    entry.nodes.forEach(n => { try { n.stop() } catch {} })
    try { entry.gain.disconnect() } catch {}
  }, [])

  const toggleSound = useCallback((id) => {
    setActive(prev => {
      const next = { ...prev }
      if (next[id]) {
        stopSound(next[id])
        delete next[id]
      } else {
        const ctx = getCtx()
        const gainNode = ctx.createGain()
        gainNode.gain.value = volume * 0.3
        gainNode.connect(ctx.destination)
        const nodes = createSoundscape(ctx, id, gainNode)
        next[id] = { nodes, gain: gainNode }
      }
      activeRef.current = next
      return next
    })
  }, [getCtx, volume, stopSound])

  // update volumes when slider changes
  useEffect(() => {
    Object.values(active).forEach(s => {
      if (s.gain) s.gain.gain.value = volume * 0.3
    })
  }, [volume, active])

  // cleanup on unmount — use ref to avoid stale closure
  useEffect(() => {
    return () => {
      Object.values(activeRef.current).forEach(s => {
        s.nodes.forEach(n => { try { n.stop() } catch {} })
        try { s.gain.disconnect() } catch {}
      })
      if (ctxRef.current) { try { ctxRef.current.close() } catch {} }
    }
  }, [])

  const activeCount = Object.keys(active).length

  return (
    <div className="flex flex-col items-center gap-6 max-w-md">
      {/* Visualizer bar */}
      {activeCount > 0 && (
        <motion.div
          className="flex items-end gap-0.5 h-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {Array.from({ length: 16 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-1 rounded-full bg-[var(--c-primary)]/30"
              animate={{
                height: [4, 8 + Math.random() * 20, 4],
              }}
              transition={{
                duration: 0.8 + Math.random() * 0.6,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.05,
              }}
            />
          ))}
        </motion.div>
      )}

      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
        {SOUNDSCAPES.map(s => {
          const isActive = !!active[s.id]
          return (
            <button
              key={s.id}
              onClick={(e) => { e.stopPropagation(); toggleSound(s.id) }}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-300 cursor-pointer min-w-[64px] ${
                isActive
                  ? 'bg-white/10 border-[var(--c-primary)]/30 shadow-[0_0_20px_rgba(252,101,31,0.08)]'
                  : 'bg-white/[0.03] border-white/[0.06] hover:border-white/10 hover:bg-white/[0.05]'
              }`}
            >
              <span className="text-xl">{s.emoji}</span>
              <span className={`text-[10px] tracking-wider uppercase ${isActive ? 'text-white/70' : 'text-white/30'}`}>
                {s.label}
              </span>
            </button>
          )
        })}
      </div>

      {/* Volume */}
      <div className="flex items-center gap-3 w-full max-w-[260px]">
        <FiVolumeX size={12} className="text-white/20 shrink-0" />
        <input
          type="range"
          min="0" max="1" step="0.01"
          value={volume}
          onChange={(e) => { e.stopPropagation(); setVolume(parseFloat(e.target.value)) }}
          onClick={(e) => e.stopPropagation()}
          className="zen-volume-slider w-full h-1 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--c-primary) ${volume * 100}%, rgba(255,255,255,0.06) ${volume * 100}%)`,
          }}
        />
        <FiVolume2 size={12} className="text-white/20 shrink-0" />
      </div>

      <p className="text-white/15 text-[10px] tracking-widest uppercase">
        {activeCount === 0
          ? 'Selecciona sonidos para mezclar'
          : `${activeCount} sonido${activeCount > 1 ? 's' : ''} activo${activeCount > 1 ? 's' : ''}`}
      </p>
    </div>
  )
}

/* ================================================================
   4. FOCUS QUOTES
   ================================================================ */

const QUOTES = [
  { text: 'La creatividad es la inteligencia divirti\éndose.', author: 'Albert Einstein' },
  { text: 'El enfoque es el arte de saber qu\é ignorar.', author: 'An\ónimo' },
  { text: 'La mejor forma de predecir el futuro es crearlo.', author: 'Peter Drucker' },
  { text: 'En medio de la dificultad yace la oportunidad.', author: 'Albert Einstein' },
  { text: 'No cuentes los d\ías, haz que los d\ías cuenten.', author: 'Muhammad Ali' },
  { text: 'El secreto de avanzar es comenzar.', author: 'Mark Twain' },
  { text: 'La disciplina es el puente entre las metas y los logros.', author: 'Jim Rohn' },
  { text: 'Cada momento es un nuevo comienzo.', author: 'T.S. Eliot' },
  { text: 'Piensa, cree, sue\ña y atr\évete.', author: 'Walt Disney' },
  { text: 'La \única forma de hacer un gran trabajo es amar lo que haces.', author: 'Steve Jobs' },
  { text: 'Tu mente es un jard\ín, tus pensamientos son las semillas.', author: 'Proverbio' },
  { text: 'El conocimiento habla, la sabidur\ía escucha.', author: 'Jimi Hendrix' },
  { text: 'Lo que resistes, persiste. Lo que aceptas, se transforma.', author: 'Carl Jung' },
  { text: 'El verdadero viaje de descubrimiento no consiste en buscar nuevas tierras, sino en mirar con nuevos ojos.', author: 'Marcel Proust' },
  { text: 'La investigaci\ón es formalizar la curiosidad.', author: 'Zora Neale Hurston' },
  { text: 'Donde hay una mente abierta, siempre habr\á una frontera.', author: 'Charles Kettering' },
  { text: 'El \éxito no es la clave de la felicidad. La felicidad es la clave del \éxito.', author: 'Albert Schweitzer' },
  { text: 'S\é el cambio que quieres ver en el mundo.', author: 'Mahatma Gandhi' },
  { text: 'La ciencia es el gran antídoto contra el veneno del entusiasmo y la superstición.', author: 'Adam Smith' },
  { text: 'Nada en la vida debe ser temido, solo comprendido.', author: 'Marie Curie' },
  { text: 'La imaginación es más importante que el conocimiento.', author: 'Albert Einstein' },
  { text: 'El que aprende pero no piensa está perdido. El que piensa pero no aprende está en peligro.', author: 'Confucio' },
  { text: 'La inteligencia artificial es la nueva electricidad.', author: 'Andrew Ng' },
  { text: 'La curiosidad es la mecha del aprendizaje.', author: 'William Arthur Ward' },
  { text: 'Investigar es ver lo que todo el mundo ha visto y pensar lo que nadie ha pensado.', author: 'Albert Szent-Györgyi' },
  { text: 'El verdadero signo de inteligencia no es el conocimiento sino la imaginación.', author: 'Albert Einstein' },
  { text: 'Aprender sin reflexionar es malgastar energía.', author: 'Confucio' },
  { text: 'La mente que se abre a una nueva idea jamás vuelve a su tamaño original.', author: 'Oliver Wendell Holmes' },
  { text: 'Los datos no son información, la información no es conocimiento, el conocimiento no es sabiduría.', author: 'Clifford Stoll' },
  { text: 'El aprendizaje es un tesoro que acompaña a su dueño a todas partes.', author: 'Proverbio chino' },
  { text: 'Solo sé que no sé nada, y eso me motiva a seguir aprendiendo.', author: 'Sócrates (adaptado)' },
  { text: 'La tecnología es mejor cuando conecta a las personas.', author: 'Matt Mullenweg' },
  { text: 'El progreso es imposible sin cambio, y quienes no pueden cambiar su mente no pueden cambiar nada.', author: 'George Bernard Shaw' },
  { text: 'La persistencia es el camino del éxito.', author: 'Charles Chaplin' },
  { text: 'No te preocupes por fracasar. Preocúpate por las chances que pierdes cuando ni siquiera lo intentas.', author: 'Jack Canfield' },
]

function FocusQuotes() {
  const [idx, setIdx] = useState(() => Math.floor(Math.random() * QUOTES.length))
  const [autoCycle, setAutoCycle] = useState(true)

  useEffect(() => {
    if (!autoCycle) return
    const interval = setInterval(() => {
      setIdx(prev => (prev + 1) % QUOTES.length)
    }, 10000)
    return () => clearInterval(interval)
  }, [autoCycle])

  const quote = QUOTES[idx]

  const goNext = (e) => {
    e.stopPropagation()
    setIdx(prev => (prev + 1) % QUOTES.length)
    setAutoCycle(false)
    // Resume auto-cycle after 20s of inactivity
    setTimeout(() => setAutoCycle(true), 20000)
  }

  const goPrev = (e) => {
    e.stopPropagation()
    setIdx(prev => (prev - 1 + QUOTES.length) % QUOTES.length)
    setAutoCycle(false)
    setTimeout(() => setAutoCycle(true), 20000)
  }

  return (
    <div className="flex flex-col items-center gap-6 max-w-lg px-4 text-center">
      {/* Decorative quote mark */}
      <motion.span
        className="text-[var(--c-primary)]/15 text-6xl font-serif leading-none select-none"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
      >
        &ldquo;
      </motion.span>

      <div className="min-h-[120px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="flex flex-col items-center gap-4"
          >
            <p className="text-white/50 text-lg sm:text-xl font-light leading-relaxed italic">
              {quote.text}
            </p>
            <span className="text-white/20 text-xs tracking-widest uppercase">
              &mdash; {quote.author}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={goPrev}
          className="p-2 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/25 hover:text-white/50 hover:border-white/15 transition-all cursor-pointer"
        >
          <FiRotateCcw size={14} />
        </button>

        <span className="text-white/15 text-[10px] tracking-widest font-mono tabular-nums">
          {idx + 1} / {QUOTES.length}
        </span>

        <button
          onClick={goNext}
          className="p-2.5 rounded-full bg-[var(--c-primary)]/10 border border-[var(--c-primary)]/25 text-[var(--c-primary)]/60 hover:text-[var(--c-primary)] transition-all cursor-pointer"
        >
          <FiSkipForward size={16} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-[200px] h-0.5 bg-white/[0.04] rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-[var(--c-primary)]/30"
          initial={{ width: 0 }}
          animate={{ width: `${((idx + 1) / QUOTES.length) * 100}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
    </div>
  )
}

/* ================================================================
   5. MINI MEDITATION GUIDE
   ================================================================ */

const MEDITATION_DURATIONS = [
  { label: '5 min', minutes: 5 },
  { label: '10 min', minutes: 10 },
  { label: '15 min', minutes: 15 },
  { label: '20 min', minutes: 20 },
]

const MEDITATION_PROMPTS = [
  'Encuentra una posici\ón c\ómoda y cierra los ojos.',
  'Respira profundamente... inhala por la nariz.',
  'Exhala lentamente por la boca, soltando toda tensi\ón.',
  'Siente el peso de tu cuerpo. Relaja los hombros.',
  'Observa tus pensamientos sin juzgarlos... d\éjalos pasar.',
  'Inhala calma. Exhala cualquier preocupaci\ón.',
  'Lleva tu atenci\ón al presente. Solo este momento existe.',
  'Siente gratitud por este instante de paz.',
  'Con cada respiraci\ón, tu mente se aclara m\ás.',
  'Est\ás exactamente donde necesitas estar.',
  'Deja que la calma llene cada c\élula de tu cuerpo.',
  'Tu respiraci\ón es tu ancla al momento presente.',
  'Suelta lo que no puedes controlar.',
  'Cada inhalaci\ón trae energ\ía, cada exhalaci\ón trae paz.',
  'Tu mente es un cielo vasto; los pensamientos son solo nubes.',
  'Cuando est\és listo, abre suavemente los ojos.',
  'Lleva esta calma contigo.',
]

function MiniMeditation() {
  const [durationIdx, setDurationIdx] = useState(0)
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0) // seconds elapsed
  const [breathPhase, setBreathPhase] = useState(0) // 0-1 continuous
  const [promptIdx, setPromptIdx] = useState(0)
  const startTimeRef = useRef(null)

  const totalSeconds = MEDITATION_DURATIONS[durationIdx].minutes * 60
  const progress = Math.min(elapsed / totalSeconds, 1)
  const remaining = Math.max(totalSeconds - elapsed, 0)
  const remMin = Math.floor(remaining / 60)
  const remSec = remaining % 60

  // Breathing animation cycle: 4s inhale, 4s exhale = 8s total
  const BREATH_CYCLE = 8
  const breathProgress = (breathPhase % BREATH_CYCLE) / BREATH_CYCLE
  const isInhaling = breathProgress < 0.5
  const breathScale = isInhaling
    ? 1 + breathProgress * 0.7 // 1.0 -> 1.35
    : 1 + (1 - breathProgress) * 0.7 // 1.35 -> 1.0

  // Main timer
  useEffect(() => {
    if (!running) return
    startTimeRef.current = Date.now() - elapsed * 1000
    const interval = setInterval(() => {
      const newElapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
      setElapsed(newElapsed)
      if (newElapsed >= totalSeconds) {
        setRunning(false)
        recordSession(MEDITATION_DURATIONS[durationIdx].minutes)
      }
    }, 200)
    return () => clearInterval(interval)
  }, [running, totalSeconds, durationIdx])

  // Breathing phase animation
  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => {
      setBreathPhase(prev => prev + 0.05)
    }, 50)
    return () => clearInterval(interval)
  }, [running])

  // Rotate prompts every ~20 seconds
  useEffect(() => {
    if (!running) return
    const interval = setInterval(() => {
      setPromptIdx(prev => (prev + 1) % MEDITATION_PROMPTS.length)
    }, 20000)
    return () => clearInterval(interval)
  }, [running])

  const startMeditation = (e) => {
    e.stopPropagation()
    setElapsed(0)
    setBreathPhase(0)
    setPromptIdx(0)
    setRunning(true)
  }

  const stopMeditation = (e) => {
    e.stopPropagation()
    if (elapsed > 60) {
      recordSession(Math.round(elapsed / 60))
    }
    setRunning(false)
    setElapsed(0)
  }

  const isComplete = elapsed >= totalSeconds && !running && elapsed > 0

  // SVG ring
  const R = 100
  const C = 2 * Math.PI * R

  if (!running && !isComplete) {
    return (
      <div className="flex flex-col items-center gap-6 max-w-sm text-center px-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-5"
        >
          {/* Pulsing preview circle */}
          <motion.div
            className="w-24 h-24 rounded-full flex items-center justify-center bg-gradient-to-br from-[var(--c-secondary)]/10 to-[var(--c-primary)]/5 border border-[var(--c-secondary)]/20"
            animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <FiHeart size={28} className="text-[var(--c-secondary)]/50" />
          </motion.div>

          <p className="text-white/30 text-sm leading-relaxed">
            Meditaci\ón guiada con gu\ía visual de respiraci\ón.
          </p>

          {/* Duration selector */}
          <div className="flex gap-2">
            {MEDITATION_DURATIONS.map((d, i) => (
              <button
                key={d.label}
                onClick={(e) => { e.stopPropagation(); setDurationIdx(i) }}
                className={`px-4 py-2 rounded-full text-xs font-medium tracking-wide transition-all duration-300 border cursor-pointer ${
                  durationIdx === i
                    ? 'bg-white/10 border-[var(--c-secondary)]/40 text-white/80'
                    : 'bg-white/[0.03] border-white/[0.06] text-white/30 hover:text-white/50 hover:border-white/10'
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <button
            onClick={startMeditation}
            className="px-8 py-3 rounded-full border text-sm tracking-wider transition-all duration-300 cursor-pointer bg-[var(--c-secondary)]/10 border-[var(--c-secondary)]/30 text-[var(--c-secondary)] hover:bg-[var(--c-secondary)]/20"
          >
            Comenzar Meditaci\ón
          </button>
        </motion.div>
      </div>
    )
  }

  if (isComplete) {
    return (
      <div className="flex flex-col items-center gap-6 max-w-sm text-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-20 h-20 rounded-full flex items-center justify-center bg-gradient-to-br from-[var(--c-secondary)]/15 to-[var(--c-primary)]/10 border border-[var(--c-secondary)]/25">
            <FiAward size={28} className="text-[var(--c-secondary)]/60" />
          </div>
          <p className="text-white/60 text-lg font-light">Sesi\ón completada</p>
          <p className="text-white/25 text-sm">
            {MEDITATION_DURATIONS[durationIdx].minutes} minutos de calma y claridad
          </p>
          <button
            onClick={(e) => { e.stopPropagation(); setElapsed(0) }}
            className="px-6 py-2.5 rounded-full border text-sm tracking-wider transition-all duration-300 cursor-pointer bg-[var(--c-secondary)]/10 border-[var(--c-secondary)]/30 text-[var(--c-secondary)]"
          >
            Nueva sesi\ón
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-5 max-w-sm text-center px-4">
      {/* Breathing circle with progress ring */}
      <div className="relative w-[240px] h-[240px] flex items-center justify-center">
        {/* Session progress ring */}
        <svg className="absolute inset-0 -rotate-90" width="240" height="240" viewBox="0 0 240 240">
          <circle cx="120" cy="120" r={R} fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="2" />
          <circle
            cx="120" cy="120" r={R} fill="none"
            stroke="var(--c-secondary)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - progress)}
            className="drop-shadow-[0_0_6px_var(--c-secondary)] transition-all duration-500"
          />
        </svg>

        {/* Outer breathing glow */}
        <motion.div
          className="absolute rounded-full w-[180px] h-[180px] bg-[radial-gradient(circle,_rgba(139,92,246,0.08)_0%,_transparent_70%)]"
          animate={{ scale: breathScale, opacity: isInhaling ? 0.8 : 0.3 }}
          transition={{ duration: 0.05 }}
        />

        {/* Breathing ring */}
        <motion.div
          className="absolute rounded-full border border-[var(--c-secondary)]/15 w-[150px] h-[150px]"
          animate={{ scale: breathScale }}
          transition={{ duration: 0.05 }}
        />

        {/* Inner breathing ring */}
        <motion.div
          className="absolute rounded-full border border-[var(--c-primary)]/10 w-[120px] h-[120px]"
          animate={{ scale: breathScale * 0.95 }}
          transition={{ duration: 0.05 }}
        />

        {/* Core circle */}
        <motion.div
          className="rounded-full flex flex-col items-center justify-center w-[90px] h-[90px] bg-gradient-to-br from-[var(--c-secondary)]/15 to-[var(--c-primary)]/10 border border-[var(--c-secondary)]/20"
          animate={{ scale: breathScale }}
          transition={{ duration: 0.05 }}
        >
          <span className="text-white/40 text-[10px] tracking-widest uppercase">
            {isInhaling ? 'Inhala' : 'Exhala'}
          </span>
        </motion.div>
      </div>

      {/* Timer display */}
      <div className="text-white/60 text-2xl font-mono font-light tracking-wider">
        {String(remMin).padStart(2, '0')}:{String(remSec).padStart(2, '0')}
      </div>

      {/* Guided prompt */}
      <div className="min-h-[50px] flex items-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={promptIdx}
            className="text-white/30 text-sm font-light leading-relaxed"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.8 }}
          >
            {MEDITATION_PROMPTS[promptIdx]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={stopMeditation}
          className="px-5 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] text-white/25 text-xs tracking-wider hover:text-white/40 transition-colors cursor-pointer"
        >
          Detener
        </button>
      </div>
    </div>
  )
}

/* ================================================================
   6. ZEN STATS PANEL
   ================================================================ */

function ZenStats() {
  const [stats, setStats] = useState(() => getStats())

  // Refresh stats when tab becomes active
  useEffect(() => {
    const refresh = () => setStats(getStats())
    window.addEventListener('focus', refresh)
    const interval = setInterval(refresh, 5000)
    return () => {
      window.removeEventListener('focus', refresh)
      clearInterval(interval)
    }
  }, [])

  const weeklyMinutes = useMemo(() => {
    if (!stats.dailyLog) return 0
    const now = new Date()
    let total = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      total += stats.dailyLog[key] || 0
    }
    return total
  }, [stats])

  // Last 7 days chart data
  const chartData = useMemo(() => {
    if (!stats.dailyLog) return Array(7).fill(0)
    const now = new Date()
    const data = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      data.push(stats.dailyLog[key] || 0)
    }
    return data
  }, [stats])

  const maxChart = Math.max(...chartData, 1)

  const statCards = [
    {
      icon: FiClock,
      label: 'Minutos totales',
      value: Math.round(stats.totalMinutes || 0),
      color: 'var(--c-primary)',
    },
    {
      icon: FiZap,
      label: 'Sesiones',
      value: stats.sessions || 0,
      color: 'var(--c-secondary)',
    },
    {
      icon: FiAward,
      label: 'Racha actual',
      value: `${stats.streakDays || 0} d`,
      color: 'var(--c-accent)',
    },
    {
      icon: FiTrendingUp,
      label: 'Mejor racha',
      value: `${stats.bestStreak || 0} d`,
      color: 'var(--c-secondary)',
    },
    {
      icon: FiBarChart2,
      label: 'Esta semana',
      value: `${weeklyMinutes} min`,
      color: 'var(--c-primary)',
    },
  ]

  const dayLabels = useMemo(() => {
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    const now = new Date()
    const labels = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      labels.push(days[d.getDay()])
    }
    return labels
  }, [])

  return (
    <div className="flex flex-col items-center gap-6 max-w-sm w-full">
      {/* Stat cards - top row 3, bottom row 2 */}
      <div className="grid grid-cols-3 gap-2.5 w-full">
        {statCards.slice(0, 3).map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div
              key={s.label}
              className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.03]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
            >
              <Icon size={14} className="text-white/20" />
              <span className="text-white/70 text-lg font-mono font-light">{s.value}</span>
              <span className="text-white/20 text-[9px] tracking-widest uppercase">{s.label}</span>
            </motion.div>
          )
        })}
      </div>
      <div className="grid grid-cols-2 gap-2.5 w-full">
        {statCards.slice(3).map((s, i) => {
          const Icon = s.icon
          return (
            <motion.div
              key={s.label}
              className="flex flex-col items-center gap-1.5 p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.03]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: (i + 3) * 0.06 }}
            >
              <Icon size={14} className="text-white/20" />
              <span className="text-white/70 text-lg font-mono font-light">{s.value}</span>
              <span className="text-white/20 text-[9px] tracking-widest uppercase">{s.label}</span>
            </motion.div>
          )
        })}
      </div>

      {/* Weekly bar chart */}
      <div className="w-full p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
        <p className="text-white/20 text-[10px] tracking-widest uppercase mb-3 text-center">
          \Últimos 7 d\ías
        </p>
        <div className="flex items-end justify-between gap-2 h-24">
          {chartData.map((val, i) => {
            const isToday = i === 6
            return (
              <div key={i} className="flex flex-col items-center gap-1.5 flex-1 group relative">
                {/* Value tooltip on hover */}
                {val > 0 && (
                  <span className="text-white/0 group-hover:text-white/40 text-[8px] font-mono transition-colors duration-200 absolute -top-3.5">
                    {val}m
                  </span>
                )}
                <motion.div
                  className={`w-full rounded-t ${isToday ? 'bg-[var(--c-primary)]/60' : 'bg-[var(--c-primary)]/30'}`}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max((val / maxChart) * 100, 4)}%` }}
                  transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
                />
                <span className={`text-[8px] ${isToday ? 'text-white/30' : 'text-white/15'}`}>{dayLabels[i]}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Reset button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          if (window.confirm('¿Reiniciar todas las estadísticas?')) {
            localStorage.removeItem(STATS_KEY)
            setStats(getStats())
          }
        }}
        className="px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-white/15 text-[10px] tracking-widest uppercase hover:text-white/30 transition-colors cursor-pointer"
      >
        Reiniciar stats
      </button>
    </div>
  )
}

/* ================================================================
   MAIN ZEN MODE PAGE
   ================================================================ */

export default function ZenMode() {
  const { exitZen } = useZen()
  const navigate = useNavigate()
  const [showUI, setShowUI] = useState(true)
  const [activity, setActivity] = useState('breathing')
  const [navOpen, setNavOpen] = useState(true)
  const hideTimerRef = useRef(null)

  const handleExit = () => {
    exitZen()
    navigate('/dashboard')
  }

  // auto-hide UI after inactivity
  const resetHideTimer = useCallback(() => {
    setShowUI(true)
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current)
    hideTimerRef.current = setTimeout(() => setShowUI(false), 6000)
  }, [])

  useEffect(() => {
    resetHideTimer()
    return () => { if (hideTimerRef.current) clearTimeout(hideTimerRef.current) }
  }, [resetHideTimer])

  const ActivityComponent = useMemo(() => {
    switch (activity) {
      case 'breathing': return BreathingExercise
      case 'pomodoro': return PomodoroTimer
      case 'sounds': return AmbientSoundscapes
      case 'quotes': return FocusQuotes
      case 'meditation': return MiniMeditation
      case 'stats': return ZenStats
      default: return BreathingExercise
    }
  }, [activity])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#020102]"
      onMouseMove={resetHideTimer}
    >
      <Suspense fallback={null}>
        <ImmersiveBackground intensity={1.4} />
      </Suspense>

      {/* Vignette */}
      <div className="absolute inset-0 z-[1] pointer-events-none bg-[radial-gradient(ellipse_at_center,_transparent_20%,_rgba(2,1,2,0.7)_100%)]" />

      {/* Center content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activity}
          className="relative z-10 text-center px-8 flex flex-col items-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          <ActivityComponent />
        </motion.div>
      </AnimatePresence>

      {/* Top controls - auto-hide */}
      <AnimatePresence>
        {showUI && (
          <motion.div
            className="absolute top-5 right-5 z-20 flex items-center gap-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleExit() }}
              className="gap-2 text-white/30 hover:text-white"
            >
              <FiX size={16} /> Salir
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom activity selector */}
      <AnimatePresence>
        {showUI && (
          <motion.div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Toggle nav */}
            <button
              onClick={(e) => { e.stopPropagation(); setNavOpen(n => !n) }}
              className="p-1 text-white/15 hover:text-white/30 transition-colors cursor-pointer"
            >
              {navOpen ? <FiChevronDown size={14} /> : <FiChevronUp size={14} />}
            </button>

            <AnimatePresence>
              {navOpen && (
                <motion.div
                  className="flex items-center gap-1.5 p-1.5 rounded-2xl border border-white/[0.06] bg-black/40 backdrop-blur-md"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.25 }}
                >
                  {ACTIVITIES.map(a => {
                    const Icon = a.icon
                    const isActive = activity === a.id
                    return (
                      <button
                        key={a.id}
                        onClick={(e) => { e.stopPropagation(); setActivity(a.id); resetHideTimer() }}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs tracking-wider transition-all duration-300 cursor-pointer ${
                          isActive
                            ? 'bg-white/10 text-white/70'
                            : 'text-white/25 hover:text-white/50 hover:bg-white/[0.04]'
                        }`}
                      >
                        <Icon size={14} />
                        <span className="hidden sm:inline">{a.label}</span>
                      </button>
                    )
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
