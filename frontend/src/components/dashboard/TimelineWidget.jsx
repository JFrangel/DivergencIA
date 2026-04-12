import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FiArrowRight } from 'react-icons/fi'
import { useTimelineRecent } from '../../hooks/useTimeline'
import { timeAgo } from '../../lib/utils'
import Spinner from '../ui/Spinner'
import Avatar from '../ui/Avatar'

const TIPO_COLOR = {
  proyecto_nuevo:  '#FC651F',
  proyecto_estado: '#F59E0B',
  avance:          '#22c55e',
  idea_aprobada:   '#8B5CF6',
  evento_creado:   '#00D1FF',
  nodo_aprobado:   '#F59E0B',
  archivo_subido:  '#6b7280',
}

export default function TimelineWidget() {
  const { items, loading } = useTimelineRecent(5)

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white/80">Actividad reciente</span>
          {items.length > 0 && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: 'rgba(252,101,31,0.15)', color: '#FC651F' }}
            >
              {items.length}
            </span>
          )}
        </div>
        <Link
          to="/roadmap?view=actividad"
          className="flex items-center gap-1 text-[11px] text-white/30 hover:text-[var(--c-primary)] transition-colors"
        >
          Ver todo <FiArrowRight size={10} />
        </Link>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-8"><Spinner size="sm" /></div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-white/25 text-xs">Sin actividad aún</p>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.04]">
          {items.map((item, i) => {
            const color = TIPO_COLOR[item.tipo] || '#6b7280'
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
              >
                {/* Icon dot */}
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5"
                  style={{ background: `${color}18`, border: `1px solid ${color}30` }}
                >
                  <span style={{ fontSize: 12 }}>{item.icono || '📌'}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/70 font-medium leading-snug line-clamp-2">
                    {item.titulo}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.usuario && (
                      <span className="text-[10px] text-white/30 truncate">
                        {item.usuario.nombre?.split(' ')[0]}
                      </span>
                    )}
                    <span className="text-[10px] text-white/20 ml-auto shrink-0">
                      {timeAgo(item.created_at)}
                    </span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
