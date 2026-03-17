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
          background: 'rgba(0,209,255,0.12)',
          border: '1px solid rgba(0,209,255,0.25)',
          boxShadow: '0 0 14px rgba(0,209,255,0.15)',
          transform: 'rotate(45deg)',
        }}
      >
        <div style={{ transform: 'rotate(-45deg)' }} className="flex flex-col items-center">
          <FiStar size={12} className="text-[#00D1FF]" />
          {data.votes != null && (
            <span className="text-[7px] text-[#00D1FF]/70 font-mono mt-px">↑{data.votes}</span>
          )}
        </div>
      </div>
      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className="text-[8px] text-[#00D1FF]/60 max-w-[80px] truncate block text-center">{data.label}</span>
      </div>
      <Handle type="target" position={Position.Top} className="!bg-[#00D1FF] !w-1.5 !h-1.5 !border-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-[#00D1FF] !w-1.5 !h-1.5 !border-0" />
    </div>
  )
}

export default memo(IdeaNode)
