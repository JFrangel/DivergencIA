import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiZap, FiCheck, FiStar, FiTool } from 'react-icons/fi'
import { supabase } from '../../lib/supabase'

const SEEN_KEY = 'divergencia_seen_version'

function getSeen() {
  try { return localStorage.getItem(SEEN_KEY) || '' } catch { return '' }
}

/* Inline markdown: **bold**, *italic*, `code` */
function renderInline(text) {
  const parts = []
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  let last = 0, m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[2] != null) parts.push(<strong key={m.index} className="text-white font-semibold">{m[2]}</strong>)
    else if (m[3] != null) parts.push(<em key={m.index} className="italic text-white/70">{m[3]}</em>)
    else if (m[4] != null) parts.push(
      <code key={m.index} className="px-1 py-0.5 rounded text-[11px] font-mono" style={{ background: 'rgba(252,101,31,0.15)', color: '#FC651F' }}>
        {m[4]}
      </code>
    )
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length ? parts : text
}

const SECTION_META = {
  '### nuevo':    { icon: FiStar,  color: '#8B5CF6', label: 'Nuevo' },
  '### fix':      { icon: FiTool,  color: '#22c55e', label: 'Fix' },
  '### mejoras':  { icon: FiCheck, color: '#00D1FF', label: 'Mejoras' },
  '### mejora':   { icon: FiCheck, color: '#00D1FF', label: 'Mejoras' },
}

function renderContent(text) {
  const lines = text.split('\n')
  const blocks = []
  let currentSection = null
  let currentItems = []

  const flushSection = () => {
    if (currentItems.length === 0) return
    blocks.push({ section: currentSection, items: currentItems })
    currentItems = []
  }

  lines.forEach((line, i) => {
    const trimmed = line.trim()
    if (!trimmed) return

    const sectionKey = Object.keys(SECTION_META).find(k => trimmed.toLowerCase().startsWith(k))
    if (sectionKey) {
      flushSection()
      currentSection = SECTION_META[sectionKey]
      return
    }

    if (trimmed.startsWith('## ')) {
      flushSection()
      currentSection = null
      blocks.push({ header: trimmed.slice(3) })
      return
    }

    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      currentItems.push(trimmed.slice(2))
      return
    }

    // plain paragraph
    currentItems.push(trimmed)
  })

  flushSection()

  return blocks.map((block, bi) => {
    if (block.header) {
      return (
        <p key={bi} className="text-xs font-bold text-white/35 uppercase tracking-widest mt-4 mb-2">
          {block.header}
        </p>
      )
    }

    const meta = block.section
    const color = meta?.color || 'var(--c-primary)'
    const Icon = meta?.icon || FiZap

    return (
      <div key={bi} className="mb-3">
        {meta && (
          <div className="flex items-center gap-1.5 mb-1.5">
            <Icon size={11} style={{ color }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>
              {meta.label}
            </span>
          </div>
        )}
        <ul className="space-y-1.5 pl-1">
          {block.items.map((item, ii) => (
            <li key={ii} className="flex items-start gap-2 text-sm text-white/55 leading-relaxed">
              <span
                className="mt-[6px] w-1 h-1 rounded-full shrink-0"
                style={{ background: color }}
              />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  })
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
      if (getSeen() !== data.id) {
        setNovedad(data)
        setOpen(true)
      }
    }
    const t = setTimeout(check, 1400)
    return () => clearTimeout(t)
  }, [])

  const handleClose = () => {
    if (novedad) {
      try { localStorage.setItem(SEEN_KEY, novedad.id) } catch {}
    }
    setOpen(false)
  }

  return (
    <AnimatePresence>
      {open && novedad && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={handleClose} />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-lg rounded-2xl z-10 overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #0f0608 0%, #130a10 60%, #0f060e 100%)',
              border: '1px solid rgba(252,101,31,0.18)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(252,101,31,0.08)',
            }}
            initial={{ opacity: 0, scale: 0.93, y: 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: 16 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          >
            {/* Top gradient bar */}
            <div className="h-[3px] w-full" style={{ background: 'linear-gradient(90deg, #FC651F, #8B5CF6, #00D1FF)' }} />

            {/* Decorative background glow */}
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none opacity-[0.04]"
              style={{ background: '#FC651F', filter: 'blur(60px)', transform: 'translate(30%, -30%)' }} />

            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-3">
              <div className="flex items-center gap-3">
                <motion.div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(252,101,31,0.12)', border: '1px solid rgba(252,101,31,0.25)' }}
                  animate={{ rotate: [0, -8, 8, -4, 0] }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                >
                  <FiZap size={18} className="text-[#FC651F]" />
                </motion.div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-white font-title">¿Qué hay de nuevo?</h2>
                    <span
                      className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(252,101,31,0.15)', color: '#FC651F', border: '1px solid rgba(252,101,31,0.2)' }}
                    >
                      v{novedad.version}
                    </span>
                  </div>
                  <p className="text-sm text-white/40 mt-0.5 leading-snug">{novedad.titulo}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-1.5 rounded-lg text-white/25 hover:text-white hover:bg-white/10 transition-colors mt-0.5 shrink-0"
              >
                <FiX size={15} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 pb-4">
              <div
                className="rounded-xl p-4 max-h-72 overflow-y-auto"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                {renderContent(novedad.contenido)}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 flex items-center justify-between gap-3">
              <span className="text-[11px] text-white/20">
                {new Date(novedad.fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <button
                onClick={handleClose}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #FC651F, #8B5CF6)' }}
              >
                <FiCheck size={14} />
                ¡Entendido!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
