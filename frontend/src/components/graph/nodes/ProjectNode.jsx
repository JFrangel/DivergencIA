import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { FiFolder } from 'react-icons/fi'

const STATE_COLORS = {
  idea: '#F59E0B',
  desarrollo: '#FC651F',
  investigacion: '#8B5CF6',
  pruebas: '#00D1FF',
  finalizado: '#22c55e',
  cancelado: '#EF4444',
  pausa: '#6b7280',
}

function ProjectNode({ data }) {
  const color = STATE_COLORS[data.estado] || '#888'

  return (
    <div className="relative group cursor-pointer">
      <div
        className="relative px-3 py-2 rounded-xl flex items-center gap-2 z-10 transition-all group-hover:scale-105"
        style={{
          background: 'rgba(8,4,4,0.9)',
          border: `1px solid ${color}40`,
          backdropFilter: 'blur(12px)',
          boxShadow: `0 0 16px ${color}15`,
        }}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${color}20` }}
        >
          <FiFolder size={13} style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-white/80 truncate max-w-[100px]">{data.label}</p>
          <p className="text-[8px] capitalize" style={{ color: `${color}cc` }}>{data.estado}</p>
        </div>
      </div>
      <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !border-0" style={{ background: color }} />
      <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !border-0" style={{ background: color }} />
    </div>
  )
}

export default memo(ProjectNode)
