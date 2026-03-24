import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiGitMerge, FiSearch, FiCheck, FiLayers, FiArrowDownCircle, FiRefreshCw } from 'react-icons/fi'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'

const MERGE_METHODS = [
  {
    id: 'combinar',
    label: 'Combinar',
    desc: 'Fusiona descripciones y combina tags de ambas ideas',
    icon: FiLayers,
    color: '#8B5CF6',
  },
  {
    id: 'absorber',
    label: 'Absorber',
    desc: 'Mantiene la idea principal y archiva la secundaria',
    icon: FiArrowDownCircle,
    color: '#FC651F',
  },
  {
    id: 'nueva_sintesis',
    label: 'Nueva sintesis',
    desc: 'Crea una nueva idea a partir de ambas y archiva las originales',
    icon: FiRefreshCw,
    color: '#00D1FF',
  },
]

export default function IdeaMergeModal({ open, onClose, ideas = [], onMerge }) {
  const [search, setSearch] = useState('')
  const [targetId, setTargetId] = useState(null)   // idea destino
  const [sourceId, setSourceId] = useState(null)   // idea a fusionar
  const [mergeMethod, setMergeMethod] = useState('combinar')

  const filteredIdeas = useMemo(() => {
    return ideas.filter((i) => i.titulo.toLowerCase().includes(search.toLowerCase()))
  }, [ideas, search])

  const selectedIdea = useMemo(() => ideas.find((i) => i.id === targetId) || null, [ideas, targetId])
  const sourceIdea = useMemo(() => ideas.find((i) => i.id === sourceId) || null, [ideas, sourceId])

  const preview = useMemo(() => {
    if (!selectedIdea || !sourceIdea) return null
    switch (mergeMethod) {
      case 'absorber':
        return {
          titulo: selectedIdea.titulo,
          descripcion: selectedIdea.descripcion,
          votos: (selectedIdea.votos_favor ?? 0) + (sourceIdea.votos_favor ?? 0),
          note: `"${sourceIdea.titulo}" sera archivada`,
        }
      case 'nueva_sintesis':
        return {
          titulo: `Sintesis: ${selectedIdea.titulo} & ${sourceIdea.titulo}`,
          descripcion: [selectedIdea.descripcion, sourceIdea.descripcion].filter(Boolean).join('\n\n---\n\n'),
          votos: 0,
          note: 'Ambas ideas originales seran archivadas',
        }
      case 'combinar':
      default:
        return {
          titulo: `${selectedIdea.titulo} + ${sourceIdea.titulo}`,
          descripcion: [selectedIdea.descripcion, sourceIdea.descripcion].filter(Boolean).join('\n\n'),
          votos: (selectedIdea.votos_favor ?? 0) + (sourceIdea.votos_favor ?? 0),
          note: 'Se combinan descripciones, tags y votos',
        }
    }
  }, [selectedIdea, sourceIdea, mergeMethod])

  const handleConfirm = () => {
    if (!targetId || !sourceId) return
    onMerge?.(targetId, sourceId, mergeMethod)
    handleClose()
  }

  const handleClose = () => {
    setSearch('')
    setTargetId(null)
    setSourceId(null)
    setMergeMethod('combinar')
    onClose?.()
  }

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
          <Button variant="ghost" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            variant="solid"
            icon={<FiGitMerge size={16} />}
            disabled={!targetId || !sourceId}
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
          {/* Target selector */}
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
          {/* Source selector */}
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

        {/* Merge method selector */}
        <div>
          <p className="text-[11px] uppercase tracking-wider text-white/30 mb-2 font-semibold">
            Metodo de fusion
          </p>
          <div className="grid grid-cols-3 gap-2">
            {MERGE_METHODS.map(method => {
              const isActive = mergeMethod === method.id
              const MethodIcon = method.icon
              return (
                <button
                  key={method.id}
                  onClick={() => setMergeMethod(method.id)}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 text-center cursor-pointer"
                  style={{
                    background: isActive ? `color-mix(in srgb, ${method.color} 10%, transparent)` : 'var(--c-surface-1, rgba(255,255,255,0.03))',
                    borderColor: isActive ? `color-mix(in srgb, ${method.color} 40%, transparent)` : 'rgba(255,255,255,0.06)',
                  }}
                >
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

        {/* Search + list to pick both */}
        <div className="flex flex-col gap-2">
          <Input
            placeholder="Buscar idea..."
            icon={<FiSearch size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <p className="text-[10px] text-white/25">Haz clic para asignar como destino · doble clic para asignar como "a fusionar"</p>
        </div>

        <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {filteredIdeas.length === 0 && (
              <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-sm text-white/20 text-center py-6">
                No se encontraron ideas
              </motion.p>
            )}
            {filteredIdeas.map((idea) => {
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
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 border transition-all cursor-pointer"
                  style={{
                    background: isTarget ? 'rgba(139,92,246,0.1)' : isSource ? 'rgba(252,101,31,0.1)' : 'rgba(255,255,255,0.03)',
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
                      className="text-[10px] px-2 py-1 rounded-lg font-semibold transition-all"
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

        {/* Merge preview */}
        <AnimatePresence>
          {preview && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="rounded-xl bg-white/[0.04] border border-[#FC651F]/20 p-4">
                <p className="text-[11px] uppercase tracking-wider text-[#FC651F] mb-2 font-semibold">
                  Vista previa de fusión
                </p>
                <h4 className="text-sm font-semibold text-white leading-snug">{preview.titulo}</h4>
                {preview.descripcion && (
                  <p className="text-xs text-white/30 mt-1.5 line-clamp-3 whitespace-pre-line">
                    {preview.descripcion}
                  </p>
                )}
                <p className="text-xs text-[#8B5CF6] mt-2 font-medium">
                  {preview.votos} votos combinados
                </p>
                {preview.note && (
                  <p className="text-[10px] text-white/25 mt-1 italic">{preview.note}</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  )
}
