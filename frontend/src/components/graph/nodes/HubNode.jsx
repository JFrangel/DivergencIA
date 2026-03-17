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
          background: 'radial-gradient(circle, rgba(252,101,31,0.3) 0%, transparent 70%)',
        }}
      />
      {/* Inner animated ring */}
      <div
        className="absolute -inset-1.5 rounded-full"
        style={{
          background: 'conic-gradient(from 0deg, #FC651F, #8B5CF6, #00D1FF, #FC651F)',
          animation: 'spin 6s linear infinite',
          opacity: 0.6,
        }}
      />
      {/* Core */}
      <div
        className="relative w-16 h-16 rounded-full flex items-center justify-center z-10"
        style={{
          background: 'linear-gradient(135deg, #FC651F, #8B5CF6)',
          boxShadow: '0 0 30px rgba(252,101,31,0.4), 0 0 60px rgba(139,92,246,0.2)',
        }}
      >
        <FiZap size={24} className="text-white" />
      </div>
      {/* Label */}
      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className="text-[10px] font-title font-bold text-white/80">
          {data.label || 'DivergencIA'}
        </span>
      </div>
      <Handle type="source" position={Position.Top} className="!bg-[#FC651F] !w-2 !h-2 !border-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-[#8B5CF6] !w-2 !h-2 !border-0" id="bottom" />
      <Handle type="source" position={Position.Left} className="!bg-[#00D1FF] !w-2 !h-2 !border-0" id="left" />
      <Handle type="source" position={Position.Right} className="!bg-[#00D1FF] !w-2 !h-2 !border-0" id="right" />
    </div>
  )
}

export default memo(HubNode)
