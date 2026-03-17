import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiMessageCircle, FiClock, FiChevronDown } from 'react-icons/fi'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Avatar from '../ui/Avatar'
import VoteBar from './VoteBar'
import CommentSection from '../ui/CommentSection'
import { timeAgo } from '../../lib/utils'

export default function IdeaCard({ idea, myVote, onVote, index = 0 }) {
  const { titulo, descripcion, estado, area_relacionada, votos_favor, votos_contra, fecha_publicacion, autor } = idea
  const [showComments, setShowComments] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
    >
      <Card hover className="flex flex-col gap-4 group">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-white group-hover:text-[#8B5CF6] transition-colors font-title leading-snug flex-1">
            {titulo}
          </h3>
          <Badge estado={estado} size="xs" />
        </div>

        {/* Description */}
        {descripcion && (
          <p className="text-sm text-white/40 leading-relaxed line-clamp-3">{descripcion}</p>
        )}

        {/* Area tag */}
        {area_relacionada && (
          <div>
            <Badge area={area_relacionada} size="xs" />
          </div>
        )}

        {/* Vote bar */}
        <VoteBar
          favor={votos_favor}
          contra={votos_contra}
          myVote={myVote}
          onVote={onVote ? (tipo) => onVote(idea.id, tipo) : null}
          disabled={!onVote}
        />

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Avatar name={autor?.nombre || ''} area={autor?.area_investigacion} size="xs" />
            <span className="text-xs text-white/30">{autor?.nombre}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowComments(s => !s)}
              className="flex items-center gap-1 text-[11px] text-white/20 hover:text-white/50 transition-colors"
            >
              <FiMessageCircle size={11} /> Comentar
              <motion.span animate={{ rotate: showComments ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <FiChevronDown size={10} />
              </motion.span>
            </button>
            <div className="flex items-center gap-1 text-[11px] text-white/20">
              <FiClock size={10} />
              {timeAgo(fecha_publicacion)}
            </div>
          </div>
        </div>

        {/* Comments section (expandable) */}
        <AnimatePresence>
          {showComments && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-white/[0.04] pt-3"
            >
              <CommentSection ideaId={idea.id} maxHeight={200} />
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}
