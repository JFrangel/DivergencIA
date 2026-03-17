import { motion } from 'framer-motion'
import { FiBook, FiLink, FiLayers } from 'react-icons/fi'
import Badge from '../ui/Badge'

const CATEGORY_GRADIENTS = {
  ML:      'linear-gradient(135deg, rgba(252,101,31,0.15), rgba(252,101,31,0.03))',
  NLP:     'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(139,92,246,0.03))',
  Vision:  'linear-gradient(135deg, rgba(0,209,255,0.15), rgba(0,209,255,0.03))',
  Datos:   'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.03))',
  General: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(245,158,11,0.03))',
}

const CATEGORY_BORDERS = {
  ML:      'rgba(252,101,31,0.25)',
  NLP:     'rgba(139,92,246,0.25)',
  Vision:  'rgba(0,209,255,0.25)',
  Datos:   'rgba(34,197,94,0.25)',
  General: 'rgba(245,158,11,0.25)',
}

const NIVEL_PRESETS = {
  basico:     'finalizado',
  intermedio: 'idea',
  avanzado:   'cancelado',
}

const NIVEL_LABELS = {
  basico: 'Basico',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
}

export default function TopicCard({ topic, index = 0, onClick }) {
  const sectionCount = Array.isArray(topic.contenido) ? topic.contenido.length : 0
  const resourceCount = Array.isArray(topic.recursos) ? topic.recursos.length : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      whileHover={{ y: -4, scale: 1.01 }}
      onClick={onClick}
      className="rounded-xl p-5 cursor-pointer transition-shadow duration-200 hover:shadow-xl"
      style={{
        background: CATEGORY_GRADIENTS[topic.categoria] || CATEGORY_GRADIENTS.General,
        border: `1px solid ${CATEGORY_BORDERS[topic.categoria] || CATEGORY_BORDERS.General}`,
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Top badges */}
      <div className="flex items-center gap-2 mb-3">
        <Badge preset={topic.categoria} size="xs">{topic.categoria}</Badge>
        <Badge preset={NIVEL_PRESETS[topic.nivel]} size="xs">
          {NIVEL_LABELS[topic.nivel] || topic.nivel}
        </Badge>
      </div>

      {/* Title */}
      <h3 className="text-white font-semibold text-base font-title mb-1.5 line-clamp-2">
        {topic.titulo}
      </h3>

      {/* Description */}
      <p className="text-white/50 text-sm leading-relaxed line-clamp-3 mb-4">
        {topic.descripcion}
      </p>

      {/* Stats */}
      <div className="flex items-center gap-4 text-white/40 text-xs">
        <span className="flex items-center gap-1.5">
          <FiLayers size={13} />
          {sectionCount} {sectionCount === 1 ? 'seccion' : 'secciones'}
        </span>
        <span className="flex items-center gap-1.5">
          <FiLink size={13} />
          {resourceCount} {resourceCount === 1 ? 'recurso' : 'recursos'}
        </span>
      </div>

      {/* Author */}
      {topic.autor && (
        <p className="text-white/30 text-[11px] mt-3">
          Por {topic.autor.nombre}
        </p>
      )}
    </motion.div>
  )
}
