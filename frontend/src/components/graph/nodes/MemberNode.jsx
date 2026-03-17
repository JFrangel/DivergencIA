import { memo } from 'react'
import { Handle, Position } from 'reactflow'

const AREA_COLORS = {
  ML: '#FC651F',
  NLP: '#8B5CF6',
  Vision: '#00D1FF',
  Datos: '#22c55e',
  General: '#F59E0B',
}

function MemberNode({ data }) {
  const color = AREA_COLORS[data.area] || '#888'
  const initials = (data.label || '')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="relative group cursor-pointer">
      {/* Glow based on activity */}
      {data.active && (
        <div
          className="absolute -inset-1.5 rounded-full opacity-30"
          style={{ background: `radial-gradient(circle, ${color}40 0%, transparent 70%)` }}
        />
      )}
      <div
        className="relative w-10 h-10 rounded-full flex items-center justify-center font-title font-semibold text-xs text-white z-10 transition-transform group-hover:scale-110"
        style={{
          background: `linear-gradient(135deg, ${color}, ${color}cc)`,
          boxShadow: `0 0 12px ${color}30`,
          border: `2px solid ${color}60`,
        }}
      >
        {initials}
      </div>
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className="text-[8px] text-white/50">{data.label}</span>
      </div>
      <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !border-0" style={{ background: color }} />
      <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !border-0" style={{ background: color }} />
    </div>
  )
}

export default memo(MemberNode)
