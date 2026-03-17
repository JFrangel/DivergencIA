import { motion } from 'framer-motion'
import Card from './Card'

export default function MetricCard({ label, value, change, changeLabel, color = 'var(--c-primary)', icon, className = '' }) {
  const isPositive = typeof change === 'number' ? change >= 0 : true

  return (
    <Card className={`shimmer ${className}`} hover>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-2">{label}</p>
          <motion.p
            className="text-3xl font-bold font-title"
            style={{ color }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {value}
          </motion.p>
          {change !== undefined && (
            <p className={`text-xs mt-1.5 ${isPositive ? 'text-[#22c55e]' : 'text-[#EF4444]'}`}>
              {isPositive ? '↑' : '↓'} {Math.abs(change)}{changeLabel && ` ${changeLabel}`}
            </p>
          )}
        </div>
        {icon && (
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: `${color}15`, color }}
          >
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}
