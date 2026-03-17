import { useMemo } from 'react'
import { motion } from 'framer-motion'

const NODE_COLORS = {
  task: '#FC651F',
  milestone: '#8B5CF6',
  decision: '#00D1FF',
}

const STATE_COLORS = {
  completada: '#22c55e',
  en_progreso: '#F59E0B',
  pendiente: '#6b7280',
}

/**
 * A minimap overview of workflow nodes for quick navigation.
 * Props:
 *   - nodes: React Flow nodes array
 *   - edges: React Flow edges array
 *   - onNodeClick: (nodeId) => void
 *   - activeNodeId: currently selected node ID
 */
export default function WorkflowMiniMap({ nodes = [], edges = [], onNodeClick, activeNodeId }) {
  // Calculate bounding box
  const { minX, minY, maxX, maxY, scale } = useMemo(() => {
    if (nodes.length === 0) return { minX: 0, minY: 0, maxX: 200, maxY: 200, scale: 1 }
    let mnX = Infinity, mnY = Infinity, mxX = -Infinity, mxY = -Infinity
    nodes.forEach(n => {
      const x = n.position?.x || 0
      const y = n.position?.y || 0
      if (x < mnX) mnX = x
      if (y < mnY) mnY = y
      if (x > mxX) mxX = x
      if (y > mxY) mxY = y
    })
    const w = mxX - mnX || 200
    const h = mxY - mnY || 200
    const s = Math.min(180 / w, 120 / h, 1)
    return { minX: mnX, minY: mnY, maxX: mxX, maxY: mxY, scale: s }
  }, [nodes])

  if (nodes.length === 0) {
    return (
      <div className="w-48 h-32 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center">
        <p className="text-[9px] text-white/15">Sin nodos</p>
      </div>
    )
  }

  return (
    <div className="w-48 h-32 rounded-xl bg-black/40 backdrop-blur-sm border border-white/[0.08] p-2 relative overflow-hidden">
      <p className="text-[8px] text-white/20 uppercase tracking-wider mb-1">Minimap</p>
      <svg className="w-full h-full" viewBox={`${minX * scale - 10} ${minY * scale - 10} ${(maxX - minX) * scale + 20} ${(maxY - minY) * scale + 20}`}>
        {/* Edges */}
        {edges.map(e => {
          const source = nodes.find(n => n.id === e.source)
          const target = nodes.find(n => n.id === e.target)
          if (!source || !target) return null
          return (
            <line
              key={e.id}
              x1={(source.position?.x || 0) * scale}
              y1={(source.position?.y || 0) * scale}
              x2={(target.position?.x || 0) * scale}
              y2={(target.position?.y || 0) * scale}
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={0.5}
            />
          )
        })}

        {/* Nodes */}
        {nodes.map(n => {
          const x = (n.position?.x || 0) * scale
          const y = (n.position?.y || 0) * scale
          const color = STATE_COLORS[n.data?.estado] || NODE_COLORS[n.type] || '#6b7280'
          const isActive = n.id === activeNodeId

          return (
            <g key={n.id} onClick={() => onNodeClick?.(n.id)} className="cursor-pointer">
              <circle
                cx={x}
                cy={y}
                r={isActive ? 4 : 3}
                fill={color}
                opacity={isActive ? 1 : 0.6}
              />
              {isActive && (
                <circle
                  cx={x}
                  cy={y}
                  r={6}
                  fill="none"
                  stroke={color}
                  strokeWidth={0.5}
                  opacity={0.5}
                />
              )}
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="absolute bottom-1.5 left-2 flex gap-2">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-0.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
            <span className="text-[7px] text-white/20 capitalize">{type === 'task' ? 'T' : type === 'milestone' ? 'M' : 'D'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
