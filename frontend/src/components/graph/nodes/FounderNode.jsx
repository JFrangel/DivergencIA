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
          background: 'radial-gradient(circle, color-mix(in srgb, var(--c-primary) 25%, transparent) 0%, transparent 70%)',
        }}
      />
      {/* Avatar */}
      <div
        className="relative w-12 h-12 rounded-full flex items-center justify-center font-title font-bold text-sm text-white z-10"
        style={{
          background: 'linear-gradient(135deg, var(--c-primary), var(--c-secondary))',
          boxShadow: '0 0 20px color-mix(in srgb, var(--c-primary) 30%, transparent)',
          outline: '2px solid color-mix(in srgb, var(--c-primary) 50%, transparent)',
          outlineOffset: '0px',
        }}
      >
        {initials}
      </div>
      {/* Crown indicator */}
      <div className="absolute -top-1 -right-1 text-[10px] z-20">👑</div>
      {/* Label */}
      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className="text-[9px] font-medium" style={{ color: 'var(--c-primary)', opacity: 0.8 }}>{data.label}</span>
      </div>
      <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !border-0" style={{ background: 'var(--c-primary)' }} />
      <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !border-0" style={{ background: 'var(--c-primary)' }} />
    </div>
  )
}

export default memo(FounderNode)
