import { useCallback, useState, useEffect, useRef, useMemo } from 'react'
import ReactFlow, {
  ReactFlowProvider, Background, MiniMap,
  useReactFlow, useNodesState, useEdgesState, Handle, Position,
} from 'reactflow'
import 'reactflow/dist/style.css'
import GraphControls from './GraphControls'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiExternalLink, FiUsers, FiFolder, FiStar, FiZap, FiLink, FiUser } from 'react-icons/fi'
import { Link, useNavigate } from 'react-router-dom'

/* ──────── Area colors ──────── */
const AREA_COLOR = {
  ML: '#FC651F', NLP: '#8B5CF6', Vision: '#00D1FF', Datos: '#22c55e', General: '#F59E0B',
  default: '#6b7280',
}
function ac(area) { return AREA_COLOR[area] || AREA_COLOR.default }

/* ──────── Custom Nodes ──────── */
function HubNode({ data }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 80, height: 80 }}>
      <Handle type="source" position={Position.Right} className="opacity-0" />
      {/* Outer ring */}
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-[#FC651F]/40"
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.2, 0.6] }}
        transition={{ repeat: Infinity, duration: 3 }}
      />
      <motion.div
        className="absolute inset-2 rounded-full border border-[#8B5CF6]/30"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ repeat: Infinity, duration: 2.5, delay: 0.5 }}
      />
      {/* Core */}
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center z-10"
        style={{
          background: 'linear-gradient(135deg, #FC651F, #8B5CF6)',
          boxShadow: '0 0 20px rgba(252,101,31,0.5)',
        }}
      >
        <FiZap size={22} className="text-white" />
      </div>
    </div>
  )
}

function MemberNode({ data }) {
  const color = ac(data.area)
  return (
    <div
      className="px-3 py-2 rounded-xl text-xs font-medium text-white text-center max-w-[110px]"
      style={{ background: `${color}15`, border: `1px solid ${color}40`, minWidth: 80 }}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center mx-auto mb-1 text-[11px] font-bold"
        style={{ background: `${color}25`, color }}
      >
        {(data.label || '?')[0]}
      </div>
      <p className="truncate text-white/80 text-[11px]">{data.label}</p>
      {data.area && <p className="text-[9px] mt-0.5" style={{ color: `${color}80` }}>{data.area}</p>}
    </div>
  )
}

function FounderNode({ data }) {
  return (
    <div
      className="px-3 py-2 rounded-xl text-xs font-medium text-white text-center max-w-[120px]"
      style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.5)', minWidth: 90 }}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />
      <motion.div
        className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1 text-[11px] font-bold text-[#F59E0B]"
        style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)' }}
        animate={{ boxShadow: ['0 0 6px rgba(245,158,11,0.3)', '0 0 14px rgba(245,158,11,0.6)', '0 0 6px rgba(245,158,11,0.3)'] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        {(data.label || '?')[0]}
      </motion.div>
      <p className="truncate text-[#F59E0B]/90 text-[11px] font-semibold">{data.label}</p>
      <p className="text-[9px] text-[#F59E0B]/50 mt-0.5">Fundador</p>
    </div>
  )
}

function ProjectNode({ data }) {
  const STATE_COLOR = { desarrollo: '#FC651F', finalizado: '#22c55e', pausa: '#F59E0B', cancelado: '#EF4444', idea: '#8B5CF6', default: '#6b7280' }
  const color = STATE_COLOR[data.estado] || STATE_COLOR.default
  return (
    <div
      className="px-3 py-2 rounded-lg text-[11px] max-w-[130px]"
      style={{ background: `${color}10`, border: `1px solid ${color}35` }}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <Handle type="source" position={Position.Right} className="opacity-0" />
      <div className="flex items-center gap-1.5 mb-1">
        <FiFolder size={10} style={{ color }} />
        <span style={{ color, fontSize: 9 }}>{data.estado}</span>
      </div>
      <p className="text-white/70 truncate font-medium" style={{ maxWidth: 110 }}>{data.label}</p>
    </div>
  )
}

function IdeaNode({ data }) {
  return (
    <div
      className="px-3 py-2 rounded-xl text-[11px] max-w-[120px]"
      style={{ background: 'rgba(0,209,255,0.08)', border: '1px solid rgba(0,209,255,0.25)' }}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <div className="flex items-center gap-1 mb-1">
        <FiStar size={9} className="text-[#00D1FF]/60" />
        <span className="text-[#00D1FF]/50 text-[9px]">{data.votos}</span>
      </div>
      <p className="text-white/60 truncate" style={{ maxWidth: 100 }}>{data.label}</p>
    </div>
  )
}

const nodeTypes = {
  hub: HubNode,
  member: MemberNode,
  founder: FounderNode,
  project: ProjectNode,
  idea: IdeaNode,
}

/* ──────── Detail Panel ──────── */
function DetailPanel({ node, onClose }) {
  if (!node) return null
  const { type, data } = node

  const ICON = { hub: FiZap, member: FiUsers, founder: FiUsers, project: FiFolder, idea: FiStar }
  const Icon = ICON[type] || FiZap

  const HREF = {
    member: data.id ? `/members/${data.id}` : null,
    founder: data.id ? `/members/${data.id}` : null,
    project: data.id ? `/projects/${data.id}` : null,
  }

  return (
    <motion.div
      className="absolute right-4 top-4 z-10 glass rounded-2xl p-5 w-64 shadow-2xl"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      <button
        className="absolute top-3 right-3 text-white/30 hover:text-white transition-colors"
        onClick={onClose}
      >
        <FiX size={14} />
      </button>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-lg bg-[#FC651F]/15 text-[#FC651F] flex items-center justify-center">
          <Icon size={15} />
        </div>
        <div>
          <p className="text-[10px] text-white/30 capitalize">{type}</p>
          <p className="text-sm font-semibold text-white">{data.label}</p>
        </div>
      </div>

      {data.area && <p className="text-xs text-white/40 mb-2">Area: {data.area}</p>}
      {data.estado && <p className="text-xs text-white/40 mb-2">Estado: {data.estado}</p>}
      {data.votos !== undefined && <p className="text-xs text-white/40 mb-2">Votos: {data.votos}</p>}

      {HREF[type] && (
        <Link to={HREF[type]} className="mt-3 flex items-center gap-1.5 text-[11px] text-[#FC651F] hover:text-[#FC651F]/80 transition-colors">
          <FiExternalLink size={11} /> Ver detalle
        </Link>
      )}
    </motion.div>
  )
}

/* ──────── Context Menu ──────── */
function ContextMenu({ x, y, node, onClose }) {
  const navigate = useNavigate()
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  if (!node) return null
  const { type, data } = node

  const HREF = {
    member: data.id ? `/members/${data.id}` : null,
    founder: data.id ? `/members/${data.id}` : null,
    project: data.id ? `/projects/${data.id}` : null,
  }

  const items = []
  if (HREF[type]) {
    items.push({ label: 'Ver perfil', icon: FiUser, action: () => navigate(HREF[type]) })
  }
  if (type === 'member' || type === 'founder') {
    items.push({ label: 'Ver proyectos', icon: FiFolder, action: () => navigate('/projects') })
    items.push({ label: 'Conectar con...', icon: FiLink, action: () => navigate('/projects') })
  }
  if (type === 'project') {
    items.push({ label: 'Ver proyecto', icon: FiFolder, action: () => navigate(`/projects/${data.id}`) })
  }

  return (
    <motion.div
      ref={menuRef}
      className="fixed z-50 py-1.5 min-w-[160px] rounded-xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl"
      style={{ left: x, top: y }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.12 }}
    >
      <div className="px-3 py-1.5 border-b border-white/[0.06]">
        <p className="text-[10px] text-white/30 capitalize">{type}</p>
        <p className="text-xs text-white font-medium truncate">{data.label}</p>
      </div>
      {items.map((item, i) => (
        <button
          key={i}
          onClick={() => { item.action(); onClose() }}
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
        >
          <item.icon size={12} /> {item.label}
        </button>
      ))}
    </motion.div>
  )
}

/* ──────── Layout algorithms ──────── */

/**
 * Build an adjacency list from edges, returning { adjacency, edgeMap }
 */
function buildAdjacency(nodes, edges) {
  const adjacency = {}
  nodes.forEach(n => { adjacency[n.id] = [] })
  edges.forEach(e => {
    if (adjacency[e.source]) adjacency[e.source].push(e.target)
    if (adjacency[e.target]) adjacency[e.target].push(e.source)
  })
  return adjacency
}

/**
 * BFS from a root node, returns Map<nodeId, depth>
 */
function bfs(rootId, adjacency) {
  const visited = new Map()
  const queue = [rootId]
  visited.set(rootId, 0)
  while (queue.length > 0) {
    const current = queue.shift()
    const depth = visited.get(current)
    const neighbors = adjacency[current] || []
    for (const nb of neighbors) {
      if (!visited.has(nb)) {
        visited.set(nb, depth + 1)
        queue.push(nb)
      }
    }
  }
  return visited
}

/**
 * Radial layout: concentric circles from center hub.
 * Hub at (0,0), each depth level at increasing radius.
 */
function applyRadialLayout(nodes, edges) {
  const adjacency = buildAdjacency(nodes, edges)
  const hubNode = nodes.find(n => n.type === 'hub')
  const rootId = hubNode ? hubNode.id : nodes[0]?.id
  if (!rootId) return nodes

  const depths = bfs(rootId, adjacency)

  // Group nodes by depth
  const levels = {}
  depths.forEach((depth, id) => {
    if (!levels[depth]) levels[depth] = []
    levels[depth].push(id)
  })

  // Any unvisited nodes go to the outermost ring
  const maxDepth = Math.max(...Object.keys(levels).map(Number), 0)
  nodes.forEach(n => {
    if (!depths.has(n.id)) {
      const ring = maxDepth + 1
      if (!levels[ring]) levels[ring] = []
      levels[ring].push(n.id)
    }
  })

  const RADIUS_STEP = 250
  const positionMap = {}

  Object.entries(levels).forEach(([depthStr, ids]) => {
    const depth = Number(depthStr)
    if (depth === 0) {
      ids.forEach(id => { positionMap[id] = { x: 0, y: 0 } })
      return
    }
    const radius = depth * RADIUS_STEP
    const angleStep = (2 * Math.PI) / ids.length
    ids.forEach((id, i) => {
      const angle = i * angleStep - Math.PI / 2
      positionMap[id] = {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      }
    })
  })

  return nodes.map(n => ({
    ...n,
    position: positionMap[n.id] || n.position,
  }))
}

/**
 * Tree layout: hierarchical top-down from hub.
 * Each depth is a horizontal row, nodes spaced evenly.
 */
function applyTreeLayout(nodes, edges) {
  const adjacency = buildAdjacency(nodes, edges)
  const hubNode = nodes.find(n => n.type === 'hub')
  const rootId = hubNode ? hubNode.id : nodes[0]?.id
  if (!rootId) return nodes

  const depths = bfs(rootId, adjacency)

  // Group by depth
  const levels = {}
  depths.forEach((depth, id) => {
    if (!levels[depth]) levels[depth] = []
    levels[depth].push(id)
  })

  const maxDepth = Math.max(...Object.keys(levels).map(Number), 0)
  nodes.forEach(n => {
    if (!depths.has(n.id)) {
      const ring = maxDepth + 1
      if (!levels[ring]) levels[ring] = []
      levels[ring].push(n.id)
    }
  })

  const LEVEL_HEIGHT = 200
  const NODE_SPACING = 180
  const positionMap = {}

  Object.entries(levels).forEach(([depthStr, ids]) => {
    const depth = Number(depthStr)
    const y = depth * LEVEL_HEIGHT
    const totalWidth = (ids.length - 1) * NODE_SPACING
    const startX = -totalWidth / 2
    ids.forEach((id, i) => {
      positionMap[id] = { x: startX + i * NODE_SPACING, y }
    })
  })

  return nodes.map(n => ({
    ...n,
    position: positionMap[n.id] || n.position,
  }))
}

/**
 * Apply the selected layout to a set of nodes.
 * 'force' keeps the original positions from useGraph (default radial-ish layout).
 */
function applyLayout(layout, originalNodes, edges) {
  if (layout === 'radial') return applyRadialLayout(originalNodes, edges)
  if (layout === 'tree') return applyTreeLayout(originalNodes, edges)
  // 'force' — return original positions from useGraph
  return originalNodes
}

/* ──────── Graph Controls Wrapper (must be inside ReactFlowProvider) ──────── */
function GraphControlsWrapper({ layout, onLayoutChange, onToggleFullscreen }) {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  return (
    <GraphControls
      onZoomIn={zoomIn}
      onZoomOut={zoomOut}
      onFitView={fitView}
      onToggleFullscreen={onToggleFullscreen}
      layout={layout}
      onLayoutChange={onLayoutChange}
    />
  )
}

/* ──────── Focus on highlighted node ──────── */
function FocusNode({ highlightedNodeId }) {
  const { setCenter, getNode } = useReactFlow()

  useEffect(() => {
    if (!highlightedNodeId) return
    const node = getNode(highlightedNodeId)
    if (node) {
      const x = node.position.x + (node.width || 100) / 2
      const y = node.position.y + (node.height || 50) / 2
      setCenter(x, y, { zoom: 1.2, duration: 600 })
    }
  }, [highlightedNodeId, setCenter, getNode])

  return null
}

/* ──────── FitView helper — auto fit after layout change ──────── */
function FitAfterLayout({ layoutKey }) {
  const { fitView } = useReactFlow()
  useEffect(() => {
    // Small delay to let React Flow measure new positions
    const t = setTimeout(() => fitView({ padding: 0.15, duration: 400 }), 50)
    return () => clearTimeout(t)
  }, [layoutKey, fitView])
  return null
}

/* ──────── Inner graph (must be inside ReactFlowProvider) ──────── */
function InnerGraph({ initialNodes, initialEdges, highlightedNodeId, layout, onLayoutChange }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [contextMenu, setContextMenu] = useState(null)
  const prevLayoutRef = useRef(layout)

  // Sync nodes/edges when layout, initialNodes, or initialEdges change
  useEffect(() => {
    const safeNodes = initialNodes || []
    const safeEdges = initialEdges || []
    if (safeNodes.length === 0) {
      setNodes([])
      setEdges(safeEdges)
      return
    }
    const laidOut = applyLayout(layout, safeNodes, safeEdges)
    // Add draggable: true to each node
    setNodes(laidOut.map(n => ({ ...n, draggable: true })))
    setEdges(safeEdges)
    prevLayoutRef.current = layout
  }, [layout, initialNodes, initialEdges, setNodes, setEdges])

  const onNodeClick = useCallback((_, node) => {
    setContextMenu(null)
    setSelectedNode(node)
  }, [])

  const onNodeContextMenu = useCallback((event, node) => {
    event.preventDefault()
    setSelectedNode(null)
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      node,
    })
  }, [])

  const onPaneClick = useCallback(() => {
    setContextMenu(null)
  }, [])

  // Track layout + node count for FitAfterLayout
  const layoutKey = `${layout}-${nodes.length}-${edges.length}`

  return (
    <div
      className="w-full h-full"
      style={isFullscreen ? {
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'var(--c-bg)',
        borderRadius: 0,
      } : { position: 'relative', width: '100%', height: '100%' }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onNodeContextMenu={onNodeContextMenu}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        nodesDraggable
        nodesConnectable
        elementsSelectable
        panOnDrag
        zoomOnScroll
        zoomOnPinch
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.15}
        maxZoom={2}
        style={{ background: 'transparent' }}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#ffffff08" gap={40} size={1} />
        <GraphControlsWrapper
          layout={layout}
          onLayoutChange={onLayoutChange}
          onToggleFullscreen={() => setIsFullscreen(f => !f)}
        />
        <FocusNode highlightedNodeId={highlightedNodeId} />
        <FitAfterLayout layoutKey={layoutKey} />
        <MiniMap
          nodeColor={n => {
            const type = n.type
            if (type === 'hub') return '#FC651F'
            if (type === 'founder') return '#F59E0B'
            if (type === 'project') return '#8B5CF6'
            if (type === 'idea') return '#00D1FF'
            return '#6b7280'
          }}
          style={{
            background: 'rgba(6,3,4,0.9)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
          }}
          maskColor="rgba(6,3,4,0.7)"
        />
      </ReactFlow>

      <AnimatePresence>
        {selectedNode && (
          <DetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            node={contextMenu.node}
            onClose={() => setContextMenu(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ──────── Main ──────── */
export default function UniversalGraph({ initialNodes, initialEdges, highlightedNodeId }) {
  const [layout, setLayout] = useState('force')

  const handleLayoutChange = useCallback((newLayout) => {
    setLayout(newLayout)
  }, [])

  return (
    <div className="relative w-full h-full">
      <ReactFlowProvider>
        <InnerGraph
          initialNodes={initialNodes}
          initialEdges={initialEdges}
          highlightedNodeId={highlightedNodeId}
          layout={layout}
          onLayoutChange={handleLayoutChange}
        />
      </ReactFlowProvider>
    </div>
  )
}
