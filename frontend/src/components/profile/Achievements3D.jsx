import { useRef, useMemo, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Text, Float, OrbitControls, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { LOGRO_META, ACHIEVEMENT_DEFINITIONS } from '../../hooks/useAchievements'

/* ── Tier definitions ─────────────────────────────────────── */

const TIER_ORDER = ['legendario', 'diamante', 'platino', 'oro', 'plata', 'bronce']

function getTier(achievement) {
  if (achievement.tier) return achievement.tier
  // Infer tier from color / category for legacy logros
  const c = (achievement.color || '').toLowerCase()
  if (c === '#f59e0b' || c === '#fc651f') return 'oro'
  if (c === '#8b5cf6') return 'plata'
  if (c === '#22c55e') return 'plata'
  if (c === '#ec4899') return 'oro'
  if (c === '#00d1ff') return 'plata'
  if (c === '#ef4444') return 'oro'
  return 'bronce'
}

const TIER_COLORS = {
  bronce:     { base: '#CD7F32', emissive: '#CD7F32', intensity: 0.3 },
  plata:      { base: '#C0C0C0', emissive: '#E8E8E8', intensity: 0.4 },
  oro:        { base: '#FFD700', emissive: '#FFA500', intensity: 0.5 },
  platino:    { base: '#E5E4E2', emissive: '#FFFFFF', intensity: 0.6 },
  diamante:   { base: '#B9F2FF', emissive: '#00D1FF', intensity: 0.7 },
  legendario: { base: '#FF6EC7', emissive: '#FF00FF', intensity: 0.8 },
}

/* ── Tier-specific Geometry Components ────────────────────── */

function BronzeGeometry() {
  return <octahedronGeometry args={[0.35, 0]} />
}

function SilverGeometry() {
  return <dodecahedronGeometry args={[0.35, 0]} />
}

function GoldGeometry() {
  return <icosahedronGeometry args={[0.35, 0]} />
}

function PlatinumGeometry() {
  return <torusKnotGeometry args={[0.22, 0.08, 64, 16]} />
}

function DiamondShape() {
  // Two cones forming a diamond
  return (
    <group>
      <mesh position={[0, 0.15, 0]}>
        <coneGeometry args={[0.28, 0.35, 6]} />
      </mesh>
      <mesh position={[0, -0.15, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.28, 0.25, 6]} />
      </mesh>
    </group>
  )
}

function LegendaryShape() {
  // Saturn-like: sphere + ring
  return (
    <group>
      <mesh>
        <sphereGeometry args={[0.25, 32, 32]} />
      </mesh>
      <mesh rotation={[Math.PI / 3, 0.3, 0]}>
        <torusGeometry args={[0.42, 0.04, 8, 48]} />
      </mesh>
    </group>
  )
}

/* ── Particle System (InstancedMesh) ──────────────────────── */

const PARTICLE_COUNT = 8

function Particles({ color, active }) {
  const meshRef = useRef()
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const particleData = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, () => ({
      offset: Math.random() * Math.PI * 2,
      speed: 0.4 + Math.random() * 0.8,
      radius: 0.4 + Math.random() * 0.3,
      y: (Math.random() - 0.5) * 0.6,
      scale: 0.02 + Math.random() * 0.03,
    }))
  }, [])

  useFrame(({ clock }) => {
    if (!meshRef.current || !active) return
    const t = clock.getElapsedTime()
    particleData.forEach((p, i) => {
      const angle = t * p.speed + p.offset
      dummy.position.set(
        Math.cos(angle) * p.radius,
        p.y + Math.sin(t * p.speed * 1.5) * 0.15,
        Math.sin(angle) * p.radius
      )
      dummy.scale.setScalar(p.scale * (0.8 + Math.sin(t * 2 + p.offset) * 0.4))
      dummy.updateMatrix()
      meshRef.current.setMatrixAt(i, dummy.matrix)
    })
    meshRef.current.instanceMatrix.needsUpdate = true
  })

  if (!active) return null

  return (
    <instancedMesh ref={meshRef} args={[null, null, PARTICLE_COUNT]}>
      <sphereGeometry args={[1, 6, 6]} />
      <meshBasicMaterial color={color} transparent opacity={0.8} />
    </instancedMesh>
  )
}

/* ── Badge Component ──────────────────────────────────────── */

function Badge({ position, badge, isUnlocked, onHover, isHovered, compact }) {
  const meshRef = useRef()
  const groupRef = useRef()
  const tier = badge.tier || 'bronce'
  const tierColor = TIER_COLORS[tier] || TIER_COLORS.bronce
  const badgeColor = badge.color || tierColor.base

  useFrame((_, delta) => {
    if (!meshRef.current) return
    meshRef.current.rotation.y += delta * (isHovered ? 1.2 : 0.3)
    meshRef.current.rotation.x += delta * (isHovered ? 0.4 : 0.1)
  })

  const handlePointerOver = useCallback((e) => {
    e.stopPropagation()
    onHover?.(badge.id)
    document.body.style.cursor = 'pointer'
  }, [badge.id, onHover])

  const handlePointerOut = useCallback(() => {
    onHover?.(null)
    document.body.style.cursor = 'auto'
  }, [onHover])

  const renderGeometry = () => {
    switch (tier) {
      case 'plata': return <SilverGeometry />
      case 'oro': return <GoldGeometry />
      case 'platino': return <PlatinumGeometry />
      case 'diamante': return null // Uses DiamondShape group
      case 'legendario': return null // Uses LegendaryShape group
      default: return <BronzeGeometry />
    }
  }

  const scaleFactor = compact ? 0.7 : 1

  return (
    <Float
      speed={isUnlocked ? 1.8 : 0.5}
      rotationIntensity={isUnlocked ? 0.4 : 0.1}
      floatIntensity={isUnlocked ? 0.6 : 0.15}
    >
      <group
        ref={groupRef}
        position={position}
        scale={isHovered ? scaleFactor * 1.2 : scaleFactor}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        {/* Badge geometry */}
        {tier === 'diamante' ? (
          <group ref={meshRef}>
            <DiamondShape />
            {/* Apply material to children via traversal */}
            <mesh>
              <sphereGeometry args={[0, 0, 0]} />
              <meshPhysicalMaterial
                color={isUnlocked ? badgeColor : '#333'}
                emissive={isUnlocked ? tierColor.emissive : '#000'}
                emissiveIntensity={isUnlocked ? (isHovered ? tierColor.intensity * 1.8 : tierColor.intensity) : 0}
                roughness={isUnlocked ? 0.15 : 0.8}
                metalness={isUnlocked ? 0.9 : 0.1}
                clearcoat={isUnlocked ? 1 : 0}
                clearcoatRoughness={0.1}
                transparent={!isUnlocked}
                opacity={isUnlocked ? 1 : 0.3}
                transmission={isUnlocked ? 0 : 0.6}
              />
            </mesh>
          </group>
        ) : tier === 'legendario' ? (
          <group ref={meshRef}>
            <LegendaryShape />
          </group>
        ) : (
          <mesh ref={meshRef}>
            {renderGeometry()}
            <meshPhysicalMaterial
              color={isUnlocked ? badgeColor : '#333'}
              emissive={isUnlocked ? tierColor.emissive : '#000'}
              emissiveIntensity={isUnlocked ? (isHovered ? tierColor.intensity * 1.8 : tierColor.intensity) : 0}
              roughness={isUnlocked ? 0.15 : 0.8}
              metalness={isUnlocked ? 0.9 : 0.1}
              clearcoat={isUnlocked ? 1 : 0}
              clearcoatRoughness={0.1}
              transparent={!isUnlocked}
              opacity={isUnlocked ? 1 : 0.3}
              transmission={isUnlocked ? 0 : 0.6}
            />
          </mesh>
        )}

        {/* Material for diamond/legendary shapes applied to their sub-meshes */}
        {(tier === 'diamante' || tier === 'legendario') && (
          <BadgeMaterialApplier
            groupRef={meshRef}
            isUnlocked={isUnlocked}
            badgeColor={badgeColor}
            tierColor={tierColor}
            isHovered={isHovered}
          />
        )}

        {/* Particles for unlocked badges */}
        <Particles color={badgeColor} active={isUnlocked} />

        {/* Label - shows on hover or always in compact mode */}
        {(isHovered || compact) && (
          <Text
            position={[0, -0.6, 0]}
            fontSize={compact ? 0.12 : 0.14}
            color={isUnlocked ? '#ffffff' : '#666666'}
            anchorX="center"
            anchorY="top"
            maxWidth={1.4}
            outlineWidth={isHovered ? 0.008 : 0}
            outlineColor={badgeColor}
          >
            {badge.label}
          </Text>
        )}

        {/* Glow ring when hovered */}
        {isHovered && isUnlocked && (
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.5, 0.55, 32]} />
            <meshBasicMaterial
              color={badgeColor}
              transparent
              opacity={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
        )}
      </group>
    </Float>
  )
}

/* Helper: apply material to diamond/legendary sub-meshes */
function BadgeMaterialApplier({ groupRef, isUnlocked, badgeColor, tierColor, isHovered }) {
  useFrame(() => {
    if (!groupRef.current) return
    groupRef.current.traverse((child) => {
      if (child.isMesh && !child.userData._materialApplied) {
        child.material = new THREE.MeshPhysicalMaterial({
          color: isUnlocked ? badgeColor : '#333',
          emissive: isUnlocked ? tierColor.emissive : '#000',
          emissiveIntensity: isUnlocked ? tierColor.intensity : 0,
          roughness: isUnlocked ? 0.15 : 0.8,
          metalness: isUnlocked ? 0.9 : 0.1,
          clearcoat: isUnlocked ? 1 : 0,
          clearcoatRoughness: 0.1,
          transparent: !isUnlocked,
          opacity: isUnlocked ? 1 : 0.3,
        })
        child.userData._materialApplied = true
      }
    })
  })
  return null
}

/* ── Central Stats Display ────────────────────────────────── */

function CentralStats({ unlockedCount, totalCount, compact }) {
  const groupRef = useRef()

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.3) * 0.1
  })

  if (compact) return null

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Central trophy pedestal */}
      <mesh position={[0, -0.8, 0]}>
        <cylinderGeometry args={[0.5, 0.6, 0.1, 32]} />
        <meshPhysicalMaterial
          color="#1a1a2e"
          emissive="#8B5CF6"
          emissiveIntensity={0.15}
          metalness={0.8}
          roughness={0.2}
          clearcoat={1}
        />
      </mesh>

      {/* Stats text */}
      <Text
        position={[0, 0.15, 0]}
        fontSize={0.35}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.01}
        outlineColor="#8B5CF6"
      >
        {`${unlockedCount}/${totalCount}`}
      </Text>
      <Text
        position={[0, -0.2, 0]}
        fontSize={0.13}
        color="#a0a0c0"
        anchorX="center"
        anchorY="middle"
      >
        Logros Desbloqueados
      </Text>

      {/* Rotating ring around stats */}
      <RotatingRing />
    </group>
  )
}

function RotatingRing() {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.z = clock.getElapsedTime() * 0.2
    ref.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.15) * 0.3
  })

  return (
    <mesh ref={ref}>
      <torusGeometry args={[0.7, 0.015, 8, 64]} />
      <meshBasicMaterial color="#8B5CF6" transparent opacity={0.4} />
    </mesh>
  )
}

/* ── Scene ────────────────────────────────────────────────── */

function TrophyScene({ badges, compact }) {
  const [hoveredId, setHoveredId] = useState(null)

  const { positions, unlockedCount, totalCount } = useMemo(() => {
    const total = badges.length
    const unlocked = badges.filter(b => b.isUnlocked).length
    const radius = compact ? 1.8 : (total <= 12 ? 2.5 : 2.5)
    const positions = []

    if (total <= 12) {
      // Circular layout
      badges.forEach((_, i) => {
        const angle = (i / total) * Math.PI * 2 - Math.PI / 2
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        const y = 0
        positions.push([x, y, z])
      })
    } else {
      // Spiral layout
      const turns = Math.ceil(total / 12)
      const heightRange = turns * 1.2
      badges.forEach((_, i) => {
        const t = i / total
        const angle = t * Math.PI * 2 * turns
        const r = radius * (0.6 + t * 0.4)
        const x = Math.cos(angle) * r
        const z = Math.sin(angle) * r
        const y = (t - 0.5) * heightRange
        positions.push([x, y, z])
      })
    }

    return { positions, unlockedCount: unlocked, totalCount: total }
  }, [badges, compact])

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={0.8} color="#ffffff" />
      <pointLight position={[-5, 3, -5]} intensity={0.4} color="#8B5CF6" />
      <pointLight position={[0, -3, 5]} intensity={0.3} color="#00D1FF" />

      {/* Background stars */}
      <Stars
        radius={50}
        depth={50}
        count={compact ? 500 : 1500}
        factor={compact ? 2 : 4}
        saturation={0.5}
        fade
        speed={0.5}
      />

      {/* Central stats */}
      <CentralStats
        unlockedCount={unlockedCount}
        totalCount={totalCount}
        compact={compact}
      />

      {/* Badges */}
      {badges.map((badge, i) => (
        <Badge
          key={badge.id}
          position={positions[i]}
          badge={badge}
          isUnlocked={badge.isUnlocked}
          onHover={setHoveredId}
          isHovered={hoveredId === badge.id}
          compact={compact}
        />
      ))}

      {/* Controls */}
      <OrbitControls
        enablePan={false}
        enableZoom={!compact}
        minDistance={compact ? 3 : 2}
        maxDistance={compact ? 6 : 10}
        autoRotate
        autoRotateSpeed={0.5}
        maxPolarAngle={Math.PI * 0.75}
        minPolarAngle={Math.PI * 0.25}
      />
    </>
  )
}

/* ── Normalize Props ──────────────────────────────────────── */

function normalizeBadges(logros, achievements) {
  const badgeMap = new Map()

  // Process new achievements array first (higher priority)
  achievements.forEach((a) => {
    const meta = LOGRO_META[a.id] || { label: a.name || a.id, color: a.color || '#888' }
    badgeMap.set(a.id, {
      id: a.id,
      label: a.name || meta.label,
      color: a.color || meta.color,
      icon: a.icon || meta.icon || '',
      tier: a.tier || getTier({ color: a.color || meta.color }),
      isUnlocked: a.isUnlocked ?? true,
      percent: a.percent ?? 100,
      category: a.category || 'general',
    })
  })

  // Process legacy logros
  logros.forEach((l) => {
    const tipo = l.tipo || l.id
    if (badgeMap.has(tipo)) return // Skip duplicates
    const meta = LOGRO_META[tipo] || { label: tipo, color: '#888', icon: '' }
    badgeMap.set(tipo, {
      id: l.id || tipo,
      label: meta.label,
      color: meta.color,
      icon: meta.icon || '',
      tier: getTier({ color: meta.color }),
      isUnlocked: true,
      percent: 100,
      category: 'legacy',
    })
  })

  // If neither prop has data, show all definitions as locked
  if (badgeMap.size === 0) {
    ACHIEVEMENT_DEFINITIONS.forEach((def) => {
      badgeMap.set(def.id, {
        id: def.id,
        label: def.name,
        color: def.color,
        icon: def.icon,
        tier: getTier({ color: def.color }),
        isUnlocked: false,
        percent: 0,
        category: def.category,
      })
    })
  }

  // Sort: unlocked first, then by tier priority
  const sorted = Array.from(badgeMap.values()).sort((a, b) => {
    if (a.isUnlocked !== b.isUnlocked) return a.isUnlocked ? -1 : 1
    const ta = TIER_ORDER.indexOf(a.tier)
    const tb = TIER_ORDER.indexOf(b.tier)
    return (ta === -1 ? 99 : ta) - (tb === -1 ? 99 : tb)
  })

  // Limit to 30 for performance
  return sorted.slice(0, 30)
}

/* ── Exported Component ───────────────────────────────────── */

export default function Achievements3D({ logros = [], achievements = [], compact = false }) {
  const badges = useMemo(
    () => normalizeBadges(logros, achievements),
    [logros, achievements]
  )

  if (!badges.length) {
    return (
      <div className="flex items-center justify-center rounded-2xl bg-white/[0.02] text-sm text-white/20"
        style={{ height: compact ? 150 : 200 }}
      >
        Sin logros aun
      </div>
    )
  }

  return (
    <div
      className={`w-full overflow-hidden rounded-2xl bg-black/40 border border-white/[0.06] ${
        compact ? 'h-[200px]' : 'h-[420px]'
      }`}
    >
      <Canvas
        dpr={[1, 1.5]}
        frameloop="always"
        camera={{
          position: compact ? [0, 1, 4] : [0, 1.5, 6],
          fov: compact ? 50 : 45,
        }}
      >
        <TrophyScene badges={badges} compact={compact} />
      </Canvas>
    </div>
  )
}
