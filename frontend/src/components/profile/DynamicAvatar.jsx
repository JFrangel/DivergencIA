import { useEffect, useRef, useCallback } from 'react'

/* ══════════════════════════════════════════════════════════════════════
   Compact canvas animations designed for avatar circles (24–112px)
   ══════════════════════════════════════════════════════════════════════ */

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return { r, g, b }
}

function getCSSColor(varName, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
    return v || fallback
  } catch { return fallback }
}

/* ─── 1. SPARKLE ─────────────────────────────────────── gold stars */
function createSparkle() {
  const stars = Array.from({ length: 18 }, (_, i) => ({
    x: Math.random(),
    y: Math.random(),
    vy: -(0.002 + Math.random() * 0.003),
    size: 1 + Math.random() * 2,
    phase: Math.random() * Math.PI * 2,
    freq: 1.5 + Math.random() * 2,
  }))
  return {
    render(ctx, w, h, t) {
      ctx.clearRect(0, 0, w, h)
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2

      // bg gradient
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
      bg.addColorStop(0, 'rgba(30,20,8,0.95)')
      bg.addColorStop(1, 'rgba(10,6,2,0.98)')
      ctx.fillStyle = bg
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()

      stars.forEach(s => {
        s.y += s.vy
        if (s.y < -0.05) s.y = 1.05

        const alpha = 0.5 + Math.sin(t * s.freq + s.phase) * 0.4
        const glow = s.size * 3
        const sx = s.x * w, sy = s.y * h

        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, glow)
        grad.addColorStop(0, `rgba(255,210,80,${alpha})`)
        grad.addColorStop(0.4, `rgba(252,101,31,${alpha * 0.5})`)
        grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(sx, sy, glow, 0, Math.PI * 2)
        ctx.fill()
      })
    }
  }
}

/* ─── 2. FIRE ────────────────────────────────────────── flame particles */
function createFire() {
  const particles = Array.from({ length: 24 }, () => ({
    x: 0.3 + Math.random() * 0.4,
    y: 0.7 + Math.random() * 0.3,
    vy: -(0.005 + Math.random() * 0.006),
    vx: (Math.random() - 0.5) * 0.002,
    life: Math.random(),
    size: 1 + Math.random() * 2,
  }))
  return {
    render(ctx, w, h, t) {
      ctx.clearRect(0, 0, w, h)
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2

      const bg = ctx.createRadialGradient(cx, cy * 1.2, 0, cx, cy, r)
      bg.addColorStop(0, 'rgba(20,6,2,0.97)')
      bg.addColorStop(1, 'rgba(6,2,1,0.99)')
      ctx.fillStyle = bg
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()

      particles.forEach(p => {
        p.y += p.vy
        p.x += p.vx + Math.sin(t * 3 + p.y * 10) * 0.001
        p.life -= 0.012
        if (p.life <= 0) {
          p.x = 0.3 + Math.random() * 0.4
          p.y = 0.85 + Math.random() * 0.2
          p.life = 0.6 + Math.random() * 0.4
          p.vy = -(0.005 + Math.random() * 0.006)
          p.vx = (Math.random() - 0.5) * 0.002
        }

        const ratio = p.life
        const r2 = ratio > 0.5 ? 255 : 255 * (ratio / 0.5)
        const g2 = ratio > 0.7 ? 150 : ratio > 0.3 ? 80 + (ratio - 0.3) / 0.4 * 70 : 0
        const alpha = ratio * 0.8
        const glow = p.size * (2 + ratio * 2)

        const grad = ctx.createRadialGradient(p.x * w, p.y * h, 0, p.x * w, p.y * h, glow)
        grad.addColorStop(0, `rgba(${r2|0},${g2|0},30,${alpha})`)
        grad.addColorStop(1, 'transparent')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(p.x * w, p.y * h, glow, 0, Math.PI * 2)
        ctx.fill()
      })
    }
  }
}

/* ─── 3. CRYSTAL ─────────────────────────────────────── rotating gem */
function createCrystal() {
  return {
    render(ctx, w, h, t) {
      ctx.clearRect(0, 0, w, h)
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2

      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
      bg.addColorStop(0, 'rgba(0,20,30,0.97)')
      bg.addColorStop(1, 'rgba(0,5,10,0.99)')
      ctx.fillStyle = bg
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()

      const sides = 6
      const rot = t * 0.5
      const pulse = 0.7 + Math.sin(t * 2) * 0.15

      // outer ring
      for (let layer = 3; layer >= 1; layer--) {
        const layerR = (r * 0.55 * pulse) * (layer / 3)
        const alpha = 0.1 + (4 - layer) * 0.08
        ctx.strokeStyle = `rgba(0,210,255,${alpha})`
        ctx.lineWidth = 0.5
        ctx.beginPath()
        for (let i = 0; i <= sides; i++) {
          const a = (i / sides) * Math.PI * 2 + rot * (layer % 2 === 0 ? 1 : -1)
          const x = cx + Math.cos(a) * layerR
          const y = cy + Math.sin(a) * layerR
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.stroke()
      }

      // crystal facets
      const gemR = r * 0.4 * pulse
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(rot)

      for (let i = 0; i < sides; i++) {
        const a = (i / sides) * Math.PI * 2
        const na = ((i + 1) / sides) * Math.PI * 2
        const ax = Math.cos(a) * gemR, ay = Math.sin(a) * gemR
        const bx = Math.cos(na) * gemR, by = Math.sin(na) * gemR

        const facetAlpha = 0.15 + Math.sin(a + t * 3) * 0.1
        ctx.fillStyle = `rgba(0,210,255,${facetAlpha})`
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(ax, ay)
        ctx.lineTo(bx, by)
        ctx.closePath()
        ctx.fill()

        ctx.strokeStyle = `rgba(0,210,255,0.4)`
        ctx.lineWidth = 0.5
        ctx.stroke()
      }
      ctx.restore()

      // center glow
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.3)
      glow.addColorStop(0, `rgba(0,210,255,${0.3 + Math.sin(t * 4) * 0.15})`)
      glow.addColorStop(1, 'transparent')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

/* ─── 4. PLASMA ──────────────────────────────────────── lava lamp orb */
function createPlasma() {
  return {
    render(ctx, w, h, t) {
      ctx.clearRect(0, 0, w, h)
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2

      const primary = getCSSColor('--c-primary', '#FC651F')
      const secondary = getCSSColor('--c-secondary', '#8B5CF6')
      const rgb1 = hexToRgb(primary)
      const rgb2 = hexToRgb(secondary)

      // base
      ctx.fillStyle = 'rgba(6,2,8,0.98)'
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()

      // animated plasma blobs
      const blobs = [
        { ox: Math.sin(t * 0.7) * 0.3, oy: Math.cos(t * 0.5) * 0.3, rgb: rgb1, a: 0.5 },
        { ox: Math.cos(t * 0.9) * 0.25, oy: Math.sin(t * 1.1) * 0.25, rgb: rgb2, a: 0.4 },
        { ox: Math.sin(t * 1.3 + 1) * 0.2, oy: Math.cos(t * 0.8 + 2) * 0.2, rgb: rgb1, a: 0.35 },
        { ox: Math.cos(t * 0.6 + 3) * 0.3, oy: Math.sin(t * 1.5) * 0.2, rgb: rgb2, a: 0.3 },
      ]

      blobs.forEach(b => {
        const bx = cx + b.ox * w
        const by = cy + b.oy * h
        const br = r * (0.5 + Math.sin(t + b.a * 5) * 0.1)
        const g = ctx.createRadialGradient(bx, by, 0, bx, by, br)
        g.addColorStop(0, `rgba(${b.rgb.r},${b.rgb.g},${b.rgb.b},${b.a})`)
        g.addColorStop(1, 'transparent')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(bx, by, br, 0, Math.PI * 2)
        ctx.fill()
      })

    }
  }
}

/* ─── 5. VOID ────────────────────────────────────────── dark orbital */
function createVoid() {
  const orbitals = Array.from({ length: 3 }, (_, i) => ({
    radius: 0.2 + i * 0.12,
    speed: 0.8 - i * 0.2,
    offset: (i / 3) * Math.PI * 2,
    size: 2 - i * 0.4,
    tilt: (i * Math.PI) / 5,
  }))
  const dots = Array.from({ length: 30 }, () => ({
    x: Math.random(), y: Math.random(),
    size: 0.5 + Math.random() * 1,
    alpha: 0.1 + Math.random() * 0.3,
    twinkle: Math.random() * Math.PI * 2,
  }))
  return {
    render(ctx, w, h, t) {
      ctx.clearRect(0, 0, w, h)
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2

      // black bg
      ctx.fillStyle = 'rgba(2,2,8,0.99)'
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()

      // stars
      dots.forEach(d => {
        const alpha = d.alpha + Math.sin(t * 1.5 + d.twinkle) * 0.1
        ctx.fillStyle = `rgba(200,210,255,${alpha})`
        ctx.fillRect(d.x * w, d.y * h, d.size, d.size)
      })

      // event horizon glow
      const horizon = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.35)
      horizon.addColorStop(0, 'rgba(0,0,0,0.95)')
      horizon.addColorStop(0.7, 'rgba(80,0,120,0.3)')
      horizon.addColorStop(1, 'transparent')
      ctx.fillStyle = horizon
      ctx.beginPath()
      ctx.arc(cx, cy, r * 0.5, 0, Math.PI * 2)
      ctx.fill()

      // orbital rings
      orbitals.forEach(o => {
        const angle = t * o.speed + o.offset
        const orbitR = r * o.radius
        const px = cx + Math.cos(angle) * orbitR * Math.cos(o.tilt)
        const py = cy + Math.sin(angle) * orbitR

        const glow = ctx.createRadialGradient(px, py, 0, px, py, o.size * 4)
        glow.addColorStop(0, `rgba(139,92,246,0.9)`)
        glow.addColorStop(1, 'transparent')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(px, py, o.size * 4, 0, Math.PI * 2)
        ctx.fill()
      })

      // clip
      ctx.globalCompositeOperation = 'destination-in'
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
    }
  }
}

/* ─── 6. NEON ────────────────────────────────────────── pulsing rings */
function createNeon() {
  return {
    render(ctx, w, h, t) {
      ctx.clearRect(0, 0, w, h)
      const cx = w / 2, cy = h / 2, r = Math.min(w, h) / 2

      ctx.fillStyle = 'rgba(2,6,8,0.98)'
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()

      const accent = getCSSColor('--c-accent', '#00D1FF')
      const rgb = hexToRgb(accent)

      // pulsing rings
      for (let i = 0; i < 4; i++) {
        const phase = (t * 0.8 + i * 0.25) % 1
        const ringR = phase * r * 0.9
        const alpha = (1 - phase) * (0.5 - i * 0.1)
        if (alpha <= 0) continue

        ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`
        ctx.lineWidth = 1 + (1 - phase) * 2
        ctx.beginPath()
        ctx.arc(cx, cy, ringR, 0, Math.PI * 2)
        ctx.stroke()
      }

      // rotating scan line
      const scanAngle = t * 1.5
      ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.15)`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(scanAngle) * r, cy + Math.sin(scanAngle) * r)
      ctx.stroke()

      // center dot
      const dotGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.2)
      dotGlow.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.8 + Math.sin(t * 4) * 0.2})`)
      dotGlow.addColorStop(1, 'transparent')
      ctx.fillStyle = dotGlow
      ctx.beginPath()
      ctx.arc(cx, cy, r * 0.2, 0, Math.PI * 2)
      ctx.fill()

      // clip
      ctx.globalCompositeOperation = 'destination-in'
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
    }
  }
}

/* ══════════════════════════════════════════════════════════════════════
   Registry
   ══════════════════════════════════════════════════════════════════════ */
export const AVATAR_ANIM_TYPES = [
  { id: 'sparkle',  label: '✨ Sparkle',  emoji: '✨', factory: createSparkle },
  { id: 'fire',     label: '🔥 Fuego',    emoji: '🔥', factory: createFire },
  { id: 'crystal',  label: '💎 Crystal',  emoji: '💎', factory: createCrystal },
  { id: 'plasma',   label: '🌀 Plasma',   emoji: '🌀', factory: createPlasma },
  { id: 'void',     label: '🌑 Void',     emoji: '🌑', factory: createVoid },
  { id: 'neon',     label: '🔵 Neon',     emoji: '🔵', factory: createNeon },
]

export function parseAnimatedSrc(src) {
  if (typeof src === 'string' && src.startsWith('animated::')) {
    return src.slice('animated::'.length)
  }
  return null
}

/* ══════════════════════════════════════════════════════════════════════
   DynamicAvatar component
   ══════════════════════════════════════════════════════════════════════ */
export default function DynamicAvatar({ type = 'plasma', size = 40, className = '', style: styleProp = {} }) {
  const canvasRef  = useRef(null)
  const animRef    = useRef(null)
  const rendererRef = useRef(null)
  const startRef   = useRef(null)

  const init = useCallback(() => {
    const entry = AVATAR_ANIM_TYPES.find(a => a.id === type)
    if (entry) rendererRef.current = entry.factory()
  }, [type])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    init()
    startRef.current = performance.now()
    const ctx = canvas.getContext('2d')

    let visible = true
    const observer = new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { threshold: 0.1 })
    observer.observe(canvas)

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width  = size * dpr
      canvas.height = size * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    function frame() {
      if (visible && rendererRef.current) {
        const t = (performance.now() - startRef.current) / 1000
        rendererRef.current.render(ctx, size, size, t)
      }
      animRef.current = requestAnimationFrame(frame)
    }
    animRef.current = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(animRef.current)
      observer.disconnect()
    }
  }, [type, size, init])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: size, height: size, borderRadius: '50%', display: 'block', ...styleProp }}
    />
  )
}
