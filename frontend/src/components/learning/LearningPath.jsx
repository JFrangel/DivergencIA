import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { FiCheck, FiLock, FiPlay } from 'react-icons/fi'

const NIVEL_ORDER = { basico: 0, intermedio: 1, avanzado: 2 }

const NIVEL_COLORS = {
  basico: '#22c55e',
  intermedio: '#F59E0B',
  avanzado: '#EF4444',
}

const NIVEL_LABELS = {
  basico: 'Basico',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
}

/**
 * Visual learning path showing topics grouped by level with connecting lines.
 * Shows prerequisite flow: basico → intermedio → avanzado
 */
export default function LearningPath({ topics, progressMap, onSelectTopic }) {
  // Group by nivel
  const levels = useMemo(() => {
    const groups = { basico: [], intermedio: [], avanzado: [] }
    topics.forEach(t => {
      const nivel = t.nivel || 'basico'
      if (groups[nivel]) groups[nivel].push(t)
    })
    return [
      { key: 'basico', label: NIVEL_LABELS.basico, color: NIVEL_COLORS.basico, topics: groups.basico },
      { key: 'intermedio', label: NIVEL_LABELS.intermedio, color: NIVEL_COLORS.intermedio, topics: groups.intermedio },
      { key: 'avanzado', label: NIVEL_LABELS.avanzado, color: NIVEL_COLORS.avanzado, topics: groups.avanzado },
    ]
  }, [topics])

  if (topics.length === 0) return null

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 overflow-x-auto">
      <h3 className="text-sm font-semibold text-white/70 mb-4 uppercase tracking-wider">
        Ruta de Aprendizaje
      </h3>

      <div className="flex items-start gap-3 min-w-[700px]">
        {levels.map((level, levelIdx) => (
          <div key={level.key} className="flex items-start gap-3 flex-1">
            {/* Level column */}
            <div className="flex-1 min-w-0">
              {/* Level header */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ background: level.color, boxShadow: `0 0 8px ${level.color}60` }}
                />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: level.color }}>
                  {level.label}
                </span>
                <span className="text-[10px] text-white/30">
                  ({level.topics.length})
                </span>
              </div>

              {/* Topic nodes */}
              <div className="space-y-2">
                {level.topics.length === 0 ? (
                  <p className="text-[11px] text-white/20 italic pl-5">Sin temas</p>
                ) : (
                  level.topics.map((topic, i) => {
                    const totalSections = Array.isArray(topic.contenido) ? topic.contenido.length : 0
                    const entry = progressMap[topic.id]
                    const completedCount = entry?.completedSections?.length || 0
                    const percent = totalSections > 0 ? Math.round((completedCount / totalSections) * 100) : 0
                    const isComplete = entry?.completed || false
                    const isStarted = completedCount > 0

                    return (
                      <motion.button
                        key={topic.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: levelIdx * 0.1 + i * 0.05 }}
                        onClick={() => onSelectTopic(topic)}
                        className="group w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 hover:bg-white/[0.06] border border-transparent hover:border-white/[0.1]"
                        style={{
                          background: isComplete
                            ? `${level.color}08`
                            : 'transparent',
                        }}
                      >
                        {/* Status icon */}
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 border transition-colors"
                          style={{
                            borderColor: isComplete ? level.color : isStarted ? `${level.color}60` : 'rgba(255,255,255,0.15)',
                            background: isComplete ? `${level.color}25` : 'transparent',
                          }}
                        >
                          {isComplete ? (
                            <FiCheck size={12} style={{ color: level.color }} />
                          ) : isStarted ? (
                            <FiPlay size={10} style={{ color: level.color }} />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
                          )}
                        </span>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white/80 truncate group-hover:text-white transition-colors">
                            {topic.titulo}
                          </p>
                          {totalSections > 0 && (
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden max-w-[80px]">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${percent}%`,
                                    background: level.color,
                                  }}
                                />
                              </div>
                              <span className="text-[10px] text-white/30">{percent}%</span>
                            </div>
                          )}
                        </div>
                      </motion.button>
                    )
                  })
                )}
              </div>
            </div>

            {/* Connector arrow between levels */}
            {levelIdx < 2 && (
              <div className="flex flex-col items-center justify-center pt-10 shrink-0">
                <div className="w-8 h-px bg-gradient-to-r from-white/20 to-white/5" />
                <svg width="8" height="12" viewBox="0 0 8 12" className="text-white/20 -mt-px">
                  <path d="M0 0 L8 6 L0 12" fill="none" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
