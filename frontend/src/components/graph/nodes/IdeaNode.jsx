import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { FiStar } from 'react-icons/fi'

function IdeaNode({ data }) {
  return (
    <div className="relative group cursor-pointer">
      {/* Hexagonal-ish shape using CSS */}
      <div
        className="relative w-11 h-11 rounded-lg flex items-center justify-center z-10 transition-transform group-hover:scale-110"
        style={{
          background: 'color-mix(in srgb, var(--c-accent) 12%, transparent)',
          border: '1px solid color-mix(in srgb, var(--c-accent) 25%, transparent)',
          boxShadow: '0 0 14px color-mix(in srgb, var(--c-accent) 15%, transparent)',
          transform: 'rotate(45deg)',
        }}
      >
        <div style={{ transform: 'rotate(-45deg)' }} className="flex flex-col items-center">
          <FiStar size={12} style={{ color: 'var(--c-accent)' }} />
          {data.votes != null && (
            <span className="text-[7px] font-mono mt-px" style={{ color: 'var(--c-accent)', opacity: 0.7 }}>↑{data.votes}</span>
          )}
        </div>
      </div>
      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className="text-[8px] max-w-[80px] truncate block text-center" style={{ color: 'var(--c-accent)', opacity: 0.6 }}>{data.label}</span>
      </div>
      <Handle type="target" position={Position.Top} className="!w-1.5 !h-1.5 !border-0" style={{ background: 'var(--c-accent)' }} />
      <Handle type="source" position={Position.Bottom} className="!w-1.5 !h-1.5 !border-0" style={{ background: 'var(--c-accent)' }} />
    </div>
  )
}

export default memo(IdeaNode)
