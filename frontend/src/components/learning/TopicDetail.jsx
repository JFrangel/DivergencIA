import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiChevronLeft, FiChevronRight, FiExternalLink, FiX, FiCheck,
  FiCheckCircle, FiCircle, FiAward, FiEdit2, FiTrash2, FiPlus,
  FiArrowUp, FiArrowDown, FiSettings, FiZap, FiRotateCcw, FiBookOpen, FiImage,
} from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { generateFlashcards, generateDynamicQuiz, generateIllustrativeCard } from '../../lib/gemini'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'
import Select from '../ui/Select'

const NIVEL_PRESETS = {
  basico: 'finalizado',
  intermedio: 'idea',
  avanzado: 'cancelado',
}

const CATEGORIA_OPTIONS = [
  { value: 'ML', label: 'Machine Learning' },
  { value: 'NLP', label: 'NLP' },
  { value: 'Vision', label: 'Computer Vision' },
  { value: 'Datos', label: 'Datos & Analytics' },
  { value: 'General', label: 'General' },
]

const NIVEL_OPTIONS = [
  { value: 'basico', label: 'Basico' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
]

const SECTION_TYPE_OPTIONS = [
  { value: 'texto', label: 'Texto' },
  { value: 'codigo', label: 'Codigo' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'imagen', label: 'Imagen (URL)' },
  { value: 'video', label: 'Video (URL)' },
]

/* ─── Markdown renderer ────────────────────────────────────────────────── */

function renderInline(text, keyPrefix = '') {
  if (!text) return text
  const regex = /(\!\[([^\]]*)\]\(([^)]+)\)|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  const parts = []
  let lastIndex = 0
  let match
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index))
    const key = `${keyPrefix}-${match.index}`
    if (match[3]) {
      // ![alt](url) inline image
      parts.push(
        <img key={key} src={match[3]} alt={match[2] || ''} className="inline-block max-h-32 rounded object-contain align-middle mx-1" onError={e => { e.target.style.display = 'none' }} />
      )
    } else if (match[4]) parts.push(<strong key={key} className="text-white font-semibold">{match[4]}</strong>)
    else if (match[5]) parts.push(<em key={key} className="text-white/80 italic">{match[5]}</em>)
    else if (match[6]) parts.push(<code key={key} className="px-1 py-0.5 rounded text-[0.9em] font-mono" style={{ background: 'rgba(0,209,255,0.1)', color: '#00D1FF' }}>{match[6]}</code>)
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex))
  return parts.length > 1 ? parts : text
}

function MarkdownText({ text }) {
  if (!text) return null
  const lines = text.split('\n')
  const elements = []
  let listItems = []
  let listType = null

  const flushList = () => {
    if (!listItems.length) return
    const Tag = listType === 'ol' ? 'ol' : 'ul'
    elements.push(
      <Tag key={`list-${elements.length}`} className={`${listType === 'ol' ? 'list-decimal' : 'list-disc'} list-inside space-y-1 my-2 text-white/75 text-sm`}>
        {listItems.map((item, j) => <li key={j}>{renderInline(item, `li-${elements.length}-${j}`)}</li>)}
      </Tag>
    )
    listItems = []
    listType = null
  }

  lines.forEach((line, i) => {
    // Block-level image: line is exactly ![alt](url)
    const imgMatch = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)$/)
    if (imgMatch) {
      flushList()
      elements.push(
        <div key={i} className="my-3 flex justify-center">
          <img
            src={imgMatch[2]}
            alt={imgMatch[1] || ''}
            className="max-w-full rounded-lg border border-white/10 max-h-72 object-contain"
            onError={e => { e.target.style.display = 'none' }}
          />
        </div>
      )
    } else if (line.startsWith('### ')) {
      flushList()
      elements.push(<h4 key={i} className="text-white font-semibold text-base mt-4 mb-1">{renderInline(line.slice(4), `h4-${i}`)}</h4>)
    } else if (line.startsWith('## ')) {
      flushList()
      elements.push(<h3 key={i} className="text-white font-bold text-lg mt-5 mb-2">{renderInline(line.slice(3), `h3-${i}`)}</h3>)
    } else if (line.startsWith('# ')) {
      flushList()
      elements.push(<h2 key={i} className="text-white font-bold text-xl mt-5 mb-2">{renderInline(line.slice(2), `h2-${i}`)}</h2>)
    } else if (/^[-*] /.test(line)) {
      if (listType !== 'ul') { flushList(); listType = 'ul' }
      listItems.push(line.slice(2))
    } else if (/^\d+\. /.test(line)) {
      if (listType !== 'ol') { flushList(); listType = 'ol' }
      listItems.push(line.replace(/^\d+\. /, ''))
    } else if (line.trim() === '') {
      flushList()
    } else {
      flushList()
      elements.push(<p key={i} className="text-white/80 text-sm leading-relaxed">{renderInline(line, `p-${i}`)}</p>)
    }
  })
  flushList()
  return <div className="space-y-1">{elements}</div>
}

/* ─── Section Renderers ───────────────────────────────────────────────── */

function TextSection({ contenido }) {
  // Split into logical blocks (double newline = new block)
  const blocks = (contenido || '').split(/\n{2,}/).filter(b => b.trim())
  const [revealed, setRevealed] = useState(1) // how many blocks are visible

  const showAll = revealed >= blocks.length
  const canRevealMore = revealed < blocks.length

  // Reset when content changes
  useEffect(() => { setRevealed(1) }, [contenido])

  if (blocks.length <= 1) {
    return (
      <div className="text-white/80 text-sm leading-relaxed">
        <MarkdownText text={contenido} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {blocks.slice(0, revealed).map((block, i) => (
        <motion.div
          key={i}
          initial={i === revealed - 1 && revealed > 1 ? { opacity: 0, y: 12 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="relative"
        >
          {/* Step indicator */}
          <div className="flex items-start gap-3">
            <div
              className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold mt-0.5"
              style={{
                background: i === revealed - 1 ? 'var(--c-primary)' : 'rgba(255,255,255,0.08)',
                color: i === revealed - 1 ? 'white' : 'rgba(255,255,255,0.3)',
              }}
            >
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <MarkdownText text={block} />
            </div>
          </div>
          {/* Connector line */}
          {i < revealed - 1 && (
            <div
              className="absolute left-2.5 top-6 w-px"
              style={{ height: 'calc(100% - 8px)', background: 'rgba(255,255,255,0.05)' }}
            />
          )}
        </motion.div>
      ))}

      {/* Continue / Show all button */}
      {canRevealMore && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-3 pl-8"
        >
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          <div className="flex gap-2">
            <button
              onClick={() => setRevealed(r => Math.min(r + 1, blocks.length))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{ background: 'rgba(252,101,31,0.1)', color: 'var(--c-primary)', border: '1px solid rgba(252,101,31,0.2)' }}
            >
              <FiChevronRight size={13} /> Continuar
            </button>
            <button
              onClick={() => setRevealed(blocks.length)}
              className="px-3 py-1.5 rounded-lg text-xs transition-all"
              style={{ color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.04)' }}
            >
              Ver todo
            </button>
          </div>
          <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
        </motion.div>
      )}

      {/* Progress indicator when reading block by block */}
      {!showAll && (
        <div className="flex items-center gap-1 pl-8">
          {blocks.map((_, i) => (
            <div
              key={i}
              className="h-1 rounded-full transition-all duration-300"
              style={{
                width: i < revealed ? 20 : 8,
                background: i < revealed ? 'var(--c-primary)' : 'rgba(255,255,255,0.1)',
              }}
            />
          ))}
          <span className="text-[10px] text-white/25 ml-1">{revealed}/{blocks.length}</span>
        </div>
      )}
    </div>
  )
}

function CodeSection({ contenido }) {
  return (
    <pre className="rounded-lg p-4 text-sm font-mono overflow-x-auto leading-relaxed bg-black/40 border border-white/[0.08] text-[#00D1FF]">
      <code>{contenido}</code>
    </pre>
  )
}

function QuizSection({ contenido, onQuizAnswer }) {
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)

  let quiz
  try {
    quiz = typeof contenido === 'string' ? JSON.parse(contenido) : contenido
  } catch {
    return <p className="text-white/50 text-sm">Quiz mal formateado</p>
  }

  const { pregunta, opciones = [], respuesta_correcta } = quiz

  const handleVerify = () => {
    setRevealed(true)
    if (onQuizAnswer) onQuizAnswer(selected === respuesta_correcta ? 1 : 0, 1)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <FiAward size={16} className="text-[var(--c-secondary)]" />
        <p className="text-white font-medium text-sm">Quiz</p>
      </div>
      <p className="text-white/90 font-medium text-sm">{pregunta}</p>
      <div className="space-y-2">
        {opciones.map((opt, i) => {
          const isCorrect = i === respuesta_correcta
          const isSelected = selected === i
          let borderColor = 'rgba(255,255,255,0.1)'
          let bg = 'rgba(255,255,255,0.03)'
          let textColor = 'text-white/80'
          if (revealed && isCorrect) { borderColor = 'rgba(34,197,94,0.6)'; bg = 'rgba(34,197,94,0.1)'; textColor = 'text-[#22c55e]' }
          else if (revealed && isSelected && !isCorrect) { borderColor = 'rgba(239,68,68,0.6)'; bg = 'rgba(239,68,68,0.1)'; textColor = 'text-[#EF4444]' }
          else if (isSelected) { borderColor = 'rgba(252,101,31,0.5)'; bg = 'rgba(252,101,31,0.08)' }
          return (
            <button
              key={i}
              onClick={() => { if (!revealed) setSelected(i) }}
              className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all duration-200 flex items-center gap-3 ${textColor}`}
              style={{ background: bg, border: `1px solid ${borderColor}` }}
            >
              <span className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center shrink-0 text-xs">
                {revealed && isCorrect && <FiCheck size={12} className="text-[#22c55e]" />}
                {revealed && isSelected && !isCorrect && <FiX size={12} className="text-[#EF4444]" />}
              </span>
              {opt}
            </button>
          )
        })}
      </div>
      {!revealed && selected !== null && (
        <Button size="sm" onClick={handleVerify}>Verificar respuesta</Button>
      )}
      {revealed && (
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg"
          style={{
            background: selected === respuesta_correcta ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
            border: `1px solid ${selected === respuesta_correcta ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          }}
        >
          {selected === respuesta_correcta
            ? <><FiCheckCircle size={16} className="text-[#22c55e] shrink-0" /><span className="text-sm text-[#22c55e] font-medium">Correcto! Excelente trabajo.</span></>
            : <><FiX size={16} className="text-[#EF4444] shrink-0" /><span className="text-sm text-[#EF4444]/80">Incorrecto. La respuesta correcta está marcada en verde.</span></>
          }
        </motion.div>
      )}
    </div>
  )
}

function ImageSection({ contenido }) {
  const [error, setError] = useState(false)
  const isUrl = contenido && /^https?:\/\//i.test(contenido)
  if (!contenido || error || !isUrl) {
    return (
      <div className="rounded-lg p-6 flex flex-col items-center gap-2" style={{ background: 'rgba(139,92,246,0.05)', border: '1px dashed rgba(139,92,246,0.2)' }}>
        <FiImage size={20} style={{ color: 'rgba(139,92,246,0.4)' }} />
        <p className="text-xs text-white/30">Imagen no disponible</p>
        {contenido && !isUrl && <p className="text-[10px] text-white/20 italic text-center max-w-xs">{contenido}</p>}
      </div>
    )
  }
  return (
    <div className="rounded-lg overflow-hidden">
      <img src={contenido} alt="Contenido visual" className="w-full max-h-96 object-contain rounded-lg" onError={() => setError(true)} />
    </div>
  )
}

function FlashcardsSection({ contenido }) {
  let cards = []
  try {
    const parsed = typeof contenido === 'string' ? JSON.parse(contenido) : contenido
    cards = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : [])
  } catch { return <p className="text-white/50 text-sm">Tarjetas mal formateadas</p> }
  if (!cards.length) return <p className="text-white/40 text-sm">Sin tarjetas</p>
  const [index, setIndex] = useState(0)
  const currentCard = cards[index]
  return (
    <div className="space-y-3">
      <FlashcardItem key={index} card={currentCard} index={index} total={cards.length} />
      {cards.length > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setIndex(i => Math.max(i - 1, 0))}
            disabled={index === 0}
            className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-30 text-white/50 hover:text-white transition-all"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          >← Anterior</button>
          <span className="text-xs text-white/30">{index + 1} / {cards.length}</span>
          <button
            onClick={() => setIndex(i => Math.min(i + 1, cards.length - 1))}
            disabled={index === cards.length - 1}
            className="px-3 py-1.5 rounded-lg text-xs disabled:opacity-30 text-white/50 hover:text-white transition-all"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          >Siguiente →</button>
        </div>
      )}
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
          allowFullScreen title="Video"
        />
      </div>
    )
  }
  return <video controls className="w-full rounded-lg max-h-96"><source src={contenido} /></video>
}

const SECTION_RENDERERS = { texto: TextSection, codigo: CodeSection, quiz: QuizSection, imagen: ImageSection, video: VideoSection, tarjetas: FlashcardsSection }
const SECTION_TYPE_LABELS = { texto: 'Lectura', codigo: 'Codigo', quiz: 'Quiz', imagen: 'Visual', video: 'Video', tarjetas: 'Tarjetas' }

/* ─── Flashcards Panel ────────────────────────────────────────────────── */

function FlashcardItem({ card, index, total }) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div
      className="relative cursor-pointer select-none"
      style={{ perspective: '1000px', height: 220 }}
      onClick={() => setFlipped(f => !f)}
    >
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.45, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d', position: 'relative', width: '100%', height: '100%' }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-8 text-center"
          style={{
            backfaceVisibility: 'hidden',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <p className="text-[10px] text-white/25 uppercase tracking-widest mb-4">Pregunta {index + 1}/{total}</p>
          <p className="text-white font-medium text-sm leading-relaxed">{card.pregunta}</p>
          <p className="text-white/20 text-[11px] mt-5 flex items-center gap-1.5">
            <FiRotateCcw size={11} /> Toca para ver respuesta
          </p>
        </div>
        {/* Back */}
        <div
          className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center p-8 text-center"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: 'rgba(252,101,31,0.06)',
            border: '1px solid rgba(252,101,31,0.2)',
          }}
        >
          <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: 'rgba(252,101,31,0.5)' }}>Respuesta</p>
          <p className="text-white/90 text-sm leading-relaxed">{card.respuesta}</p>
          <p className="text-white/20 text-[11px] mt-5 flex items-center gap-1.5">
            <FiRotateCcw size={11} /> Toca para volver
          </p>
        </div>
      </motion.div>
    </div>
  )
}

/* ─── AI cache helpers ────────────────────────────────────────────────── */

const AI_CACHE_KEY = 'divergencia_ai_cache'

function loadAiCache(topicId, type) {
  try {
    const raw = localStorage.getItem(AI_CACHE_KEY)
    const all = raw ? JSON.parse(raw) : {}
    return all[topicId]?.[type] ?? null
  } catch { return null }
}

function saveAiCache(topicId, type, data) {
  try {
    const raw = localStorage.getItem(AI_CACHE_KEY)
    const all = raw ? JSON.parse(raw) : {}
    if (!all[topicId]) all[topicId] = {}
    all[topicId][type] = data
    all[topicId][`${type}_date`] = new Date().toISOString()
    localStorage.setItem(AI_CACHE_KEY, JSON.stringify(all))
  } catch {}
}

/* ─── AI Illustrated Card Panel ──────────────────────────────────────── */

function AIIllustrativeCardPanel({ topic }) {
  const [card, setCard] = useState(() => loadAiCache(topic.id, 'card'))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generate = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await generateIllustrativeCard(topic)
      if (result) { setCard(result); saveAiCache(topic.id, 'card', result) }
      else setError('No se pudo generar la tarjeta')
    } catch (e) {
      setError(e.message || 'Error al generar')
    } finally {
      setLoading(false)
    }
  }

  if (!card && !loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
        <div className="text-5xl mb-2">✨</div>
        <p className="text-white/60 text-sm text-center max-w-xs">
          Genera una tarjeta visual con la esencia del tema, un ejemplo concreto y un tip de estudio.
        </p>
        {error && <p className="text-[#EF4444] text-xs">{error}</p>}
        <button
          onClick={generate}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(252,101,31,0.15))', color: 'var(--c-secondary)', border: '1px solid rgba(139,92,246,0.3)' }}
        >
          <FiZap size={14} /> Generar tarjeta IA
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--c-secondary)', borderTopColor: 'transparent' }} />
        <p className="text-white/40 text-sm">Generando tarjeta ilustrativa...</p>
      </div>
    )
  }

  const bgColor = card.color || 'var(--c-primary)'

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center gap-6">
      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ border: `1px solid ${bgColor}30` }}
      >
        {/* Card header */}
        <div className="px-6 pt-6 pb-4" style={{ background: `linear-gradient(135deg, ${bgColor}20, ${bgColor}08)` }}>
          <div className="flex items-center gap-3 mb-3">
            <span className="text-4xl">{card.emoji || '🧠'}</span>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: bgColor }}>Concepto clave</p>
              <p className="text-white font-semibold text-sm leading-snug mt-0.5">{card.concepto}</p>
            </div>
          </div>
        </div>

        {/* Example */}
        <div className="px-6 py-4 border-t" style={{ borderColor: `${bgColor}15` }}>
          <p className="text-[10px] uppercase tracking-wider font-semibold text-white/40 mb-2">Ejemplo</p>
          <p className="text-white/75 text-sm leading-relaxed">{card.ejemplo}</p>
        </div>

        {/* Tip */}
        <div className="px-6 py-4 border-t rounded-b-2xl" style={{ borderColor: `${bgColor}15`, background: `${bgColor}08` }}>
          <div className="flex items-start gap-2">
            <span className="text-base mt-0.5">💡</span>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-semibold mb-1" style={{ color: bgColor }}>Tip</p>
              <p className="text-white/65 text-xs leading-relaxed">{card.tip}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Regenerate */}
      <button
        onClick={generate}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
        style={{ color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.04)' }}
      >
        <FiRotateCcw size={11} /> Regenerar
      </button>
    </div>
  )
}

function FlashcardsPanel({ topic }) {
  const [cards, setCards] = useState(() => loadAiCache(topic.id, 'flashcards') || [])
  const [loading, setLoading] = useState(false)
  const [current, setCurrent] = useState(0)
  const [error, setError] = useState(null)

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await generateFlashcards(topic)
      setCards(result)
      setCurrent(0)
      saveAiCache(topic.id, 'flashcards', result)
    } catch {
      setError('Error generando flashcards. Verifica tu API key de Gemini.')
    } finally {
      setLoading(false)
    }
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-16 px-6">
        <div className="text-5xl">🧠</div>
        <div className="text-center space-y-1">
          <p className="text-white/70 text-sm font-medium">Flashcards con IA</p>
          <p className="text-white/35 text-xs max-w-xs">
            Genera tarjetas de estudio dinámicas basadas en el contenido de este tema
          </p>
        </div>
        {error && <p className="text-[#EF4444] text-xs text-center">{error}</p>}
        <Button onClick={generate} loading={loading} size="sm">
          <FiZap size={13} className="mr-1.5" />
          {loading ? 'Generando...' : 'Generar Flashcards'}
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg"
          >
            <FlashcardItem card={cards[current]} index={current} total={cards.length} />
          </motion.div>
        </AnimatePresence>
        {/* Dots */}
        <div className="flex items-center gap-1.5 mt-4">
          {cards.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className="rounded-full transition-all duration-200"
              style={{
                width: i === current ? 20 : 6,
                height: 6,
                background: i === current ? 'var(--c-primary)' : 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.08] gap-2">
        <Button
          variant="ghost" size="sm" icon={<FiChevronLeft size={16} />}
          onClick={() => setCurrent(c => Math.max(0, c - 1))}
          disabled={current === 0}
        >Anterior</Button>

        <button
          onClick={generate}
          disabled={loading}
          className="p-1.5 rounded-lg text-white/30 hover:text-[var(--c-primary)] hover:bg-white/[0.05] transition-colors"
          title="Regenerar"
        >
          <FiRotateCcw size={14} className={loading ? 'animate-spin' : ''} />
        </button>

        <Button
          variant="ghost" size="sm" iconRight={<FiChevronRight size={16} />}
          onClick={() => setCurrent(c => Math.min(cards.length - 1, c + 1))}
          disabled={current === cards.length - 1}
        >Siguiente</Button>
      </div>
    </div>
  )
}

/* ─── AI Dynamic Quiz Panel ───────────────────────────────────────────── */

function AIDynamicQuizPanel({ topic }) {
  const [questions, setQuestions] = useState(() => loadAiCache(topic.id, 'quiz') || [])
  const [loading, setLoading] = useState(false)
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers] = useState({})
  const [revealed, setRevealed] = useState({})
  const [finished, setFinished] = useState(false)
  const [error, setError] = useState(null)

  const generate = async () => {
    setLoading(true)
    setError(null)
    setAnswers({})
    setRevealed({})
    setFinished(false)
    setCurrent(0)
    try {
      const result = await generateDynamicQuiz(topic)
      setQuestions(result)
      saveAiCache(topic.id, 'quiz', result)
    } catch {
      setError('Error generando quiz. Verifica tu API key de Gemini.')
    } finally {
      setLoading(false)
    }
  }

  const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.respuesta_correcta ? 1 : 0), 0)

  const handleReveal = () => {
    setRevealed(r => ({ ...r, [current]: true }))
  }

  const handleNext = () => {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1)
    } else {
      setFinished(true)
    }
  }

  if (questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 py-16 px-6">
        <div className="text-5xl">📝</div>
        <div className="text-center space-y-1">
          <p className="text-white/70 text-sm font-medium">Quiz Dinámico con IA</p>
          <p className="text-white/35 text-xs max-w-xs">
            Genera un examen con preguntas únicas basadas en el contenido de este tema
          </p>
        </div>
        {error && <p className="text-[#EF4444] text-xs text-center">{error}</p>}
        <Button onClick={generate} loading={loading} size="sm">
          <FiZap size={13} className="mr-1.5" />
          {loading ? 'Generando...' : 'Generar Quiz'}
        </Button>
      </div>
    )
  }

  if (finished) {
    const pct = Math.round((score / questions.length) * 100)
    const emoji = pct >= 80 ? '🏆' : pct >= 60 ? '✅' : pct >= 40 ? '📚' : '💪'
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center h-full gap-5 py-16 px-6"
      >
        <div className="text-6xl">{emoji}</div>
        <div className="text-center space-y-1">
          <p className="text-white font-bold text-2xl">{score}/{questions.length}</p>
          <p className="text-white/50 text-sm">
            {pct >= 80 ? '¡Excelente dominio del tema!' : pct >= 60 ? 'Buen trabajo, sigue practicando' : 'Revisa el contenido y vuelve a intentarlo'}
          </p>
        </div>
        {/* Score bar */}
        <div className="w-full max-w-xs">
          <div className="w-full h-2 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: pct >= 80 ? '#22c55e' : pct >= 60 ? 'var(--c-primary)' : '#EF4444' }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, delay: 0.2 }}
            />
          </div>
          <p className="text-center text-white/30 text-xs mt-1">{pct}%</p>
        </div>
        {/* Review answers */}
        <div className="w-full max-w-sm space-y-1.5 max-h-36 overflow-y-auto">
          {questions.map((q, i) => (
            <div key={i} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
              {answers[i] === q.respuesta_correcta
                ? <FiCheckCircle size={12} className="text-[#22c55e] shrink-0" />
                : <FiX size={12} className="text-[#EF4444] shrink-0" />
              }
              <span className="text-white/50 truncate flex-1">{q.pregunta}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { setAnswers({}); setRevealed({}); setFinished(false); setCurrent(0) }}>
            <FiRotateCcw size={13} className="mr-1" /> Reintentar
          </Button>
          <Button size="sm" variant="ghost" onClick={generate} loading={loading}>
            <FiZap size={13} className="mr-1" /> Nuevo Quiz
          </Button>
        </div>
      </motion.div>
    )
  }

  const q = questions[current]
  const isRevealed = revealed[current]
  const selected = answers[current] ?? null

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="px-6 pt-4 pb-2">
        <div className="flex items-center justify-between text-[10px] text-white/30 mb-1.5">
          <span>Pregunta {current + 1} de {questions.length}</span>
          <span>{score} correcta{score !== 1 ? 's' : ''}</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${((current) / questions.length) * 100}%`, background: 'var(--c-primary)' }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <p className="text-white font-medium text-sm leading-relaxed">{q.pregunta}</p>
            <div className="space-y-2">
              {q.opciones.map((opt, i) => {
                const isCorrect = i === q.respuesta_correcta
                const isSelected = selected === i
                let borderColor = 'rgba(255,255,255,0.1)'
                let bg = 'rgba(255,255,255,0.03)'
                let textColor = 'rgba(255,255,255,0.8)'
                if (isRevealed && isCorrect) { borderColor = 'rgba(34,197,94,0.6)'; bg = 'rgba(34,197,94,0.1)'; textColor = '#22c55e' }
                else if (isRevealed && isSelected && !isCorrect) { borderColor = 'rgba(239,68,68,0.6)'; bg = 'rgba(239,68,68,0.1)'; textColor = '#EF4444' }
                else if (isSelected) { borderColor = 'rgba(252,101,31,0.5)'; bg = 'rgba(252,101,31,0.08)' }
                return (
                  <button
                    key={i}
                    onClick={() => { if (!isRevealed) setAnswers(a => ({ ...a, [current]: i })) }}
                    disabled={isRevealed}
                    className="w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all duration-200 flex items-center gap-3"
                    style={{ background: bg, border: `1px solid ${borderColor}`, color: textColor }}
                  >
                    <span className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center shrink-0 text-xs font-medium" style={{ borderColor }}>
                      {isRevealed && isCorrect && <FiCheck size={11} style={{ color: '#22c55e' }} />}
                      {isRevealed && isSelected && !isCorrect && <FiX size={11} style={{ color: '#EF4444' }} />}
                      {!isRevealed && String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                )
              })}
            </div>
            {/* Explanation after reveal */}
            {isRevealed && q.explicacion && (
              <motion.div
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 px-3 py-2.5 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <FiBookOpen size={14} className="text-white/40 mt-0.5 shrink-0" />
                <p className="text-white/60 text-xs leading-relaxed">{q.explicacion}</p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.08] gap-3">
        {!isRevealed ? (
          <Button
            size="sm" onClick={handleReveal}
            disabled={selected === null}
            className="w-full"
          >
            Verificar respuesta
          </Button>
        ) : (
          <Button size="sm" onClick={handleNext} className="w-full">
            {current < questions.length - 1 ? 'Siguiente pregunta' : 'Ver resultados'}
            <FiChevronRight size={14} className="ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}

/* ─── Section Edit Modal ──────────────────────────────────────────────── */

function SectionEditModal({ open, onClose, section, onSave, loading }) {
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState('texto')
  const [contenido, setContenido] = useState('')

  useEffect(() => {
    if (section) {
      setTitulo(section.titulo || '')
      setTipo(section.tipo || 'texto')
      setContenido(
        typeof section.contenido === 'object'
          ? JSON.stringify(section.contenido, null, 2)
          : section.contenido || ''
      )
    }
  }, [section])

  return (
    <Modal
      open={open} onClose={onClose} title="Editar Seccion" size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave({ titulo: titulo.trim(), tipo, contenido })} loading={loading}>Guardar</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Titulo de la seccion" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Titulo opcional..." />
        <Select label="Tipo de contenido" value={tipo} onChange={e => setTipo(e.target.value)} options={SECTION_TYPE_OPTIONS} />
        {tipo === 'quiz' ? (
          <div className="space-y-2">
            <p className="text-xs text-white/40">Formato JSON: {`{"pregunta":"...","opciones":["A","B","C","D"],"respuesta_correcta":0}`}</p>
            <Textarea label="Contenido (JSON)" value={contenido} onChange={e => setContenido(e.target.value)} rows={6} />
          </div>
        ) : (
          <Textarea
            label="Contenido" value={contenido} onChange={e => setContenido(e.target.value)}
            rows={tipo === 'codigo' ? 10 : 6}
            placeholder={tipo === 'codigo' ? 'Codigo...' : tipo === 'imagen' ? 'URL de la imagen' : tipo === 'video' ? 'URL del video' : 'Escribe el contenido...'}
          />
        )}
      </div>
    </Modal>
  )
}

/* ─── Topic Metadata Edit Modal ───────────────────────────────────────── */

function TopicMetaEditModal({ open, onClose, topic, onSave, loading }) {
  const [titulo, setTitulo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [categoria, setCategoria] = useState('')
  const [nivel, setNivel] = useState('')
  const [tags, setTags] = useState('')

  useEffect(() => {
    if (topic) {
      setTitulo(topic.titulo || '')
      setDescripcion(topic.descripcion || '')
      setCategoria(topic.categoria || '')
      setNivel(topic.nivel || '')
      setTags(Array.isArray(topic.tags) ? topic.tags.join(', ') : '')
    }
  }, [topic])

  return (
    <Modal
      open={open} onClose={onClose} title="Editar Tema" size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave({ titulo: titulo.trim(), descripcion: descripcion.trim(), categoria, nivel, tags: tags.split(',').map(t => t.trim()).filter(Boolean) })} loading={loading}>
            Guardar cambios
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Titulo" value={titulo} onChange={e => setTitulo(e.target.value)} />
        <Textarea label="Descripcion" value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3} />
        <div className="grid grid-cols-2 gap-4">
          <Select label="Categoria" value={categoria} onChange={e => setCategoria(e.target.value)} options={CATEGORIA_OPTIONS} />
          <Select label="Nivel" value={nivel} onChange={e => setNivel(e.target.value)} options={NIVEL_OPTIONS} />
        </div>
        <Input label="Tags (separados por coma)" value={tags} onChange={e => setTags(e.target.value)} placeholder="neural-networks, deep-learning, ..." />
      </div>
    </Modal>
  )
}

/* ─── Delete Confirm Modal ────────────────────────────────────────────── */

function DeleteConfirmModal({ open, onClose, onConfirm, loading, message }) {
  return (
    <Modal
      open={open} onClose={onClose} title="Confirmar eliminacion" size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>Eliminar</Button>
        </>
      }
    >
      <p className="text-white/60 text-sm">{message}</p>
    </Modal>
  )
}

/* ─── Main Component ──────────────────────────────────────────────────── */

export default function TopicDetail({
  topic, onClose, progressData, onMarkComplete, onUnmark, onQuizScore,
  onUpdateTopic, onDeleteTopic,
}) {
  const { isAdmin } = useAuth()
  const [currentSection, setCurrentSection] = useState(0)
  const [activeTab, setActiveTab] = useState('content') // 'content' | 'flashcards' | 'quiz'
  const [editingSection, setEditingSection] = useState(null)
  const [showSectionEdit, setShowSectionEdit] = useState(false)
  const [showMetaEdit, setShowMetaEdit] = useState(false)
  const [showDeleteTopic, setShowDeleteTopic] = useState(false)
  const [showDeleteSection, setShowDeleteSection] = useState(null)
  const [saving, setSaving] = useState(false)

  if (!topic) return null

  const sections = Array.isArray(topic.contenido) ? topic.contenido : []
  const recursos = Array.isArray(topic.recursos) ? topic.recursos : []
  const total = sections.length
  const completedSections = new Set(progressData?.completedSections || [])
  const completedCount = completedSections.size
  const progress = total > 0 ? Math.round((completedCount / total) * 100) : 0
  const isTopicComplete = progressData?.completed || false

  const section = sections[currentSection]
  const isSectionComplete = completedSections.has(currentSection)
  const Renderer = section ? SECTION_RENDERERS[section.tipo] || TextSection : null

  const handleToggleComplete = () => {
    if (isSectionComplete) onUnmark?.(topic.id, currentSection)
    else onMarkComplete?.(topic.id, currentSection, total)
  }

  const handleQuizAnswer = useCallback((correct, totalQ) => {
    onQuizScore?.(topic.id, currentSection, correct, totalQ)
    if (!isSectionComplete) onMarkComplete?.(topic.id, currentSection, total)
  }, [topic.id, currentSection, total, isSectionComplete, onQuizScore, onMarkComplete])

  const handleSaveSection = async (sectionData) => {
    if (!onUpdateTopic) return
    setSaving(true)
    const newSections = [...sections]
    if (editingSection !== null && editingSection < newSections.length) {
      newSections[editingSection] = { ...newSections[editingSection], ...sectionData, orden: editingSection }
    } else {
      newSections.push({ ...sectionData, orden: newSections.length })
    }
    await onUpdateTopic(topic.id, { contenido: newSections })
    setSaving(false)
    setShowSectionEdit(false)
    setEditingSection(null)
  }

  const handleDeleteSection = async () => {
    if (!onUpdateTopic || showDeleteSection === null) return
    setSaving(true)
    const newSections = sections.filter((_, i) => i !== showDeleteSection).map((s, i) => ({ ...s, orden: i }))
    await onUpdateTopic(topic.id, { contenido: newSections })
    setSaving(false)
    setShowDeleteSection(null)
    if (currentSection >= newSections.length) setCurrentSection(Math.max(0, newSections.length - 1))
  }

  const handleMoveSection = async (idx, dir) => {
    if (!onUpdateTopic) return
    const next = idx + dir
    if (next < 0 || next >= sections.length) return
    const copy = [...sections]
    ;[copy[idx], copy[next]] = [copy[next], copy[idx]]
    await onUpdateTopic(topic.id, { contenido: copy.map((s, i) => ({ ...s, orden: i })) })
    setCurrentSection(next)
  }

  const handleSaveTopicMeta = async (metaData) => {
    if (!onUpdateTopic) return
    setSaving(true)
    await onUpdateTopic(topic.id, metaData)
    setSaving(false)
    setShowMetaEdit(false)
  }

  const handleDeleteTopic = async () => {
    if (!onDeleteTopic) return
    setSaving(true)
    await onDeleteTopic(topic.id)
    setSaving(false)
    setShowDeleteTopic(false)
    onClose()
  }

  const TABS = [
    { id: 'content', label: 'Contenido', icon: <FiBookOpen size={13} /> },
    { id: 'card', label: 'Tarjeta IA', icon: <FiZap size={13} />, ai: true },
    { id: 'flashcards', label: 'Flashcards', icon: <FiRotateCcw size={13} />, ai: true },
    { id: 'quiz', label: 'Quiz IA', icon: <FiAward size={13} />, ai: true },
  ]

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
        className="relative z-10 flex w-full max-w-5xl mx-auto my-4 rounded-2xl overflow-hidden border border-[var(--c-primary)]/15"
        style={{ background: 'rgba(12,6,8,0.98)' }}
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ duration: 0.25 }}
      >
        {/* Sidebar: Section list */}
        <div className="w-56 shrink-0 border-r border-white/[0.08] bg-white/[0.01] flex-col overflow-hidden hidden md:flex">
          <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">Secciones</p>
            {isAdmin && (
              <button
                onClick={() => { setEditingSection(null); setShowSectionEdit(true) }}
                className="p-1 rounded text-white/30 hover:text-[var(--c-primary)] hover:bg-white/[0.05] transition-colors"
                title="Agregar seccion"
              >
                <FiPlus size={14} />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {sections.map((sec, i) => {
              const done = completedSections.has(i)
              const active = i === currentSection && activeTab === 'content'
              return (
                <div key={i} className="group/item relative flex items-center">
                  <button
                    onClick={() => { setCurrentSection(i); setActiveTab('content') }}
                    className={`w-full flex items-center gap-2.5 px-4 py-2 text-left text-xs transition-all duration-150 ${
                      active ? 'bg-white/[0.06] text-white' : 'text-white/50 hover:text-white/70 hover:bg-white/[0.03]'
                    }`}
                  >
                    {done
                      ? <FiCheckCircle size={14} className="text-[#22c55e] shrink-0" />
                      : <FiCircle size={14} className="text-white/20 shrink-0" />
                    }
                    <span className="truncate flex-1">
                      {sec.titulo || `${SECTION_TYPE_LABELS[sec.tipo] || 'Seccion'} ${i + 1}`}
                    </span>
                  </button>
                  {isAdmin && (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover/item:flex items-center gap-0.5 rounded-md px-0.5 py-0.5 border border-white/[0.06]" style={{ background: 'rgba(12,6,8,0.95)' }}>
                      <button onClick={(e) => { e.stopPropagation(); handleMoveSection(i, -1) }} disabled={i === 0} className="p-0.5 rounded text-white/25 hover:text-white disabled:opacity-20 transition-colors" title="Subir"><FiArrowUp size={10} /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleMoveSection(i, 1) }} disabled={i === sections.length - 1} className="p-0.5 rounded text-white/25 hover:text-white disabled:opacity-20 transition-colors" title="Bajar"><FiArrowDown size={10} /></button>
                      <button onClick={(e) => { e.stopPropagation(); setEditingSection(i); setShowSectionEdit(true) }} className="p-0.5 rounded text-white/25 hover:text-[var(--c-primary)] transition-colors" title="Editar"><FiEdit2 size={10} /></button>
                      <button onClick={(e) => { e.stopPropagation(); setShowDeleteSection(i) }} className="p-0.5 rounded text-white/25 hover:text-[#EF4444] transition-colors" title="Eliminar"><FiTrash2 size={10} /></button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Progress summary */}
          <div className="px-4 py-3 border-t border-white/[0.06]">
            <div className="flex items-center justify-between text-[10px] text-white/40 mb-1.5">
              <span>{completedCount}/{total}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg, var(--c-primary), var(--c-secondary))' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            {isTopicComplete ? (
              <p className="text-[10px] text-[#22c55e] font-medium mt-1.5 flex items-center gap-1">
                <FiCheckCircle size={10} /> Tema completado
              </p>
            ) : topic.skills_relacionadas?.length > 0 && (
              <p className="text-[10px] text-white/30 mt-1.5">
                🏅 Desbloquea: {topic.skills_relacionadas.slice(0, 3).join(', ')}{topic.skills_relacionadas.length > 3 ? ` +${topic.skills_relacionadas.length - 3}` : ''}
              </p>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08]">
            <div className="flex items-center gap-3 min-w-0">
              <h2 className="text-white font-semibold font-title text-lg truncate">{topic.titulo}</h2>
              <Badge preset={topic.categoria} size="xs">{topic.categoria}</Badge>
              <Badge preset={NIVEL_PRESETS[topic.nivel]} size="xs">{topic.nivel}</Badge>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isAdmin && (
                <>
                  <button onClick={() => setShowMetaEdit(true)} className="p-1.5 rounded-lg text-white/30 hover:text-[var(--c-primary)] hover:bg-white/[0.05] transition-colors" title="Editar tema"><FiSettings size={16} /></button>
                  <button onClick={() => setShowDeleteTopic(true)} className="p-1.5 rounded-lg text-white/30 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors" title="Eliminar tema"><FiTrash2 size={16} /></button>
                </>
              )}
              <button onClick={onClose} className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"><FiX size={18} /></button>
            </div>
          </div>

          {/* AI / Content Tabs */}
          <div className="flex items-center gap-1 px-6 pt-3 pb-0 border-b border-white/[0.06]">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-t-lg transition-all duration-150 relative"
                style={{
                  color: activeTab === tab.id ? (tab.ai ? 'var(--c-secondary)' : 'var(--c-primary)') : 'rgba(255,255,255,0.35)',
                  background: activeTab === tab.id ? 'rgba(255,255,255,0.04)' : 'transparent',
                  borderBottom: activeTab === tab.id ? `2px solid ${tab.ai ? 'var(--c-secondary)' : 'var(--c-primary)'}` : '2px solid transparent',
                }}
              >
                {tab.icon}
                {tab.label}
                {tab.ai && (
                  <span className="text-[9px] px-1 rounded" style={{ background: 'rgba(139,92,246,0.2)', color: 'var(--c-secondary)' }}>IA</span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {activeTab === 'content' ? (
              <motion.div
                key="content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex-1 flex flex-col min-h-0"
              >
                {/* Mobile progress */}
                {total > 0 && (
                  <div className="px-6 pt-3 md:hidden">
                    <div className="flex items-center justify-between text-xs text-white/40 mb-1.5">
                      <span>Seccion {currentSection + 1} de {total}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, var(--c-primary), var(--c-secondary))' }} animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                    </div>
                  </div>
                )}

                {/* Admin edit button */}
                {isAdmin && section && (
                  <div className="px-6 pt-3 flex items-center gap-2">
                    <button
                      onClick={() => { setEditingSection(currentSection); setShowSectionEdit(true) }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] text-white/30 hover:text-[var(--c-primary)] hover:bg-[var(--c-primary)]/5 border border-white/[0.06] hover:border-[var(--c-primary)]/20 transition-all"
                    >
                      <FiEdit2 size={11} /> Editar seccion
                    </button>
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
                        {section.titulo && (
                          <h3 className="text-white font-semibold text-base mb-4">{section.titulo}</h3>
                        )}
                        {section.tipo === 'quiz'
                          ? <Renderer contenido={section.contenido} onQuizAnswer={handleQuizAnswer} />
                          : <Renderer contenido={section.contenido} />
                        }
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {total === 0 && (
                    <div className="text-center py-8">
                      <p className="text-white/40 text-sm">Este tema aún no tiene contenido.</p>
                      {isAdmin && (
                        <Button variant="outline" size="sm" icon={<FiPlus size={14} />} onClick={() => { setEditingSection(null); setShowSectionEdit(true) }} className="mt-3">
                          Agregar primera seccion
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.08] gap-3">
                  <Button variant="ghost" size="sm" icon={<FiChevronLeft size={16} />} onClick={() => setCurrentSection(s => Math.max(0, s - 1))} disabled={currentSection === 0 || total <= 1}>
                    Anterior
                  </Button>
                  {total > 0 && section?.tipo !== 'quiz' && (
                    <button
                      onClick={handleToggleComplete}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border"
                      style={isSectionComplete
                        ? { background: 'rgba(34,197,94,0.15)', color: '#22c55e', borderColor: 'rgba(34,197,94,0.3)' }
                        : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', borderColor: 'rgba(255,255,255,0.1)' }
                      }
                    >
                      {isSectionComplete ? <FiCheckCircle size={14} /> : <FiCircle size={14} />}
                      {isSectionComplete ? 'Completada' : 'Marcar completada'}
                    </button>
                  )}
                  <Button variant="ghost" size="sm" iconRight={<FiChevronRight size={16} />} onClick={() => setCurrentSection(s => Math.min(total - 1, s + 1))} disabled={currentSection === total - 1 || total <= 1}>
                    Siguiente
                  </Button>
                </div>
              </motion.div>
            ) : activeTab === 'card' ? (
              <motion.div key="card" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex-1 flex flex-col min-h-0">
                <AIIllustrativeCardPanel topic={topic} />
              </motion.div>
            ) : activeTab === 'flashcards' ? (
              <motion.div key="flashcards" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex-1 flex flex-col min-h-0">
                <FlashcardsPanel topic={topic} />
              </motion.div>
            ) : (
              <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="flex-1 flex flex-col min-h-0">
                <AIDynamicQuizPanel topic={topic} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Resources sidebar */}
        {recursos.length > 0 && (
          <div className="w-52 shrink-0 border-l border-white/[0.08] overflow-y-auto p-4 hidden lg:block" style={{ background: 'rgba(255,255,255,0.01)' }}>
            <p className="text-xs text-white/40 uppercase tracking-widest font-semibold mb-3">Recursos</p>
            <div className="space-y-2">
              {recursos.map((r, i) => (
                <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/[0.05] transition-colors">
                  <FiExternalLink size={13} className="shrink-0" />
                  <span className="truncate">{r.titulo}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Admin Modals */}
      {isAdmin && (
        <>
          <SectionEditModal
            open={showSectionEdit}
            onClose={() => { setShowSectionEdit(false); setEditingSection(null) }}
            section={editingSection !== null ? sections[editingSection] : { tipo: 'texto', contenido: '', titulo: '' }}
            onSave={handleSaveSection}
            loading={saving}
          />
          <TopicMetaEditModal open={showMetaEdit} onClose={() => setShowMetaEdit(false)} topic={topic} onSave={handleSaveTopicMeta} loading={saving} />
          <DeleteConfirmModal
            open={showDeleteSection !== null} onClose={() => setShowDeleteSection(null)} onConfirm={handleDeleteSection} loading={saving}
            message={`Eliminar la seccion "${sections[showDeleteSection]?.titulo || `Seccion ${(showDeleteSection ?? 0) + 1}`}"?`}
          />
          <DeleteConfirmModal
            open={showDeleteTopic} onClose={() => setShowDeleteTopic(false)} onConfirm={handleDeleteTopic} loading={saving}
            message={`Eliminar el tema "${topic.titulo}"? Esta accion no se puede deshacer.`}
          />
        </>
      )}
    </motion.div>
  )
}
