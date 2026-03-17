import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, Float } from '@react-three/drei'
import { LOGRO_META } from '../../hooks/useAchievements'

/* ── Single 3D badge ─────────────────────────────────────── */

function Badge({ position, color, label }) {
  const meshRef = useRef()

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.3
      meshRef.current.rotation.x += delta * 0.15
    }
  })

  return (
    <Float speed={1.8} rotationIntensity={0.4} floatIntensity={0.6}>
      <group position={position}>
        <mesh ref={meshRef}>
          <icosahedronGeometry args={[0.35, 0]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={0.45}
            roughness={0.3}
            metalness={0.6}
          />
        </mesh>

        <Text
          position={[0, -0.55, 0]}
          fontSize={0.15}
          color="#e2e8f0"
          anchorX="center"
          anchorY="top"
          maxWidth={1.2}
        >
          {label}
        </Text>
      </group>
    </Float>
  )
}

/* ── Scene layout ────────────────────────────────────────── */

function BadgeScene({ logros }) {
  const badges = useMemo(() => {
    const spacing = 1.6
    const total = logros.length
    const offsetX = ((total - 1) * spacing) / 2

    return logros.map((logro, i) => {
      const meta = LOGRO_META[logro.tipo] || { label: logro.tipo, color: '#888' }
      return {
        id: logro.id,
        position: [i * spacing - offsetX, 0, 0],
        color: meta.color,
        label: meta.label,
      }
    })
  }, [logros])

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={0.8} />

      {badges.map((b) => (
        <Badge key={b.id} position={b.position} color={b.color} label={b.label} />
      ))}
    </>
  )
}

/* ── Exported component ──────────────────────────────────── */

export default function Achievements3D({ logros = [] }) {
  if (!logros.length) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-2xl bg-white/[0.02] text-sm text-white/20">
        Sin logros aún
      </div>
    )
  }

  return (
    <div className="h-[200px] w-full overflow-hidden rounded-2xl bg-black/40 border border-white/[0.06]">
      <Canvas
        dpr={[1, 1.5]}
        frameloop="always"
        camera={{ position: [0, 0, 4], fov: 50 }}
      >
        <BadgeScene logros={logros} />
      </Canvas>
    </div>
  )
}
