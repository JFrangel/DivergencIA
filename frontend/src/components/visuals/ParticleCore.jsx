import { Suspense, useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

const COUNT = 500

function CoreParticles() {
  const meshRef = useRef()
  const { positions, dummy } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      const r = 2 + Math.random() * 3
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
    }
    return { positions, dummy: new THREE.Object3D() }
  }, [])

  const geo = useMemo(() => new THREE.SphereGeometry(0.025, 4, 4), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#00D1FF',
    emissive: '#00D1FF',
    emissiveIntensity: 0.8,
  }), [])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()
    for (let i = 0; i < COUNT; i++) {
      const speed = 0.3 + (i % 5) * 0.05
      dummy.position.set(
        positions[i * 3]     + Math.sin(t * speed + i) * 0.1,
        positions[i * 3 + 1] + Math.cos(t * speed + i) * 0.1,
        positions[i * 3 + 2] + Math.sin(t * speed * 0.7 + i) * 0.1,
      )
      dummy.scale.setScalar(0.8 + 0.4 * Math.sin(t * 2 + i * 0.5))
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  return <instancedMesh ref={meshRef} args={[geo, mat, COUNT]} />
}

function PulsingCore() {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    const s = 1 + 0.15 * Math.sin(clock.getElapsedTime() * 2)
    ref.current.scale.setScalar(s)
  })
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[0.4, 32, 32]} />
      <meshStandardMaterial
        color="#8B5CF6"
        emissive="#8B5CF6"
        emissiveIntensity={1}
        wireframe
      />
    </mesh>
  )
}

export default function ParticleCore({ className = '' }) {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`} style={{ zIndex: 0 }}>
      <Canvas
        camera={{ position: [0, 0, 7], fov: 50 }}
        dpr={Math.min(window.devicePixelRatio, 1.5)}
        gl={{ antialias: false, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.1} />
          <pointLight position={[0, 0, 5]} intensity={2} color="#00D1FF" />
          <CoreParticles />
          <PulsingCore />
          <EffectComposer>
            <Bloom luminanceThreshold={0.2} intensity={1.5} radius={0.6} />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  )
}
