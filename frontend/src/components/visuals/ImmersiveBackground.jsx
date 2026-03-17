import { Suspense, useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, ChromaticAberration } from '@react-three/postprocessing'
import * as THREE from 'three'

const PARTICLE_COUNT = 3000

function Particles({ mouseRef }) {
  const meshRef = useRef()

  const { positions, dummy } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 30
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20
    }
    return { positions, dummy: new THREE.Object3D() }
  }, [])

  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(0.03, 4, 4)
    return geo
  }, [])

  const material = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color('#FC651F'),
    emissive: new THREE.Color('#FC651F'),
    emissiveIntensity: 0.6,
    roughness: 0.4,
    metalness: 0.2,
  }), [])

  useFrame(({ clock }) => {
    if (!meshRef.current) return
    const t = clock.getElapsedTime()
    const mx = mouseRef.current.x * 2
    const my = mouseRef.current.y * 2

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = positions[i * 3]
      const iy = positions[i * 3 + 1]
      const iz = positions[i * 3 + 2]

      dummy.position.set(
        ix + Math.sin(t * 0.2 + ix * 0.3) * 0.3 + mx * 0.01,
        iy + Math.cos(t * 0.15 + iy * 0.2) * 0.2 + my * 0.01,
        iz + Math.sin(t * 0.1 + iz * 0.4) * 0.15,
      )
      const s = 0.6 + 0.4 * Math.abs(Math.sin(t * 0.5 + i))
      dummy.scale.setScalar(s)
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true

    // Shift color between primary and secondary
    const hue = (t * 0.02) % 1
    material.emissive.setHSL(hue * 0.15 + 0.05, 0.9, 0.5)
  })

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, PARTICLE_COUNT]}>
    </instancedMesh>
  )
}

function Scene({ mouseRef, intensity = 1 }) {
  return (
    <>
      <ambientLight intensity={0.1} />
      <pointLight position={[5, 5, 5]} intensity={intensity} color="#FC651F" />
      <pointLight position={[-5, -5, -5]} intensity={intensity * 0.5} color="#8B5CF6" />
      <Particles mouseRef={mouseRef} />
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.6}
          intensity={1.2 * intensity}
          radius={0.5}
        />
        <ChromaticAberration offset={[0.0004, 0.0004]} />
      </EffectComposer>
    </>
  )
}

export default function ImmersiveBackground({ intensity = 1, className = '' }) {
  const mouseRef = useRef({ x: 0, y: 0 })

  const handleMouseMove = (e) => {
    mouseRef.current.x = (e.clientX / window.innerWidth - 0.5) * 2
    mouseRef.current.y = -(e.clientY / window.innerHeight - 0.5) * 2
  }

  return (
    <div
      className={`absolute inset-0 ${className}`}
      onMouseMove={handleMouseMove}
      style={{ zIndex: 0 }}
    >
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        dpr={Math.min(window.devicePixelRatio, 1.5)}
        gl={{ antialias: false, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Suspense fallback={null}>
          <Scene mouseRef={mouseRef} intensity={intensity} />
        </Suspense>
      </Canvas>
    </div>
  )
}
