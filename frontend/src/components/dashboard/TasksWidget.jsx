import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FiCheckCircle, FiClock, FiLoader, FiAlertCircle, FiArrowUpRight } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Card from '../ui/Card'

const STATE_CFG = {
  pendiente: { icon: FiClock, color: '#6b7280', label: 'Pendiente' },
  en_progreso: { icon: FiLoader, color: '#FC651F', label: 'En progreso' },
  revision: { icon: FiAlertCircle, color: '#F59E0B', label: 'Revisión' },
  completada: { icon: FiCheckCircle, color: '#22c55e', label: 'Completada' },
}

export default function TasksWidget() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('tareas')
      .select('id, titulo, estado, prioridad, fecha_limite, proyecto:proyecto_id(id, titulo)')
      .eq('asignado_a', user.id)
      .neq('estado', 'completada')
      .limit(20)
      .then(({ data }) => {
        const PRIO = { critica: 0, alta: 1, media: 2, baja: 3 }
        const sorted = (data || []).sort((a, b) => {
          const pd = (PRIO[a.prioridad] ?? 4) - (PRIO[b.prioridad] ?? 4)
          if (pd !== 0) return pd
          if (a.fecha_limite && b.fecha_limite) return new Date(a.fecha_limite) - new Date(b.fecha_limite)
          if (a.fecha_limite) return -1
          if (b.fecha_limite) return 1
          return 0
        })
        setTasks(sorted.slice(0, 6))
        setLoading(false)
      })
  }, [user])

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#FC651F]/10 flex items-center justify-center">
            <FiLoader size={13} className="text-[#FC651F]" />
          </div>
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Mis Tareas</h3>
        </div>
        <span className="text-[10px] text-white/20">{tasks.length} pendientes</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 rounded-lg bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-6">
          <FiCheckCircle size={24} className="mx-auto text-[#22c55e]/30 mb-2" />
          <p className="text-white/20 text-sm">¡Todo al día!</p>
          <p className="text-white/10 text-[11px] mt-0.5">No tienes tareas pendientes</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {tasks.map((task, i) => {
            const cfg = STATE_CFG[task.estado] || STATE_CFG.pendiente
            const Icon = cfg.icon
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={task.proyecto?.id ? `/projects/${task.proyecto.id}` : '#'}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] transition-all group"
                >
                  <Icon size={13} style={{ color: cfg.color }} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/70 truncate group-hover:text-white/90 transition-colors">
                      {task.titulo}
                    </p>
                    {task.proyecto?.titulo && (
                      <p className="text-[10px] text-white/20 truncate">{task.proyecto.titulo}</p>
                    )}
                  </div>
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0"
                    style={{ background: `${cfg.color}15`, color: `${cfg.color}aa` }}
                  >
                    {cfg.label}
                  </span>
                </Link>
              </motion.div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
