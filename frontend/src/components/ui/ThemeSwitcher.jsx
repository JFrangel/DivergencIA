import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiDroplet, FiCheck } from 'react-icons/fi'
import { useTheme, THEMES } from '../../context/ThemeContext'

export default function ThemeSwitcher({ compact = false }) {
  const { themeId, setTheme, themes } = useTheme()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-2 py-2 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.05] transition-all duration-150"
        title="Cambiar tema"
      >
        <FiDroplet size={17} className="shrink-0" />
        {!compact && <span className="text-sm">Tema</span>}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              className="absolute bottom-full left-0 mb-2 z-50 w-52 p-2 rounded-xl glass"
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <p className="text-[9px] uppercase tracking-widest text-white/25 font-semibold px-2 mb-2">
                Tema de color
              </p>
              {Object.values(themes).map(t => (
                <button
                  key={t.id}
                  onClick={() => { setTheme(t.id); setOpen(false) }}
                  className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm transition-all ${
                    themeId === t.id
                      ? 'bg-white/[0.08] text-white'
                      : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Color preview dots */}
                  <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-full" style={{ background: t.primary }} />
                    <div className="w-3 h-3 rounded-full" style={{ background: t.secondary }} />
                    <div className="w-3 h-3 rounded-full" style={{ background: t.accent }} />
                  </div>
                  <span className="flex-1 text-left">{t.label}</span>
                  {themeId === t.id && <FiCheck size={13} className="text-[var(--c-primary)]" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
