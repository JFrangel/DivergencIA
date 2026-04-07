import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiZap, FiTag } from 'react-icons/fi'
import { supabase } from '../../lib/supabase'

const SEEN_KEY = 'divergencia_seen_version'

function getSeen() {
  try { return localStorage.getItem(SEEN_KEY) || '' } catch { return '' }
}

export default function ChangelogModal() {
  const [novedad, setNovedad] = useState(null)
  const [open, setOpen]       = useState(false)

  useEffect(() => {
    async function check() {
      const { data } = await supabase
        .from('novedades_version')
        .select('*')
        .eq('publicado', true)
        .order('fecha', { ascending: false })
        .limit(1)
        .single()

      if (!data) return
      const seen = getSeen()
      if (seen !== data.id) {
        setNovedad(data)
        setOpen(true)
      }
    }
    // Small delay so the app renders first
    const t = setTimeout(check, 1200)
    return () => clearTimeout(t)
  }, [])

  const handleClose = () => {
    if (novedad) {
      try { localStorage.setItem(SEEN_KEY, novedad.id) } catch { /* noop */ }
    }
    setOpen(false)
  }

  // Render simple markdown: newline, bullets
  const renderContent = (text) => {
    return text.split('\n').map((line, i) => {
      const trimmed = line.trim()
      if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
        return (
          <li key={i} className="flex items-start gap-2 text-sm text-white/60 leading-relaxed">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--c-primary)' }} />
            <span>{trimmed.slice(2)}</span>
          </li>
        )
      }
      if (trimmed.startsWith('## ')) {
        return <p key={i} className="text-xs font-semibold text-white/40 uppercase tracking-wider mt-3 mb-1">{trimmed.slice(3)}</p>
      }
      if (!trimmed) return null
      return <p key={i} className="text-sm text-white/60 leading-relaxed">{trimmed}</p>
    }).filter(Boolean)
  }

  return (
    <AnimatePresence>
      {open && novedad && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-md rounded-2xl z-10 overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #0f0608 0%, #130a0f 100%)',
              border: '1px solid rgba(252,101,31,0.2)',
              boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
            }}
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            {/* Accent bar */}
            <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg, var(--c-primary), var(--c-secondary))' }} />

            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(252,101,31,0.12)', border: '1px solid rgba(252,101,31,0.2)' }}
                >
                  <FiZap size={16} className="text-[var(--c-primary)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white font-title">¿Qué hay de nuevo?</h2>
                    <span
                      className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(252,101,31,0.15)', color: 'var(--c-primary)' }}
                    >
                      {novedad.version}
                    </span>
                  </div>
                  <p className="text-sm text-white/50 mt-0.5">{novedad.titulo}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors mt-0.5 shrink-0"
              >
                <FiX size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 pb-5">
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 max-h-64 overflow-y-auto">
                <ul className="space-y-2">
                  {renderContent(novedad.contenido)}
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 flex items-center justify-between gap-3">
              <span className="text-[11px] text-white/20">
                {new Date(novedad.fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <button
                onClick={handleClose}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg, var(--c-primary), var(--c-secondary))' }}
              >
                ¡Entendido!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
