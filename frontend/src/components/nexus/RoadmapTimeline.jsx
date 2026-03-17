import { motion } from 'framer-motion'
import { FiCheckCircle, FiLoader, FiCircle, FiTarget, FiLock, FiEdit2 } from 'react-icons/fi'
import { toast } from 'sonner'
import { useRoadmap } from '../../hooks/useRoadmap'
import { useAuth } from '../../context/AuthContext'

const STATE_CFG = {
  completado:  { icon: FiCheckCircle, label: '✓ Completado' },
  en_progreso: { icon: FiLoader, label: '● En progreso' },
  pendiente:   { icon: FiCircle, label: '○ Próxima' },
  bloqueado:   { icon: FiLock, label: '⊘ Bloqueada' },
}

const ESTADO_OPTIONS = [
  { value: 'completada', label: 'Completada' },
  { value: 'actual', label: 'Fase actual' },
  { value: 'proxima', label: 'Próxima' },
  { value: 'bloqueada', label: 'Bloqueada' },
]

export default function RoadmapTimeline({ onEditPhase }) {
  const { roadmap, loading, toggleMilestone, updatePhaseEstado } = useRoadmap()
  const { isAdmin } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <FiLoader size={18} className="text-white/20 animate-spin" />
      </div>
    )
  }

  if (!roadmap.length) {
    return <p className="text-white/20 text-sm text-center py-8">No hay fases en el roadmap.</p>
  }

  async function handleToggleMilestone(phaseId, milestoneTitle) {
    try {
      await toggleMilestone(phaseId, milestoneTitle)
      toast.success('Hito actualizado')
    } catch {
      toast.error('Error al actualizar el hito')
    }
  }

  async function handleEstadoChange(phaseId, newEstado) {
    try {
      await updatePhaseEstado(phaseId, newEstado)
      toast.success('Estado actualizado')
    } catch {
      toast.error('Error al cambiar el estado')
    }
  }

  return (
    <div className="relative px-2">
      {/* Vertical line */}
      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-gradient-to-b from-[var(--c-primary)]/30 via-white/[0.06] to-transparent" />

      <div className="space-y-6">
        {roadmap.map((item, i) => {
          const color = item.color || '#6b7280'
          const cfg = STATE_CFG[item.estado] || STATE_CFG.pendiente
          const Icon = cfg.icon
          const isActive = item.estado === 'en_progreso'

          return (
            <motion.div
              key={item.id}
              className="relative flex gap-4 pl-1"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12, duration: 0.4 }}
            >
              {/* Node dot */}
              <div className="relative z-10 shrink-0 mt-1">
                <motion.div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{
                    background: `${color}12`,
                    border: `1.5px solid ${color}40`,
                    boxShadow: isActive ? `0 0 12px ${color}25` : 'none',
                  }}
                  animate={isActive ? {
                    boxShadow: [`0 0 8px ${color}20`, `0 0 18px ${color}40`, `0 0 8px ${color}20`],
                  } : {}}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <Icon size={16} style={{ color }} />
                </motion.div>
              </div>

              {/* Content */}
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ background: `${color}12`, color: `${color}bb` }}
                  >
                    Fase {item.orden}
                  </span>
                  {item.fecha_estimada && (
                    <span className="text-[9px] text-white/20">
                      {new Date(item.fecha_estimada).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  <span className="text-[9px] uppercase tracking-wider" style={{ color: `${color}80` }}>
                    {cfg.label}
                  </span>
                  {isAdmin && (
                    <select
                      value={item.estadoOriginal}
                      onChange={(e) => handleEstadoChange(item.id, e.target.value)}
                      className="text-[10px] bg-white/5 border border-white/10 rounded-lg px-2 py-0.5 text-white/60 outline-none cursor-pointer hover:border-white/20 transition-colors"
                      style={{ colorScheme: 'dark' }}
                    >
                      {ESTADO_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}
                  {isAdmin && onEditPhase && (
                    <button
                      onClick={() => onEditPhase(item)}
                      className="p-1 rounded-lg text-white/25 hover:text-white/60 hover:bg-white/10 transition-colors"
                      title="Editar fase"
                    >
                      <FiEdit2 size={11} />
                    </button>
                  )}
                </div>

                <h4 className="text-base font-bold font-title text-white/80 mb-1">{item.titulo}</h4>
                <p className="text-sm text-white/35 leading-relaxed mb-3">{item.descripcion}</p>

                {/* Milestones with completion status */}
                {item.hitos?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.hitos.map(hito => {
                      const pillStyle = {
                        background: hito.completado ? `${color}10` : 'rgba(255,255,255,0.03)',
                        color: hito.completado ? `${color}90` : 'rgba(255,255,255,0.25)',
                        border: `1px solid ${hito.completado ? `${color}25` : 'rgba(255,255,255,0.05)'}`,
                      }

                      if (isAdmin) {
                        return (
                          <button
                            key={hito.titulo}
                            onClick={() => handleToggleMilestone(item.id, hito.titulo)}
                            className="text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 transition-all hover:scale-105 cursor-pointer"
                            style={pillStyle}
                            title={hito.completado ? 'Marcar como pendiente' : 'Marcar como completado'}
                          >
                            {hito.completado ? <FiCheckCircle size={8} /> : <FiCircle size={8} />}
                            {hito.titulo}
                          </button>
                        )
                      }

                      return (
                        <span
                          key={hito.titulo}
                          className="text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1"
                          style={pillStyle}
                        >
                          {hito.completado ? <FiCheckCircle size={8} /> : <FiTarget size={8} />}
                          {hito.titulo}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
