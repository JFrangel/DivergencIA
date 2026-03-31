import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { FiZap } from 'react-icons/fi'

function HubNode({ data }) {
  return (
    <div className="relative group">
      {/* Outer glow ring */}
      <div
        className="absolute -inset-3 rounded-full animate-pulse opacity-40"
        style={{
          background: 'radial-gradient(circle, color-mix(in srgb, var(--c-primary) 30%, transparent) 0%, transparent 70%)',
        }}
      />
      {/* Inner animated ring */}
      <div
        className="absolute -inset-1.5 rounded-full"
        style={{
          background: 'conic-gradient(from 0deg, var(--c-primary), var(--c-secondary), var(--c-accent), var(--c-primary))',
          animation: 'spin 6s linear infinite',
          opacity: 0.6,
        }}
      />
      {/* Core */}
      <div
        className="relative w-16 h-16 rounded-full flex items-center justify-center z-10"
        style={{
          background: 'linear-gradient(135deg, var(--c-primary), var(--c-secondary))',
          boxShadow: '0 0 30px color-mix(in srgb, var(--c-primary) 40%, transparent), 0 0 60px color-mix(in srgb, var(--c-secondary) 20%, transparent)',
        }}
      >
        <FiZap size={24} className="text-white" />
      </div>
      {/* Label */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className="text-[10px] font-title font-bold text-white/80">
          {data.label || 'ATHENIA'}
        </span>
      </div>
      <Handle type="source" position={Position.Top} className="!w-2 !h-2 !border-0" style={{ background: 'var(--c-primary)' }} />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !border-0" id="bottom" style={{ background: 'var(--c-secondary)' }} />
      <Handle type="source" position={Position.Left} className="!w-2 !h-2 !border-0" id="left" style={{ background: 'var(--c-accent)' }} />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !border-0" id="right" style={{ background: 'var(--c-accent)' }} />
    </div>
  )
}

export default memo(HubNode)
