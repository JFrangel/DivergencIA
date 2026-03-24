import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { FiGitBranch, FiEdit2 } from 'react-icons/fi'

function DecisionNode({ data }) {
  return (
    <div className="relative flex items-center justify-center group cursor-pointer" style={{ width: 72, height: 72 }}>
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-white/20 !border-white/10" />
      <Handle type="source" position={Position.Right} id="yes" className="!w-2 !h-2 !bg-[#22c55e]/50 !border-[#22c55e]/30" style={{ top: '30%' }} />
      <Handle type="source" position={Position.Right} id="no" className="!w-2 !h-2 !bg-[#EF4444]/50 !border-[#EF4444]/30" style={{ top: '70%' }} />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-white/20 !border-white/10" />

      {/* Edit hint on hover */}
      <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <div
          className="w-5 h-5 rounded-full flex items-center justify-center"
          style={{
            background: 'rgba(12,6,8,0.95)',
            border: '1px solid color-mix(in srgb, var(--c-accent) 30%, transparent)',
          }}
        >
          <FiEdit2 size={9} style={{ color: 'var(--c-accent)' }} />
        </div>
      </div>

      {/* Diamond */}
      <div
        className="w-12 h-12 rotate-45 rounded-md flex items-center justify-center"
        style={{
          background: 'color-mix(in srgb, var(--c-accent) 8%, transparent)',
          border: '1.5px solid color-mix(in srgb, var(--c-accent) 35%, transparent)',
        }}
      >
        <FiGitBranch size={14} className="-rotate-45" style={{ color: 'var(--c-accent)' }} />
      </div>

      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <p className="text-[10px] font-medium text-center" style={{ color: 'var(--c-accent)', opacity: 0.6 }}>{data.label || '?'}</p>
      </div>
    </div>
  )
}

export default memo(DecisionNode)
