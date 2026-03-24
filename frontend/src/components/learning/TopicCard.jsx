import { useState } from 'react'
import { motion } from 'framer-motion'
import { FiLayers, FiLink, FiClock, FiHelpCircle, FiCheckCircle, FiEdit2, FiTrash2 } from 'react-icons/fi'
import { toast } from 'sonner'
import Badge from '../ui/Badge'

const CATEGORY_COLORS = {
  ML:      '#FC651F',
  NLP:     '#8B5CF6',
  Vision:  '#00D1FF',
  Datos:   '#22c55e',
  General: '#F59E0B',
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

const NIVEL_ICONS = {
  basico: '1',
  intermedio: '2',
  avanzado: '3',
}

/** Estimate reading time: ~2 min per text section, ~3 per code, ~1 per quiz, ~1 per image/video */
function estimateTime(sections) {
  if (!Array.isArray(sections)) return 0
  return sections.reduce((acc, s) => {
    if (s.tipo === 'texto') return acc + 2
    if (s.tipo === 'codigo') return acc + 3
    if (s.tipo === 'quiz') return acc + 1
    return acc + 1
  }, 0)
}

export default function TopicCard({ topic, index = 0, onClick, progressData, isAdmin, onEdit, onDelete }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async (e) => {
    e.stopPropagation()
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }
    setDeleting(true)
    await onDelete?.(topic.id)
    setDeleting(false)
    setShowDeleteConfirm(false)
  }

  const handleCancelDelete = (e) => {
    e.stopPropagation()
    setShowDeleteConfirm(false)
  }
  const sections = Array.isArray(topic.contenido) ? topic.contenido : []
  const sectionCount = sections.length
  const resourceCount = Array.isArray(topic.recursos) ? topic.recursos.length : 0
  const quizCount = sections.filter(s => s.tipo === 'quiz').length
  const estimatedMinutes = estimateTime(sections)

  // Progress
  const completedSections = progressData?.completedSections?.length || 0
  const progressPercent = sectionCount > 0 ? Math.round((completedSections / sectionCount) * 100) : 0
  const isComplete = progressData?.completed || false
  const isStarted = completedSections > 0

  const catColor = CATEGORY_COLORS[topic.categoria] || CATEGORY_COLORS.General

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      whileHover={{ y: -4, scale: 1.01 }}
      onClick={onClick}
      className="group relative rounded-xl p-5 cursor-pointer transition-shadow duration-200 hover:shadow-xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${catColor}12, ${catColor}04)`,
        border: `1px solid ${catColor}30`,
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Completed overlay glow */}
      {isComplete && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(135deg, ${catColor}08, transparent)`,
            borderTop: `2px solid ${catColor}60`,
          }}
        />
      )}

      {/* Top badges row */}
      <div className="relative flex items-center gap-2 mb-3 flex-wrap">
        <Badge preset={topic.categoria} size="xs">{topic.categoria}</Badge>
        <Badge preset={NIVEL_PRESETS[topic.nivel]} size="xs">
          {NIVEL_LABELS[topic.nivel] || topic.nivel}
        </Badge>
        {isComplete && (
          <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-[#22c55e]">
            <FiCheckCircle size={12} />
            Completado
          </span>
        )}
        {/* Admin controls */}
        {isAdmin && !showDeleteConfirm && (
          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg text-white/30 hover:text-[var(--c-primary)] hover:bg-[var(--c-primary)]/10 transition-colors"
              title="Editar tema"
            >
              <FiEdit2 size={13} />
            </button>
            <button
              onClick={handleDelete}
              className="p-1.5 rounded-lg text-white/30 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
              title="Eliminar tema"
            >
              <FiTrash2 size={13} />
            </button>
          </div>
        )}
        {/* Delete confirmation inline */}
        {isAdmin && showDeleteConfirm && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-[10px] text-[#EF4444]/80">Eliminar?</span>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 hover:bg-[#EF4444]/25 transition-colors disabled:opacity-50"
            >
              {deleting ? '...' : 'Si'}
            </button>
            <button
              onClick={handleCancelDelete}
              className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/[0.04] text-white/50 border border-white/10 hover:bg-white/[0.08] transition-colors"
            >
              No
            </button>
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="relative text-white font-semibold text-base font-title mb-1.5 line-clamp-2 group-hover:text-white/95 transition-colors">
        {topic.titulo}
      </h3>

      {/* Description */}
      <p className="relative text-white/50 text-sm leading-relaxed line-clamp-2 mb-3">
        {topic.descripcion}
      </p>

      {/* Progress bar */}
      {sectionCount > 0 && (
        <div className="relative mb-3">
          <div className="flex items-center justify-between text-[10px] text-white/40 mb-1">
            <span>{completedSections}/{sectionCount} secciones</span>
            <span style={{ color: progressPercent > 0 ? catColor : undefined }}>{progressPercent}%</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${catColor}, ${catColor}cc)`,
                boxShadow: progressPercent > 0 ? `0 0 6px ${catColor}40` : 'none',
              }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.06 + 0.2 }}
            />
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="relative flex items-center gap-3 text-white/40 text-[11px] flex-wrap">
        <span className="flex items-center gap-1">
          <FiLayers size={12} />
          {sectionCount} {sectionCount === 1 ? 'seccion' : 'secciones'}
        </span>
        {quizCount > 0 && (
          <span className="flex items-center gap-1">
            <FiHelpCircle size={12} />
            {quizCount} {quizCount === 1 ? 'quiz' : 'quizzes'}
          </span>
        )}
        {estimatedMinutes > 0 && (
          <span className="flex items-center gap-1">
            <FiClock size={12} />
            ~{estimatedMinutes} min
          </span>
        )}
        {resourceCount > 0 && (
          <span className="flex items-center gap-1">
            <FiLink size={12} />
            {resourceCount}
          </span>
        )}
      </div>

      {/* Author */}
      {topic.autor && (
        <p className="relative text-white/30 text-[11px] mt-3">
          Por {topic.autor.nombre}
        </p>
      )}
    </motion.div>
  )
}
