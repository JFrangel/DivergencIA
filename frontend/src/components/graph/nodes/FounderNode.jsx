import { memo } from 'react'
import { Handle, Position } from 'reactflow'

function FounderNode({ data }) {
  const initials = (data.label || '')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="relative group cursor-pointer">
      {/* Amber pulsing aura */}
      <div
        className="absolute -inset-2 rounded-full animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(245,158,11,0.25) 0%, transparent 70%)',
        }}
      />
      {/* Avatar */}
      <div
        className="relative w-12 h-12 rounded-full flex items-center justify-center font-title font-bold text-sm text-white z-10 ring-2 ring-[#F59E0B]/50"
        style={{
          background: 'linear-gradient(135deg, #F59E0B, #D97706)',
          boxShadow: '0 0 20px rgba(245,158,11,0.3)',
        }}
      >
        {initials}
      </div>
      {/* Crown indicator */}
      <div className="absolute -top-1 -right-1 text-[10px] z-20">👑</div>
      {/* Label */}
      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className="text-[9px] text-[#F59E0B]/80 font-medium">{data.label}</span>
      </div>
      <Handle type="target" position={Position.Top} className="!bg-[#F59E0B] !w-1.5 !h-1.5 !border-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-[#F59E0B] !w-1.5 !h-1.5 !border-0" />
    </div>
  )
}

export default memo(FounderNode)
