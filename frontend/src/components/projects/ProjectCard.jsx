import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiCalendar, FiArrowRight, FiCheckSquare } from 'react-icons/fi'
import Badge from '../ui/Badge'
import ProgressBar from '../ui/ProgressBar'
import Avatar from '../ui/Avatar'
import DynamicProjectCover from './DynamicProjectCover'
import { formatDate } from '../../lib/utils'

const AREA_META = {
  ML:      { label: 'Machine Learning', color: '#FC651F', icon: '🤖' },
  NLP:     { label: 'NLP',              color: '#8B5CF6', icon: '💬' },
  Vision:  { label: 'Computer Vision',  color: '#00D1FF', icon: '👁️' },
  Datos:   { label: 'Datos & Analytics',color: '#22c55e', icon: '📊' },
  General: { label: 'General',          color: '#F59E0B', icon: '🔬' },
}

export default function ProjectCard({ project, index = 0 }) {
  const { id, titulo, descripcion, estado, fecha_fin, miembros = [], tareas = [], area, creador, cover_url } = project

  const total = tareas.length
  const done = tareas.filter(t => t.estado === 'completada').length
  const progress = total ? Math.round((done / total) * 100) : 0

  const activeMembers = miembros.filter(m => m.activo)
  const visibleMembers = activeMembers.slice(0, 4)
  const extra = activeMembers.length - 4

  const areaMeta = AREA_META[area] || null
  const accentColor = areaMeta?.color || '#FC651F'

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="group"
    >
      <Link to={`/projects/${id}`} className="block">
        <div
          className="flex flex-col rounded-2xl border overflow-hidden transition-all duration-200 hover:border-white/15 hover:-translate-y-0.5 hover:shadow-lg"
          style={{
            background: 'rgba(255,255,255,0.02)',
            borderColor: 'rgba(255,255,255,0.07)',
          }}
        >
          {/* Color bar */}
          <div className="h-0.5 w-full shrink-0" style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}40)` }} />

          {/* Header — dynamic animated cover */}
          <div className="relative overflow-hidden shrink-0" style={{ height: 96 }}>
            {cover_url ? (
              <img src={cover_url} alt="" className="w-full h-full object-cover" />
            ) : area ? (
              <DynamicProjectCover area={area} height={96} />
            ) : (
              /* No area — static fallback */
              <div
                className="w-full h-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.02)' }}
              >
                <span className="text-5xl select-none" style={{ opacity: 0.15 }}>📁</span>
              </div>
            )}

            {/* subtle dark vignette */}
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.55))' }}
            />

            {/* Status badge — top right */}
            <div className="absolute top-2.5 right-2.5">
              <Badge estado={estado} />
            </div>

            {/* Area badge — top left */}
            {areaMeta && (
              <div
                className="absolute top-2.5 left-2.5 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                style={{ background: `${accentColor}30`, color: accentColor, backdropFilter: 'blur(4px)' }}
              >
                {areaMeta.label}
              </div>
            )}
          </div>

          {/* Body */}
          <div className="flex flex-col gap-3 p-4 flex-1">
            {/* Title + desc */}
            <div>
              <h3
                className="font-semibold text-white/90 group-hover:text-white line-clamp-1 font-title transition-colors text-sm"
                style={{ '--tw-text-opacity': 1 }}
              >
                {titulo}
              </h3>
              {descripcion && (
                <p className="text-[11px] text-white/35 mt-1 line-clamp-2 leading-relaxed">
                  {descripcion}
                </p>
              )}
            </div>

            {/* Progress */}
            {total > 0 && (
              <div>
                <div className="flex justify-between text-[10px] text-white/25 mb-1.5">
                  <span className="flex items-center gap-1">
                    <FiCheckSquare size={9} /> {done}/{total} tareas
                  </span>
                  <span style={{ color: accentColor }}>{progress}%</span>
                </div>
                <ProgressBar value={progress} max={100} height={3} color={accentColor} />
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-auto pt-1">
              {/* Member stack */}
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1.5">
                  {visibleMembers.map(m => (
                    <Avatar
                      key={m.usuario?.id}
                      name={m.usuario?.nombre || ''}
                      src={m.usuario?.foto_url}
                      area={m.usuario?.area_investigacion}
                      size="xs"
                      className="ring-1 ring-[#060304]"
                    />
                  ))}
                  {extra > 0 && (
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium ring-1 ring-[#060304]"
                      style={{ background: `${accentColor}20`, color: accentColor }}
                    >
                      +{extra}
                    </div>
                  )}
                </div>
                {activeMembers.length > 0 && (
                  <span className="text-[10px] text-white/20">
                    {activeMembers.length} miembro{activeMembers.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-[10px] text-white/20">
                {fecha_fin && (
                  <span className="flex items-center gap-1">
                    <FiCalendar size={9} /> {formatDate(fecha_fin)}
                  </span>
                )}
                <FiArrowRight size={12} className="transition-colors group-hover:text-white/50" style={{ color: accentColor + '60' }} />
              </div>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
