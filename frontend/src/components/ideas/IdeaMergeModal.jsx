import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiGitMerge, FiSearch, FiCheck } from 'react-icons/fi'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'

export default function IdeaMergeModal({ open, onClose, ideas = [], selectedIdea, onMerge }) {
  const [search, setSearch] = useState('')
  const [sourceId, setSourceId] = useState(null)

  const filteredIdeas = useMemo(() => {
    if (!selectedIdea) return []
    return ideas
      .filter((i) => i.id !== selectedIdea.id)
      .filter((i) => i.titulo.toLowerCase().includes(search.toLowerCase()))
  }, [ideas, selectedIdea, search])

  const sourceIdea = useMemo(
    () => ideas.find((i) => i.id === sourceId) || null,
    [ideas, sourceId],
  )

  const preview = useMemo(() => {
    if (!selectedIdea || !sourceIdea) return null
    return {
      titulo: `${selectedIdea.titulo} + ${sourceIdea.titulo}`,
      descripcion: [selectedIdea.descripcion, sourceIdea.descripcion].filter(Boolean).join('\n\n'),
      votos: (selectedIdea.votos_favor ?? 0) + (sourceIdea.votos_favor ?? 0),
    }
  }, [selectedIdea, sourceIdea])

  const handleConfirm = () => {
    if (!selectedIdea || !sourceIdea) return
    onMerge?.(selectedIdea.id, sourceIdea.id)
    handleClose()
  }

  const handleClose = () => {
    setSearch('')
    setSourceId(null)
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
            disabled={!sourceId}
            onClick={handleConfirm}
          >
            Confirmar fusión
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Target idea */}
        {selectedIdea && (
          <div className="rounded-xl bg-white/[0.04] border border-[#8B5CF6]/30 p-4">
            <p className="text-[11px] uppercase tracking-wider text-[#8B5CF6] mb-2 font-semibold">
              Idea destino
            </p>
            <h4 className="text-sm font-semibold text-white leading-snug">{selectedIdea.titulo}</h4>
            <div className="flex items-center gap-3 mt-2 text-xs text-white/30">
              {selectedIdea.area_relacionada && <span>{selectedIdea.area_relacionada}</span>}
              <span>{(selectedIdea.votos_favor ?? 0)} votos a favor</span>
            </div>
          </div>
        )}

        {/* Search */}
        <Input
          placeholder="Buscar idea para fusionar..."
          icon={<FiSearch size={16} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Source list */}
        <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {filteredIdeas.length === 0 && (
              <motion.p
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm text-white/20 text-center py-6"
              >
                No se encontraron ideas
              </motion.p>
            )}
            {filteredIdeas.map((idea) => {
              const isSelected = idea.id === sourceId
              return (
                <motion.button
                  key={idea.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setSourceId(isSelected ? null : idea.id)}
                  className={`w-full text-left rounded-lg px-3.5 py-2.5 transition-all duration-200 flex items-center gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-[#8B5CF6]/15 border border-[#8B5CF6]/40'
                      : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate font-medium">{idea.titulo}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-white/30">
                      {idea.area_relacionada && <span>{idea.area_relacionada}</span>}
                      <span>{(idea.votos_favor ?? 0)} votos</span>
                    </div>
                  </div>
                  {isSelected && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="shrink-0 text-[#8B5CF6]"
                    >
                      <FiCheck size={18} />
                    </motion.span>
                  )}
                </motion.button>
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
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Modal>
  )
}
