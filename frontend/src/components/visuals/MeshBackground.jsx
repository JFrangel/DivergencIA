import { useRef, useEffect } from 'react'

/**
 * Animated gradient mesh background using canvas.
 * Lightweight alternative to Three.js for subtle page backgrounds.
 * Props:
 *   - intensity: 0-1, controls opacity
 *   - colors: array of hex colors (default: brand palette)
 *   - speed: animation speed multiplier (default: 1)
 */
export default function MeshBackground({
  intensity = 0.4,
  colors = ['#FC651F', '#8B5CF6', '#00D1FF', '#22c55e'],
  speed = 1,
  className = '',
}) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let animationId
    let time = 0

    // Blob points that float around
    const blobs = colors.map((color, i) => ({
      x: Math.random(),
      y: Math.random(),
      vx: (0.0003 + Math.random() * 0.0005) * speed * (i % 2 === 0 ? 1 : -1),
      vy: (0.0003 + Math.random() * 0.0005) * speed * (i % 2 === 0 ? -1 : 1),
      radius: 0.25 + Math.random() * 0.15,
      color,
    }))

    function hexToRgb(hex) {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return { r, g, b }
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio, 2)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.scale(dpr, dpr)
    }

    function animate() {
      time += 0.016 * speed
      const w = canvas.clientWidth
      const h = canvas.clientHeight

      ctx.clearRect(0, 0, w, h)

      // Update blob positions
      blobs.forEach(blob => {
        blob.x += blob.vx + Math.sin(time * 0.5 + blob.x * 3) * 0.0002
        blob.y += blob.vy + Math.cos(time * 0.5 + blob.y * 3) * 0.0002

        // Bounce off edges
        if (blob.x < -0.1 || blob.x > 1.1) blob.vx *= -1
        if (blob.y < -0.1 || blob.y > 1.1) blob.vy *= -1
      })

      // Draw blobs
      blobs.forEach(blob => {
        const rgb = hexToRgb(blob.color)
        const cx = blob.x * w
        const cy = blob.y * h
        const r = blob.radius * Math.min(w, h)

        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
        gradient.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${intensity * 0.3})`)
        gradient.addColorStop(0.5, `rgba(${rgb.r},${rgb.g},${rgb.b},${intensity * 0.08})`)
        gradient.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`)

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fill()
      })

      animationId = requestAnimationFrame(animate)
    }

    resize()
    animate()

    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationId)
    }
  }, [colors, intensity, speed])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
      style={{ opacity: intensity }}
    />
  )
}
