import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiMessageCircle, FiClock, FiChevronDown, FiMaximize2, FiEdit2, FiAlertTriangle, FiTrash2 } from 'react-icons/fi'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Avatar from '../ui/Avatar'
import VoteBar from './VoteBar'
import VotingTimer from './VotingTimer'
import CommentSection from '../ui/CommentSection'
import IdeaDetailModal from './IdeaDetailModal'
import { timeAgo } from '../../lib/utils'

// Estados que requieren aprobación del admin/director para editar
const PROTECTED_ESTADOS = ['aprobada', 'en_desarrollo', 'completada']

export default function IdeaCard({ idea, myVote, onVote, onChangeEstado, canChangeEstado, onEdit, onDelete, currentUserId, index = 0, childIdeas = [], onCreateChild, parentIdea = null }) {
  const { titulo, descripcion, estado, area_relacionada, votos_favor, votos_contra, fecha_publicacion, autor } = idea
  const [showComments, setShowComments] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [votingExpired, setVotingExpired] = useState(false)
  const [showEditRequest, setShowEditRequest] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const isOwner = currentUserId && idea.autor_id === currentUserId
  const canEdit = isOwner || canChangeEstado
  const canDelete = isOwner || canChangeEstado
  const isProtected = PROTECTED_ESTADOS.includes(estado)

  const handleEditClick = () => {
    if (!canEdit) return
    // Admin/director siempre edita directo
    if (canChangeEstado) { onEdit?.(idea); return }
    // Dueño en estado protegido → pedir solicitud
    if (isOwner && isProtected) { setShowEditRequest(true); return }
    // Dueño en estado libre → editar directo
    onEdit?.(idea)
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06 }}
      >
        <Card hover className="flex flex-col gap-4 group">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <button
              onClick={() => setShowDetail(true)}
              className="font-semibold text-white group-hover:text-[var(--c-secondary)] transition-colors font-title leading-snug flex-1 text-left cursor-pointer"
            >
              {titulo}
            </button>
            <div className="flex items-center gap-1 shrink-0">
              <Badge estado={estado} size="xs" />
              {canEdit && (
                <button
                  onClick={handleEditClick}
                  className="p-1 rounded-md text-white/20 hover:text-[var(--c-primary)] hover:bg-white/[0.06] transition-all opacity-0 group-hover:opacity-100"
                  title={isProtected && !canChangeEstado ? 'Solicitar edición' : 'Editar idea'}
                >
                  <FiEdit2 size={12} />
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-1 rounded-md text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                  title="Eliminar idea"
                >
                  <FiTrash2 size={12} />
                </button>
              )}
              <button
                onClick={() => setShowDetail(true)}
                className="p-1 rounded-md text-white/20 hover:text-white/50 hover:bg-white/[0.06] transition-all opacity-0 group-hover:opacity-100"
                title="Ver detalle completo"
              >
                <FiMaximize2 size={12} />
              </button>
            </div>
          </div>

          {/* Description — clickable to expand */}
          {descripcion && (
            <button
              onClick={() => setShowDetail(true)}
              className="text-sm text-white/40 leading-relaxed line-clamp-3 text-left cursor-pointer hover:text-white/50 transition-colors"
            >
              {descripcion}
            </button>
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
            disabled={!onVote || votingExpired}
          />

          {/* Voting timer */}
          {idea.fecha_limite_votacion && (
            <VotingTimer
              deadline={idea.fecha_limite_votacion}
              createdAt={fecha_publicacion}
              onExpire={() => setVotingExpired(true)}
            />
          )}

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

      {/* Detail modal */}
      <IdeaDetailModal
        idea={idea}
        open={showDetail}
        onClose={() => setShowDetail(false)}
        myVote={myVote}
        onVote={onVote}
        canChangeEstado={canChangeEstado}
        onChangeEstado={onChangeEstado}
        childIdeas={childIdeas}
        onCreateChild={onCreateChild}
        parentIdea={parentIdea}
      />

      {/* Delete confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowDeleteConfirm(false)}
          >
            <motion.div
              className="rounded-2xl px-6 py-5 flex flex-col gap-4 w-80"
              style={{ background: '#130a0f', border: '1px solid rgba(239,68,68,0.3)' }}
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.15)' }}>
                  <FiTrash2 size={16} className="text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/90">Eliminar idea</p>
                  <p className="text-[11px] text-white/40 mt-1 leading-relaxed">
                    Esta acción no se puede deshacer. La idea y sus votos serán eliminados permanentemente.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => { setShowDeleteConfirm(false); await onDelete?.(idea.id) }}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: '#EF4444' }}
                >
                  Eliminar
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit request confirmation — for protected states */}
      <AnimatePresence>
        {showEditRequest && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowEditRequest(false)}
          >
            <motion.div
              className="rounded-2xl px-6 py-5 flex flex-col gap-4 w-80"
              style={{ background: '#130a0f', border: '1px solid rgba(255,255,255,0.1)' }}
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(245,158,11,0.15)' }}>
                  <FiAlertTriangle size={16} className="text-[#F59E0B]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white/90">Solicitud de edición</p>
                  <p className="text-[11px] text-white/40 mt-1 leading-relaxed">
                    Esta idea está en estado <strong className="text-white/60">{estado}</strong>. Para editarla se cambiará a{' '}
                    <strong className="text-white/60">{estado === 'completada' ? 'En desarrollo' : 'En modificación'}</strong>
                    {estado === 'completada' ? ' para continuar su desarrollo.' : ' y requerirá aprobación del admin o director para volver a publicarse.'}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowEditRequest(false)
                    onChangeEstado?.(idea.id, estado === 'completada' ? 'en_desarrollo' : 'modificacion')
                    onEdit?.(idea)
                  }}
                  className="flex-1 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
                  style={{ background: '#F59E0B' }}
                >
                  Solicitar edición
                </button>
                <button
                  onClick={() => setShowEditRequest(false)}
                  className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
