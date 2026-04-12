import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiX, FiUser, FiCalendar, FiTag, FiMessageCircle,
  FiThumbsUp, FiThumbsDown, FiLink, FiShare2, FiGitBranch, FiPlus, FiCornerDownRight,
} from 'react-icons/fi'
import Avatar from '../ui/Avatar'
import Badge from '../ui/Badge'
import VoteBar from './VoteBar'
import CommentSection from '../ui/CommentSection'
import { timeAgo } from '../../lib/utils'

const ESTADOS = [
  { id: 'votacion',      label: 'En votación',    color: 'var(--c-accent)' },
  { id: 'aprobada',      label: 'Aprobada',       color: '#22c55e' },
  { id: 'en_desarrollo', label: 'En desarrollo',  color: 'var(--c-primary)' },
  { id: 'completada',    label: 'Completada',     color: '#a855f7' },
  { id: 'rechazada',     label: 'Rechazada',      color: '#ef4444' },
  { id: 'archivada',     label: 'Archivada',      color: '#6b7280' },
  { id: 'modificacion',  label: 'Modificación',   color: '#F59E0B' },
]

export default function IdeaDetailModal({ idea, open, onClose, myVote, onVote, canChangeEstado, onChangeEstado, childIdeas = [], onCreateChild, parentIdea = null }) {
  const [showChildForm, setShowChildForm] = useState(false)
  const [childForm, setChildForm] = useState({ titulo: '', descripcion: '' })
  const [savingChild, setSavingChild] = useState(false)

  if (!idea) return null

  const {
    id, titulo, descripcion, estado, area_relacionada,
    votos_favor, votos_contra, fecha_publicacion, created_at, autor,
    tags,
  } = idea

  const handleCreateChild = async () => {
    if (!childForm.titulo.trim()) return
    setSavingChild(true)
    await onCreateChild?.(id, { titulo: childForm.titulo, descripcion: childForm.descripcion })
    setChildForm({ titulo: '', descripcion: '' })
    setShowChildForm(false)
    setSavingChild(false)
  }

  const publishDate = fecha_publicacion || created_at

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-2xl glass-panel rounded-2xl z-10 flex flex-col max-h-[90vh]"
            style={{ border: '1px solid rgba(139,92,246,0.2)' }}
            initial={{ opacity: 0, scale: 0.96, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-5 border-b border-white/[0.08]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge estado={estado} size="xs" />
                  {area_relacionada && <Badge area={area_relacionada} size="xs" />}
                </div>
                <h2 className="text-lg font-bold text-white font-title leading-snug">
                  {titulo}
                </h2>
                {canChangeEstado && (
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Cambiar estado:</span>
                    {ESTADOS.map(e => (
                      <button
                        key={e.id}
                        onClick={() => onChangeEstado?.(id, e.id)}
                        disabled={estado === e.id}
                        className="text-[11px] px-2 py-0.5 rounded-md border transition-all disabled:opacity-30 disabled:cursor-default hover:scale-105"
                        style={{
                          borderColor: estado === e.id ? e.color : 'rgba(255,255,255,0.1)',
                          color: estado === e.id ? e.color : 'rgba(255,255,255,0.5)',
                          background: estado === e.id ? `color-mix(in srgb, ${e.color} 15%, transparent)` : 'transparent',
                        }}
                      >
                        {e.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0 mt-0.5"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Body — scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* Author + date row */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <Avatar
                    name={autor?.nombre || ''}
                    area={autor?.area_investigacion}
                    size="sm"
                  />
                  <div>
                    <p className="text-sm font-medium text-white/80">
                      {autor?.nombre || 'Anónimo'}
                    </p>
                    {autor?.area_investigacion && (
                      <p className="text-[11px] text-white/30">{autor.area_investigacion}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-white/30 ml-auto">
                  <FiCalendar size={12} />
                  <span>{publishDate ? timeAgo(publishDate) : 'Sin fecha'}</span>
                </div>
              </div>

              {/* Full description */}
              {descripcion ? (
                <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                  <p className="text-sm text-white/50 leading-relaxed whitespace-pre-line">
                    {descripcion}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.04] p-4">
                  <p className="text-sm text-white/20 italic">Sin descripcion proporcionada.</p>
                </div>
              )}

              {/* Tags */}
              {tags && tags.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <FiTag size={12} className="text-white/30" />
                  {tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--c-secondary)]/10 text-[var(--c-secondary)] border border-[var(--c-secondary)]/20"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Voting section */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <FiThumbsUp size={13} className="text-white/30" />
                  <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">
                    Votacion
                  </span>
                </div>
                <VoteBar
                  favor={votos_favor}
                  contra={votos_contra}
                  myVote={myVote}
                  onVote={onVote ? (tipo) => onVote(id, tipo) : null}
                  disabled={!onVote}
                />
                <div className="flex items-center justify-between text-[11px] text-white/20 pt-1">
                  <span>{(votos_favor || 0) + (votos_contra || 0)} votos totales</span>
                  <span>
                    {votos_favor || 0} a favor / {votos_contra || 0} en contra
                  </span>
                </div>
              </div>

              {/* Related ideas hint */}
              {area_relacionada && (
                <div className="flex items-center gap-2 text-xs text-white/20">
                  <FiLink size={12} />
                  <span>
                    Ideas relacionadas en el area de <strong className="text-white/40">{area_relacionada}</strong> se pueden explorar desde el mapa conceptual.
                  </span>
                </div>
              )}

              {/* Parent idea breadcrumb */}
              {parentIdea && (
                <div className="flex items-center gap-2 text-xs text-white/30 bg-white/[0.02] border border-white/[0.05] rounded-xl px-3 py-2">
                  <FiCornerDownRight size={12} />
                  <span>Derivada de:</span>
                  <span className="text-[var(--c-secondary)] font-medium">{parentIdea.titulo}</span>
                </div>
              )}

              {/* Child ideas */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FiGitBranch size={13} className="text-[#8B5CF6]" />
                    <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">
                      Ideas derivadas {childIdeas.length > 0 && `(${childIdeas.length})`}
                    </span>
                  </div>
                  {onCreateChild && (
                    <button
                      onClick={() => setShowChildForm(v => !v)}
                      className="text-[10px] text-[#8B5CF6] hover:text-[#8B5CF6]/80 flex items-center gap-1 transition-colors"
                    >
                      <FiPlus size={10} /> Derivar idea
                    </button>
                  )}
                </div>

                {/* Child create form */}
                <AnimatePresence>
                  {showChildForm && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-2 pt-1">
                        <input
                          className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none"
                          placeholder="Título de la idea derivada"
                          value={childForm.titulo}
                          onChange={e => setChildForm(f => ({ ...f, titulo: e.target.value }))}
                        />
                        <textarea
                          rows={2}
                          className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none resize-none"
                          placeholder="Descripción (opcional)"
                          value={childForm.descripcion}
                          onChange={e => setChildForm(f => ({ ...f, descripcion: e.target.value }))}
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => setShowChildForm(false)}
                            className="text-xs text-white/30 hover:text-white/60 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleCreateChild}
                            disabled={savingChild || !childForm.titulo.trim()}
                            className="text-xs bg-[#8B5CF6]/20 text-[#8B5CF6] hover:bg-[#8B5CF6]/30 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                          >
                            {savingChild ? 'Creando...' : 'Crear derivada'}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Child list */}
                {childIdeas.length === 0 && !showChildForm && (
                  <p className="text-xs text-white/15">Sin ideas derivadas aún.</p>
                )}
                {childIdeas.map(child => (
                  <div key={child.id} className="flex items-start gap-2 py-1.5 border-t border-white/[0.04]">
                    <FiCornerDownRight size={11} className="text-[#8B5CF6]/40 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/60">{child.titulo}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge estado={child.estado} size="xs" />
                        <span className="text-[10px] text-white/20">{child.votos_favor || 0} votos</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Discussion / Comments */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4">
                <div className="flex items-center gap-2 mb-4">
                  <FiMessageCircle size={13} className="text-white/30" />
                  <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">
                    Discusion
                  </span>
                </div>
                <CommentSection ideaId={id} maxHeight={280} />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
