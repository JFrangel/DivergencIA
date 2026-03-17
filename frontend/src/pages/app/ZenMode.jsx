import { lazy, Suspense, useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiVolume2, FiVolumeX } from 'react-icons/fi'
import { useZen } from '../../context/ZenContext'
import Button from '../../components/ui/Button'

const ImmersiveBackground = lazy(() => import('../../components/visuals/ImmersiveBackground'))

/* ──────── Breathing circle ──────── */
const PHASES = [
  { label: 'Inhala', duration: 4, scale: 1.35 },
  { label: 'Sostén', duration: 4, scale: 1.35 },
  { label: 'Exhala', duration: 6, scale: 1 },
  { label: 'Pausa', duration: 2, scale: 1 },
]
const TOTAL = PHASES.reduce((a, p) => a + p.duration, 0)

function BreathingCircle() {
  const [phase, setPhase] = useState(0)
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 0.05
        let acc = 0
        for (let i = 0; i < PHASES.length; i++) {
          acc += PHASES[i].duration
          if (next < acc) {
            setPhase(i)
            break
          }
        }
        return next >= TOTAL ? 0 : next
      })
    }, 50)
    return () => clearInterval(interval)
  }, [])

  const current = PHASES[phase]

  return (
    <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
      {/* Outer glow */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: 180,
          height: 180,
          background: 'radial-gradient(circle, rgba(252,101,31,0.06) 0%, transparent 70%)',
        }}
        animate={{ scale: current.scale, opacity: current.scale > 1 ? 0.8 : 0.3 }}
        transition={{ duration: current.duration, ease: 'easeInOut' }}
      />

      {/* Ring 1 */}
      <motion.div
        className="absolute rounded-full border border-[#FC651F]/15"
        style={{ width: 150, height: 150 }}
        animate={{ scale: current.scale }}
        transition={{ duration: current.duration, ease: 'easeInOut' }}
      />

      {/* Ring 2 */}
      <motion.div
        className="absolute rounded-full border border-[#8B5CF6]/10"
        style={{ width: 120, height: 120 }}
        animate={{ scale: current.scale * 0.95 }}
        transition={{ duration: current.duration, ease: 'easeInOut', delay: 0.1 }}
      />

      {/* Core circle */}
      <motion.div
        className="rounded-full flex items-center justify-center"
        style={{
          width: 80,
          height: 80,
          background: 'linear-gradient(135deg, rgba(252,101,31,0.15), rgba(139,92,246,0.15))',
          border: '1px solid rgba(252,101,31,0.2)',
        }}
        animate={{ scale: current.scale }}
        transition={{ duration: current.duration, ease: 'easeInOut' }}
      >
        <AnimatePresence mode="wait">
          <motion.span
            key={phase}
            className="text-white/40 text-sm font-light tracking-wider"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3 }}
          >
            {current.label}
          </motion.span>
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

/* ──────── Ambient audio ──────── */
function useAmbientAudio() {
  const ctxRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const nodesRef = useRef([])

  const start = () => {
    if (ctxRef.current) return
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      ctxRef.current = ctx

      const masterGain = ctx.createGain()
      masterGain.gain.value = 0.06
      masterGain.connect(ctx.destination)

      const freqs = [55, 82.41, 110, 165]
      freqs.forEach(f => {
        const osc = ctx.createOscillator()
        osc.type = 'sine'
        osc.frequency.value = f

        const gain = ctx.createGain()
        gain.gain.value = 0.3

        const lfo = ctx.createOscillator()
        lfo.type = 'sine'
        lfo.frequency.value = 0.05 + Math.random() * 0.1
        const lfoGain = ctx.createGain()
        lfoGain.gain.value = 0.15
        lfo.connect(lfoGain)
        lfoGain.connect(gain.gain)
        lfo.start()

        osc.connect(gain)
        gain.connect(masterGain)
        osc.start()
        nodesRef.current.push(osc, lfo)
      })

      setPlaying(true)
    } catch (e) {
      console.warn('Audio not available:', e)
    }
  }

  const stop = () => {
    nodesRef.current.forEach(n => { try { n.stop() } catch {} })
    nodesRef.current = []
    if (ctxRef.current) {
      ctxRef.current.close()
      ctxRef.current = null
    }
    setPlaying(false)
  }

  const toggle = () => playing ? stop() : start()

  useEffect(() => () => stop(), [])

  return { playing, toggle }
}

/* ──────── Main ZenMode ──────── */
export default function ZenMode() {
  const { exitZen } = useZen()
  const navigate = useNavigate()
  const { playing, toggle } = useAmbientAudio()
  const [showUI, setShowUI] = useState(true)

  const handleExit = () => {
    exitZen()
    navigate('/dashboard')
  }

  useEffect(() => {
    const timer = setTimeout(() => setShowUI(false), 5000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#020102]"
      onMouseMove={() => setShowUI(true)}
      onClick={() => setShowUI(s => !s)}
    >
      <Suspense fallback={null}>
        <ImmersiveBackground intensity={1.4} />
      </Suspense>

      {/* Vignette */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 20%, rgba(2,1,2,0.7) 100%)',
        }}
      />

      {/* Center content */}
      <motion.div
        className="relative z-10 text-center px-8 flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      >
        <BreathingCircle />

        <motion.div
          className="mt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <div className="text-white/[0.08] text-lg font-mono font-light tracking-[0.5em] uppercase mb-3">
            Modo Zen
          </div>
          <div
            className="text-5xl font-bold font-title mb-2"
            style={{
              background: 'linear-gradient(135deg, #FC651F, #8B5CF6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Divergenc<span>IA</span>
          </div>
          <p className="text-white/15 text-sm font-light tracking-wider">
            Donde la inteligencia converge
          </p>
        </motion.div>
      </motion.div>

      {/* Controls - auto-hide */}
      <AnimatePresence>
        {showUI && (
          <motion.div
            className="absolute top-6 right-6 z-10 flex items-center gap-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); toggle() }}
              className="gap-2 text-white/30 hover:text-white"
            >
              {playing ? <FiVolume2 size={14} /> : <FiVolumeX size={14} />}
              {playing ? 'Audio on' : 'Audio off'}
            </Button>
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

      {/* Subtle hint */}
      <AnimatePresence>
        {showUI && (
          <motion.p
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 text-white/[0.08] text-[10px] tracking-widest uppercase"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            Respira · Enfoca · Crea
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
