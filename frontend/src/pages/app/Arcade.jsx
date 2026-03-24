import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiPlay, FiAward, FiClock, FiTarget, FiZap, FiCpu, FiType, FiNavigation, FiTruck, FiUser, FiGrid } from 'react-icons/fi'

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */
const getHigh = (key) => Number(localStorage.getItem(`arcade_${key}`) || 0)
const setHigh = (key, v) => {
  const prev = getHigh(key)
  if (v > prev) { localStorage.setItem(`arcade_${key}`, v); return true }
  return false
}

/** Read a CSS variable from :root at runtime (canvas doesn't support var()) */
function getCSSColor(varName, fallback) {
  try {
    const val = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
    return val || fallback
  } catch {
    return fallback
  }
}

/** Shared palette resolved once per game mount */
function useCanvasColors() {
  const [colors, setColors] = useState(null)
  useEffect(() => {
    setColors({
      primary: getCSSColor('--c-primary', '#FC651F'),
      secondary: getCSSColor('--c-secondary', '#8B5CF6'),
      accent: getCSSColor('--c-accent', '#00D1FF'),
      success: getCSSColor('--c-success', '#22c55e'),
      warning: getCSSColor('--c-warning', '#F59E0B'),
      error: getCSSColor('--c-error', '#EF4444'),
      bg: '#0a0a0f',
    })
  }, [])
  return colors
}

/** Hook to pause game loop when canvas not visible */
function useVisibility(ref) {
  const [visible, setVisible] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [ref])
  return visible
}

/* ═══════════════════════════════════════════════════════════════
   GAME 1 — SNAKE
   ═══════════════════════════════════════════════════════════════ */
function SnakeGame({ onClose }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const stateRef = useRef(null)
  const animRef = useRef(null)
  const lastTickRef = useRef(0)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(getHigh('snake'))
  const [gameOver, setGameOver] = useState(false)
  const [started, setStarted] = useState(false)
  const [restartKey, setRestartKey] = useState(0)
  const colors = useCanvasColors()
  const visible = useVisibility(wrapRef)

  const CELL = 16
  const COLS = 25
  const ROWS = 25
  const W = COLS * CELL
  const H = ROWS * CELL

  function spawnFood(snake) {
    let pos
    do { pos = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) } }
    while (snake.some(s => s.x === pos.x && s.y === pos.y))
    return pos
  }

  const init = useCallback(() => {
    cancelAnimationFrame(animRef.current)
    const mid = Math.floor(COLS / 2)
    stateRef.current = {
      snake: [{ x: mid, y: Math.floor(ROWS / 2) }],
      dir: { x: 1, y: 0 },
      nextDir: { x: 1, y: 0 },
      food: spawnFood([{ x: mid, y: Math.floor(ROWS / 2) }]),
      score: 0,
      alive: true,
      speed: 110,
    }
    lastTickRef.current = 0
    setScore(0)
    setGameOver(false)
    setStarted(true)
    setRestartKey(k => k + 1)
    wrapRef.current?.focus()
  }, [])

  useEffect(() => {
    const handleKey = (e) => {
      if (!stateRef.current) return
      const s = stateRef.current
      const { dir } = s
      if ((e.key === 'ArrowUp' || e.key === 'w') && dir.y !== 1) s.nextDir = { x: 0, y: -1 }
      if ((e.key === 'ArrowDown' || e.key === 's') && dir.y !== -1) s.nextDir = { x: 0, y: 1 }
      if ((e.key === 'ArrowLeft' || e.key === 'a') && dir.x !== 1) s.nextDir = { x: -1, y: 0 }
      if ((e.key === 'ArrowRight' || e.key === 'd') && dir.x !== -1) s.nextDir = { x: 1, y: 0 }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) {
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    if (!started || !colors) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    const loop = (time) => {
      const s = stateRef.current
      if (!s || !s.alive) return

      // Pause when not visible
      if (!visible) {
        animRef.current = requestAnimationFrame(loop)
        return
      }

      // Throttle updates based on speed
      if (time - lastTickRef.current < s.speed) {
        animRef.current = requestAnimationFrame(loop)
        return
      }
      lastTickRef.current = time

      s.dir = { ...s.nextDir }
      const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y }

      // wall collision
      if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
        s.alive = false
        setGameOver(true)
        const isNew = setHigh('snake', s.score)
        if (isNew) setBest(s.score)
        return
      }
      // self collision
      if (s.snake.some(p => p.x === head.x && p.y === head.y)) {
        s.alive = false
        setGameOver(true)
        const isNew = setHigh('snake', s.score)
        if (isNew) setBest(s.score)
        return
      }

      s.snake.unshift(head)
      if (head.x === s.food.x && head.y === s.food.y) {
        s.score++
        setScore(s.score)
        s.food = spawnFood(s.snake)
        s.speed = Math.max(50, s.speed - 2)
      } else {
        s.snake.pop()
      }

      // draw
      ctx.fillStyle = colors.bg
      ctx.fillRect(0, 0, W, H)

      // grid
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'
      for (let x = 0; x < COLS; x++) {
        for (let y = 0; y < ROWS; y++) {
          ctx.strokeRect(x * CELL, y * CELL, CELL, CELL)
        }
      }

      // snake
      s.snake.forEach((p, i) => {
        const ratio = 1 - i / s.snake.length
        ctx.fillStyle = i === 0
          ? colors.primary
          : `rgba(${hexToRgb(colors.primary)}, ${0.3 + ratio * 0.6})`
        ctx.shadowColor = i === 0 ? colors.primary : 'transparent'
        ctx.shadowBlur = i === 0 ? 8 : 0
        ctx.beginPath()
        ctx.roundRect(p.x * CELL + 1, p.y * CELL + 1, CELL - 2, CELL - 2, 3)
        ctx.fill()
        ctx.shadowBlur = 0
      })

      // food
      ctx.fillStyle = colors.accent
      ctx.shadowColor = colors.accent
      ctx.shadowBlur = 10
      ctx.beginPath()
      ctx.arc(s.food.x * CELL + CELL / 2, s.food.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [started, colors, visible, restartKey])

  return (
    <div ref={wrapRef} tabIndex={-1} className="flex flex-col items-center gap-4 outline-none">
      <div className="flex items-center justify-between w-full max-w-md">
        <div className="flex gap-4 text-sm">
          <span className="text-[var(--c-text,_white)]/60">Puntos: <span className="text-white font-bold">{score}</span></span>
          <span className="text-white/40">Mejor: <span className="font-bold text-[var(--c-accent)]">{best}</span></span>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white"><FiX size={20} /></button>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded-xl border border-white/10 bg-[#0a0a0f] max-w-full"
      />
      {!started && (
        <button onClick={init} className="px-6 py-2 rounded-lg font-semibold text-sm text-white bg-[var(--c-primary)]">
          Iniciar Juego
        </button>
      )}
      {gameOver && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-white/60 text-sm">Game Over! Puntos: {score}</p>
          <button onClick={init} className="px-6 py-2 rounded-lg font-semibold text-sm text-white bg-[var(--c-primary)]">
            Reintentar
          </button>
        </div>
      )}
      {started && !gameOver && (
        <p className="text-white/30 text-xs">Usa las flechas o WASD para moverte</p>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   GAME 2 — PONG
   ═══════════════════════════════════════════════════════════════ */
function PongGame({ onClose }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const stateRef = useRef(null)
  const animRef = useRef(null)
  const [scores, setScores] = useState({ player: 0, ai: 0 })
  const [best, setBest] = useState(getHigh('pong'))
  const [started, setStarted] = useState(false)
  const [restartKey, setRestartKey] = useState(0)
  const colors = useCanvasColors()
  const visible = useVisibility(wrapRef)

  const W = 600, H = 400
  const PAD_W = 12, PAD_H = 80, BALL_R = 6

  const init = useCallback(() => {
    cancelAnimationFrame(animRef.current)
    stateRef.current = {
      player: { y: H / 2 - PAD_H / 2 },
      ai: { y: H / 2 - PAD_H / 2 },
      ball: { x: W / 2, y: H / 2, vx: 4, vy: 2 },
      scores: { player: 0, ai: 0 },
      mouseY: H / 2,
    }
    setScores({ player: 0, ai: 0 })
    setStarted(true)
    setRestartKey(k => k + 1)
  }, [])

  useEffect(() => {
    const handleMove = (e) => {
      if (!stateRef.current || !canvasRef.current) return
      const rect = canvasRef.current.getBoundingClientRect()
      stateRef.current.mouseY = ((e.clientY - rect.top) / rect.height) * H
    }
    window.addEventListener('mousemove', handleMove)
    return () => window.removeEventListener('mousemove', handleMove)
  }, [])

  useEffect(() => {
    if (!started || !colors) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    const loop = () => {
      const s = stateRef.current
      if (!s) return

      if (!visible) {
        animRef.current = requestAnimationFrame(loop)
        return
      }

      // player paddle follows mouse
      s.player.y += (s.mouseY - PAD_H / 2 - s.player.y) * 0.15
      s.player.y = Math.max(0, Math.min(H - PAD_H, s.player.y))

      // ai paddle
      const aiTarget = s.ball.y - PAD_H / 2
      s.ai.y += (aiTarget - s.ai.y) * 0.06
      s.ai.y = Math.max(0, Math.min(H - PAD_H, s.ai.y))

      // ball
      s.ball.x += s.ball.vx
      s.ball.y += s.ball.vy

      // top/bottom bounce
      if (s.ball.y - BALL_R <= 0 || s.ball.y + BALL_R >= H) s.ball.vy *= -1

      // player paddle bounce (left side)
      if (s.ball.x - BALL_R <= PAD_W + 16 &&
          s.ball.y >= s.player.y && s.ball.y <= s.player.y + PAD_H &&
          s.ball.vx < 0) {
        s.ball.vx = Math.abs(s.ball.vx) * 1.05
        const hit = (s.ball.y - s.player.y - PAD_H / 2) / (PAD_H / 2)
        s.ball.vy = hit * 5
      }
      // ai paddle bounce (right side)
      if (s.ball.x + BALL_R >= W - PAD_W - 16 &&
          s.ball.y >= s.ai.y && s.ball.y <= s.ai.y + PAD_H &&
          s.ball.vx > 0) {
        s.ball.vx = -Math.abs(s.ball.vx) * 1.05
        const hit = (s.ball.y - s.ai.y - PAD_H / 2) / (PAD_H / 2)
        s.ball.vy = hit * 5
      }

      // scoring
      if (s.ball.x < 0) {
        s.scores.ai++
        setScores({ ...s.scores })
        s.ball = { x: W / 2, y: H / 2, vx: 4, vy: 2 * (Math.random() > 0.5 ? 1 : -1) }
      }
      if (s.ball.x > W) {
        s.scores.player++
        setScores({ ...s.scores })
        const isNew = setHigh('pong', s.scores.player)
        if (isNew) setBest(s.scores.player)
        s.ball = { x: W / 2, y: H / 2, vx: -4, vy: 2 * (Math.random() > 0.5 ? 1 : -1) }
      }

      // clamp speed
      const maxV = 12
      if (Math.abs(s.ball.vx) > maxV) s.ball.vx = maxV * Math.sign(s.ball.vx)

      // draw
      ctx.fillStyle = colors.bg
      ctx.fillRect(0, 0, W, H)

      // center line
      ctx.setLineDash([6, 8])
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.beginPath()
      ctx.moveTo(W / 2, 0)
      ctx.lineTo(W / 2, H)
      ctx.stroke()
      ctx.setLineDash([])

      // paddles
      ctx.fillStyle = colors.primary
      ctx.shadowColor = colors.primary
      ctx.shadowBlur = 12
      ctx.beginPath()
      ctx.roundRect(16, s.player.y, PAD_W, PAD_H, 4)
      ctx.fill()

      ctx.fillStyle = colors.secondary
      ctx.shadowColor = colors.secondary
      ctx.beginPath()
      ctx.roundRect(W - 16 - PAD_W, s.ai.y, PAD_W, PAD_H, 4)
      ctx.fill()
      ctx.shadowBlur = 0

      // ball
      ctx.fillStyle = colors.accent
      ctx.shadowColor = colors.accent
      ctx.shadowBlur = 14
      ctx.beginPath()
      ctx.arc(s.ball.x, s.ball.y, BALL_R, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      // scores on canvas
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.font = '48px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(s.scores.player, W / 2 - 60, 60)
      ctx.fillText(s.scores.ai, W / 2 + 60, 60)

      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [started, colors, visible, restartKey])

  return (
    <div ref={wrapRef} className="flex flex-col items-center gap-4">
      <div className="flex items-center justify-between w-full max-w-[600px]">
        <div className="flex gap-4 text-sm">
          <span className="text-white/60">Tu: <span className="text-white font-bold">{scores.player}</span></span>
          <span className="text-white/60">IA: <span className="text-white font-bold">{scores.ai}</span></span>
          <span className="text-white/40">Mejor: <span className="font-bold text-[var(--c-accent)]">{best}</span></span>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white"><FiX size={20} /></button>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded-xl border border-white/10 bg-[#0a0a0f] max-w-full"
      />
      {!started ? (
        <button onClick={init} className="px-6 py-2 rounded-lg font-semibold text-sm text-white bg-[var(--c-primary)]">
          Iniciar Juego
        </button>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <p className="text-white/30 text-xs">Mueve el raton para controlar tu paleta</p>
          <button onClick={init} className="px-4 py-1.5 rounded-lg text-xs text-white/50 hover:text-white border border-white/10 hover:border-white/20 transition-colors">
            Reiniciar
          </button>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   GAME 3 — MEMORY CARDS
   ═══════════════════════════════════════════════════════════════ */
const MEMORY_ICONS = ['🤖', '🧠', '⚡', '🔮', '💻', '🌐', '🎯', '🚀']

function MemoryGame({ onClose }) {
  const [cards, setCards] = useState([])
  const [flipped, setFlipped] = useState([])
  const [matched, setMatched] = useState([])
  const [moves, setMoves] = useState(0)
  const [timer, setTimer] = useState(0)
  const [started, setStarted] = useState(false)
  const [best, setBest] = useState(getHigh('memory'))
  const timerRef = useRef(null)

  const init = useCallback(() => {
    const pairs = [...MEMORY_ICONS, ...MEMORY_ICONS]
    const shuffled = pairs.sort(() => Math.random() - 0.5).map((icon, i) => ({ id: i, icon }))
    setCards(shuffled)
    setFlipped([])
    setMatched([])
    setMoves(0)
    setTimer(0)
    setStarted(true)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setTimer(t => t + 1), 1000)
  }, [])

  useEffect(() => () => clearInterval(timerRef.current), [])

  const handleFlip = (idx) => {
    if (flipped.length === 2 || flipped.includes(idx) || matched.includes(idx)) return
    const next = [...flipped, idx]
    setFlipped(next)

    if (next.length === 2) {
      const newMoves = moves + 1
      setMoves(newMoves)
      if (cards[next[0]].icon === cards[next[1]].icon) {
        const newMatched = [...matched, next[0], next[1]]
        setMatched(newMatched)
        setFlipped([])
        if (newMatched.length === cards.length) {
          clearInterval(timerRef.current)
          // Score = higher is better: base 1000 - moves*10 - timer*5
          const finalScore = Math.max(0, 1000 - newMoves * 10 - timer * 5)
          const isNew = setHigh('memory', finalScore)
          if (isNew) setBest(finalScore)
        }
      } else {
        setTimeout(() => setFlipped([]), 800)
      }
    }
  }

  const done = matched.length === cards.length && cards.length > 0
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center justify-between w-full max-w-md">
        <div className="flex gap-4 text-sm">
          <span className="text-white/60">Movimientos: <span className="text-white font-bold">{moves}</span></span>
          <span className="text-white/60">Tiempo: <span className="text-white font-bold">{fmt(timer)}</span></span>
          <span className="text-white/40">Mejor: <span className="font-bold text-[var(--c-accent)]">{best}</span></span>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white"><FiX size={20} /></button>
      </div>

      {!started ? (
        <button onClick={init} className="px-6 py-2 rounded-lg font-semibold text-sm text-white bg-[var(--c-primary)]">
          Iniciar Juego
        </button>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {cards.map((card, idx) => {
            const isFlipped = flipped.includes(idx) || matched.includes(idx)
            return (
              <motion.button
                key={card.id}
                onClick={() => handleFlip(idx)}
                className="w-20 h-20 rounded-xl flex items-center justify-center text-3xl cursor-pointer select-none border border-white/10"
                style={{
                  background: matched.includes(idx)
                    ? 'color-mix(in srgb, var(--c-primary) 20%, #0a0a0f)'
                    : isFlipped ? '#1a1a2e' : '#0f0f1a',
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                animate={{ rotateY: isFlipped ? 0 : 180 }}
                transition={{ duration: 0.3 }}
              >
                {isFlipped ? card.icon : (
                  <span className="text-white/10 text-xl">?</span>
                )}
              </motion.button>
            )
          })}
        </div>
      )}

      {done && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-lg font-bold text-[var(--c-primary)]">
            Completado en {moves} movimientos y {fmt(timer)}!
          </p>
          <button onClick={init} className="px-6 py-2 rounded-lg font-semibold text-sm text-white bg-[var(--c-primary)]">
            Jugar de nuevo
          </button>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   GAME 4 — TYPING SPEED
   ═══════════════════════════════════════════════════════════════ */
const TYPING_WORDS = [
  'algorithm', 'neural', 'transformer', 'gradient', 'tensor',
  'backprop', 'dataset', 'pytorch', 'inference', 'embedding',
  'tokenizer', 'attention', 'encoder', 'decoder', 'pipeline',
  'finetune', 'hyperparameter', 'overfitting', 'dropout', 'softmax',
  'convolution', 'recurrent', 'generative', 'discriminator', 'latent',
  'kubernetes', 'docker', 'microservice', 'serverless', 'graphql',
  'typescript', 'component', 'middleware', 'websocket', 'bandwidth',
  'recursion', 'polymorphism', 'abstraction', 'encapsulation', 'iterator',
  'blockchain', 'consensus', 'protocol', 'encryption', 'hashing',
  'machine', 'learning', 'artificial', 'intelligence', 'network',
  'supabase', 'postgres', 'realtime', 'function', 'deploy',
  'divergencia', 'athenia', 'quantum', 'paradigm', 'semantic',
]

function TypingGame({ onClose }) {
  const [wordList, setWordList] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [input, setInput] = useState('')
  const [timeLeft, setTimeLeft] = useState(60)
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [correct, setCorrect] = useState(0)
  const [errors, setErrors] = useState(0)
  const [best, setBest] = useState(getHigh('typing'))
  const inputRef = useRef(null)
  const timerRef = useRef(null)

  const shuffle = () => {
    const shuffled = [...TYPING_WORDS].sort(() => Math.random() - 0.5)
    setWordList(shuffled)
  }

  const init = useCallback(() => {
    shuffle()
    setCurrentIdx(0)
    setInput('')
    setTimeLeft(60)
    setStarted(true)
    setFinished(false)
    setCorrect(0)
    setErrors(0)
    clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current)
          setFinished(true)
          return 0
        }
        return t - 1
      })
    }, 1000)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  useEffect(() => () => clearInterval(timerRef.current), [])

  useEffect(() => {
    if (finished && correct > 0) {
      const wpm = correct // each correct word in 60s
      const isNew = setHigh('typing', wpm)
      if (isNew) setBest(wpm)
    }
  }, [finished, correct])

  const handleInput = (e) => {
    if (finished) return
    const val = e.target.value
    if (val.endsWith(' ')) {
      const typed = val.trim()
      if (typed === wordList[currentIdx]) {
        setCorrect(c => c + 1)
      } else {
        setErrors(er => er + 1)
      }
      setInput('')
      setCurrentIdx(i => {
        const next = i + 1
        if (next >= wordList.length) {
          shuffle()
          return 0
        }
        return next
      })
    } else {
      setInput(val)
    }
  }

  const currentWord = wordList[currentIdx] || ''
  const wpm = correct

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-lg">
      <div className="flex items-center justify-between w-full">
        <div className="flex gap-4 text-sm">
          <span className="text-white/60">Tiempo: <span className="text-white font-bold">{timeLeft}s</span></span>
          <span className="text-white/60">WPM: <span className="text-white font-bold">{wpm}</span></span>
          <span className="text-white/40">Mejor: <span className="font-bold text-[var(--c-accent)]">{best}</span></span>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white"><FiX size={20} /></button>
      </div>

      {!started ? (
        <button onClick={init} className="px-6 py-2 rounded-lg font-semibold text-sm text-white bg-[var(--c-primary)]">
          Iniciar Juego
        </button>
      ) : finished ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-4xl font-bold text-[var(--c-primary)]">{wpm} WPM</p>
          <p className="text-white/50 text-sm">Correctas: {correct} | Errores: {errors}</p>
          <p className="text-white/30 text-sm">Precision: {correct + errors > 0 ? Math.round(correct / (correct + errors) * 100) : 0}%</p>
          <button onClick={init} className="px-6 py-2 rounded-lg font-semibold text-sm text-white mt-2 bg-[var(--c-primary)]">
            Reintentar
          </button>
        </div>
      ) : (
        <>
          {/* Word display */}
          <div className="flex flex-wrap gap-2 p-4 rounded-xl border border-white/10 min-h-[80px] w-full bg-[#0a0a0f]">
            {wordList.slice(currentIdx, currentIdx + 12).map((word, i) => (
              <span
                key={`${currentIdx}-${i}`}
                className={`text-lg font-mono px-1 rounded ${i === 0 ? 'font-bold text-[var(--c-primary)] bg-[color-mix(in_srgb,var(--c-primary)_10%,transparent)]' : 'text-white/30'}`}
              >
                {word}
              </span>
            ))}
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            value={input}
            onChange={handleInput}
            className="w-full px-4 py-3 rounded-xl border text-white text-lg font-mono focus:outline-none bg-[#0f0f1a]"
            style={{
              borderColor: input && !currentWord.startsWith(input)
                ? '#ef4444'
                : input ? 'var(--c-primary)' : 'rgba(255,255,255,0.1)',
            }}
            placeholder="Escribe aqui..."
            autoFocus
          />

          {/* Progress bar */}
          <div className="w-full h-1.5 rounded-full overflow-hidden bg-white/5">
            <motion.div
              className="h-full rounded-full bg-[var(--c-primary)]"
              initial={{ width: '100%' }}
              animate={{ width: `${(timeLeft / 60) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   GAME 5 — SPACE INVADERS
   ═══════════════════════════════════════════════════════════════ */
function SpaceInvadersGame({ onClose }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const stateRef = useRef(null)
  const animRef = useRef(null)
  const keysRef = useRef({})
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [best, setBest] = useState(getHigh('spaceinvaders'))
  const [gameOver, setGameOver] = useState(false)
  const [started, setStarted] = useState(false)
  const [restartKey, setRestartKey] = useState(0)
  const colors = useCanvasColors()
  const visible = useVisibility(wrapRef)

  const W = 480, H = 520

  const init = useCallback(() => {
    cancelAnimationFrame(animRef.current)
    const aliens = []
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 8; c++) {
        aliens.push({ x: 50 + c * 46, y: 40 + r * 38, alive: true, row: r })
      }
    }
    stateRef.current = {
      player: { x: W / 2 - 16, y: H - 50, w: 32, h: 16 },
      aliens,
      bullets: [],
      alienBullets: [],
      alienDir: 1,
      alienSpeed: 0.4,
      alienMoveTimer: 0,
      alienShootTimer: 0,
      score: 0,
      lives: 3,
      alive: true,
    }
    setScore(0)
    setLives(3)
    setGameOver(false)
    setStarted(true)
    setRestartKey(k => k + 1)
    wrapRef.current?.focus()
  }, [])

  useEffect(() => {
    const down = (e) => {
      keysRef.current[e.key] = true
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault()
    }
    const up = (e) => { keysRef.current[e.key] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  useEffect(() => {
    if (!started || !colors) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    let lastShot = 0
    const alienColors = [colors.accent, colors.secondary, '#22d3ee', colors.success]

    const loop = (time) => {
      const s = stateRef.current
      if (!s || !s.alive) return

      if (!visible) {
        animRef.current = requestAnimationFrame(loop)
        return
      }

      const keys = keysRef.current
      // player movement
      if (keys['ArrowLeft'] || keys['a']) s.player.x = Math.max(0, s.player.x - 4)
      if (keys['ArrowRight'] || keys['d']) s.player.x = Math.min(W - s.player.w, s.player.x + 4)
      // shooting (throttle to 300ms)
      if (keys[' '] && time - lastShot > 300) {
        s.bullets.push({ x: s.player.x + s.player.w / 2, y: s.player.y })
        lastShot = time
      }

      // move bullets
      s.bullets = s.bullets.filter(b => { b.y -= 6; return b.y > 0 })
      s.alienBullets = s.alienBullets.filter(b => { b.y += 4; return b.y < H })

      // move aliens
      s.alienMoveTimer++
      if (s.alienMoveTimer > 2) {
        s.alienMoveTimer = 0
        let hitEdge = false
        const liveAliens = s.aliens.filter(a => a.alive)
        liveAliens.forEach(a => {
          a.x += s.alienDir * s.alienSpeed * 8
          if (a.x < 10 || a.x > W - 40) hitEdge = true
        })
        if (hitEdge) {
          s.alienDir *= -1
          liveAliens.forEach(a => { a.y += 16 })
        }
      }

      // alien shooting
      s.alienShootTimer++
      const liveAliens = s.aliens.filter(a => a.alive)
      if (s.alienShootTimer > 60 && liveAliens.length > 0) {
        s.alienShootTimer = 0
        const shooter = liveAliens[Math.floor(Math.random() * liveAliens.length)]
        s.alienBullets.push({ x: shooter.x + 14, y: shooter.y + 24 })
      }

      // bullet-alien collision
      s.bullets.forEach(b => {
        s.aliens.forEach(a => {
          if (a.alive && b.x > a.x && b.x < a.x + 28 && b.y > a.y && b.y < a.y + 24) {
            a.alive = false
            b.y = -10 // mark for removal
            s.score += (4 - a.row) * 10
            setScore(s.score)
            // speed up as aliens decrease
            const remaining = s.aliens.filter(al => al.alive).length
            s.alienSpeed = 0.4 + (32 - remaining) * 0.04
          }
        })
      })
      s.bullets = s.bullets.filter(b => b.y > 0)

      // alien bullet hitting player
      s.alienBullets.forEach(b => {
        if (b.x > s.player.x && b.x < s.player.x + s.player.w && b.y > s.player.y && b.y < s.player.y + s.player.h) {
          s.lives--
          setLives(s.lives)
          b.y = H + 10
          if (s.lives <= 0) {
            s.alive = false
            setGameOver(true)
            const isNew = setHigh('spaceinvaders', s.score)
            if (isNew) setBest(s.score)
          }
        }
      })

      // aliens reaching bottom
      if (liveAliens.some(a => a.y + 24 >= s.player.y)) {
        s.alive = false
        setGameOver(true)
        const isNew = setHigh('spaceinvaders', s.score)
        if (isNew) setBest(s.score)
      }

      // all aliens dead = win, respawn harder
      if (s.aliens.filter(a => a.alive).length === 0) {
        const aliens = []
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 8; c++) {
            aliens.push({ x: 50 + c * 46, y: 40 + r * 38, alive: true, row: r })
          }
        }
        s.aliens = aliens
        s.alienSpeed = Math.min(2, s.alienSpeed + 0.3)
        s.alienBullets = []
      }

      // draw
      ctx.fillStyle = colors.bg
      ctx.fillRect(0, 0, W, H)

      // stars
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      for (let i = 0; i < 30; i++) {
        const sx = (i * 137 + 50) % W, sy = (i * 97 + 30) % H
        ctx.fillRect(sx, sy, 1, 1)
      }

      // player ship
      ctx.fillStyle = colors.primary
      ctx.shadowColor = colors.primary
      ctx.shadowBlur = 10
      ctx.beginPath()
      ctx.moveTo(s.player.x + s.player.w / 2, s.player.y - 4)
      ctx.lineTo(s.player.x, s.player.y + s.player.h)
      ctx.lineTo(s.player.x + s.player.w, s.player.y + s.player.h)
      ctx.closePath()
      ctx.fill()
      ctx.shadowBlur = 0

      // aliens
      s.aliens.forEach(a => {
        if (!a.alive) return
        ctx.fillStyle = alienColors[a.row] || colors.accent
        ctx.shadowColor = alienColors[a.row] || colors.accent
        ctx.shadowBlur = 6
        // simple alien shape
        ctx.beginPath()
        ctx.roundRect(a.x, a.y, 28, 20, 4)
        ctx.fill()
        // eyes
        ctx.fillStyle = colors.bg
        ctx.fillRect(a.x + 7, a.y + 7, 4, 4)
        ctx.fillRect(a.x + 17, a.y + 7, 4, 4)
        ctx.shadowBlur = 0
      })

      // player bullets
      ctx.fillStyle = colors.primary
      ctx.shadowColor = colors.primary
      ctx.shadowBlur = 8
      s.bullets.forEach(b => {
        ctx.fillRect(b.x - 1, b.y, 2, 8)
      })
      ctx.shadowBlur = 0

      // alien bullets
      ctx.fillStyle = colors.accent
      ctx.shadowColor = colors.accent
      ctx.shadowBlur = 6
      s.alienBullets.forEach(b => {
        ctx.fillRect(b.x - 1, b.y, 2, 8)
      })
      ctx.shadowBlur = 0

      // lives display on canvas
      ctx.fillStyle = colors.primary
      for (let i = 0; i < s.lives; i++) {
        ctx.beginPath()
        ctx.moveTo(15 + i * 25 + 8, H - 15)
        ctx.lineTo(15 + i * 25, H - 5)
        ctx.lineTo(15 + i * 25 + 16, H - 5)
        ctx.closePath()
        ctx.fill()
      }

      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [started, colors, visible, restartKey])

  return (
    <div ref={wrapRef} tabIndex={-1} className="flex flex-col items-center gap-4 outline-none">
      <div className="flex items-center justify-between w-full max-w-[480px]">
        <div className="flex gap-4 text-sm">
          <span className="text-white/60">Puntos: <span className="text-white font-bold">{score}</span></span>
          <span className="text-white/60">Vidas: <span className="text-white font-bold">{lives}</span></span>
          <span className="text-white/40">Mejor: <span className="font-bold text-[var(--c-accent)]">{best}</span></span>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white"><FiX size={20} /></button>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded-xl border border-white/10 bg-[#0a0a0f]"
      />
      {!started && (
        <button onClick={init} className="px-6 py-2 rounded-lg font-semibold text-sm text-white bg-[var(--c-primary)]">
          Iniciar Juego
        </button>
      )}
      {gameOver && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-white/60 text-sm">Game Over! Puntos: {score}</p>
          <button onClick={init} className="px-6 py-2 rounded-lg font-semibold text-sm text-white bg-[var(--c-primary)]">
            Reintentar
          </button>
        </div>
      )}
      {started && !gameOver && (
        <p className="text-white/30 text-xs">Flechas para mover | Espacio para disparar</p>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   GAME 6 — RACING
   ═══════════════════════════════════════════════════════════════ */
function RacingGame({ onClose }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const stateRef = useRef(null)
  const animRef = useRef(null)
  const keysRef = useRef({})
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(getHigh('racing'))
  const [gameOver, setGameOver] = useState(false)
  const [started, setStarted] = useState(false)
  const [restartKey, setRestartKey] = useState(0)
  const colors = useCanvasColors()
  const visible = useVisibility(wrapRef)

  const W = 360, H = 560
  const LANE_W = 70, LANES = 4
  const ROAD_L = (W - LANES * LANE_W) / 2

  const init = useCallback(() => {
    cancelAnimationFrame(animRef.current)
    stateRef.current = {
      player: { lane: 1, targetLane: 1, x: ROAD_L + 1 * LANE_W + LANE_W / 2, y: H - 80, w: 30, h: 50 },
      obstacles: [],
      spawnTimer: 0,
      speed: 3,
      distance: 0,
      alive: true,
      roadOffset: 0,
    }
    setScore(0)
    setGameOver(false)
    setStarted(true)
    setRestartKey(k => k + 1)
    wrapRef.current?.focus()
  }, [])

  useEffect(() => {
    const down = (e) => {
      keysRef.current[e.key] = true
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault()

      // Lane switching on key press (not hold)
      if (!stateRef.current || !stateRef.current.alive) return
      const s = stateRef.current
      if (e.key === 'ArrowLeft' || e.key === 'a') {
        s.player.targetLane = Math.max(0, s.player.targetLane - 1)
      }
      if (e.key === 'ArrowRight' || e.key === 'd') {
        s.player.targetLane = Math.min(LANES - 1, s.player.targetLane + 1)
      }
    }
    const up = (e) => { keysRef.current[e.key] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  useEffect(() => {
    if (!started || !colors) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    const obstacleColors = [colors.error, colors.warning, colors.secondary, '#22d3ee']

    const loop = () => {
      const s = stateRef.current
      if (!s || !s.alive) return

      if (!visible) {
        animRef.current = requestAnimationFrame(loop)
        return
      }

      // Smooth lane transition
      const targetX = ROAD_L + s.player.targetLane * LANE_W + LANE_W / 2
      s.player.x += (targetX - s.player.x) * 0.15
      if (Math.abs(s.player.x - targetX) < 1) {
        s.player.x = targetX
        s.player.lane = s.player.targetLane
      }

      // speed increases over time
      s.speed = 3 + s.distance / 500
      s.distance += s.speed
      setScore(Math.floor(s.distance / 10))

      // spawn obstacles
      s.spawnTimer++
      const spawnRate = Math.max(30, 70 - Math.floor(s.distance / 300))
      if (s.spawnTimer >= spawnRate) {
        s.spawnTimer = 0
        const lane = Math.floor(Math.random() * LANES)
        const isBarrier = Math.random() > 0.6
        s.obstacles.push({
          lane,
          x: ROAD_L + lane * LANE_W + LANE_W / 2,
          y: -60,
          w: isBarrier ? LANE_W - 10 : 28,
          h: isBarrier ? 20 : 50,
          type: isBarrier ? 'barrier' : 'car',
          color: obstacleColors[Math.floor(Math.random() * 4)],
        })
      }

      // move obstacles
      s.obstacles.forEach(o => { o.y += s.speed })
      s.obstacles = s.obstacles.filter(o => o.y < H + 60)

      // collision
      const px = s.player.x, py = s.player.y, pw = s.player.w / 2, ph = s.player.h / 2
      for (const o of s.obstacles) {
        const ow = o.w / 2, oh = o.h / 2
        if (Math.abs(px - o.x) < pw + ow && Math.abs(py - o.y) < ph + oh) {
          s.alive = false
          setGameOver(true)
          const finalScore = Math.floor(s.distance / 10)
          const isNew = setHigh('racing', finalScore)
          if (isNew) setBest(finalScore)
          return
        }
      }

      // draw
      ctx.fillStyle = colors.bg
      ctx.fillRect(0, 0, W, H)

      // road
      ctx.fillStyle = '#111118'
      ctx.fillRect(ROAD_L, 0, LANES * LANE_W, H)

      // road edges
      ctx.fillStyle = colors.primary
      ctx.shadowColor = colors.primary
      ctx.shadowBlur = 6
      ctx.fillRect(ROAD_L - 3, 0, 3, H)
      ctx.fillRect(ROAD_L + LANES * LANE_W, 0, 3, H)
      ctx.shadowBlur = 0

      // lane dashes
      s.roadOffset = (s.roadOffset + s.speed) % 40
      ctx.setLineDash([20, 20])
      ctx.lineDashOffset = -s.roadOffset
      ctx.strokeStyle = 'rgba(255,255,255,0.08)'
      ctx.lineWidth = 1
      for (let i = 1; i < LANES; i++) {
        ctx.beginPath()
        ctx.moveTo(ROAD_L + i * LANE_W, 0)
        ctx.lineTo(ROAD_L + i * LANE_W, H)
        ctx.stroke()
      }
      ctx.setLineDash([])
      ctx.lineWidth = 1

      // obstacles
      s.obstacles.forEach(o => {
        ctx.fillStyle = o.color
        ctx.shadowColor = o.color
        ctx.shadowBlur = 8
        if (o.type === 'car') {
          ctx.beginPath()
          ctx.roundRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h, 6)
          ctx.fill()
          // windshield
          ctx.fillStyle = 'rgba(0,0,0,0.5)'
          ctx.fillRect(o.x - 8, o.y - o.h / 2 + 6, 16, 10)
        } else {
          ctx.beginPath()
          ctx.roundRect(o.x - o.w / 2, o.y - o.h / 2, o.w, o.h, 3)
          ctx.fill()
        }
        ctx.shadowBlur = 0
      })

      // player car
      ctx.fillStyle = colors.primary
      ctx.shadowColor = colors.primary
      ctx.shadowBlur = 14
      ctx.beginPath()
      ctx.roundRect(px - pw, py - ph, s.player.w, s.player.h, 6)
      ctx.fill()
      ctx.shadowBlur = 0
      // windshield
      ctx.fillStyle = 'rgba(0,0,0,0.4)'
      ctx.fillRect(px - 8, py - ph + 8, 16, 10)
      // tail lights
      ctx.fillStyle = colors.accent
      ctx.shadowColor = colors.accent
      ctx.shadowBlur = 6
      ctx.fillRect(px - pw + 2, py + ph - 6, 6, 4)
      ctx.fillRect(px + pw - 8, py + ph - 6, 6, 4)
      ctx.shadowBlur = 0

      // speed indicator
      ctx.fillStyle = 'rgba(255,255,255,0.15)'
      ctx.font = '12px monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`${Math.floor(s.speed * 30)} km/h`, W - 15, H - 15)

      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [started, colors, visible, restartKey])

  return (
    <div ref={wrapRef} tabIndex={-1} className="flex flex-col items-center gap-4 outline-none">
      <div className="flex items-center justify-between w-full max-w-[360px]">
        <div className="flex gap-4 text-sm">
          <span className="text-white/60">Distancia: <span className="text-white font-bold">{score}</span></span>
          <span className="text-white/40">Mejor: <span className="font-bold text-[var(--c-accent)]">{best}</span></span>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white"><FiX size={20} /></button>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded-xl border border-white/10 bg-[#0a0a0f]"
      />
      {!started && (
        <button onClick={init} className="px-6 py-2 rounded-lg font-semibold text-sm text-white bg-[var(--c-primary)]">
          Iniciar Juego
        </button>
      )}
      {gameOver && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-white/60 text-sm">Game Over! Distancia: {score}</p>
          <button onClick={init} className="px-6 py-2 rounded-lg font-semibold text-sm text-white bg-[var(--c-primary)]">
            Reintentar
          </button>
        </div>
      )}
      {started && !gameOver && (
        <p className="text-white/30 text-xs">Flechas izquierda/derecha para cambiar de carril</p>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   GAME 7 — PLATFORMER
   ═══════════════════════════════════════════════════════════════ */
function PlatformerGame({ onClose }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const stateRef = useRef(null)
  const animRef = useRef(null)
  const keysRef = useRef({})
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(getHigh('platformer'))
  const [gameOver, setGameOver] = useState(false)
  const [started, setStarted] = useState(false)
  const [restartKey, setRestartKey] = useState(0)
  const colors = useCanvasColors()
  const visible = useVisibility(wrapRef)

  const W = 560, H = 400
  const GRAVITY = 0.5
  const JUMP_FORCE = -10
  const PLAYER_W = 20, PLAYER_H = 28

  const init = useCallback(() => {
    cancelAnimationFrame(animRef.current)
    // generate platforms
    const platforms = [{ x: 50, y: H - 40, w: 120, h: 12 }]
    for (let i = 1; i < 100; i++) {
      const prev = platforms[i - 1]
      platforms.push({
        x: prev.x + 80 + Math.random() * 100,
        y: Math.max(60, Math.min(H - 60, prev.y + (Math.random() - 0.55) * 120)),
        w: 60 + Math.random() * 80,
        h: 12,
      })
    }
    // place coins on platforms
    const coins = platforms.slice(1).map((p, i) => ({
      x: p.x + p.w / 2,
      y: p.y - 25,
      collected: false,
      id: i,
    }))

    stateRef.current = {
      player: { x: 80, y: H - 80, vx: 0, vy: 0, onGround: false },
      platforms,
      coins,
      cameraX: 0,
      score: 0,
      alive: true,
    }
    setScore(0)
    setGameOver(false)
    setStarted(true)
    setRestartKey(k => k + 1)
    wrapRef.current?.focus()
  }, [])

  useEffect(() => {
    const down = (e) => {
      keysRef.current[e.key] = true
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault()
    }
    const up = (e) => { keysRef.current[e.key] = false }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  useEffect(() => {
    if (!started || !colors) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    const loop = () => {
      const s = stateRef.current
      if (!s || !s.alive) return

      if (!visible) {
        animRef.current = requestAnimationFrame(loop)
        return
      }

      const p = s.player
      const keys = keysRef.current

      // horizontal movement
      if (keys['ArrowLeft'] || keys['a']) p.vx = -4
      else if (keys['ArrowRight'] || keys['d']) p.vx = 4
      else p.vx *= 0.8

      // jump
      if ((keys[' '] || keys['ArrowUp'] || keys['w']) && p.onGround) {
        p.vy = JUMP_FORCE
        p.onGround = false
      }

      // gravity
      p.vy += GRAVITY
      p.x += p.vx
      p.y += p.vy

      // platform collision
      p.onGround = false
      for (const plat of s.platforms) {
        if (
          p.x + PLAYER_W > plat.x && p.x < plat.x + plat.w &&
          p.y + PLAYER_H >= plat.y && p.y + PLAYER_H <= plat.y + plat.h + 10 &&
          p.vy >= 0
        ) {
          p.y = plat.y - PLAYER_H
          p.vy = 0
          p.onGround = true
        }
      }

      // fell off screen
      if (p.y > H + 100) {
        s.alive = false
        setGameOver(true)
        const isNew = setHigh('platformer', s.score)
        if (isNew) setBest(s.score)
        return
      }

      // coin collection
      s.coins.forEach(c => {
        if (!c.collected && Math.abs(p.x + PLAYER_W / 2 - c.x) < 18 && Math.abs(p.y + PLAYER_H / 2 - c.y) < 18) {
          c.collected = true
          s.score++
          setScore(s.score)
        }
      })

      // camera follows player
      s.cameraX += (p.x - W / 3 - s.cameraX) * 0.1

      // draw
      ctx.fillStyle = colors.bg
      ctx.fillRect(0, 0, W, H)

      // background parallax stars
      ctx.fillStyle = 'rgba(255,255,255,0.06)'
      for (let i = 0; i < 40; i++) {
        const sx = ((i * 173 + 20) % (W * 2) - s.cameraX * 0.2 + W * 4) % (W * 2)
        const sy = (i * 89 + 15) % H
        ctx.fillRect(sx, sy, 1.5, 1.5)
      }

      ctx.save()
      ctx.translate(-s.cameraX, 0)

      // platforms
      s.platforms.forEach(plat => {
        if (plat.x + plat.w < s.cameraX - 20 || plat.x > s.cameraX + W + 20) return
        ctx.fillStyle = '#1e1e2e'
        ctx.strokeStyle = colors.primary
        ctx.lineWidth = 1.5
        ctx.shadowColor = colors.primary
        ctx.shadowBlur = 4
        ctx.beginPath()
        ctx.roundRect(plat.x, plat.y, plat.w, plat.h, 4)
        ctx.fill()
        ctx.stroke()
        ctx.shadowBlur = 0
      })

      // coins
      s.coins.forEach(c => {
        if (c.collected) return
        if (c.x < s.cameraX - 20 || c.x > s.cameraX + W + 20) return
        ctx.fillStyle = colors.warning
        ctx.shadowColor = colors.warning
        ctx.shadowBlur = 10
        ctx.beginPath()
        ctx.arc(c.x, c.y, 8, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
        // inner highlight
        ctx.fillStyle = '#fde68a'
        ctx.beginPath()
        ctx.arc(c.x - 2, c.y - 2, 3, 0, Math.PI * 2)
        ctx.fill()
      })

      // player
      ctx.fillStyle = colors.primary
      ctx.shadowColor = colors.primary
      ctx.shadowBlur = 12
      ctx.beginPath()
      ctx.roundRect(p.x, p.y, PLAYER_W, PLAYER_H, 5)
      ctx.fill()
      ctx.shadowBlur = 0
      // eyes
      ctx.fillStyle = colors.bg
      const eyeDir = p.vx > 0.5 ? 3 : p.vx < -0.5 ? -1 : 1
      ctx.fillRect(p.x + 5 + eyeDir, p.y + 8, 3, 4)
      ctx.fillRect(p.x + 12 + eyeDir, p.y + 8, 3, 4)

      ctx.restore()

      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [started, colors, visible, restartKey])

  return (
    <div ref={wrapRef} tabIndex={-1} className="flex flex-col items-center gap-4 outline-none">
      <div className="flex items-center justify-between w-full max-w-[560px]">
        <div className="flex gap-4 text-sm">
          <span className="text-white/60">Monedas: <span className="text-white font-bold">{score}</span></span>
          <span className="text-white/40">Mejor: <span className="font-bold text-[var(--c-accent)]">{best}</span></span>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white"><FiX size={20} /></button>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded-xl border border-white/10 bg-[#0a0a0f]"
      />
      {!started && (
        <button onClick={init} className="px-6 py-2 rounded-lg font-semibold text-sm text-white bg-[var(--c-primary)]">
          Iniciar Juego
        </button>
      )}
      {gameOver && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-white/60 text-sm">Game Over! Monedas: {score}</p>
          <button onClick={init} className="px-6 py-2 rounded-lg font-semibold text-sm text-white bg-[var(--c-primary)]">
            Reintentar
          </button>
        </div>
      )}
      {started && !gameOver && (
        <p className="text-white/30 text-xs">Flechas o WASD para mover | Espacio para saltar</p>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   GAME 8 — BREAKOUT / ARKANOID
   ═══════════════════════════════════════════════════════════════ */
function BreakoutGame({ onClose }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const stateRef = useRef(null)
  const animRef = useRef(null)
  const keysRef = useRef({})
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [best, setBest] = useState(getHigh('breakout'))
  const [gameOver, setGameOver] = useState(false)
  const [started, setStarted] = useState(false)
  const [restartKey, setRestartKey] = useState(0)
  const colors = useCanvasColors()
  const visible = useVisibility(wrapRef)

  const W = 480, H = 520
  const COLS = 10, ROWS = 6
  const BRICK_W = (W - 40) / COLS, BRICK_H = 18, BRICK_GAP = 3
  const PAD_W = 80, PAD_H = 12, BALL_R = 6

  function makeBricks() {
    const bricks = []
    const brickColors = [
      '#f472b6', '#a855f7', '#06b6d4', '#22d3ee', '#34d399', '#fbbf24'
    ]
    const points = [60, 50, 40, 30, 20, 10]
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        bricks.push({
          x: 20 + c * BRICK_W,
          y: 50 + r * (BRICK_H + BRICK_GAP),
          w: BRICK_W - BRICK_GAP,
          h: BRICK_H,
          alive: true,
          color: brickColors[r],
          points: points[r],
        })
      }
    }
    return bricks
  }

  const init = useCallback(() => {
    cancelAnimationFrame(animRef.current)
    stateRef.current = {
      paddle: { x: W / 2 - PAD_W / 2, y: H - 40 },
      ball: { x: W / 2, y: H - 60, vx: 3.5, vy: -3.5 },
      bricks: makeBricks(),
      score: 0,
      lives: 3,
      alive: true,
      mouseX: W / 2,
    }
    setScore(0)
    setLives(3)
    setGameOver(false)
    setStarted(true)
    setRestartKey(k => k + 1)
    wrapRef.current?.focus()
  }, [])

  useEffect(() => {
    const down = (e) => {
      keysRef.current[e.key] = true
      if (['ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault()
    }
    const up = (e) => { keysRef.current[e.key] = false }
    const move = (e) => {
      if (!stateRef.current || !canvasRef.current) return
      const rect = canvasRef.current.getBoundingClientRect()
      stateRef.current.mouseX = ((e.clientX - rect.left) / rect.width) * W
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('mousemove', move)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('mousemove', move)
    }
  }, [])

  useEffect(() => {
    if (!started || !colors) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    const loop = () => {
      const s = stateRef.current
      if (!s || !s.alive) return

      if (!visible) {
        animRef.current = requestAnimationFrame(loop)
        return
      }

      const keys = keysRef.current
      // paddle movement (keyboard + mouse)
      if (keys['ArrowLeft'] || keys['a']) s.paddle.x -= 6
      if (keys['ArrowRight'] || keys['d']) s.paddle.x += 6
      s.paddle.x += (s.mouseX - PAD_W / 2 - s.paddle.x) * 0.15
      s.paddle.x = Math.max(0, Math.min(W - PAD_W, s.paddle.x))

      // ball movement
      s.ball.x += s.ball.vx
      s.ball.y += s.ball.vy

      // wall bounce
      if (s.ball.x - BALL_R <= 0 || s.ball.x + BALL_R >= W) s.ball.vx *= -1
      if (s.ball.y - BALL_R <= 0) s.ball.vy *= -1

      // paddle bounce
      if (
        s.ball.y + BALL_R >= s.paddle.y &&
        s.ball.y + BALL_R <= s.paddle.y + PAD_H + 6 &&
        s.ball.x >= s.paddle.x &&
        s.ball.x <= s.paddle.x + PAD_W &&
        s.ball.vy > 0
      ) {
        s.ball.vy = -Math.abs(s.ball.vy)
        const hit = (s.ball.x - s.paddle.x - PAD_W / 2) / (PAD_W / 2)
        s.ball.vx = hit * 5
        // ensure minimum vy
        if (Math.abs(s.ball.vy) < 2) s.ball.vy = -2
      }

      // brick collision
      for (const b of s.bricks) {
        if (!b.alive) continue
        if (
          s.ball.x + BALL_R > b.x && s.ball.x - BALL_R < b.x + b.w &&
          s.ball.y + BALL_R > b.y && s.ball.y - BALL_R < b.y + b.h
        ) {
          b.alive = false
          s.score += b.points
          setScore(s.score)

          // determine bounce direction
          const overlapL = s.ball.x + BALL_R - b.x
          const overlapR = b.x + b.w - (s.ball.x - BALL_R)
          const overlapT = s.ball.y + BALL_R - b.y
          const overlapB = b.y + b.h - (s.ball.y - BALL_R)
          const minOverlap = Math.min(overlapL, overlapR, overlapT, overlapB)
          if (minOverlap === overlapT || minOverlap === overlapB) s.ball.vy *= -1
          else s.ball.vx *= -1
          break
        }
      }

      // ball falls off bottom
      if (s.ball.y > H + 20) {
        s.lives--
        setLives(s.lives)
        if (s.lives <= 0) {
          s.alive = false
          setGameOver(true)
          const isNew = setHigh('breakout', s.score)
          if (isNew) setBest(s.score)
          return
        }
        // reset ball
        s.ball = { x: s.paddle.x + PAD_W / 2, y: s.paddle.y - 20, vx: 3.5 * (Math.random() > 0.5 ? 1 : -1), vy: -3.5 }
      }

      // all bricks cleared - regenerate
      if (s.bricks.every(b => !b.alive)) {
        s.bricks = makeBricks()
        s.ball.vx *= 1.15
        s.ball.vy *= 1.15
      }

      // draw
      ctx.fillStyle = colors.bg
      ctx.fillRect(0, 0, W, H)

      // bricks
      s.bricks.forEach(b => {
        if (!b.alive) return
        ctx.fillStyle = b.color
        ctx.shadowColor = b.color
        ctx.shadowBlur = 4
        ctx.beginPath()
        ctx.roundRect(b.x, b.y, b.w, b.h, 3)
        ctx.fill()
        ctx.shadowBlur = 0
      })

      // paddle
      ctx.fillStyle = colors.primary
      ctx.shadowColor = colors.primary
      ctx.shadowBlur = 12
      ctx.beginPath()
      ctx.roundRect(s.paddle.x, s.paddle.y, PAD_W, PAD_H, 6)
      ctx.fill()
      ctx.shadowBlur = 0

      // ball
      ctx.fillStyle = colors.accent
      ctx.shadowColor = colors.accent
      ctx.shadowBlur = 14
      ctx.beginPath()
      ctx.arc(s.ball.x, s.ball.y, BALL_R, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      // lives on canvas
      for (let i = 0; i < s.lives; i++) {
        ctx.fillStyle = colors.accent
        ctx.beginPath()
        ctx.arc(20 + i * 20, H - 12, 5, 0, Math.PI * 2)
        ctx.fill()
      }

      animRef.current = requestAnimationFrame(loop)
    }
    animRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animRef.current)
  }, [started, colors, visible, restartKey])

  return (
    <div ref={wrapRef} tabIndex={-1} className="flex flex-col items-center gap-4 outline-none">
      <div className="flex items-center justify-between w-full max-w-[480px]">
        <div className="flex gap-4 text-sm">
          <span className="text-white/60">Puntos: <span className="text-white font-bold">{score}</span></span>
          <span className="text-white/60">Vidas: <span className="text-white font-bold">{lives}</span></span>
          <span className="text-white/40">Mejor: <span className="font-bold text-[var(--c-accent)]">{best}</span></span>
        </div>
        <button onClick={onClose} className="text-white/40 hover:text-white"><FiX size={20} /></button>
      </div>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded-xl border border-white/10 bg-[#0a0a0f]"
      />
      {!started && (
        <button onClick={init} className="px-6 py-2 rounded-lg font-semibold text-sm text-white bg-[var(--c-primary)]">
          Iniciar Juego
        </button>
      )}
      {gameOver && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-white/60 text-sm">Game Over! Puntos: {score}</p>
          <button onClick={init} className="px-6 py-2 rounded-lg font-semibold text-sm text-white bg-[var(--c-primary)]">
            Reintentar
          </button>
        </div>
      )}
      {started && !gameOver && (
        <p className="text-white/30 text-xs">Raton o flechas para mover la paleta</p>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════
   UTILITY: hex color to rgb components string
   ═══════════════════════════════════════════════════════════════ */
function hexToRgb(hex) {
  if (!hex) return '255, 255, 255'
  const h = hex.replace('#', '')
  const r = parseInt(h.substring(0, 2), 16)
  const g = parseInt(h.substring(2, 4), 16)
  const b = parseInt(h.substring(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return '255, 255, 255'
  return `${r}, ${g}, ${b}`
}

/* ═══════════════════════════════════════════════════════════════
   GAME CARDS DATA
   ═══════════════════════════════════════════════════════════════ */
const GAMES = [
  {
    id: 'snake',
    name: 'Snake',
    description: 'Clasico juego de la serpiente. Come, crece, sobrevive.',
    icon: FiZap,
    color: 'var(--c-primary)',
    Component: SnakeGame,
    scoreLabel: 'Puntos',
  },
  {
    id: 'pong',
    name: 'Pong',
    description: 'Tu vs la IA. Mueve el raton para defender tu lado.',
    icon: FiTarget,
    color: 'var(--c-secondary)',
    Component: PongGame,
    scoreLabel: 'Puntos',
  },
  {
    id: 'memory',
    name: 'Memory Cards',
    description: 'Encuentra los pares de iconos tech. Entrena tu memoria.',
    icon: FiCpu,
    color: 'var(--c-accent)',
    Component: MemoryGame,
    scoreLabel: 'Score',
  },
  {
    id: 'typing',
    name: 'Typing Speed',
    description: 'Escribe terminos de programacion lo mas rapido posible.',
    icon: FiType,
    color: '#22d3ee',
    Component: TypingGame,
    scoreLabel: 'WPM',
  },
  {
    id: 'spaceinvaders',
    name: 'Space Invaders',
    description: 'Defiende la galaxia. Destruye oleadas de invasores alienigenas.',
    icon: FiNavigation,
    color: '#f472b6',
    Component: SpaceInvadersGame,
    scoreLabel: 'Puntos',
  },
  {
    id: 'racing',
    name: 'Racing',
    description: 'Esquiva obstaculos a toda velocidad. Cuanto puedes durar?',
    icon: FiTruck,
    color: '#ef4444',
    Component: RacingGame,
    scoreLabel: 'Distancia',
  },
  {
    id: 'platformer',
    name: 'Platformer',
    description: 'Salta entre plataformas y recoge todas las monedas.',
    icon: FiUser,
    color: '#fbbf24',
    Component: PlatformerGame,
    scoreLabel: 'Monedas',
  },
  {
    id: 'breakout',
    name: 'Breakout',
    description: 'Rompe todos los ladrillos con la pelota. Clasico Arkanoid.',
    icon: FiGrid,
    color: '#a855f7',
    Component: BreakoutGame,
    scoreLabel: 'Puntos',
  },
]

/* ═══════════════════════════════════════════════════════════════
   ARCADE PAGE
   ═══════════════════════════════════════════════════════════════ */
export default function Arcade() {
  const [activeGame, setActiveGame] = useState(null)

  return (
    <motion.div
      className="min-h-screen p-6 md:p-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <div className="mb-10">
        <motion.h1
          className="text-3xl md:text-4xl font-bold font-[family-name:var(--font-title)] text-white mb-2"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          <span className="mr-3" role="img" aria-label="arcade">🕹️</span>
          Arcade Divergenc
          <span className="text-[var(--c-primary)]">IA</span>
        </motion.h1>
        <motion.p
          className="text-white/40 text-lg"
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          Descansa la mente, entrena los reflejos
        </motion.p>
      </div>

      {/* Leaderboard summary */}
      <motion.div
        className="mb-8 p-4 rounded-2xl border border-white/[0.06] flex flex-wrap gap-6 bg-white/[0.02]"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <div className="flex items-center gap-2">
          <FiAward size={18} className="text-[var(--c-accent)]" />
          <span className="text-white/50 text-sm font-semibold">Mejores marcas personales:</span>
        </div>
        {GAMES.map(g => (
          <div key={g.id} className="flex items-center gap-2 text-sm">
            <g.icon size={14} style={{ color: g.color }} />
            <span className="text-white/40">{g.name}:</span>
            <span className="font-bold text-white/70">{getHigh(g.id) || '—'}</span>
            <span className="text-white/30 text-xs">{g.scoreLabel}</span>
          </div>
        ))}
      </motion.div>

      {/* Game Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        {GAMES.map((game, i) => (
          <motion.div
            key={game.id}
            className="rounded-2xl border border-white/[0.08] p-6 flex flex-col items-center text-center gap-4 cursor-pointer group bg-white/[0.02] hover:border-white/20 transition-colors"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 + i * 0.07 }}
            whileHover={{ scale: 1.03 }}
            onClick={() => setActiveGame(game.id)}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: `color-mix(in srgb, ${game.color} 15%, transparent)` }}
            >
              <game.icon size={28} style={{ color: game.color, filter: `drop-shadow(0 0 8px ${game.color})` }} />
            </div>
            <h3 className="text-white font-bold text-lg">{game.name}</h3>
            <p className="text-white/40 text-sm leading-relaxed">{game.description}</p>
            <div className="text-xs text-white/30">
              Record: <span className="font-bold text-white/50">{getHigh(game.id) || '—'}</span> {game.scoreLabel}
            </div>
            <button
              className="mt-auto px-5 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all"
              style={{ background: `color-mix(in srgb, ${game.color} 20%, transparent)`, color: game.color }}
              onMouseEnter={(e) => { e.currentTarget.style.background = `color-mix(in srgb, ${game.color} 35%, transparent)` }}
              onMouseLeave={(e) => { e.currentTarget.style.background = `color-mix(in srgb, ${game.color} 20%, transparent)` }}
            >
              <FiPlay size={14} /> Jugar
            </button>
          </motion.div>
        ))}
      </div>

      {/* Active Game Modal */}
      <AnimatePresence>
        {activeGame && (() => {
          const game = GAMES.find(g => g.id === activeGame)
          if (!game) return null
          const GameComponent = game.Component
          return (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* backdrop */}
              <div
                className="absolute inset-0 bg-black/85 backdrop-blur-lg"
                onClick={() => setActiveGame(null)}
              />
              {/* modal content */}
              <motion.div
                className="relative z-10 rounded-2xl border border-white/[0.08] p-6 md:p-8 max-w-[700px] w-full max-h-[90vh] overflow-y-auto bg-[#0c0c14]"
                initial={{ scale: 0.9, y: 30, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.9, y: 30, opacity: 0 }}
                transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
              >
                <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
                  <game.icon size={20} style={{ color: game.color }} />
                  {game.name}
                </h2>
                <GameComponent onClose={() => setActiveGame(null)} />
              </motion.div>
            </motion.div>
          )
        })()}
      </AnimatePresence>
    </motion.div>
  )
}
