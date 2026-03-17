import { useMemo } from 'react'
import ReactFlow, { MiniMap, Background } from 'reactflow'
import 'reactflow/dist/style.css'
import { motion } from 'framer-motion'

const AREA_COLORS = {
  NLP: '#8b5cf6',
  Vision: '#3b82f6',
  Datos: '#22c55e',
  Robotica: '#f59e0b',
}

function getAreaColor(area) {
  return AREA_COLORS[area] || '#6b7280'
}

function truncate(str, max = 30) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '...' : str
}

function buildNodesAndEdges(ideas) {
  const centerNode = {
    id: 'hub',
    type: 'default',
    position: { x: 0, y: 0 },
    data: { label: 'Banco de Ideas' },
    style: {
      background: 'rgba(139,92,246,0.15)',
      border: '1px solid rgba(139,92,246,0.4)',
      borderRadius: '12px',
      color: '#e2e8f0',
      fontWeight: 700,
      fontSize: '13px',
      padding: '10px 18px',
    },
  }

  const count = ideas.length || 1
  const radius = Math.max(180, count * 28)

  const ideaNodes = ideas.map((idea, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2
    const color = getAreaColor(idea.area_relacionada)

    return {
      id: String(idea.id),
      type: 'default',
      position: {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      },
      data: {
        label: `${truncate(idea.titulo)}\n+${idea.votos_favor ?? 0}`,
      },
      style: {
        background: `${color}18`,
        border: `1px solid ${color}66`,
        borderRadius: '10px',
        color: '#e2e8f0',
        fontSize: '11px',
        padding: '8px 12px',
        whiteSpace: 'pre-line',
        textAlign: 'center',
        maxWidth: '160px',
      },
    }
  })

  const edges = ideas.map((idea) => ({
    id: `hub-${idea.id}`,
    source: 'hub',
    target: String(idea.id),
    style: { stroke: getAreaColor(idea.area_relacionada), strokeOpacity: 0.35 },
    animated: idea.estado === 'en_revision',
  }))

  return { nodes: [centerNode, ...ideaNodes], edges }
}

export default function ConceptMap({ ideas = [] }) {
  const { nodes, edges } = useMemo(() => buildNodesAndEdges(ideas), [ideas])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="h-[500px] w-full rounded-xl overflow-hidden border border-white/[0.06]"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background color="#ffffff08" gap={20} />
        <MiniMap
          nodeColor={(n) => {
            if (n.id === 'hub') return '#8b5cf6'
            const idea = ideas.find((i) => String(i.id) === n.id)
            return idea ? getAreaColor(idea.area_relacionada) : '#6b7280'
          }}
          maskColor="rgba(0,0,0,0.7)"
          className="!bg-white/[0.03] !border-white/[0.06] rounded-lg"
        />
      </ReactFlow>
    </motion.div>
  )
}
