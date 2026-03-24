import { useMemo, useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { FiMapPin, FiStar, FiClock, FiUser, FiX } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'

/* ── Group configuration ── */
const GROUP_CONFIG = {
  fundadores: { label: 'Fundadores', color: '#F59E0B', radius: 0.28 },
  activos:    { label: 'Miembros activos', color: 'var(--c-primary)', radius: 0.48 },
  nuevos:     { label: 'Nuevos (30d)', color: 'var(--c-accent)', radius: 0.68 },
  egresados:  { label: 'Egresados', color: '#6b7280', radius: 0.85 },
}

/* ── Area colors for clustering ── */
const AREA_COLORS = {
  ML: '#FC651F', NLP: '#8B5CF6', Vision: '#00D1FF', Datos: '#22c55e', General: '#F59E0B',
}

/* ── Connection types ── */
const CONNECTION_STYLES = {
  mentor:    { dash: '8 4',  opacity: 0.18, width: 1.2, label: 'Mentoría' },
  area:      { dash: '3 3',  opacity: 0.12, width: 0.8, label: 'Misma área' },
  alumni:    { dash: '2 6',  opacity: 0.10, width: 0.6, label: 'Egresado-Proyecto' },
  intraRing: { dash: 'none', opacity: 0.06, width: 0.5, label: 'Grupo' },
}

const STORAGE_KEY = 'divergencia-network-positions'

/* ── Helpers ── */
function resolveColor(val, el) {
  if (!val || !val.startsWith('var(')) return val
  const varName = val.slice(4, -1)
  return getComputedStyle(el || document.documentElement).getPropertyValue(varName).trim() || '#FC651F'
}

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function classifyMember(m) {
  if (!m.activo) return 'egresados'
  if (m.es_fundador) return 'fundadores'
  if (m.fecha_registro) {
    const joined = new Date(m.fecha_registro)
    const thirtyAgo = new Date()
    thirtyAgo.setDate(thirtyAgo.getDate() - 30)
    if (joined >= thirtyAgo) return 'nuevos'
  }
  return 'activos'
}

function isNewMember(m) {
  if (!m.fecha_registro) return false
  const joined = new Date(m.fecha_registro)
  const sevenAgo = new Date()
  sevenAgo.setDate(sevenAgo.getDate() - 7)
  return joined >= sevenAgo
}

/* Distribute nodes around a ring, clustered by area */
function ringPositionsWithClusters(groupMembers, radiusFraction, cx, cy, maxR) {
  if (!groupMembers.length) return []

  // Group by area
  const byArea = {}
  groupMembers.forEach(m => {
    const area = m.area_investigacion || 'General'
    if (!byArea[area]) byArea[area] = []
    byArea[area].push(m)
  })

  const r = radiusFraction * maxR
  const areas = Object.keys(byArea)
  const totalMembers = groupMembers.length
  const positions = new Map()

  let currentAngle = -Math.PI / 2
  areas.forEach(area => {
    const areaMembers = byArea[area]
    const arcSpan = (2 * Math.PI * areaMembers.length) / totalMembers
    const areaStartAngle = currentAngle

    areaMembers.forEach((m, i) => {
      const angle = areaStartAngle + (arcSpan * (i + 0.5)) / areaMembers.length
      const jitter = (Math.random() - 0.5) * 8
      positions.set(m.id, {
        x: cx + r * Math.cos(angle) + jitter,
        y: cy + r * Math.sin(angle) + jitter,
        area,
        areaCenter: {
          x: cx + (r + 28) * Math.cos(areaStartAngle + arcSpan / 2),
          y: cy + (r + 28) * Math.sin(areaStartAngle + arcSpan / 2),
        },
      })
    })

    currentAngle += arcSpan
  })

  return { positions, areaClusters: byArea }
}

/* ── Welcome banner ── */
function WelcomeBanner({ newMembers, onDismiss }) {
  if (!newMembers.length) return null
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        className="absolute top-14 left-1/2 z-40 glass rounded-2xl px-5 py-3 flex items-center gap-3"
        style={{
          transform: 'translateX(-50%)',
          border: '1px solid rgba(0,209,255,0.2)',
          background: 'linear-gradient(135deg, rgba(0,209,255,0.08), rgba(139,92,246,0.06))',
          maxWidth: '90%',
        }}
      >
        <span className="text-lg">🎉</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white/80">
            ¡Bienvenid{newMembers.length > 1 ? 'os' : 'o'}!
          </p>
          <p className="text-[11px] text-white/40 truncate">
            {newMembers.map(m => m.nombre?.split(' ')[0]).join(', ')} se {newMembers.length > 1 ? 'unieron' : 'unió'} esta semana
          </p>
        </div>
        <button onClick={onDismiss} className="text-white/25 hover:text-white/60 transition-colors">
          <FiX size={13} />
        </button>
      </motion.div>
    </AnimatePresence>
  )
}

/* ── Mini profile popup ── */
function MiniProfile({ member, x, y, color, containerW, containerH, onClose }) {
  const popupW = 220
  const popupH = 180
  let left = x
  let top = y - popupH - 20

  // Keep within bounds
  if (left + popupW / 2 > containerW) left = containerW - popupW / 2 - 8
  if (left - popupW / 2 < 0) left = popupW / 2 + 8
  if (top < 8) top = y + 40

  const skills = member.habilidades?.slice(0, 4) || []
  const joinDate = member.fecha_registro
    ? new Date(member.fecha_registro).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })
    : null

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.85, y: 8 }}
      className="absolute z-50 glass rounded-2xl px-4 py-3.5"
      style={{
        left,
        top,
        transform: 'translate(-50%, 0)',
        border: `1px solid ${color}30`,
        width: popupW,
        boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${color}10`,
      }}
      onClick={e => e.stopPropagation()}
    >
      <button
        onClick={onClose}
        className="absolute top-2 right-2 text-white/20 hover:text-white/50 transition-colors"
      >
        <FiX size={11} />
      </button>
      <div className="flex items-center gap-2.5 mb-2.5">
        {member.foto_url ? (
          <img src={member.foto_url} alt="" className="w-10 h-10 rounded-full object-cover" style={{ border: `2px solid ${color}` }} />
        ) : (
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-title font-bold text-xs" style={{ background: `${color}20`, border: `2px solid ${color}`, color }}>
            {getInitials(member.nombre)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{member.nombre}</p>
          <p className="text-[10px] text-white/35 truncate">{member.carrera || member.rol || 'Investigador'}</p>
        </div>
      </div>

      {member.area_investigacion && (
        <div className="flex items-center gap-1.5 mb-2">
          <FiMapPin size={10} className="text-white/25 shrink-0" />
          <span className="text-[10px] font-medium" style={{ color }}>{member.area_investigacion}</span>
        </div>
      )}

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {skills.map((s, i) => (
            <span key={i} className="px-1.5 py-0.5 rounded text-[9px] text-white/40" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {s}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3 mt-1">
        {member.es_fundador && (
          <span className="flex items-center gap-1 text-[10px] text-[#F59E0B]">
            <FiStar size={9} /> Fundador
          </span>
        )}
        {joinDate && (
          <span className="flex items-center gap-1 text-[10px] text-white/25">
            <FiClock size={9} /> {joinDate}
          </span>
        )}
      </div>

      <p className="text-[9px] text-white/20 mt-2 text-center">
        Doble clic para ver perfil completo
      </p>
    </motion.div>
  )
}

/* ── Node tooltip (hover) ── */
function NodeTooltip({ member, x, y }) {
  const joined = member.fecha_registro
    ? new Date(member.fecha_registro).toLocaleDateString('es-CO', { month: 'short', year: 'numeric' })
    : null
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      className="absolute z-40 pointer-events-none glass rounded-xl px-3 py-2 text-center"
      style={{
        left: x,
        top: y - 64,
        transform: 'translate(-50%, -100%)',
        border: '1px solid rgba(255,255,255,0.1)',
        minWidth: 120,
      }}
    >
      <p className="text-xs font-semibold text-white truncate">{member.nombre}</p>
      {member.area_investigacion && (
        <p className="text-[10px] text-white/40">{member.area_investigacion}</p>
      )}
      {joined && <p className="text-[10px] text-white/30 mt-0.5">{joined}</p>}
    </motion.div>
  )
}

/* ══════════════════════════════════
   Main MemberNetwork component
   ══════════════════════════════════ */
export default function MemberNetwork({ members = [] }) {
  const containerRef = useRef(null)
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [dims, setDims] = useState({ w: 800, h: 600 })
  const [hovered, setHovered] = useState(null)
  const [selected, setSelected] = useState(null)
  const [resolvedColors, setResolvedColors] = useState({})
  const [showWelcome, setShowWelcome] = useState(true)
  const [dragState, setDragState] = useState(null)
  const [customPositions, setCustomPositions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}
    } catch { return {} }
  })
  const [connectionFilter, setConnectionFilter] = useState('all') // 'all' | 'mentor' | 'area' | 'alumni'

  /* Observe container size */
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (width > 0) setDims({ w: width, h: Math.max(540, height) })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  /* Resolve CSS var colors */
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const resolved = {}
    for (const [key, cfg] of Object.entries(GROUP_CONFIG)) {
      resolved[key] = resolveColor(cfg.color, el)
    }
    setResolvedColors(resolved)
  }, [dims])

  /* Classify members into groups */
  const groups = useMemo(() => {
    const g = { fundadores: [], activos: [], nuevos: [], egresados: [] }
    members.forEach(m => {
      const cat = classifyMember(m)
      g[cat].push(m)
    })
    return g
  }, [members])

  /* New members (last 7 days) */
  const newMembers = useMemo(() => members.filter(isNewMember), [members])

  /* Compute node positions with area clustering */
  const { nodes, cx, cy, maxR, areaLabels } = useMemo(() => {
    const cx = dims.w / 2
    const cy = dims.h / 2
    const maxR = Math.min(cx, cy) - 40
    const allNodes = []
    const areaLabels = []

    for (const [groupKey, cfg] of Object.entries(GROUP_CONFIG)) {
      const groupMembers = groups[groupKey] || []
      if (!groupMembers.length) continue

      const { positions, areaClusters } = ringPositionsWithClusters(
        groupMembers, cfg.radius, cx, cy, maxR
      )

      groupMembers.forEach(m => {
        const pos = positions.get(m.id)
        // Use custom position if admin has set one
        const customPos = customPositions[m.id]
        allNodes.push({
          ...m,
          group: groupKey,
          px: customPos?.x ?? pos.x,
          py: customPos?.y ?? pos.y,
          clusterArea: pos.area,
        })
      })

      // Area labels for this ring
      for (const [area, areaMembers] of Object.entries(areaClusters)) {
        if (areaMembers.length < 2) continue
        const pos = positions.get(areaMembers[0].id)
        if (pos?.areaCenter) {
          areaLabels.push({
            text: area,
            x: pos.areaCenter.x,
            y: pos.areaCenter.y,
            color: AREA_COLORS[area] || '#6b7280',
            groupKey,
          })
        }
      }
    }

    return { nodes: allNodes, cx, cy, maxR, areaLabels }
  }, [groups, dims, customPositions])

  /* Build inter-group connections */
  const interGroupConnections = useMemo(() => {
    const conns = []
    const nodeMap = new Map(nodes.map(n => [n.id, n]))

    // Fundadores -> activos with same area (mentor connections)
    const fundadores = nodes.filter(n => n.group === 'fundadores')
    const activos = nodes.filter(n => n.group === 'activos')
    const nuevos = nodes.filter(n => n.group === 'nuevos')
    const egresados = nodes.filter(n => n.group === 'egresados')

    fundadores.forEach(f => {
      activos
        .filter(a => a.area_investigacion && a.area_investigacion === f.area_investigacion)
        .slice(0, 3) // max 3 connections per founder
        .forEach(a => {
          conns.push({ from: f, to: a, type: 'mentor' })
        })
    })

    // New members -> members in same area
    nuevos.forEach(n => {
      const sameArea = [...fundadores, ...activos].filter(
        m => m.area_investigacion && m.area_investigacion === n.area_investigacion
      )
      sameArea.slice(0, 2).forEach(m => {
        conns.push({ from: n, to: m, type: 'area' })
      })
    })

    // Egresados -> random active members (simulating project connections)
    egresados.forEach(e => {
      const targets = activos.filter(a => a.area_investigacion === e.area_investigacion)
      targets.slice(0, 2).forEach(t => {
        conns.push({ from: e, to: t, type: 'alumni' })
      })
    })

    return conns
  }, [nodes])

  /* Filter visible connections */
  const visibleConnections = useMemo(() => {
    if (connectionFilter === 'all') return interGroupConnections
    return interGroupConnections.filter(c => c.type === connectionFilter)
  }, [interGroupConnections, connectionFilter])

  const nodeRadius = Math.max(14, Math.min(22, 800 / (members.length + 10)))

  /* Admin drag handlers */
  const handleDragStart = useCallback((e, node) => {
    if (!isAdmin) return
    e.preventDefault()
    setDragState({ id: node.id, startX: e.clientX, startY: e.clientY, origX: node.px, origY: node.py })
  }, [isAdmin])

  useEffect(() => {
    if (!dragState) return

    const handleMouseMove = (e) => {
      const dx = e.clientX - dragState.startX
      const dy = e.clientY - dragState.startY
      setCustomPositions(prev => ({
        ...prev,
        [dragState.id]: { x: dragState.origX + dx, y: dragState.origY + dy },
      }))
    }

    const handleMouseUp = () => {
      // Save to localStorage
      setCustomPositions(prev => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prev)) } catch {}
        return prev
      })
      setDragState(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState])

  /* Reset custom positions */
  const resetPositions = () => {
    setCustomPositions({})
    localStorage.removeItem(STORAGE_KEY)
  }

  /* Compute dimmed state for hover-highlight */
  const isNodeHighlighted = useCallback((node) => {
    if (!hovered) return true
    if (hovered.id === node.id) return true
    // Highlight connected nodes
    return interGroupConnections.some(
      c => (c.from.id === hovered.id && c.to.id === node.id) ||
           (c.to.id === hovered.id && c.from.id === node.id)
    )
  }, [hovered, interGroupConnections])

  const isConnectionHighlighted = useCallback((conn) => {
    if (!hovered) return false
    return conn.from.id === hovered.id || conn.to.id === hovered.id
  }, [hovered])

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-2xl overflow-hidden glass select-none"
      style={{ minHeight: 540, border: '1px solid rgba(255,255,255,0.06)' }}
      onClick={() => setSelected(null)}
    >
      {/* Welcome banner for new members */}
      {showWelcome && newMembers.length > 0 && (
        <WelcomeBanner newMembers={newMembers} onDismiss={() => setShowWelcome(false)} />
      )}

      {/* Legend */}
      <div className="absolute top-4 left-4 z-30 flex flex-col gap-2">
        <div className="flex flex-wrap gap-3">
          {Object.entries(GROUP_CONFIG).map(([key, cfg]) => {
            const count = (groups[key] || []).length
            if (!count) return null
            return (
              <div key={key} className="flex items-center gap-1.5 text-[11px] text-white/50">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: resolvedColors[key] || '#999' }} />
                {cfg.label} ({count})
              </div>
            )
          })}
        </div>

        {/* Connection type filter */}
        {interGroupConnections.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'mentor', label: 'Mentoría', dash: '8 4' },
              { id: 'area', label: 'Área', dash: '3 3' },
              { id: 'alumni', label: 'Egresados', dash: '2 6' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setConnectionFilter(f.id)}
                className="px-2 py-0.5 rounded text-[9px] font-medium transition-all"
                style={connectionFilter === f.id
                  ? { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.15)' }
                  : { background: 'rgba(255,255,255,0.02)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.05)' }
                }
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Admin controls */}
      {isAdmin && Object.keys(customPositions).length > 0 && (
        <button
          onClick={resetPositions}
          className="absolute top-4 right-4 z-30 px-3 py-1.5 rounded-lg text-[10px] text-white/40 hover:text-white/70 transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          Reiniciar posiciones
        </button>
      )}

      <svg width={dims.w} height={dims.h} className="absolute inset-0">
        <defs>
          {/* Glow filter for new member nodes */}
          <filter id="newMemberGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Ring guides */}
        {Object.entries(GROUP_CONFIG).map(([key, cfg]) => {
          if (!(groups[key] || []).length) return null
          const r = cfg.radius * maxR
          return (
            <circle
              key={key}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.04)"
              strokeWidth={1}
              strokeDasharray="4 6"
            />
          )
        })}

        {/* Area cluster backgrounds */}
        {areaLabels.map((label, i) => (
          <g key={`area-label-${i}`}>
            <text
              x={label.x}
              y={label.y}
              textAnchor="middle"
              dominantBaseline="central"
              fill={label.color}
              fillOpacity={0.25}
              fontSize={9}
              fontWeight={600}
              fontFamily="inherit"
            >
              {label.text}
            </text>
          </g>
        ))}

        {/* Lines from each node to center hub */}
        {nodes.map((n, i) => {
          const highlighted = isNodeHighlighted(n)
          return (
            <motion.line
              key={`line-${n.id}`}
              x1={cx}
              y1={cy}
              x2={n.px}
              y2={n.py}
              stroke={resolvedColors[n.group] || '#666'}
              strokeOpacity={hovered ? (highlighted ? 0.25 : 0.03) : 0.08}
              strokeWidth={hovered?.id === n.id ? 1.5 : 0.5}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, delay: 0.1 + i * 0.02 }}
            />
          )
        })}

        {/* Intra-group connections (connect neighbors) */}
        {Object.keys(GROUP_CONFIG).map(groupKey => {
          const groupNodes = nodes.filter(n => n.group === groupKey)
          if (groupNodes.length < 2) return null
          return groupNodes.map((n, i) => {
            const next = groupNodes[(i + 1) % groupNodes.length]
            const highlighted = hovered
              ? (isNodeHighlighted(n) && isNodeHighlighted(next))
              : true
            return (
              <motion.line
                key={`intra-${groupKey}-${i}`}
                x1={n.px}
                y1={n.py}
                x2={next.px}
                y2={next.py}
                stroke={resolvedColors[groupKey] || '#666'}
                strokeOpacity={highlighted ? 0.06 : 0.02}
                strokeWidth={0.5}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.6, delay: 0.4 + i * 0.03 }}
              />
            )
          })
        })}

        {/* Inter-group connections */}
        {visibleConnections.map((conn, i) => {
          const style = CONNECTION_STYLES[conn.type]
          const highlighted = isConnectionHighlighted(conn)
          const fromNode = nodes.find(n => n.id === conn.from.id)
          const toNode = nodes.find(n => n.id === conn.to.id)
          if (!fromNode || !toNode) return null

          // Curved path for better visuals
          const midX = (fromNode.px + toNode.px) / 2
          const midY = (fromNode.py + toNode.py) / 2
          const dx = toNode.px - fromNode.px
          const dy = toNode.py - fromNode.py
          const dist = Math.sqrt(dx * dx + dy * dy)
          const curvature = dist * 0.15
          const nx = -dy / dist * curvature
          const ny = dx / dist * curvature
          const ctrlX = midX + nx
          const ctrlY = midY + ny

          const connColor = conn.type === 'mentor' ? '#F59E0B'
            : conn.type === 'area' ? (AREA_COLORS[fromNode.area_investigacion] || '#00D1FF')
            : '#6b7280'

          return (
            <motion.path
              key={`inter-${i}`}
              d={`M ${fromNode.px} ${fromNode.py} Q ${ctrlX} ${ctrlY} ${toNode.px} ${toNode.py}`}
              fill="none"
              stroke={connColor}
              strokeOpacity={hovered ? (highlighted ? style.opacity * 2.5 : style.opacity * 0.3) : style.opacity}
              strokeWidth={highlighted ? style.width * 1.5 : style.width}
              strokeDasharray={style.dash === 'none' ? undefined : style.dash}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 0.6 + i * 0.04 }}
            />
          )
        })}

        {/* Pulsing glow for new members */}
        {newMembers.map(m => {
          const node = nodes.find(n => n.id === m.id)
          if (!node) return null
          const color = AREA_COLORS[node.area_investigacion] || '#00D1FF'
          return (
            <circle
              key={`glow-${m.id}`}
              cx={node.px}
              cy={node.py}
              r={nodeRadius + 6}
              fill="none"
              stroke={color}
              strokeWidth={2}
              opacity={0.4}
            >
              <animate
                attributeName="r"
                values={`${nodeRadius + 4};${nodeRadius + 14};${nodeRadius + 4}`}
                dur="2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.4;0.1;0.4"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
          )
        })}
      </svg>

      {/* Center hub node */}
      <motion.div
        className="absolute z-20 flex items-center justify-center rounded-full font-title font-bold text-white text-xs"
        style={{
          width: 56,
          height: 56,
          left: cx - 28,
          top: cy - 28,
          background: 'linear-gradient(135deg, var(--c-primary), var(--c-accent))',
          boxShadow: '0 0 30px rgba(252,101,31,0.25), 0 0 60px rgba(252,101,31,0.1)',
          border: '2px solid rgba(255,255,255,0.15)',
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', bounce: 0.4, delay: 0.1 }}
      >
        <span className="text-[10px] leading-tight text-center">DivergencIA</span>
      </motion.div>

      {/* Member nodes */}
      {nodes.map((n, i) => {
        const color = resolvedColors[n.group] || '#666'
        const isHovered = hovered?.id === n.id
        const isSelected = selected?.id === n.id
        const highlighted = isNodeHighlighted(n)
        const isNew = isNewMember(n)
        const isDragging = dragState?.id === n.id

        return (
          <motion.div
            key={n.id}
            className="absolute z-10"
            style={{
              left: n.px - nodeRadius,
              top: n.py - nodeRadius,
              width: nodeRadius * 2,
              height: nodeRadius * 2,
              cursor: isAdmin ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
              opacity: hovered ? (highlighted ? 1 : 0.25) : 1,
              transition: 'opacity 0.2s ease',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: hovered ? (highlighted ? 1 : 0.25) : 1 }}
            transition={{ type: 'spring', bounce: 0.35, delay: 0.15 + i * 0.025 }}
            onMouseEnter={() => { if (!dragState) setHovered(n) }}
            onMouseLeave={() => { if (!dragState) setHovered(null) }}
            onMouseDown={(e) => handleDragStart(e, n)}
            onClick={(e) => {
              e.stopPropagation()
              if (!dragState) setSelected(prev => prev?.id === n.id ? null : n)
            }}
            onDoubleClick={(e) => {
              e.stopPropagation()
              navigate(`/members/${n.id}`)
            }}
          >
            {/* Bienvenido badge for new members */}
            {isNew && (
              <div
                className="absolute -top-5 left-1/2 text-[8px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap pointer-events-none"
                style={{
                  transform: 'translateX(-50%)',
                  background: 'rgba(0,209,255,0.15)',
                  color: '#00D1FF',
                  border: '1px solid rgba(0,209,255,0.3)',
                }}
              >
                ¡Bienvenido!
              </div>
            )}

            {n.foto_url ? (
              <img
                src={n.foto_url}
                alt={n.nombre}
                className="w-full h-full rounded-full object-cover"
                style={{
                  border: `2px solid ${color}`,
                  boxShadow: isHovered || isSelected
                    ? `0 0 20px ${color}80`
                    : isNew
                    ? `0 0 12px rgba(0,209,255,0.4)`
                    : `0 0 8px ${color}20`,
                  transform: isHovered ? 'scale(1.25)' : isSelected ? 'scale(1.15)' : 'scale(1)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
              />
            ) : (
              <div
                className="w-full h-full rounded-full flex items-center justify-center font-title font-semibold text-[10px]"
                style={{
                  background: `${color}25`,
                  border: `2px solid ${color}90`,
                  color,
                  boxShadow: isHovered || isSelected
                    ? `0 0 20px ${color}80`
                    : isNew
                    ? `0 0 12px rgba(0,209,255,0.4)`
                    : `0 0 8px ${color}20`,
                  transform: isHovered ? 'scale(1.25)' : isSelected ? 'scale(1.15)' : 'scale(1)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}
              >
                {getInitials(n.nombre)}
              </div>
            )}
          </motion.div>
        )
      })}

      {/* Hover Tooltip */}
      <AnimatePresence>
        {hovered && !selected && (
          <NodeTooltip key={`tip-${hovered.id}`} member={hovered} x={hovered.px} y={hovered.py} />
        )}
      </AnimatePresence>

      {/* Click Mini Profile popup */}
      <AnimatePresence>
        {selected && (
          <MiniProfile
            key={`profile-${selected.id}`}
            member={selected}
            x={selected.px}
            y={selected.py}
            color={resolvedColors[selected.group] || '#666'}
            containerW={dims.w}
            containerH={dims.h}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-white/30 text-sm">
          Sin miembros para visualizar
        </div>
      )}
    </div>
  )
}
