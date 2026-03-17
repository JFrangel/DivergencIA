import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiBookOpen, FiCode, FiActivity, FiFileText, FiChevronDown } from 'react-icons/fi'
import Avatar from '../ui/Avatar'
import Badge from '../ui/Badge'
import { formatDate } from '../../lib/utils'

const typeConfig = {
  investigacion:  { icon: FiBookOpen,  label: 'Investigacion' },
  desarrollo:     { icon: FiCode,      label: 'Desarrollo' },
  experimento:    { icon: FiActivity,  label: 'Experimento' },
  documentacion:  { icon: FiFileText,  label: 'Documentacion' },
}

export default function AdvanceCard({ advance, index = 0 }) {
  const [expanded, setExpanded] = useState(false)
  const { id, titulo, contenido, tipo, fecha, autor } = advance

  const config = typeConfig[tipo] || typeConfig.investigacion
  const Icon = config.icon

  const needsTruncate = contenido && contenido.length > 150
  const preview = needsTruncate ? contenido.slice(0, 150) + '...' : contenido

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.35 }}
    >
      <motion.div
        whileHover={{ scale: 1.01 }}
        onClick={() => needsTruncate && setExpanded(prev => !prev)}
        className={`group relative rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 backdrop-blur-xl transition-shadow hover:shadow-[0_0_24px_rgba(252,101,31,0.06)] ${
          needsTruncate ? 'cursor-pointer' : ''
        }`}
      >
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-white/50">
              <Icon size={15} />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-white font-title">
                {titulo}
              </h3>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-white/25">
                {fecha && <span>{formatDate(fecha)}</span>}
                <Badge preset={tipo} size="xs">{config.label}</Badge>
              </div>
            </div>
          </div>

          {needsTruncate && (
            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="mt-1 shrink-0 text-white/20"
            >
              <FiChevronDown size={14} />
            </motion.span>
          )}
        </div>

        {/* Content */}
        <div className="mt-3">
          <AnimatePresence mode="wait" initial={false}>
            {expanded ? (
              <motion.p
                key="full"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden whitespace-pre-wrap text-sm leading-relaxed text-white/45"
              >
                {contenido}
              </motion.p>
            ) : (
              <motion.p
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="text-sm leading-relaxed text-white/45"
              >
                {preview}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Author footer */}
        {autor && (
          <div className="mt-3 flex items-center gap-2 border-t border-white/[0.04] pt-3">
            <Avatar
              name={autor.nombre || ''}
              src={autor.foto_url}
              size="xs"
            />
            <span className="text-xs text-white/30">{autor.nombre}</span>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
