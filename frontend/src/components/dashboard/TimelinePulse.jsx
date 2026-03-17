import { useEffect, useRef, useMemo } from 'react'

const COLORS = ['#FC651F', '#8B5CF6', '#00D1FF', '#22c55e', '#F59E0B']

class Bubble {
  constructor(canvas) {
    this.canvas = canvas
    this.reset(true)
  }

  reset(initial = false) {
    this.x = initial ? Math.random() * this.canvas.width : -20
    this.y = Math.random() * this.canvas.height
    this.radius = 3 + Math.random() * 8
    this.color = COLORS[Math.floor(Math.random() * COLORS.length)]
    this.speed = 0.3 + Math.random() * 0.6
    this.alpha = 0.15 + Math.random() * 0.35
    this.pulse = Math.random() * Math.PI * 2
    this.pulseSpeed = 0.02 + Math.random() * 0.03
  }

  update() {
    this.x += this.speed
    this.pulse += this.pulseSpeed
    const wave = Math.sin(this.pulse) * 0.8
    this.y += wave * 0.3

    if (this.x > this.canvas.width + 20) {
      this.reset()
    }
  }

  draw(ctx) {
    const pulseFactor = 1 + Math.sin(this.pulse) * 0.2
    const r = this.radius * pulseFactor

    // Glow
    const grd = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, r * 3)
    grd.addColorStop(0, this.color + Math.round(this.alpha * 80).toString(16).padStart(2, '0'))
    grd.addColorStop(1, this.color + '00')
    ctx.fillStyle = grd
    ctx.beginPath()
    ctx.arc(this.x, this.y, r * 3, 0, Math.PI * 2)
    ctx.fill()

    // Core
    ctx.fillStyle = this.color + Math.round(this.alpha * 255).toString(16).padStart(2, '0')
    ctx.beginPath()
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

export default function TimelinePulse({ className = '' }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
    }
    resize()

    const bubbles = Array.from({ length: 18 }, () => new Bubble(canvas))

    const animate = () => {
      const rect = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)

      // Timeline line
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, rect.height / 2)
      ctx.lineTo(rect.width, rect.height / 2)
      ctx.stroke()

      // Tick marks
      const tickSpacing = rect.width / 8
      for (let i = 1; i < 8; i++) {
        ctx.strokeStyle = 'rgba(255,255,255,0.03)'
        ctx.beginPath()
        ctx.moveTo(i * tickSpacing, rect.height / 2 - 4)
        ctx.lineTo(i * tickSpacing, rect.height / 2 + 4)
        ctx.stroke()
      }

      bubbles.forEach(b => {
        b.update()
        b.draw(ctx)
      })

      animRef.current = requestAnimationFrame(animate)
    }

    animate()

    const handleResize = () => { resize(); bubbles.forEach(b => b.reset(true)) }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`w-full rounded-xl ${className}`}
      style={{ height: 80 }}
    />
  )
}
