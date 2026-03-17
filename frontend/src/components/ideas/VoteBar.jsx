import { motion } from 'framer-motion'
import { FiThumbsUp, FiThumbsDown } from 'react-icons/fi'

export default function VoteBar({ favor = 0, contra = 0, myVote, onVote, disabled }) {
  const total = favor + contra
  const pct = total ? Math.round((favor / total) * 100) : 50

  return (
    <div className="space-y-2">
      {/* Bar */}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #22c55e, #4ade80)' }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      {/* Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onVote?.('favor')}
          disabled={disabled}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${
            myVote === 'favor'
              ? 'bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30'
              : 'text-white/30 hover:text-[#22c55e] hover:bg-[#22c55e]/10'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <FiThumbsUp size={12} />
          <span>{favor}</span>
        </button>

        <span className="text-[10px] text-white/20 font-mono">{pct}% a favor</span>

        <button
          onClick={() => onVote?.('contra')}
          disabled={disabled}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${
            myVote === 'contra'
              ? 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
              : 'text-white/30 hover:text-[#EF4444] hover:bg-[#EF4444]/10'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <span>{contra}</span>
          <FiThumbsDown size={12} />
        </button>
      </div>
    </div>
  )
}
