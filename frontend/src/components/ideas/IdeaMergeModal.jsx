import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiGitMerge, FiSearch, FiLayers, FiArrowDownCircle,
  FiRefreshCw, FiZap, FiAlertCircle,
} from 'react-icons/fi'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { generateIdeaMergePreview } from '../../lib/gemini'

const MERGE_METHODS = [
  {
    id: 'combinar',
    label: 'Combinar',
    desc: 'Fusiona ambas ideas en una sola coherente',
    icon: FiLayers,
    color: '#8B5CF6',
    aiSupported: true,
  },
  {
    id: 'absorber',
    label: 'Absorber',
    desc: 'Mantiene la idea destino y archiva la secundaria',
    icon: FiArrowDownCircle,
    color: '#FC651F',
    aiSupported: false,
  },
  {
    id: 'nueva_sintesis',
    label: 'Nueva síntesis',
    desc: 'Genera una idea nueva a partir de ambas con IA',
    icon: FiRefreshCw,
    color: '#00D1FF',
    aiSupported: true,
  },
]

export default function IdeaMergeModal({ open, onClose, ideas = [], onMerge }) {
  const [search, setSearch]           = useState('')
  const [targetId, setTargetId]       = useState(null)
  const [sourceId, setSourceId]       = useState(null)
  const [mergeMethod, setMergeMethod] = useState('combinar')

  const [aiPreview, setAiPreview]   = useState(null)
  const [aiLoading, setAiLoading]   = useState(false)
  const [aiError, setAiError]       = useState(false)

  const abortRef = useRef(null)

  const filteredIdeas  = useMemo(() => ideas.filter(i => i.titulo.toLowerCase().includes(search.toLowerCase())), [ideas, search])
  const selectedIdea   = useMemo(() => ideas.find(i => i.id === targetId) || null,  [ideas, targetId])
  const sourceIdea     = useMemo(() => ideas.find(i => i.id === sourceId) || null,  [ideas, sourceId])
  const currentMethod  = MERGE_METHODS.find(m => m.id === mergeMethod)

  // ── Auto-generate AI preview when both ideas + AI-supported method ──
  useEffect(() => {
    if (!selectedIdea || !sourceIdea) { setAiPreview(null); return }
    if (!currentMethod?.aiSupported)  { setAiPreview(null); return }

    let cancelled = false
    setAiPreview(null)
    setAiLoading(true)
    setAiError(false)

    generateIdeaMergePreview(selectedIdea, sourceIdea, mergeMethod)
      .then(result => {
        if (cancelled) return
        setAiPreview(result)
        setAiLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setAiError(true)
        setAiLoading(false)
      })

    return () => { cancelled = true }
  }, [selectedIdea?.id, sourceIdea?.id, mergeMethod]) // eslint-disable-line

  // ── Static preview (absorber or AI fallback) ─────────────────────────
  const staticPreview = useMemo(() => {
    if (!selectedIdea || !sourceIdea) return null
    switch (mergeMethod) {
      case 'absorber':
        return {
          titulo:      selectedIdea.titulo,
          descripcion: selectedIdea.descripcion,
          votos:       (selectedIdea.votos_favor ?? 0) + (sourceIdea.votos_favor ?? 0),
          note:        `"${sourceIdea.titulo}" será archivada`,
        }
      case 'nueva_sintesis':
        return {
          titulo:      `Síntesis: ${selectedIdea.titulo} & ${sourceIdea.titulo}`,
          descripcion: [selectedIdea.descripcion, sourceIdea.descripcion].filter(Boolean).join('\n\n---\n\n'),
          votos:       0,
          note:        'Ambas ideas originales serán archivadas',
        }
      case 'combinar':
      default:
        return {
          titulo:      `${selectedIdea.titulo} + ${sourceIdea.titulo}`,
          descripcion: [selectedIdea.descripcion, sourceIdea.descripcion].filter(Boolean).join('\n\n'),
          votos:       (selectedIdea.votos_favor ?? 0) + (sourceIdea.votos_favor ?? 0),
          note:        'Se combinan descripciones, tags y votos',
        }
    }
  }, [selectedIdea, sourceIdea, mergeMethod])

  const handleRegenerate = () => {
    if (!selectedIdea || !sourceIdea || !currentMethod?.aiSupported) return
    setAiPreview(null)
    setAiLoading(true)
    setAiError(false)
    generateIdeaMergePreview(selectedIdea, sourceIdea, mergeMethod)
      .then(r => { setAiPreview(r); setAiLoading(false) })
      .catch(() => { setAiError(true); setAiLoading(false) })
  }

  const handleConfirm = () => {
    if (!targetId || !sourceId) return
    const content = currentMethod?.aiSupported && aiPreview ? aiPreview : null
    onMerge?.(targetId, sourceId, mergeMethod, content)
    handleClose()
  }

  const handleClose = () => {
    setSearch('')
    setTargetId(null)
    setSourceId(null)
    setMergeMethod('combinar')
    setAiPreview(null)
    setAiLoading(false)
    setAiError(false)
    onClose?.()
  }

  // Preview to display: AI (when ready) or static
  const displayPreview = currentMethod?.aiSupported
    ? (aiPreview ? { ...aiPreview, votos: staticPreview?.votos, note: staticPreview?.note, ai: true } : null)
    : staticPreview

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={
        <span className="flex items-center gap-2">
          <FiGitMerge className="text-[#8B5CF6]" />
          Fusionar ideas
        </span>
      }
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose}>Cancelar</Button>
          <Button
            variant="solid"
            icon={<FiGitMerge size={16} />}
            disabled={!targetId || !sourceId || aiLoading}
            onClick={handleConfirm}
          >
            Confirmar fusión
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">

        {/* Step 1: Pick both ideas */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] uppercase tracking-wider text-[#8B5CF6] font-semibold">1. Idea destino</p>
            {selectedIdea ? (
              <div className="rounded-xl bg-[#8B5CF6]/10 border border-[#8B5CF6]/30 p-3 flex flex-col gap-1">
                <p className="text-xs font-semibold text-white leading-snug line-clamp-2">{selectedIdea.titulo}</p>
                <button onClick={() => setTargetId(null)} className="text-[10px] text-[#8B5CF6]/60 hover:text-[#8B5CF6] text-left transition-colors">Cambiar</button>
              </div>
            ) : (
              <p className="text-[11px] text-white/25 italic">Selecciona abajo</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] uppercase tracking-wider text-[#FC651F] font-semibold">2. Idea a fusionar</p>
            {sourceIdea ? (
              <div className="rounded-xl bg-[#FC651F]/10 border border-[#FC651F]/30 p-3 flex flex-col gap-1">
                <p className="text-xs font-semibold text-white leading-snug line-clamp-2">{sourceIdea.titulo}</p>
                <button onClick={() => setSourceId(null)} className="text-[10px] text-[#FC651F]/60 hover:text-[#FC651F] text-left transition-colors">Cambiar</button>
              </div>
            ) : (
              <p className="text-[11px] text-white/25 italic">Selecciona abajo</p>
            )}
          </div>
        </div>

        {/* Method selector */}
        <div>
          <p className="text-[11px] uppercase tracking-wider text-white/30 mb-2 font-semibold">Método de fusión</p>
          <div className="grid grid-cols-3 gap-2">
            {MERGE_METHODS.map(method => {
              const isActive  = mergeMethod === method.id
              const MethodIcon = method.icon
              return (
                <button
                  key={method.id}
                  onClick={() => setMergeMethod(method.id)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 text-center cursor-pointer relative"
                  style={{
                    background:   isActive ? `color-mix(in srgb, ${method.color} 12%, transparent)` : 'rgba(255,255,255,0.03)',
                    borderColor:  isActive ? `color-mix(in srgb, ${method.color} 50%, transparent)` : 'rgba(255,255,255,0.06)',
                    boxShadow:    isActive ? `0 0 0 1px color-mix(in srgb, ${method.color} 20%, transparent)` : 'none',
                  }}
                >
                  {method.aiSupported && (
                    <span className="absolute top-1.5 right-1.5 text-[8px] px-1 rounded"
                      style={{ background: `color-mix(in srgb, ${method.color} 20%, transparent)`, color: method.color }}>
                      IA
                    </span>
                  )}
                  <MethodIcon size={16} style={{ color: isActive ? method.color : 'rgba(255,255,255,0.3)' }} />
                  <span className="text-xs font-semibold" style={{ color: isActive ? method.color : 'rgba(255,255,255,0.5)' }}>
                    {method.label}
                  </span>
                  <span className="text-[10px] leading-tight" style={{ color: isActive ? `color-mix(in srgb, ${method.color} 70%, white)` : 'rgba(255,255,255,0.2)' }}>
                    {method.desc}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Search + list */}
        <div className="flex flex-col gap-2">
          <Input
            placeholder="Buscar idea..."
            icon={<FiSearch size={16} />}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <p className="text-[10px] text-white/25">Clic en "Destino" para elegir la idea principal · clic en "Fusionar" para la secundaria</p>
        </div>

        <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {filteredIdeas.length === 0 && (
              <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-sm text-white/20 text-center py-6">
                No se encontraron ideas
              </motion.p>
            )}
            {filteredIdeas.map(idea => {
              const isTarget = idea.id === targetId
              const isSource = idea.id === sourceId
              return (
                <motion.div
                  key={idea.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 border transition-all"
                  style={{
                    background:  isTarget ? 'rgba(139,92,246,0.1)' : isSource ? 'rgba(252,101,31,0.1)' : 'rgba(255,255,255,0.03)',
                    borderColor: isTarget ? 'rgba(139,92,246,0.35)' : isSource ? 'rgba(252,101,31,0.35)' : 'rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate font-medium">{idea.titulo}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-white/30">
                      {idea.area_relacionada && <span>{idea.area_relacionada}</span>}
                      <span>{idea.votos_favor ?? 0} votos</span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => setTargetId(isTarget ? null : idea.id)}
                      className="text-[10px] px-2 py-1 rounded-lg font-semibold transition-all"
                      style={{ background: isTarget ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.06)', color: isTarget ? '#8B5CF6' : 'rgba(255,255,255,0.3)' }}
                    >
                      Destino
                    </button>
                    <button
                      onClick={() => setSourceId(isSource ? null : idea.id)}
                      className="text-[10px] px-2 py-1 rounded-lg font-semibold transition-all disabled:opacity-30"
                      style={{ background: isSource ? 'rgba(252,101,31,0.3)' : 'rgba(255,255,255,0.06)', color: isSource ? '#FC651F' : 'rgba(255,255,255,0.3)' }}
                      disabled={idea.id === targetId}
                    >
                      Fusionar
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* ── Vista previa ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {(selectedIdea && sourceIdea) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div
                className="rounded-xl p-4 space-y-3"
                style={{
                  background: `color-mix(in srgb, ${currentMethod?.color ?? '#8B5CF6'} 6%, rgba(255,255,255,0.02))`,
                  border: `1px solid color-mix(in srgb, ${currentMethod?.color ?? '#8B5CF6'} 25%, transparent)`,
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] uppercase tracking-wider font-semibold"
                      style={{ color: currentMethod?.color }}>
                      Vista previa de fusión
                    </p>
                    {currentMethod?.aiSupported && (
                      <span className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ background: `color-mix(in srgb, ${currentMethod.color} 15%, transparent)`, color: currentMethod.color }}>
                        <FiZap size={8} /> IA
                      </span>
                    )}
                  </div>
                  {currentMethod?.aiSupported && !aiLoading && (
                    <button
                      onClick={handleRegenerate}
                      className="flex items-center gap-1 text-[10px] transition-colors hover:opacity-80"
                      style={{ color: `color-mix(in srgb, ${currentMethod.color} 70%, white)` }}
                      title="Regenerar con IA"
                    >
                      <FiRefreshCw size={10} /> Regenerar
                    </button>
                  )}
                </div>

                {/* Loading */}
                {aiLoading && (
                  <div className="flex items-center gap-2 py-3">
                    <FiZap size={13} className="animate-pulse" style={{ color: currentMethod?.color }} />
                    <p className="text-xs text-white/40 animate-pulse">
                      {mergeMethod === 'nueva_sintesis' ? 'Sintetizando nueva idea con IA...' : 'Generando fusión con IA...'}
                    </p>
                  </div>
                )}

                {/* Error fallback */}
                {aiError && !aiLoading && (
                  <div className="flex items-center gap-2 text-xs text-white/30">
                    <FiAlertCircle size={12} className="text-[#FC651F]/50" />
                    <span>No se pudo generar la vista IA — se usará la fusión estándar.</span>
                  </div>
                )}

                {/* AI or static preview content */}
                {!aiLoading && (displayPreview || (aiError && staticPreview)) && (() => {
                  const p = displayPreview || staticPreview
                  return (
                    <div className="space-y-2">
                      <h4 className="text-sm font-bold text-white leading-snug">
                        {p.titulo}
                      </h4>
                      {p.descripcion && (
                        <p className="text-xs text-white/40 line-clamp-4 whitespace-pre-line leading-relaxed">
                          {p.descripcion}
                        </p>
                      )}
                      {p.votos !== undefined && (
                        <p className="text-xs font-medium" style={{ color: currentMethod?.color ?? '#8B5CF6' }}>
                          {p.votos} votos combinados
                        </p>
                      )}
                      {p.note && (
                        <p className="text-[10px] text-white/25 italic">{p.note}</p>
                      )}
                    </div>
                  )
                })()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </Modal>
  )
}
