import { useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiCheck, FiSlash } from 'react-icons/fi'

/* ═══════════════════════════════════════════════════════════════════════════
   Banner animation renderers — each gets (ctx, canvas, time, mouse, colors)
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function getCSSColor(varName, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
    return v || fallback
  } catch { return fallback }
}

function getThemeColors() {
  return {
    primary:   getCSSColor('--c-primary',   '#FC651F'),
    secondary: getCSSColor('--c-secondary', '#8B5CF6'),
    accent:    getCSSColor('--c-accent',    '#00D1FF'),
    bg:        getCSSColor('--c-bg',        '#060304'),
    success:   getCSSColor('--c-success',   '#22c55e'),
  }
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

/* ═══════════ 1. DINO RUN ═══════════════════════════════════════════════ */
function createDinoRun() {
  let groundOffset = 0
  const cacti = []
  const clouds = []
  let dinoY = 0, dinoVel = 0, jumping = false

  for (let i = 0; i < 3; i++) {
    clouds.push({ x: Math.random() * 800, y: 15 + Math.random() * 40, w: 40 + Math.random() * 30 })
  }
  for (let i = 0; i < 4; i++) {
    cacti.push({ x: 300 + i * 200 + Math.random() * 100, h: 20 + Math.random() * 15 })
  }

  return {
    onInteract() { if (!jumping) { jumping = true; dinoVel = -6 } },
    render(ctx, w, h, time, mouse, colors) {
      const { primary, secondary, accent } = colors
      const groundY = h - 30

      // sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, groundY)
      sky.addColorStop(0, '#0a0a1a')
      sky.addColorStop(1, '#1a1028')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, w, groundY)

      // clouds
      ctx.fillStyle = 'rgba(255,255,255,0.06)'
      clouds.forEach(c => {
        c.x -= 0.3
        if (c.x + c.w < 0) c.x = w + 20
        ctx.beginPath()
        ctx.ellipse(c.x, c.y, c.w / 2, 8, 0, 0, Math.PI * 2)
        ctx.fill()
      })

      // ground
      groundOffset = (groundOffset + 2) % 20
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.fillRect(0, groundY, w, h - groundY)
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, groundY)
      ctx.lineTo(w, groundY)
      ctx.stroke()

      // ground details
      for (let x = -groundOffset; x < w; x += 20) {
        ctx.fillStyle = 'rgba(255,255,255,0.04)'
        ctx.fillRect(x, groundY + 5, 2, 2)
      }

      // dino physics
      if (jumping) {
        dinoVel += 0.35
        dinoY += dinoVel
        if (dinoY >= 0) { dinoY = 0; jumping = false; dinoVel = 0 }
      }

      // dino (pixel art style)
      const dx = 60, dy = groundY - 24 + dinoY
      const p = ctx.fillStyle = primary
      // body
      ctx.fillStyle = primary
      ctx.fillRect(dx, dy, 12, 16)
      // head
      ctx.fillRect(dx + 4, dy - 8, 12, 10)
      // eye
      ctx.fillStyle = '#fff'
      ctx.fillRect(dx + 12, dy - 6, 2, 2)
      // legs (animate)
      ctx.fillStyle = primary
      const legFrame = Math.floor(time * 8) % 2
      if (jumping) {
        ctx.fillRect(dx + 2, dy + 16, 3, 6)
        ctx.fillRect(dx + 8, dy + 16, 3, 6)
      } else {
        ctx.fillRect(dx + 2, dy + 16, 3, legFrame ? 6 : 4)
        ctx.fillRect(dx + 8, dy + 16, 3, legFrame ? 4 : 6)
      }
      // tail
      ctx.fillRect(dx - 4, dy + 2, 5, 3)

      // cacti
      cacti.forEach(c => {
        c.x -= 2
        if (c.x < -20) c.x = w + 100 + Math.random() * 200
        ctx.fillStyle = accent
        ctx.globalAlpha = 0.6
        ctx.fillRect(c.x, groundY - c.h, 6, c.h)
        ctx.fillRect(c.x - 4, groundY - c.h + 6, 4, 4)
        ctx.fillRect(c.x + 6, groundY - c.h + 10, 4, 4)
        ctx.globalAlpha = 1
      })
    }
  }
}

/* ═══════════ 2. SPACE FLIGHT ══════════════════════════════════════════ */
function createSpaceFlight() {
  const stars = Array.from({ length: 120 }, () => ({
    x: Math.random(), y: Math.random(), z: Math.random() * 3 + 0.5,
    brightness: Math.random()
  }))
  const asteroids = Array.from({ length: 5 }, () => ({
    x: Math.random() * 2 + 1, y: Math.random(), size: 3 + Math.random() * 6,
    rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 0.02
  }))

  return {
    onInteract() {},
    render(ctx, w, h, time, mouse, colors) {
      const { primary, accent, secondary } = colors

      // background
      ctx.fillStyle = '#030108'
      ctx.fillRect(0, 0, w, h)

      // stars parallax
      stars.forEach(s => {
        s.x -= 0.002 * s.z
        if (s.x < 0) { s.x = 1; s.y = Math.random() }
        const sx = s.x * w, sy = s.y * h
        const alpha = 0.3 + s.brightness * 0.5 + Math.sin(time * 2 + s.brightness * 10) * 0.15
        ctx.fillStyle = `rgba(255,255,255,${alpha})`
        const size = s.z > 2 ? 2 : 1
        ctx.fillRect(sx, sy, size, size)
      })

      // spaceship
      const shipX = 80
      const shipY = h / 2 + Math.sin(time * 1.5) * 12
      // engine glow
      const glow = ctx.createRadialGradient(shipX - 10, shipY, 0, shipX - 10, shipY, 20)
      glow.addColorStop(0, primary + '80')
      glow.addColorStop(1, 'transparent')
      ctx.fillStyle = glow
      ctx.fillRect(shipX - 30, shipY - 20, 40, 40)
      // body
      ctx.fillStyle = 'rgba(255,255,255,0.8)'
      ctx.beginPath()
      ctx.moveTo(shipX + 20, shipY)
      ctx.lineTo(shipX - 5, shipY - 7)
      ctx.lineTo(shipX - 10, shipY)
      ctx.lineTo(shipX - 5, shipY + 7)
      ctx.closePath()
      ctx.fill()
      // cockpit
      ctx.fillStyle = accent
      ctx.beginPath()
      ctx.arc(shipX + 10, shipY, 3, 0, Math.PI * 2)
      ctx.fill()

      // asteroids
      asteroids.forEach(a => {
        a.x -= 0.003
        a.rot += a.rotSpeed
        if (a.x < -0.05) { a.x = 1.1; a.y = Math.random() }
        const ax = a.x * w, ay = a.y * h
        ctx.save()
        ctx.translate(ax, ay)
        ctx.rotate(a.rot)
        ctx.fillStyle = 'rgba(255,255,255,0.12)'
        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2
          const r = a.size * (0.7 + Math.sin(i * 2.3) * 0.3)
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r)
        }
        ctx.closePath()
        ctx.fill()
        ctx.restore()
      })
    }
  }
}

/* ═══════════ 3. OCEAN WAVES ══════════════════════════════════════════ */
function createOceanWaves() {
  return {
    onInteract() {},
    render(ctx, w, h, time, mouse, colors) {
      const { accent, secondary, primary } = colors

      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, h * 0.55)
      const dayPhase = (Math.sin(time * 0.15) + 1) / 2 // 0=night, 1=day
      if (dayPhase > 0.5) {
        sky.addColorStop(0, '#1a0a2e')
        sky.addColorStop(1, '#2d1b69')
      } else {
        sky.addColorStop(0, '#050510')
        sky.addColorStop(1, '#0d0d2b')
      }
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, w, h)

      // sun/moon
      const celestialY = h * 0.15 + Math.sin(time * 0.15) * 20
      const celestialX = w * 0.75
      if (dayPhase > 0.5) {
        // sun
        const sunGlow = ctx.createRadialGradient(celestialX, celestialY, 0, celestialX, celestialY, 40)
        sunGlow.addColorStop(0, primary + '60')
        sunGlow.addColorStop(1, 'transparent')
        ctx.fillStyle = sunGlow
        ctx.fillRect(celestialX - 40, celestialY - 40, 80, 80)
        ctx.fillStyle = primary + 'aa'
        ctx.beginPath()
        ctx.arc(celestialX, celestialY, 12, 0, Math.PI * 2)
        ctx.fill()
      } else {
        ctx.fillStyle = 'rgba(200,200,220,0.7)'
        ctx.beginPath()
        ctx.arc(celestialX, celestialY, 10, 0, Math.PI * 2)
        ctx.fill()
      }

      // clouds
      ctx.fillStyle = 'rgba(255,255,255,0.04)'
      for (let i = 0; i < 4; i++) {
        const cx = ((time * 15 + i * 220) % (w + 100)) - 50
        const cy = 20 + i * 15
        ctx.beginPath()
        ctx.ellipse(cx, cy, 35, 8, 0, 0, Math.PI * 2)
        ctx.fill()
      }

      // waves
      const waveY = h * 0.55
      for (let layer = 0; layer < 4; layer++) {
        const alpha = 0.08 + layer * 0.04
        const speed = 0.8 + layer * 0.3
        const amp = 8 + layer * 4
        const freq = 0.008 - layer * 0.001
        const yOffset = waveY + layer * 15

        const rgb = hexToRgb(layer % 2 === 0 ? accent : secondary)
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`
        ctx.beginPath()
        ctx.moveTo(0, h)
        for (let x = 0; x <= w; x += 4) {
          const y = yOffset + Math.sin(x * freq + time * speed) * amp + Math.sin(x * freq * 2.3 + time * speed * 0.7) * (amp * 0.4)
          ctx.lineTo(x, y)
        }
        ctx.lineTo(w, h)
        ctx.closePath()
        ctx.fill()
      }
    }
  }
}

/* ═══════════ 4. MATRIX RAIN ═════════════════════════════════════════ */
function createMatrixRain() {
  let columns = []
  let prevW = 0

  function init(w) {
    prevW = w
    const colCount = Math.floor(w / 14)
    columns = Array.from({ length: colCount }, () => ({
      y: Math.random() * -100,
      speed: 1 + Math.random() * 3,
      chars: Array.from({ length: 20 }, () => String.fromCharCode(0x30A0 + Math.random() * 96))
    }))
  }

  return {
    onInteract() {},
    render(ctx, w, h, time, mouse, colors) {
      if (w !== prevW) init(w)

      ctx.fillStyle = 'rgba(0,0,0,0.85)'
      ctx.fillRect(0, 0, w, h)

      const rgb = hexToRgb(colors.success)
      ctx.font = '12px monospace'

      columns.forEach((col, i) => {
        col.y += col.speed
        if (col.y * 14 > h + 200) {
          col.y = Math.random() * -10
          col.speed = 1 + Math.random() * 3
        }

        col.chars.forEach((char, j) => {
          const x = i * 14
          const y = (col.y + j) * 14
          if (y < 0 || y > h) return

          const alpha = j === col.chars.length - 1 ? 1 : Math.max(0, 1 - j * 0.07)
          if (j === col.chars.length - 1) {
            ctx.fillStyle = `rgba(255,255,255,0.9)`
          } else {
            ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha * 0.7})`
          }
          // occasionally change character
          if (Math.random() < 0.01) {
            col.chars[j] = String.fromCharCode(0x30A0 + Math.random() * 96)
          }
          ctx.fillText(char, x, y)
        })
      })
    }
  }
}

/* ═══════════ 5. PARTICLE SWARM ══════════════════════════════════════ */
function createParticleSwarm() {
  const particles = Array.from({ length: 80 }, () => ({
    x: Math.random(), y: Math.random(),
    vx: (Math.random() - 0.5) * 0.002,
    vy: (Math.random() - 0.5) * 0.002,
    hue: Math.random(),
    size: 1 + Math.random() * 2
  }))

  return {
    onInteract() {},
    render(ctx, w, h, time, mouse, colors) {
      ctx.fillStyle = 'rgba(6,3,4,0.92)'
      ctx.fillRect(0, 0, w, h)

      const palette = [colors.primary, colors.secondary, colors.accent]
      const mx = mouse.x / w, my = mouse.y / h
      const hasHover = mouse.x > 0 && mouse.y > 0

      particles.forEach(p => {
        // mouse attraction
        if (hasHover) {
          const dx = mx - p.x, dy = my - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 0.3) {
            p.vx += dx * 0.0003
            p.vy += dy * 0.0003
          }
        }

        p.x += p.vx
        p.y += p.vy
        p.vx *= 0.99
        p.vy *= 0.99

        // wrap
        if (p.x < 0) p.x = 1
        if (p.x > 1) p.x = 0
        if (p.y < 0) p.y = 1
        if (p.y > 1) p.y = 0
      })

      // draw connections
      ctx.lineWidth = 0.5
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = (particles[i].x - particles[j].x) * w
          const dy = (particles[i].y - particles[j].y) * h
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 80) {
            const alpha = (1 - dist / 80) * 0.2
            const rgb = hexToRgb(palette[i % 3])
            ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`
            ctx.beginPath()
            ctx.moveTo(particles[i].x * w, particles[i].y * h)
            ctx.lineTo(particles[j].x * w, particles[j].y * h)
            ctx.stroke()
          }
        }
      }

      // draw particles
      particles.forEach((p, i) => {
        const rgb = hexToRgb(palette[i % 3])
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.8)`
        ctx.beginPath()
        ctx.arc(p.x * w, p.y * h, p.size, 0, Math.PI * 2)
        ctx.fill()
      })
    }
  }
}

/* ═══════════ 6. CITY SKYLINE ════════════════════════════════════════ */
function createCitySkyline() {
  const buildings = []
  const windows = []
  const cloudPositions = Array.from({ length: 5 }, () => ({
    x: Math.random() * 1.5,
    y: 0.1 + Math.random() * 0.25,
    w: 30 + Math.random() * 40
  }))

  function initBuildings(w, h) {
    buildings.length = 0
    windows.length = 0
    const groundY = h * 0.65
    let bx = 0
    while (bx < w + 30) {
      const bw = 20 + Math.random() * 35
      const bh = 40 + Math.random() * 80
      buildings.push({ x: bx, y: groundY - bh, w: bw, h: bh })
      // windows for this building
      for (let wx = bx + 4; wx < bx + bw - 4; wx += 8) {
        for (let wy = groundY - bh + 6; wy < groundY - 4; wy += 10) {
          windows.push({
            x: wx, y: wy, on: Math.random() > 0.4,
            flicker: Math.random() * 100
          })
        }
      }
      bx += bw + 2 + Math.random() * 5
    }
  }

  let prevW = 0

  return {
    onInteract() {},
    render(ctx, w, h, time, mouse, colors) {
      if (w !== prevW) { initBuildings(w, h); prevW = w }

      const { primary, secondary, accent } = colors
      const dayCycle = (Math.sin(time * 0.1) + 1) / 2

      // sky
      const sky = ctx.createLinearGradient(0, 0, 0, h)
      sky.addColorStop(0, dayCycle > 0.5 ? '#0d0825' : '#030108')
      sky.addColorStop(1, dayCycle > 0.5 ? '#1a0f3d' : '#0a0515')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, w, h)

      // stars (only at night)
      if (dayCycle < 0.6) {
        const starAlpha = (0.6 - dayCycle) / 0.6
        ctx.fillStyle = `rgba(255,255,255,${starAlpha * 0.5})`
        for (let i = 0; i < 40; i++) {
          const sx = (i * 137.5) % w
          const sy = (i * 73.3) % (h * 0.5)
          ctx.fillRect(sx, sy, 1, 1)
        }
      }

      // clouds
      ctx.fillStyle = 'rgba(255,255,255,0.03)'
      cloudPositions.forEach(c => {
        c.x -= 0.0005
        if (c.x < -0.1) c.x = 1.1
        ctx.beginPath()
        ctx.ellipse(c.x * w, c.y * h, c.w, 6, 0, 0, Math.PI * 2)
        ctx.fill()
      })

      // ground
      ctx.fillStyle = 'rgba(255,255,255,0.03)'
      ctx.fillRect(0, h * 0.65, w, h * 0.35)

      // buildings
      buildings.forEach(b => {
        ctx.fillStyle = 'rgba(10,5,20,0.95)'
        ctx.fillRect(b.x, b.y, b.w, b.h)
        // roof detail
        ctx.fillStyle = 'rgba(255,255,255,0.05)'
        ctx.fillRect(b.x, b.y, b.w, 2)
      })

      // windows
      windows.forEach(win => {
        if (!win.on && Math.random() < 0.001) win.on = true
        if (win.on && Math.random() < 0.0005) win.on = false

        if (win.on) {
          const flick = Math.sin(time * 3 + win.flicker) > 0.95 ? 0.3 : 0
          const rgbP = hexToRgb(primary)
          const rgbA = hexToRgb(accent)
          const useAccent = win.flicker > 50
          const rgb = useAccent ? rgbA : rgbP
          ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${0.4 + flick})`
        } else {
          ctx.fillStyle = 'rgba(255,255,255,0.02)'
        }
        ctx.fillRect(win.x, win.y, 4, 5)
      })
    }
  }
}

/* ═══════════ BANNER REGISTRY ════════════════════════════════════════ */
export const BANNER_TYPES = [
  { id: 'dino',      label: 'Dino Run',       tag: 'Retro',    emoji: '🦕', factory: createDinoRun },
  { id: 'space',     label: 'Space Flight',   tag: 'Cósmico',  emoji: '🚀', factory: createSpaceFlight },
  { id: 'ocean',     label: 'Ocean Waves',    tag: 'Ambiente', emoji: '🌊', factory: createOceanWaves },
  { id: 'matrix',    label: 'Matrix Rain',    tag: 'Tech',     emoji: '💻', factory: createMatrixRain },
  { id: 'particles', label: 'Particle Swarm', tag: 'Ciencia',  emoji: '✨', factory: createParticleSwarm },
  { id: 'city',      label: 'City Skyline',   tag: 'Urbano',   emoji: '🌆', factory: createCitySkyline },
]

/* ═══════════ DYNAMIC BANNER COMPONENT ═══════════════════════════════ */
export default function DynamicBanner({ type = 'particles', height = 200, className = '', interactive = true }) {
  const canvasRef = useRef(null)
  const animRef   = useRef(null)
  const mouseRef  = useRef({ x: -1, y: -1 })
  const rendererRef = useRef(null)
  const startRef    = useRef(null)

  const handleInteract = useCallback(() => {
    if (interactive && rendererRef.current?.onInteract) {
      rendererRef.current.onInteract()
    }
  }, [interactive])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const entry = BANNER_TYPES.find(b => b.id === type)
    if (!entry) return

    rendererRef.current = entry.factory()
    startRef.current = performance.now()

    // IntersectionObserver to pause when not visible
    let visible = true
    const observer = new IntersectionObserver(
      ([e]) => { visible = e.isIntersecting },
      { threshold: 0.1 }
    )
    observer.observe(canvas)

    // resize
    function resize() {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width  = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    // animation loop
    function frame() {
      if (visible) {
        const t = (performance.now() - startRef.current) / 1000
        const rect = canvas.getBoundingClientRect()
        const colors = getThemeColors()
        rendererRef.current.render(ctx, rect.width, rect.height, t, mouseRef.current, colors)
      }
      animRef.current = requestAnimationFrame(frame)
    }
    animRef.current = requestAnimationFrame(frame)

    // mouse tracking
    function onMove(e) {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    function onLeave() { mouseRef.current = { x: -1, y: -1 } }
    if (interactive) {
      canvas.addEventListener('mousemove', onMove)
      canvas.addEventListener('mouseleave', onLeave)
    }

    return () => {
      cancelAnimationFrame(animRef.current)
      observer.disconnect()
      ro.disconnect()
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
    }
  }, [type, interactive])

  return (
    <canvas
      ref={canvasRef}
      onClick={handleInteract}
      className={`w-full block ${className}`}
      style={{ height: `${height}px`, cursor: interactive ? 'pointer' : 'default' }}
    />
  )
}

/* ═══════════ BANNER SELECTOR (modal-style picker) ═══════════════════ */
export function BannerSelector({ currentType, onSelect, onClose }) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/75 backdrop-blur-md" />

        {/* Panel */}
        <motion.div
          className="relative w-full max-w-2xl max-h-[88vh] overflow-hidden rounded-2xl flex flex-col"
          style={{
            background: 'rgba(10,5,7,0.97)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
          }}
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.97 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06] shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-white/90">Banner animado</h3>
              <p className="text-xs text-white/30 mt-0.5">Elige la animación de tu perfil</p>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all"
            >
              <FiX size={14} />
            </button>
          </div>

          {/* Grid */}
          <div className="overflow-y-auto p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {BANNER_TYPES.map((b, i) => {
                const isSelected = currentType === b.id
                return (
                  <motion.button
                    key={b.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.2 }}
                    onClick={() => { onSelect(b.id); onClose() }}
                    className={`relative rounded-xl overflow-hidden border transition-all group ${
                      isSelected
                        ? 'border-[var(--c-primary)] ring-1 ring-[var(--c-primary)]/25'
                        : 'border-white/[0.07] hover:border-white/[0.18]'
                    }`}
                    style={isSelected ? { boxShadow: '0 0 16px color-mix(in srgb, var(--c-primary) 20%, transparent)' } : {}}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Canvas preview */}
                    <DynamicBanner type={b.id} height={90} interactive={false} />

                    {/* Bottom label */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-2.5 pt-4 pb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white/90">{b.label}</span>
                        <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-white/[0.08] text-white/40">
                          {b.tag}
                        </span>
                      </div>
                    </div>

                    {/* Emoji badge */}
                    <div className="absolute top-2 left-2 text-base leading-none select-none">{b.emoji}</div>

                    {/* Selected checkmark */}
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--c-primary)' }}
                      >
                        <FiCheck size={10} strokeWidth={3} className="text-white" />
                      </motion.div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/[0.03] transition-colors pointer-events-none" />
                  </motion.button>
                )
              })}

              {/* Sin banner */}
              <motion.button
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: BANNER_TYPES.length * 0.04, duration: 0.2 }}
                onClick={() => { onSelect(null); onClose() }}
                className={`relative rounded-xl border transition-all flex flex-col items-center justify-center gap-2 group ${
                  !currentType
                    ? 'border-white/20 bg-white/[0.04]'
                    : 'border-white/[0.07] hover:border-white/[0.16] bg-white/[0.02]'
                }`}
                style={{ height: 90 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  !currentType ? 'bg-white/10' : 'bg-white/[0.05] group-hover:bg-white/[0.08]'
                }`}>
                  <FiSlash size={14} className="text-white/40" />
                </div>
                <span className="text-xs font-medium text-white/40 group-hover:text-white/60 transition-colors">
                  Sin banner
                </span>
                {!currentType && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center bg-white/20"
                  >
                    <FiCheck size={10} strokeWidth={3} className="text-white/60" />
                  </motion.div>
                )}
              </motion.button>
            </div>
          </div>

          {/* Footer hint */}
          <div className="px-5 py-3 border-t border-white/[0.05] shrink-0">
            <p className="text-[10px] text-white/20 text-center">
              Haz clic en cualquier banner para activarlo · El banner se guarda en tu perfil
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
