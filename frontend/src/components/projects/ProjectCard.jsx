import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiFolder, FiUsers, FiCalendar, FiArrowRight } from 'react-icons/fi'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import ProgressBar from '../ui/ProgressBar'
import Avatar from '../ui/Avatar'
import { formatDate } from '../../lib/utils'

export default function ProjectCard({ project, index = 0 }) {
  const { id, titulo, descripcion, estado, fecha_fin, miembros = [], tareas = [] } = project

  const total = tareas.length
  const done = tareas.filter(t => t.estado === 'completada').length
  const progress = total ? Math.round((done / total) * 100) : 0

  const activeMembers = miembros.filter(m => m.activo).slice(0, 4)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Link to={`/projects/${id}`}>
        <Card hover shimmer className="flex flex-col gap-4 group">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(252,101,31,0.12)', color: '#FC651F' }}
            >
              <FiFolder size={16} />
            </div>
            <Badge estado={estado} />
          </div>

          {/* Title + desc */}
          <div>
            <h3 className="font-semibold text-white group-hover:text-[#FC651F] transition-colors line-clamp-1 font-title">
              {titulo}
            </h3>
            {descripcion && (
              <p className="text-sm text-white/40 mt-1 line-clamp-2 leading-relaxed">
                {descripcion}
              </p>
            )}
          </div>

          {/* Progress */}
          {total > 0 && (
            <div>
              <div className="flex justify-between text-[10px] text-white/30 mb-1">
                <span>{done}/{total} tareas</span>
                <span>{progress}%</span>
              </div>
              <ProgressBar value={progress} max={100} height={4} />
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between mt-auto pt-1">
            {/* Members */}
            <div className="flex -space-x-2">
              {activeMembers.map(m => (
                <Avatar
                  key={m.usuario?.id}
                  name={m.usuario?.nombre || ''}
                  area={m.usuario?.area_investigacion}
                  size="xs"
                  className="ring-2 ring-[#060304]"
                />
              ))}
              {miembros.length > 4 && (
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[9px] text-white/40 ring-2 ring-[#060304]">
                  +{miembros.length - 4}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 text-[11px] text-white/25">
              {fecha_fin && (
                <span className="flex items-center gap-1">
                  <FiCalendar size={10} /> {formatDate(fecha_fin)}
                </span>
              )}
              <FiArrowRight size={13} className="text-white/20 group-hover:text-[#FC651F] transition-colors" />
            </div>
          </div>
        </Card>
      </Link>
    </motion.div>
  )
}
