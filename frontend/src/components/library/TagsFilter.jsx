import { motion, AnimatePresence } from 'framer-motion'
import { FiTag } from 'react-icons/fi'

export default function TagsFilter({ tags = [], selected = [], onChange }) {
  const isSelected = (tag) => selected.includes(tag)

  const toggle = (tag) => {
    if (isSelected(tag)) {
      onChange(selected.filter(t => t !== tag))
    } else {
      onChange([...selected, tag])
    }
  }

  const clearAll = () => onChange([])

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1 -my-1">
      {/* Icon */}
      <FiTag size={14} className="text-white/25 shrink-0" />

      {/* Clear / Todos */}
      <motion.button
        layout
        onClick={clearAll}
        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
          selected.length === 0
            ? 'bg-[var(--c-primary)] text-white'
            : 'border border-white/[0.12] text-white/40 hover:text-white/60 hover:border-white/20'
        }`}
      >
        Todos
      </motion.button>

      {/* Tags */}
      <AnimatePresence mode="popLayout">
        {tags.map(tag => {
          const active = isSelected(tag)
          return (
            <motion.button
              key={tag}
              layout
              onClick={() => toggle(tag)}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.2, type: 'spring', stiffness: 500, damping: 30 }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-[var(--c-primary)] text-white shadow-[0_0_12px_rgba(252,101,31,0.25)]'
                  : 'border border-white/[0.12] text-white/40 hover:text-white/60 hover:border-white/20'
              }`}
            >
              {tag}
            </motion.button>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
