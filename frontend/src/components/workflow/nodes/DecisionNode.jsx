import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { FiGitBranch } from 'react-icons/fi'

function DecisionNode({ data }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: 72, height: 72 }}>
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-white/20 !border-white/10" />
      <Handle type="source" position={Position.Right} id="yes" className="!w-2 !h-2 !bg-[#22c55e]/50 !border-[#22c55e]/30" style={{ top: '30%' }} />
      <Handle type="source" position={Position.Right} id="no" className="!w-2 !h-2 !bg-[#EF4444]/50 !border-[#EF4444]/30" style={{ top: '70%' }} />
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-white/20 !border-white/10" />

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
