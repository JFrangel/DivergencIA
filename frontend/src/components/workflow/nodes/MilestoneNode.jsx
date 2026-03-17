import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { FiFlag } from 'react-icons/fi'
import { motion } from 'framer-motion'

function MilestoneNode({ data }) {
  const completed = data.completed
  const color = completed ? '#22c55e' : 'var(--c-secondary)'

  return (
    <div className="relative flex items-center justify-center" style={{ width: 64, height: 64 }}>
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-white/20 !border-white/10" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-white/20 !border-white/10" />

      {/* Pulsing ring */}
      {!completed && (
        <motion.div
          className="absolute inset-0 rounded-xl border"
          style={{ borderColor: `color-mix(in srgb, ${color} 20%, transparent)` }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.15, 0.5] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
        />
      )}

      {/* Diamond shape via rotated square */}
      <div
        className="w-11 h-11 rotate-45 rounded-lg flex items-center justify-center z-10"
        style={{
          background: `color-mix(in srgb, ${color} 8%, transparent)`,
          border: `1.5px solid color-mix(in srgb, ${color} 30%, transparent)`,
        }}
      >
        <FiFlag size={14} className="-rotate-45" style={{ color }} />
      </div>

      {/* Label below */}
      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <p className="text-[10px] text-white/50 font-medium text-center">{data.label}</p>
      </div>
    </div>
  )
}

export default memo(MilestoneNode)
