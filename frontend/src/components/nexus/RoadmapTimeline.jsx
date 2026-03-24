import { motion } from 'framer-motion'
import { FiCheckCircle, FiLoader, FiCircle, FiTarget, FiLock, FiEdit2 } from 'react-icons/fi'
import { toast } from 'sonner'
import { useRoadmap } from '../../hooks/useRoadmap'
import { useAuth } from '../../context/AuthContext'

const STATE_CFG = {
  completado:  { icon: FiCheckCircle, label: 'Completado', color: '#22c55e' },
  en_progreso: { icon: FiLoader, label: 'En progreso', color: '#FC651F' },
  pendiente:   { icon: FiCircle, label: 'Proxima', color: '#8B5CF6' },
  bloqueado:   { icon: FiLock, label: 'Bloqueada', color: '#ef4444' },
}

const ESTADO_OPTIONS = [
  { value: 'completada', label: 'Completada' },
  { value: 'actual', label: 'Fase actual' },
  { value: 'proxima', label: 'Proxima' },
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
          const isCompleted = item.estado === 'completado'

          return (
            <motion.div
              key={item.id}
              className="relative flex gap-4 pl-1"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.12, duration: 0.4 }}
            >
              {/* Node dot with mini progress ring */}
              <div className="relative z-10 shrink-0 mt-1">
                {item.totalHitos > 0 ? (
                  <div className="relative w-10 h-10">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 40 40">
                      <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
                      <motion.circle
                        cx="20" cy="20" r="16" fill="none"
                        stroke={cfg.color} strokeWidth="3" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 16}
                        initial={{ strokeDashoffset: 2 * Math.PI * 16 }}
                        animate={{ strokeDashoffset: 2 * Math.PI * 16 * (1 - item.progressPct / 100) }}
                        transition={{ duration: 1, ease: 'easeOut', delay: i * 0.1 }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Icon size={12} style={{ color: cfg.color }} />
                    </div>
                  </div>
                ) : (
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
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                    style={{ background: `${cfg.color}12`, color: `${cfg.color}bb` }}
                  >
                    Fase {item.orden}
                  </span>
                  {item.totalHitos > 0 && (
                    <span className="text-[9px] text-white/25 font-mono">
                      {item.completedHitos}/{item.totalHitos}
                    </span>
                  )}
                  {item.fecha_estimada && (
                    <span className="text-[9px] text-white/20">
                      {new Date(item.fecha_estimada).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  <span className="text-[9px] uppercase tracking-wider" style={{ color: `${cfg.color}80` }}>
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
                <p className="text-sm text-white/35 leading-relaxed mb-2">{item.descripcion}</p>

                {/* Phase progress bar */}
                {item.totalHitos > 0 && (
                  <div className="mb-3">
                    <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${cfg.color}, ${cfg.color}88)` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${item.progressPct}%` }}
                        transition={{ duration: 1, ease: 'easeOut', delay: i * 0.1 }}
                      />
                    </div>
                  </div>
                )}

                {/* Milestones with completion status */}
                {item.hitos?.length > 0 && (
                  <div className="space-y-1">
                    {item.hitos.map(hito => {
                      const isDone = hito.completado

                      if (isAdmin) {
                        return (
                          <button
                            key={hito.titulo}
                            onClick={() => handleToggleMilestone(item.id, hito.titulo)}
                            className={`w-full text-left text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 transition-all hover:bg-white/[0.03] cursor-pointer ${
                              isDone ? 'bg-emerald-500/[0.04]' : 'bg-white/[0.01]'
                            }`}
                            title={isDone ? 'Marcar como pendiente' : 'Marcar como completado'}
                          >
                            <motion.div animate={isDone ? { scale: [1, 1.15, 1] } : {}} transition={{ duration: 0.25 }}>
                              {isDone ? <FiCheckCircle size={10} className="text-emerald-400" /> : <FiCircle size={10} style={{ color: `${color}40` }} />}
                            </motion.div>
                            <span className={isDone ? 'text-white/50 line-through' : 'text-white/30'}>{hito.titulo}</span>
                            {isDone && <span className="ml-auto text-[8px] text-emerald-400/50 font-bold uppercase">Listo</span>}
                          </button>
                        )
                      }

                      return (
                        <div
                          key={hito.titulo}
                          className={`text-[11px] px-2.5 py-1.5 rounded-lg flex items-center gap-2 ${
                            isDone ? 'bg-emerald-500/[0.04]' : 'bg-white/[0.01]'
                          }`}
                        >
                          {isDone ? <FiCheckCircle size={10} className="text-emerald-400" /> : <FiTarget size={10} style={{ color: `${color}40` }} />}
                          <span className={isDone ? 'text-white/50 line-through' : 'text-white/30'}>{hito.titulo}</span>
                          {isDone && <span className="ml-auto text-[8px] text-emerald-400/50 font-bold uppercase">Listo</span>}
                        </div>
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
