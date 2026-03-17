import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiExternalLink, FiFolder, FiStar, FiUser } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import Avatar from '../ui/Avatar'
import Badge from '../ui/Badge'

const TYPE_META = {
  member: { icon: FiUser, label: 'Investigador', color: '#8B5CF6' },
  founder: { icon: FiUser, label: 'Fundador', color: '#F59E0B' },
  project: { icon: FiFolder, label: 'Proyecto', color: '#FC651F' },
  idea: { icon: FiStar, label: 'Idea', color: '#00D1FF' },
}

export default function GraphDetailPanel({ node, onClose }) {
  if (!node) return null

  const meta = TYPE_META[node.type] || TYPE_META.member
  const d = node.data || {}

  return (
    <AnimatePresence>
      <motion.div
        key={node.id}
        initial={{ x: 300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 300, opacity: 0 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
        className="absolute top-4 right-4 w-72 z-50 rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(8,4,4,0.95)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(20px)',
          boxShadow: `0 0 40px ${meta.color}15`,
        }}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/[0.06]" style={{ background: `${meta.color}08` }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${meta.color}20` }}
              >
                <meta.icon size={14} style={{ color: meta.color }} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider font-medium" style={{ color: `${meta.color}aa` }}>
                  {meta.label}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
              <FiX size={16} />
            </button>
          </div>
          <h3 className="font-title font-bold text-white text-sm mt-3">{d.label}</h3>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Member/Founder info */}
          {(node.type === 'member' || node.type === 'founder') && (
            <>
              <div className="flex items-center gap-2">
                <Avatar name={d.label} area={d.area} size="sm" />
                <div>
                  <p className="text-xs text-white/70">{d.label}</p>
                  <p className="text-[10px] text-white/30">{d.area || 'General'}</p>
                </div>
              </div>
              {d.area && <Badge area={d.area} size="xs" />}
              {d.userId && (
                <Link
                  to={`/members/${d.userId}`}
                  className="flex items-center gap-1 text-[11px] text-[var(--c-primary)] hover:underline"
                >
                  Ver perfil <FiExternalLink size={10} />
                </Link>
              )}
            </>
          )}

          {/* Project info */}
          {node.type === 'project' && (
            <>
              {d.estado && <Badge estado={d.estado} size="xs" />}
              {d.descripcion && (
                <p className="text-[11px] text-white/40 leading-relaxed line-clamp-3">{d.descripcion}</p>
              )}
              {d.projectId && (
                <Link
                  to={`/projects/${d.projectId}`}
                  className="flex items-center gap-1 text-[11px] text-[var(--c-primary)] hover:underline"
                >
                  Ver proyecto <FiExternalLink size={10} />
                </Link>
              )}
            </>
          )}

          {/* Idea info */}
          {node.type === 'idea' && (
            <>
              {d.votes != null && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#22c55e]">↑ {d.votes}</span>
                  <span className="text-[10px] text-white/30">votos a favor</span>
                </div>
              )}
              {d.area && <Badge area={d.area} size="xs" />}
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
