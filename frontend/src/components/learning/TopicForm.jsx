import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiPlus, FiTrash2, FiArrowUp, FiArrowDown, FiZap, FiCheck, FiX,
  FiType, FiCode, FiAward, FiImage, FiVideo, FiChevronDown, FiChevronUp,
  FiExternalLink, FiSearch, FiPaperclip,
} from 'react-icons/fi'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'
import Select from '../ui/Select'
import Button from '../ui/Button'
import LibraryPickerModal from '../library/LibraryPickerModal'
import { autoCategorize, generateTopicSections, suggestSectionImages, suggestSectionTitle } from '../../lib/gemini'

// ─── Section type metadata ────────────────────────────────────────────────────
const SECTION_TYPES = {
  texto:  { label: 'Texto',       icon: FiType,  color: '#00D1FF', bg: 'rgba(0,209,255,0.08)'   },
  codigo: { label: 'Código',      icon: FiCode,  color: '#22c55e', bg: 'rgba(34,197,94,0.08)'   },
  quiz:   { label: 'Quiz',        icon: FiAward, color: '#F59E0B', bg: 'rgba(245,158,11,0.08)'  },
  imagen: { label: 'Imagen',      icon: FiImage, color: '#8B5CF6', bg: 'rgba(139,92,246,0.08)'  },
  video:  { label: 'Video',       icon: FiVideo, color: '#FC651F', bg: 'rgba(252,101,31,0.08)'  },
}

const NIVEL_OPTIONS = [
  { value: 'basico', label: 'Basico' },
  { value: 'intermedio', label: 'Intermedio' },
  { value: 'avanzado', label: 'Avanzado' },
]

const emptySection = () => ({ tipo: 'texto', titulo: '', contenido: '', orden: 0 })
const emptyResource = () => ({ titulo: '', url: '', tipo: 'enlace' })

// ─── Section Type Picker ──────────────────────────────────────────────────────
function SectionTypePicker({ value, onChange }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {Object.entries(SECTION_TYPES).map(([type, meta]) => {
        const Icon = meta.icon
        const active = value === type
        return (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all"
            style={{
              background: active ? meta.bg : 'rgba(255,255,255,0.03)',
              color: active ? meta.color : 'rgba(255,255,255,0.35)',
              border: `1px solid ${active ? meta.color + '40' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            <Icon size={11} />
            {meta.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Quiz Builder ─────────────────────────────────────────────────────────────
const emptyQuestion = () => ({ pregunta: '', opciones: ['', '', '', ''], respuesta_correcta: 0, explicacion: '' })

function QuizBuilder({ value, onChange }) {
  // Parse stored value: could be JSON array, JSON object, or raw string
  const parseQuestions = (v) => {
    if (!v) return [emptyQuestion()]
    if (Array.isArray(v)) return v
    if (typeof v === 'string') {
      try {
        const parsed = JSON.parse(v)
        return Array.isArray(parsed) ? parsed : [parsed]
      } catch { return [emptyQuestion()] }
    }
    return [v]
  }

  const [questions, setQuestions] = useState(() => parseQuestions(value))

  const push = (newQs) => {
    setQuestions(newQs)
    onChange(JSON.stringify(newQs))
  }

  const updateQ = (qi, field, val) => {
    const next = questions.map((q, i) => i === qi ? { ...q, [field]: val } : q)
    push(next)
  }

  const updateOption = (qi, oi, val) => {
    const next = questions.map((q, i) => {
      if (i !== qi) return q
      const opciones = q.opciones.map((o, j) => j === oi ? val : o)
      return { ...q, opciones }
    })
    push(next)
  }

  const addQuestion = () => push([...questions, emptyQuestion()])
  const removeQuestion = (qi) => push(questions.filter((_, i) => i !== qi))

  return (
    <div className="space-y-3">
      {questions.map((q, qi) => (
        <div key={qi} className="rounded-lg bg-white/[0.03] border border-[#F59E0B]/15 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#F59E0B]/60 font-semibold uppercase tracking-wider">Pregunta {qi + 1}</span>
            {questions.length > 1 && (
              <button type="button" onClick={() => removeQuestion(qi)} className="text-white/20 hover:text-[#EF4444] transition-colors">
                <FiTrash2 size={11} />
              </button>
            )}
          </div>
          <input
            className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.07] text-sm text-white placeholder-white/20 outline-none"
            placeholder="Escribe la pregunta..."
            value={q.pregunta}
            onChange={e => updateQ(qi, 'pregunta', e.target.value)}
          />
          <div className="grid grid-cols-2 gap-1.5">
            {(q.opciones || ['', '', '', '']).map((opt, oi) => (
              <div key={oi} className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => updateQ(qi, 'respuesta_correcta', oi)}
                  className="w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-all"
                  style={{
                    borderColor: q.respuesta_correcta === oi ? '#22c55e' : 'rgba(255,255,255,0.15)',
                    background: q.respuesta_correcta === oi ? '#22c55e20' : 'transparent',
                  }}
                >
                  {q.respuesta_correcta === oi && <FiCheck size={8} style={{ color: '#22c55e' }} />}
                </button>
                <input
                  className="flex-1 min-w-0 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-white placeholder-white/15 outline-none"
                  placeholder={`Opción ${String.fromCharCode(65 + oi)}`}
                  value={opt}
                  onChange={e => updateOption(qi, oi, e.target.value)}
                />
              </div>
            ))}
          </div>
          <input
            className="w-full px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-white/60 placeholder-white/15 outline-none"
            placeholder="Explicación (opcional)"
            value={q.explicacion || ''}
            onChange={e => updateQ(qi, 'explicacion', e.target.value)}
          />
        </div>
      ))}
      <button
        type="button"
        onClick={addQuestion}
        className="text-xs text-[#F59E0B]/60 hover:text-[#F59E0B] flex items-center gap-1 transition-colors"
      >
        <FiPlus size={11} /> Agregar pregunta
      </button>
    </div>
  )
}

// ─── Single section card ──────────────────────────────────────────────────────
function SectionCard({ sec, idx, total, onUpdate, onRemove, onMove, topicTitulo = '' }) {
  const [collapsed, setCollapsed] = useState(false)
  const [showImgInput, setShowImgInput] = useState(false)
  const [imgUrl, setImgUrl] = useState('')
  const [imgAlt, setImgAlt] = useState('')
  const [imgSuggestions, setImgSuggestions] = useState(null) // { imagenes, queries }
  const [imgAiLoading, setImgAiLoading] = useState(false)
  const [titleAiLoading, setTitleAiLoading] = useState(false)
  const meta = SECTION_TYPES[sec.tipo] || SECTION_TYPES.texto
  const Icon = meta.icon

  const insertImage = () => {
    if (!imgUrl.trim()) return
    const tag = `\n\n![${imgAlt.trim() || 'Imagen'}](${imgUrl.trim()})\n`
    onUpdate('contenido', (sec.contenido || '') + tag)
    setImgUrl('')
    setImgAlt('')
    setShowImgInput(false)
    setImgSuggestions(null)
  }

  const insertSuggestedImage = (img) => {
    const tag = `\n\n![${img.descripcion}](${img.url})\n`
    onUpdate('contenido', (sec.contenido || '') + tag)
    setShowImgInput(false)
    setImgSuggestions(null)
  }

  const handleAiImages = async () => {
    setImgAiLoading(true)
    try {
      const result = await suggestSectionImages(topicTitulo, sec.titulo, sec.contenido)
      setImgSuggestions(result)
    } catch (e) { console.error(e) }
    finally { setImgAiLoading(false) }
  }

  const handleAiTitle = async () => {
    if (!sec.contenido?.trim()) return
    setTitleAiLoading(true)
    try {
      const title = await suggestSectionTitle(topicTitulo, sec.tipo, sec.contenido)
      if (title) onUpdate('titulo', title)
    } catch (e) { console.error(e) }
    finally { setTitleAiLoading(false) }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.18 }}
      className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${meta.color}18`, background: 'rgba(255,255,255,0.02)' }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer select-none"
        style={{ background: meta.bg }}
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: meta.color + '20' }}>
          <Icon size={12} style={{ color: meta.color }} />
        </div>
        <input
          className="flex-1 bg-transparent text-sm text-white/80 font-medium outline-none placeholder:text-white/25 min-w-0"
          value={sec.titulo || ''}
          onChange={e => { e.stopPropagation(); onUpdate('titulo', e.target.value) }}
          onClick={e => e.stopPropagation()}
          placeholder={`Título de la sección (${meta.label})`}
        />
        <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
          {/* AI title suggest */}
          {sec.contenido?.trim() && (
            <button
              type="button"
              onClick={handleAiTitle}
              disabled={titleAiLoading}
              title="Sugerir título con IA"
              className="p-1 rounded transition-colors disabled:opacity-40"
              style={{ color: titleAiLoading ? 'var(--c-secondary)' : 'rgba(139,92,246,0.5)' }}
            >
              <FiZap size={11} className={titleAiLoading ? 'animate-pulse' : ''} />
            </button>
          )}
          <button onClick={() => onMove(-1)} disabled={idx === 0} className="p-1 rounded text-white/20 hover:text-white disabled:opacity-20 transition-colors"><FiArrowUp size={12} /></button>
          <button onClick={() => onMove(1)} disabled={idx === total - 1} className="p-1 rounded text-white/20 hover:text-white disabled:opacity-20 transition-colors"><FiArrowDown size={12} /></button>
          <button onClick={onRemove} className="p-1 rounded text-white/20 hover:text-[#EF4444] transition-colors"><FiTrash2 size={12} /></button>
          <button className="p-1 rounded text-white/20 hover:text-white transition-colors">
            {collapsed ? <FiChevronDown size={12} /> : <FiChevronUp size={12} />}
          </button>
        </div>
      </div>

      {/* Body */}
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 py-3 space-y-2.5" onClick={e => e.stopPropagation()}>
              {/* Type picker */}
              <SectionTypePicker value={sec.tipo} onChange={v => onUpdate('tipo', v)} />

              {/* Content */}
              {sec.tipo === 'quiz' ? (
                <QuizBuilder
                  value={sec.contenido}
                  onChange={v => onUpdate('contenido', v)}
                />
              ) : (
                <Textarea
                  value={sec.contenido || ''}
                  onChange={e => onUpdate('contenido', e.target.value)}
                  rows={sec.tipo === 'codigo' ? 8 : sec.tipo === 'texto' ? 5 : 2}
                  placeholder={
                    sec.tipo === 'codigo'  ? '// Escribe o pega código aquí...' :
                    sec.tipo === 'imagen'  ? 'URL de la imagen (https://...)' :
                    sec.tipo === 'video'   ? 'URL del video de YouTube (https://...)' :
                    'Escribe el contenido aquí...'
                  }
                />
              )}

              {/* Image insert for texto type */}
              {sec.tipo === 'texto' && (
                <div>
                  <AnimatePresence initial={false}>
                  {showImgInput ? (
                    <motion.div
                      key="img-input"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 pt-1 overflow-hidden"
                    >
                      {/* Manual URL input */}
                      <input
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 placeholder:text-white/25 outline-none focus:border-white/20"
                        placeholder="URL de la imagen (https://...)"
                        value={imgUrl}
                        onChange={e => setImgUrl(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && insertImage()}
                      />
                      <div className="flex items-center gap-1.5">
                        <input
                          className="flex-1 bg-black/30 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/80 placeholder:text-white/25 outline-none focus:border-white/20"
                          placeholder="Descripción (opcional)"
                          value={imgAlt}
                          onChange={e => setImgAlt(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && insertImage()}
                        />
                        <button
                          type="button"
                          onClick={insertImage}
                          disabled={!imgUrl.trim()}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all disabled:opacity-40"
                          style={{ background: 'rgba(139,92,246,0.15)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.3)' }}
                        >
                          <FiCheck size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowImgInput(false); setImgUrl(''); setImgAlt(''); setImgSuggestions(null) }}
                          className="p-1.5 rounded-lg text-white/25 hover:text-white/50 transition-colors"
                        >
                          <FiX size={11} />
                        </button>
                      </div>

                      {/* AI image search */}
                      <button
                        type="button"
                        onClick={handleAiImages}
                        disabled={imgAiLoading}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all disabled:opacity-40 w-full justify-center"
                        style={{ background: 'rgba(252,101,31,0.08)', color: 'var(--c-primary)', border: '1px dashed rgba(252,101,31,0.25)' }}
                      >
                        <FiZap size={10} className={imgAiLoading ? 'animate-pulse' : ''} />
                        {imgAiLoading ? 'Buscando imágenes...' : 'Buscar imágenes con IA'}
                      </button>

                      {/* AI image suggestions */}
                      {imgSuggestions && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="rounded-lg p-2 space-y-1.5"
                          style={{ background: 'rgba(252,101,31,0.05)', border: '1px solid rgba(252,101,31,0.15)' }}
                        >
                          <p className="text-[9px] uppercase tracking-wider text-white/30 font-semibold">Sugerencias de IA</p>
                          {imgSuggestions.imagenes?.map((img, i) => (
                            <div key={i} className="flex items-center gap-2 group">
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] text-white/60 truncate">{img.descripcion}</p>
                                <p className="text-[9px] text-white/25 truncate">{img.fuente} · {img.url.slice(0, 50)}{img.url.length > 50 ? '…' : ''}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => insertSuggestedImage(img)}
                                className="shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[9px] font-medium opacity-0 group-hover:opacity-100 transition-all"
                                style={{ background: 'rgba(139,92,246,0.15)', color: '#8B5CF6' }}
                              >
                                <FiCheck size={9} /> Usar
                              </button>
                            </div>
                          ))}
                          {imgSuggestions.queries?.length > 0 && (
                            <div className="pt-1 border-t border-white/5">
                              <p className="text-[9px] text-white/25 mb-1">Buscar manualmente:</p>
                              <div className="flex flex-wrap gap-1">
                                {imgSuggestions.queries.map((q, i) => (
                                  <a
                                    key={i}
                                    href={`https://commons.wikimedia.org/w/index.php?search=${encodeURIComponent(q)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 px-2 py-0.5 rounded text-[9px] transition-colors"
                                    style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.08)' }}
                                  >
                                    <FiSearch size={8} /> {q}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </motion.div>
                  ) : (
                    <button
                      key="img-btn"
                      type="button"
                      onClick={() => setShowImgInput(true)}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] transition-all"
                      style={{ color: 'rgba(139,92,246,0.7)', border: '1px dashed rgba(139,92,246,0.2)' }}
                    >
                      <FiImage size={10} /> Insertar imagen
                    </button>
                  )}
                  </AnimatePresence>
                </div>
              )}

              {/* Char count for text */}
              {(sec.tipo === 'texto' || sec.tipo === 'codigo') && sec.contenido && (
                <p className="text-[10px] text-white/20 text-right">{sec.contenido.length} chars</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── AI Section Suggestion Card ───────────────────────────────────────────────
function AISuggestionCard({ sec, onAccept, onDismiss }) {
  const [expanded, setExpanded] = useState(false)
  const meta = SECTION_TYPES[sec.tipo] || SECTION_TYPES.texto
  const Icon = meta.icon

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10, scale: 0.97 }}
      transition={{ duration: 0.15 }}
      className="rounded-xl overflow-hidden"
      style={{ border: `1px solid ${meta.color}25`, background: `${meta.color}05` }}
    >
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: meta.color + '20' }}>
          <Icon size={10} style={{ color: meta.color }} />
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(e => !e)}>
          <p className="text-xs text-white/70 font-medium truncate">{sec.titulo}</p>
          {!expanded && <p className="text-[10px] text-white/30 truncate">{sec.preview || sec.contenido?.slice(0, 80)}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onAccept}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all"
            style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}
          >
            <FiCheck size={10} /> Agregar
          </button>
          <button type="button" onClick={onDismiss} className="p-1 rounded text-white/20 hover:text-white/50 transition-colors">
            <FiX size={10} />
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-3 pb-2.5">
          <p className="text-[11px] text-white/50 leading-relaxed whitespace-pre-wrap">{sec.contenido?.slice(0, 300)}{sec.contenido?.length > 300 ? '...' : ''}</p>
        </div>
      )}
    </motion.div>
  )
}

// ─── Main Form ────────────────────────────────────────────────────────────────
export default function TopicForm({ open, onClose, onSave, initialData, loading, existingCategories = [] }) {
  const [titulo, setTitulo] = useState(initialData?.titulo || '')
  const [descripcion, setDescripcion] = useState(initialData?.descripcion || '')
  const [categoria, setCategoria] = useState(initialData?.categoria || '')
  const [nivel, setNivel] = useState(initialData?.nivel || '')
  const [aiLoading, setAiLoading] = useState(false)
  const [sectionsAiLoading, setSectionsAiLoading] = useState(false)
  const [aiSuggested, setAiSuggested] = useState(null)       // { tags, recursos }
  const [aiSections, setAiSections] = useState([])            // suggested sections
  const [sections, setSections] = useState(
    initialData?.contenido?.length ? initialData.contenido : [emptySection()]
  )
  const [recursos, setRecursos] = useState(
    initialData?.recursos?.length ? initialData.recursos : []
  )
  const [showLibPicker, setShowLibPicker] = useState(false)
  const [skillsRelacionadas, setSkillsRelacionadas] = useState(initialData?.skills_relacionadas || [])

  useEffect(() => {
    if (open) {
      setTitulo(initialData?.titulo || '')
      setDescripcion(initialData?.descripcion || '')
      setCategoria(initialData?.categoria || '')
      setNivel(initialData?.nivel || '')
      setAiSuggested(null)
      setAiSections([])
      setSections(initialData?.contenido?.length ? initialData.contenido : [emptySection()])
      setRecursos(initialData?.recursos?.length ? initialData.recursos : [])
      setSkillsRelacionadas(initialData?.skills_relacionadas || [])
    }
  }, [open, initialData])

  // Auto-categorize
  const handleAutoCategorize = async () => {
    if (!titulo.trim()) return
    setAiLoading(true)
    try {
      const result = await autoCategorize(titulo, descripcion, existingCategories)
      if (result) {
        if (result.categoria) setCategoria(result.categoria)
        if (result.nivel) setNivel(result.nivel)
        setAiSuggested({
          tags: result.tags || [],
          recursos: (result.recursos || []).filter(r => r.titulo && r.url),
        })
      }
    } catch (e) { console.error('autoCategorize error:', e) }
    finally { setAiLoading(false) }
  }

  // Generate section suggestions
  const handleSuggestSections = async () => {
    if (!titulo.trim()) return
    setSectionsAiLoading(true)
    try {
      const result = await generateTopicSections(titulo, descripcion, categoria, nivel)
      setAiSections(result)
    } catch (e) { console.error('generateTopicSections error:', e) }
    finally { setSectionsAiLoading(false) }
  }

  const acceptAiSection = (idx) => {
    const sec = aiSections[idx]
    setSections(prev => [...prev, { ...sec, orden: prev.length }])
    setAiSections(prev => prev.filter((_, i) => i !== idx))
  }

  const dismissAiSection = (idx) => setAiSections(prev => prev.filter((_, i) => i !== idx))

  const acceptSuggestedResource = (res) => {
    setRecursos(r => [...r, { titulo: res.titulo, url: res.url, tipo: res.tipo || 'enlace' }])
    setAiSuggested(prev => prev ? { ...prev, recursos: prev.recursos.filter(r => r.url !== res.url) } : null)
  }

  // Section CRUD
  const addSection = () => setSections(s => [...s, { ...emptySection(), orden: s.length }])
  const removeSection = (idx) => setSections(s => s.filter((_, i) => i !== idx).map((sec, i) => ({ ...sec, orden: i })))
  const moveSection = (idx, dir) => {
    const next = idx + dir
    if (next < 0 || next >= sections.length) return
    const copy = [...sections];
    [copy[idx], copy[next]] = [copy[next], copy[idx]]
    setSections(copy.map((s, i) => ({ ...s, orden: i })))
  }
  const updateSection = (idx, field, value) => setSections(s => s.map((sec, i) => i === idx ? { ...sec, [field]: value } : sec))
  const addResource = () => setRecursos(r => [...r, emptyResource()])
  const removeResource = (idx) => setRecursos(r => r.filter((_, i) => i !== idx))
  const updateResource = (idx, field, value) => setRecursos(r => r.map((res, i) => i === idx ? { ...res, [field]: value } : res))

  const handleSubmit = () => {
    if (!titulo.trim() || !categoria || !nivel) return
    onSave({
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      categoria,
      nivel,
      contenido: sections,
      recursos: recursos.filter(r => r.titulo && r.url),
      skills_relacionadas: skillsRelacionadas,
    })
  }

  const allCategories = [...new Set(['ML','NLP','Vision','Datos','General', ...existingCategories, categoria].filter(Boolean))]

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initialData ? 'Editar Tema' : 'Nuevo Tema de Aprendizaje'}
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={loading}>
            {initialData ? 'Guardar cambios' : 'Crear Tema'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Titulo */}
        <Input
          label="Titulo"
          value={titulo}
          onChange={e => setTitulo(e.target.value)}
          placeholder="Ej: Introduccion a Redes Neuronales"
        />

        {/* Categoria + Nivel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1.5">Categoría</label>
            <input
              list="categoria-options"
              value={categoria}
              onChange={e => setCategoria(e.target.value)}
              placeholder="Ej: ML, NLP, Vision..."
              className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
              onFocus={e => (e.target.style.borderColor = 'var(--c-primary)')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
            <datalist id="categoria-options">
              {allCategories.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
          <Select label="Nivel" value={nivel} onChange={e => setNivel(e.target.value)} options={NIVEL_OPTIONS} />
        </div>

        {/* Skills que desbloquea este tema */}
        <div>
          <label className="block text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1.5">
            🏅 Habilidades que desbloquea
            <span className="ml-2 text-white/20 normal-case font-normal">Se añaden al perfil al completar el tema</span>
          </label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {skillsRelacionadas.map(s => (
              <span key={s} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
                {s}
                <button type="button" onClick={() => setSkillsRelacionadas(p => p.filter(x => x !== s))}
                  className="hover:text-red-400 transition-colors ml-0.5">×</button>
              </span>
            ))}
          </div>
          <input
            list="skills-suggestions"
            placeholder="Añadir habilidad y presiona Enter..."
            className="w-full px-3 py-2 rounded-lg text-sm text-white outline-none transition-all"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
            onFocus={e => (e.target.style.borderColor = 'var(--c-secondary)')}
            onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            onKeyDown={e => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                e.preventDefault()
                const val = e.target.value.trim()
                if (!skillsRelacionadas.includes(val)) setSkillsRelacionadas(p => [...p, val])
                e.target.value = ''
              }
            }}
          />
          <datalist id="skills-suggestions">
            {['Regresión','Clasificación','Clustering','Redes Neuronales','Ensemble Methods','Feature Engineering',
              'Tokenización','Embeddings','Transformers','Sentiment Analysis','NER','Text Generation','RAG',
              'CNNs','Object Detection','Segmentación','GANs','Image Classification',
              'SQL','ETL','Visualización','Estadística','A/B Testing','Data Pipelines',
              'Python','JavaScript','React','APIs REST','Docker','Git','Cloud (AWS/GCP)'].map(s => <option key={s} value={s} />)}
          </datalist>
        </div>

        {/* AI Auto-categorize */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleAutoCategorize}
            disabled={aiLoading || !titulo.trim()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
            style={{ background: 'rgba(139,92,246,0.12)', color: 'var(--c-secondary)', border: '1px solid rgba(139,92,246,0.25)' }}
          >
            <FiZap size={12} className={aiLoading ? 'animate-pulse' : ''} />
            {aiLoading ? 'Analizando...' : 'Auto-categorizar con IA'}
          </button>

          {aiSuggested?.tags?.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-white/30">Tags:</span>
              {aiSuggested.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 rounded-full text-[10px]"
                  style={{ background: 'rgba(139,92,246,0.1)', color: 'rgba(139,92,246,0.8)', border: '1px solid rgba(139,92,246,0.2)' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {aiSuggested?.recursos?.length > 0 && (
            <div className="rounded-lg p-3 space-y-2" style={{ background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.15)' }}>
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                <FiZap size={9} className="inline mr-1" style={{ color: 'var(--c-secondary)' }} />Recursos sugeridos por IA
              </p>
              {aiSuggested.recursos.map((res, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/70 truncate">{res.titulo}</p>
                    <p className="text-[10px] text-white/30 truncate">{res.url}</p>
                  </div>
                  <button type="button" onClick={() => acceptSuggestedResource(res)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-all shrink-0"
                    style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
                    <FiCheck size={10} /> Agregar
                  </button>
                  <button type="button"
                    onClick={() => setAiSuggested(prev => prev ? { ...prev, recursos: prev.recursos.filter((_, j) => j !== i) } : null)}
                    className="p-1 rounded text-white/20 hover:text-white/50 transition-colors">
                    <FiX size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <Textarea
          label="Descripcion"
          value={descripcion}
          onChange={e => setDescripcion(e.target.value)}
          placeholder="Breve descripcion del tema..."
          rows={3}
        />

        {/* Sections */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-white/70">
              Secciones de contenido
              <span className="ml-2 text-[10px] text-white/30 font-normal">{sections.length} sección{sections.length !== 1 ? 'es' : ''}</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSuggestSections}
                disabled={sectionsAiLoading || !titulo.trim()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
                style={{ background: 'rgba(252,101,31,0.1)', color: 'var(--c-primary)', border: '1px solid rgba(252,101,31,0.2)' }}
              >
                <FiZap size={11} className={sectionsAiLoading ? 'animate-pulse' : ''} />
                {sectionsAiLoading ? 'Generando...' : 'Sugerir con IA'}
              </button>
              <Button variant="ghost" size="xs" icon={<FiPlus size={14} />} onClick={addSection}>
                Agregar
              </Button>
            </div>
          </div>

          {/* AI section suggestions */}
          <AnimatePresence>
            {aiSections.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3 overflow-hidden"
              >
                <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(252,101,31,0.04)', border: '1px solid rgba(252,101,31,0.12)' }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] uppercase tracking-wider font-semibold flex items-center gap-1" style={{ color: 'var(--c-primary)' }}>
                      <FiZap size={9} /> {aiSections.length} secciones sugeridas por IA
                    </p>
                    <button
                      type="button"
                      onClick={() => { setSections(prev => [...prev, ...aiSections.map((s, i) => ({ ...s, orden: prev.length + i }))]); setAiSections([]) }}
                      className="text-[10px] px-2 py-0.5 rounded transition-all"
                      style={{ color: '#22c55e', background: 'rgba(34,197,94,0.1)' }}
                    >
                      + Agregar todas
                    </button>
                  </div>
                  <AnimatePresence>
                    {aiSections.map((sec, i) => (
                      <AISuggestionCard
                        key={i}
                        sec={sec}
                        onAccept={() => acceptAiSection(i)}
                        onDismiss={() => dismissAiSection(i)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Existing sections */}
          <AnimatePresence>
            {sections.map((sec, idx) => (
              <div key={idx} className="mb-2">
                <SectionCard
                  sec={sec}
                  idx={idx}
                  total={sections.length}
                  onUpdate={(field, value) => updateSection(idx, field, value)}
                  onRemove={() => removeSection(idx)}
                  onMove={(dir) => moveSection(idx, dir)}
                  topicTitulo={titulo}
                />
              </div>
            ))}
          </AnimatePresence>

          {sections.length === 0 && (
            <div className="text-center py-6 rounded-xl" style={{ border: '1px dashed rgba(255,255,255,0.08)' }}>
              <p className="text-white/25 text-xs">Sin secciones. Agrega una manualmente o usa IA.</p>
            </div>
          )}
        </div>

        {/* Resources */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-white/70">Recursos adicionales</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowLibPicker(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors"
                style={{ background: 'rgba(0,209,255,0.08)', color: '#00D1FF', border: '1px solid rgba(0,209,255,0.2)' }}
              >
                <FiPaperclip size={12} />
                Desde Biblioteca
              </button>
              <Button variant="ghost" size="xs" icon={<FiPlus size={14} />} onClick={addResource}>URL manual</Button>
            </div>
          </div>
          <div className="space-y-2">
            {recursos.map((res, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input value={res.titulo} onChange={e => updateResource(idx, 'titulo', e.target.value)} placeholder="Titulo del recurso" containerClass="flex-1" />
                <Input value={res.url} onChange={e => updateResource(idx, 'url', e.target.value)} placeholder="https://..." containerClass="flex-1" />
                <button onClick={() => removeResource(idx)} className="p-2 rounded text-white/30 hover:text-[#EF4444] transition-colors shrink-0"><FiTrash2 size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <LibraryPickerModal
        open={showLibPicker}
        onClose={() => setShowLibPicker(false)}
        title="Añadir recurso desde Biblioteca"
        onSelect={(archivo) => {
          setRecursos(r => [...r, { titulo: archivo.nombre, url: archivo.url, tipo: archivo.tipo || 'enlace' }])
          setShowLibPicker(false)
        }}
      />
    </Modal>
  )
}
