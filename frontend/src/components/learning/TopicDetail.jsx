import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiChevronLeft, FiChevronRight, FiExternalLink, FiX, FiCheck } from 'react-icons/fi'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import ProgressBar from '../ui/ProgressBar'

const NIVEL_PRESETS = {
  basico: 'finalizado',
  intermedio: 'idea',
  avanzado: 'cancelado',
}

function TextSection({ contenido }) {
  return (
    <div className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
      {contenido}
    </div>
  )
}

function CodeSection({ contenido }) {
  return (
    <pre
      className="rounded-lg p-4 text-sm font-mono overflow-x-auto leading-relaxed"
      style={{
        background: 'rgba(0,0,0,0.4)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: '#00D1FF',
      }}
    >
      <code>{contenido}</code>
    </pre>
  )
}

function QuizSection({ contenido }) {
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)

  let quiz
  try {
    quiz = typeof contenido === 'string' ? JSON.parse(contenido) : contenido
  } catch {
    return <p className="text-white/50 text-sm">Quiz mal formateado</p>
  }

  const { pregunta, opciones = [], respuesta_correcta } = quiz

  return (
    <div className="space-y-3">
      <p className="text-white font-medium text-sm">{pregunta}</p>
      <div className="space-y-2">
        {opciones.map((opt, i) => {
          const isCorrect = i === respuesta_correcta
          const isSelected = selected === i
          let borderColor = 'rgba(255,255,255,0.1)'
          let bg = 'rgba(255,255,255,0.03)'

          if (revealed && isCorrect) {
            borderColor = 'rgba(34,197,94,0.6)'
            bg = 'rgba(34,197,94,0.1)'
          } else if (revealed && isSelected && !isCorrect) {
            borderColor = 'rgba(239,68,68,0.6)'
            bg = 'rgba(239,68,68,0.1)'
          } else if (isSelected) {
            borderColor = 'rgba(252,101,31,0.5)'
            bg = 'rgba(252,101,31,0.08)'
          }

          return (
            <button
              key={i}
              onClick={() => { if (!revealed) setSelected(i) }}
              className="w-full text-left px-4 py-2.5 rounded-lg text-sm text-white/80 transition-all duration-200 flex items-center gap-3"
              style={{ background: bg, border: `1px solid ${borderColor}` }}
            >
              <span className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center shrink-0 text-xs">
                {revealed && isCorrect && <FiCheck size={12} className="text-[#22c55e]" />}
              </span>
              {opt}
            </button>
          )
        })}
      </div>
      {!revealed && selected !== null && (
        <Button size="sm" onClick={() => setRevealed(true)}>
          Verificar
        </Button>
      )}
      {revealed && (
        <p className="text-xs text-white/40 mt-2">
          {selected === respuesta_correcta ? 'Correcto!' : 'Incorrecto. Revisa la respuesta marcada en verde.'}
        </p>
      )}
    </div>
  )
}

function ImageSection({ contenido }) {
  return (
    <div className="rounded-lg overflow-hidden">
      <img src={contenido} alt="Contenido visual" className="w-full max-h-96 object-contain rounded-lg" />
    </div>
  )
}

function VideoSection({ contenido }) {
  const isYouTube = contenido?.includes('youtube') || contenido?.includes('youtu.be')
  if (isYouTube) {
    const videoId = contenido.match(/(?:v=|youtu\.be\/)([\w-]+)/)?.[1]
    return (
      <div className="aspect-video rounded-lg overflow-hidden">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Video"
        />
      </div>
    )
  }
  return (
    <video controls className="w-full rounded-lg max-h-96">
      <source src={contenido} />
    </video>
  )
}

const SECTION_RENDERERS = {
  texto: TextSection,
  codigo: CodeSection,
  quiz: QuizSection,
  imagen: ImageSection,
  video: VideoSection,
}

export default function TopicDetail({ topic, onClose }) {
  const [currentSection, setCurrentSection] = useState(0)

  if (!topic) return null

  const sections = Array.isArray(topic.contenido) ? topic.contenido : []
  const recursos = Array.isArray(topic.recursos) ? topic.recursos : []
  const total = sections.length
  const progress = total > 0 ? ((currentSection + 1) / total) * 100 : 0

  const section = sections[currentSection]
  const Renderer = section ? SECTION_RENDERERS[section.tipo] || TextSection : null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Content */}
      <motion.div
        className="relative z-10 flex w-full max-w-5xl mx-auto my-4 rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(12,6,8,0.98)',
          border: '1px solid rgba(252,101,31,0.15)',
        }}
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ duration: 0.25 }}
      >
        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3 min-w-0">
              <h2 className="text-white font-semibold font-title text-lg truncate">{topic.titulo}</h2>
              <Badge preset={topic.categoria} size="xs">{topic.categoria}</Badge>
              <Badge preset={NIVEL_PRESETS[topic.nivel]} size="xs">{topic.nivel}</Badge>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0"
            >
              <FiX size={18} />
            </button>
          </div>

          {/* Progress */}
          {total > 0 && (
            <div className="px-6 pt-3">
              <div className="flex items-center justify-between text-xs text-white/40 mb-1.5">
                <span>Seccion {currentSection + 1} de {total}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #FC651F, #8B5CF6)' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          {/* Section content */}
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <AnimatePresence mode="wait">
              {Renderer && (
                <motion.div
                  key={currentSection}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Renderer contenido={section.contenido} />
                </motion.div>
              )}
            </AnimatePresence>
            {total === 0 && (
              <p className="text-white/40 text-sm">Este tema aun no tiene contenido.</p>
            )}
          </div>

          {/* Navigation */}
          {total > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.08]">
              <Button
                variant="ghost"
                size="sm"
                icon={<FiChevronLeft size={16} />}
                onClick={() => setCurrentSection(s => Math.max(0, s - 1))}
                disabled={currentSection === 0}
              >
                Anterior
              </Button>
              <Button
                variant="ghost"
                size="sm"
                iconRight={<FiChevronRight size={16} />}
                onClick={() => setCurrentSection(s => Math.min(total - 1, s + 1))}
                disabled={currentSection === total - 1}
              >
                Siguiente
              </Button>
            </div>
          )}
        </div>

        {/* Resources sidebar */}
        {recursos.length > 0 && (
          <div
            className="w-64 shrink-0 border-l border-white/[0.08] overflow-y-auto p-4"
            style={{ background: 'rgba(255,255,255,0.02)' }}
          >
            <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-3">Recursos</p>
            <div className="space-y-2">
              {recursos.map((r, i) => (
                <a
                  key={i}
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors"
                >
                  <FiExternalLink size={13} className="shrink-0" />
                  <span className="truncate">{r.titulo}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
