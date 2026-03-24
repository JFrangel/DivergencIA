import { motion } from 'framer-motion'
import { FiBookOpen, FiCheckCircle, FiAward, FiTrendingUp } from 'react-icons/fi'

const statItems = [
  { key: 'started', icon: FiBookOpen, label: 'En progreso', color: 'var(--c-accent)' },
  { key: 'completed', icon: FiCheckCircle, label: 'Completados', color: '#22c55e' },
  { key: 'sections', icon: FiTrendingUp, label: 'Secciones', color: 'var(--c-primary)' },
  { key: 'quizAvg', icon: FiAward, label: 'Prom. Quiz', color: 'var(--c-secondary)' },
]

export default function LearningStatsBar({ topicsStarted = 0, topicsCompleted = 0, totalSectionsCompleted = 0, averageQuizScore = 0 }) {
  const values = {
    started: topicsStarted,
    completed: topicsCompleted,
    sections: totalSectionsCompleted,
    quizAvg: averageQuizScore > 0 ? `${averageQuizScore}%` : '—',
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {statItems.map((item, i) => (
        <motion.div
          key={item.key}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.3 }}
          className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 flex items-center gap-3"
        >
          <span
            className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
            style={{
              background: `color-mix(in srgb, ${item.color} 15%, transparent)`,
              color: item.color,
            }}
          >
            <item.icon size={18} />
          </span>
          <div>
            <p className="text-lg font-bold text-white leading-tight">{values[item.key]}</p>
            <p className="text-[10px] text-white/40 uppercase tracking-wider">{item.label}</p>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
