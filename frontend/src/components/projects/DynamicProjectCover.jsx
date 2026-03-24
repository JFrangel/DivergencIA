import { useEffect, useRef } from 'react'

/* ══════════════════════════════════════════════════════════════════════
   Area-specific animated project card covers
   Each renderer gets (ctx, w, h, t, color) where color is hex
   ══════════════════════════════════════════════════════════════════════ */

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

/* ─── ML: Neural Network ──────────────────────────────────────────── */
function createML() {
  const nodes = Array.from({ length: 12 }, () => ({
    x: Math.random(), y: Math.random(),
    vx: (Math.random() - 0.5) * 0.0004,
    vy: (Math.random() - 0.5) * 0.0004,
    phase: Math.random() * Math.PI * 2,
    active: false,
    activeSince: 0,
  }))
  let lastPulse = 0

  return (ctx, w, h, t, color) => {
    const rgb = hexToRgb(color)

    // background
    ctx.fillStyle = `rgba(${rgb.r * 0.06 | 0},${rgb.g * 0.04 | 0},${rgb.b * 0.02 | 0},0.97)`
    ctx.fillRect(0, 0, w, h)

    // move nodes
    nodes.forEach(n => {
      n.x += n.vx; n.y += n.vy
      if (n.x < 0.05 || n.x > 0.95) n.vx *= -1
      if (n.y < 0.05 || n.y > 0.95) n.vy *= -1
    })

    // activate a random node every ~1.5s
    if (t - lastPulse > 1.2 + Math.random()) {
      lastPulse = t
      const idx = Math.floor(Math.random() * nodes.length)
      nodes[idx].active = true
      nodes[idx].activeSince = t
    }

    // draw connections
    ctx.lineWidth = 0.5
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = (nodes[i].x - nodes[j].x) * w
        const dy = (nodes[i].y - nodes[j].y) * h
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < w * 0.35) {
          const alpha = (1 - dist / (w * 0.35)) * 0.18
          ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`
          ctx.beginPath()
          ctx.moveTo(nodes[i].x * w, nodes[i].y * h)
          ctx.lineTo(nodes[j].x * w, nodes[j].y * h)
          ctx.stroke()
        }
      }
    }

    // draw nodes
    nodes.forEach(n => {
      const age = t - n.activeSince
      if (n.active && age > 1.5) n.active = false

      const pulse = Math.sin(t * 2 + n.phase) * 0.3
      const baseAlpha = 0.3 + pulse
      const nodeAlpha = n.active ? Math.max(0, 1 - age / 1.5) : baseAlpha
      const nodeR = n.active ? 4 + (1 - age / 1.5) * 3 : 2.5

      if (n.active) {
        const glow = ctx.createRadialGradient(n.x * w, n.y * h, 0, n.x * w, n.y * h, nodeR * 4)
        glow.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${nodeAlpha * 0.6})`)
        glow.addColorStop(1, 'transparent')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(n.x * w, n.y * h, nodeR * 4, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${nodeAlpha})`
      ctx.beginPath()
      ctx.arc(n.x * w, n.y * h, nodeR, 0, Math.PI * 2)
      ctx.fill()
    })
  }
}

/* ─── NLP: Token Stream ───────────────────────────────────────────── */
function createNLP() {
  const CHARS = 'あいうえおかきくけこΑΒΓΔΣΩabcdefghijklmnopqrstuvwxyz0123456789<>{}[]|∇∑∫∂'
  const cols = []
  let initDone = false

  function initCols(w, h) {
    cols.length = 0
    const count = Math.floor(w / 18)
    for (let i = 0; i < count; i++) {
      cols.push({
        x: i * 18 + 9,
        y: -Math.random() * h,
        speed: 20 + Math.random() * 30,
        chars: Array.from({ length: 8 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]),
        alpha: 0.3 + Math.random() * 0.4,
      })
    }
    initDone = true
  }

  return (ctx, w, h, t, color) => {
    if (!initDone) initCols(w, h)
    const rgb = hexToRgb(color)

    ctx.fillStyle = `rgba(${rgb.r * 0.03 | 0},${rgb.g * 0.02 | 0},${rgb.b * 0.06 | 0},0.92)`
    ctx.fillRect(0, 0, w, h)

    ctx.font = `bold 9px monospace`

    cols.forEach(col => {
      col.y += col.speed * 0.016
      if (col.y > h + 100) {
        col.y = -60 - Math.random() * 100
        col.alpha = 0.3 + Math.random() * 0.4
      }
      if (Math.random() < 0.02) {
        const i = Math.floor(Math.random() * col.chars.length)
        col.chars[i] = CHARS[Math.floor(Math.random() * CHARS.length)]
      }

      col.chars.forEach((char, j) => {
        const cy = col.y + j * 13
        if (cy < 0 || cy > h) return
        const alpha = col.alpha * (1 - j / col.chars.length) * (j === 0 ? 1.5 : 1)
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${Math.min(1, alpha)})`
        ctx.fillText(char, col.x - 4, cy)
      })
    })
  }
}

/* ─── Vision: Scan Grid ───────────────────────────────────────────── */
function createVision() {
  const boxes = Array.from({ length: 3 }, () => ({
    x: 0.1 + Math.random() * 0.6,
    y: 0.1 + Math.random() * 0.6,
    w: 0.15 + Math.random() * 0.2,
    h: 0.15 + Math.random() * 0.2,
    appear: Math.random() * 3,
  }))

  return (ctx, w, h, t, color) => {
    const rgb = hexToRgb(color)

    ctx.fillStyle = `rgba(0,${rgb.g * 0.04 | 0},${rgb.b * 0.06 | 0},0.96)`
    ctx.fillRect(0, 0, w, h)

    // grid
    ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.05)`
    ctx.lineWidth = 0.5
    for (let x = 0; x < w; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
    }
    for (let y = 0; y < h; y += 20) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
    }

    // horizontal scan line
    const scanY = ((t * 0.3) % 1) * h
    const scanGrad = ctx.createLinearGradient(0, scanY - 4, 0, scanY + 4)
    scanGrad.addColorStop(0, 'transparent')
    scanGrad.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},0.4)`)
    scanGrad.addColorStop(1, 'transparent')
    ctx.fillStyle = scanGrad
    ctx.fillRect(0, scanY - 4, w, 8)

    // detection boxes
    boxes.forEach(box => {
      const phase = (t * 0.4 + box.appear) % 4
      if (phase > 2) return

      const alpha = phase < 0.3
        ? phase / 0.3
        : phase > 1.7
        ? (2 - phase) / 0.3
        : 1

      const bx = box.x * w, by = box.y * h
      const bw = box.w * w, bh = box.h * h

      ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha * 0.8})`
      ctx.lineWidth = 1

      // corner brackets
      const cs = 6
      ;[[bx, by], [bx + bw, by], [bx, by + bh], [bx + bw, by + bh]].forEach(([px, py], i) => {
        const dx = i % 2 === 0 ? 1 : -1
        const dy = i < 2 ? 1 : -1
        ctx.beginPath()
        ctx.moveTo(px, py + dy * cs); ctx.lineTo(px, py); ctx.lineTo(px + dx * cs, py)
        ctx.stroke()
      })

      // confidence label
      ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha * 0.7})`
      ctx.font = '7px monospace'
      ctx.fillText(`${(0.7 + Math.sin(t + box.appear) * 0.15).toFixed(2)}`, bx + 2, by - 2)
    })
  }
}

/* ─── Datos: Data Flow ────────────────────────────────────────────── */
function createDatos() {
  const bars = Array.from({ length: 10 }, (_, i) => ({
    x: i / 10 + 0.05,
    targetH: 0.2 + Math.random() * 0.5,
    currentH: Math.random() * 0.3,
    speed: 0.003 + Math.random() * 0.004,
    delay: i * 0.3,
  }))

  return (ctx, w, h, t, color) => {
    const rgb = hexToRgb(color)

    ctx.fillStyle = `rgba(${rgb.r * 0.02 | 0},${rgb.g * 0.04 | 0},${rgb.b * 0.02 | 0},0.96)`
    ctx.fillRect(0, 0, w, h)

    // base line
    const baseY = h * 0.8
    ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.15)`
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, baseY); ctx.lineTo(w, baseY); ctx.stroke()

    // bars
    const barW = w / bars.length * 0.6
    bars.forEach(bar => {
      // animate height with sine wave
      const targetH = 0.15 + Math.abs(Math.sin(t * 0.7 + bar.delay)) * 0.55
      bar.currentH += (targetH - bar.currentH) * 0.05

      const bh = bar.currentH * h * 0.7
      const bx = bar.x * w - barW / 2

      const grad = ctx.createLinearGradient(0, baseY - bh, 0, baseY)
      grad.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.7)`)
      grad.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0.1)`)
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.roundRect?.(bx, baseY - bh, barW, bh, 2) || ctx.rect(bx, baseY - bh, barW, bh)
      ctx.fill()
    })

    // sparkles at bar tops
    bars.forEach(bar => {
      const bh = bar.currentH * h * 0.7
      const bx = bar.x * w
      const topY = baseY - bh

      if (Math.sin(t * 2 + bar.delay) > 0.8) {
        ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.9)`
        ctx.beginPath()
        ctx.arc(bx, topY, 1.5, 0, Math.PI * 2)
        ctx.fill()
      }
    })

    // floating data labels
    for (let i = 0; i < 3; i++) {
      const labelX = ((t * 20 + i * 80) % (w + 60)) - 30
      const labelY = 10 + i * 20
      ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},0.2)`
      ctx.font = '7px monospace'
      ctx.fillText(`${(Math.random() * 100 | 0).toString().padStart(3, '0')}`, labelX, labelY)
    }
  }
}

/* ─── General: Particles ──────────────────────────────────────────── */
function createGeneral() {
  const particles = Array.from({ length: 30 }, () => ({
    x: Math.random(), y: Math.random(),
    vx: (Math.random() - 0.5) * 0.001,
    vy: (Math.random() - 0.5) * 0.001,
    size: 1 + Math.random() * 2,
    phase: Math.random() * Math.PI * 2,
  }))

  return (ctx, w, h, t, color) => {
    const rgb = hexToRgb(color)

    ctx.fillStyle = `rgba(${rgb.r * 0.04 | 0},${rgb.g * 0.04 | 0},${rgb.b * 0.02 | 0},0.96)`
    ctx.fillRect(0, 0, w, h)

    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy
      if (p.x < 0) p.x = 1; if (p.x > 1) p.x = 0
      if (p.y < 0) p.y = 1; if (p.y > 1) p.y = 0
    })

    // connections
    ctx.lineWidth = 0.4
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = (particles[i].x - particles[j].x) * w
        const dy = (particles[i].y - particles[j].y) * h
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 60) {
          ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${(1 - dist / 60) * 0.15})`
          ctx.beginPath()
          ctx.moveTo(particles[i].x * w, particles[i].y * h)
          ctx.lineTo(particles[j].x * w, particles[j].y * h)
          ctx.stroke()
        }
      }
    }

    particles.forEach((p, i) => {
      const alpha = 0.4 + Math.sin(t * 1.5 + p.phase) * 0.25
      ctx.fillStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`
      ctx.beginPath()
      ctx.arc(p.x * w, p.y * h, p.size, 0, Math.PI * 2)
      ctx.fill()
    })
  }
}

/* ══════════════════════════════════════════════════════════════════════
   Area → renderer factory map
   ══════════════════════════════════════════════════════════════════════ */
const AREA_RENDERERS = {
  ML:      createML,
  NLP:     createNLP,
  Vision:  createVision,
  Datos:   createDatos,
  General: createGeneral,
}

const AREA_COLORS = {
  ML:      '#FC651F',
  NLP:     '#8B5CF6',
  Vision:  '#00D1FF',
  Datos:   '#22c55e',
  General: '#F59E0B',
}

/* ══════════════════════════════════════════════════════════════════════
   DynamicProjectCover component
   ══════════════════════════════════════════════════════════════════════ */
export default function DynamicProjectCover({ area = 'General', height = 96, className = '' }) {
  const canvasRef  = useRef(null)
  const animRef    = useRef(null)
  const rendererRef = useRef(null)
  const startRef   = useRef(null)
  const color = AREA_COLORS[area] || AREA_COLORS.General

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const factory = AREA_RENDERERS[area] || AREA_RENDERERS.General
    rendererRef.current = factory()
    startRef.current = performance.now()

    const ctx = canvas.getContext('2d')

    let visible = true
    const observer = new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { threshold: 0.1 })
    observer.observe(canvas)

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      canvas.width  = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    function frame() {
      if (visible) {
        const t = (performance.now() - startRef.current) / 1000
        const rect = canvas.getBoundingClientRect()
        if (rect.width > 0) rendererRef.current(ctx, rect.width, rect.height, t, color)
      }
      animRef.current = requestAnimationFrame(frame)
    }
    animRef.current = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(animRef.current)
      observer.disconnect()
      ro.disconnect()
    }
  }, [area, color])

  return (
    <canvas
      ref={canvasRef}
      className={`w-full block ${className}`}
      style={{ height: `${height}px` }}
    />
  )
}
