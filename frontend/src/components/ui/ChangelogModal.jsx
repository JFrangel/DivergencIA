import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  FiX, FiZap, FiCheck, FiStar, FiTool, FiChevronLeft,
  FiChevronRight, FiCpu, FiLoader,
} from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { generateChangelogComparison } from '../../lib/gemini'

/* ─── Inline markdown: **bold**, *italic*, `code` ─────────────────────────── */
function renderInline(text) {
  const parts = []
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  let last = 0, m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[2] != null)
      parts.push(<strong key={m.index} className="text-white font-semibold">{m[2]}</strong>)
    else if (m[3] != null)
      parts.push(<em key={m.index} className="italic text-white/70">{m[3]}</em>)
    else if (m[4] != null)
      parts.push(
        <code key={m.index} className="px-1 py-0.5 rounded text-[11px] font-mono"
          style={{ background: 'rgba(252,101,31,0.15)', color: '#FC651F' }}>
          {m[4]}
        </code>
      )
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length ? parts : text
}

const SECTION_META = {
  '### nuevo':   { icon: FiStar,  color: '#8B5CF6', label: 'Nuevo' },
  '### fix':     { icon: FiTool,  color: '#22c55e', label: 'Fix' },
  '### mejoras': { icon: FiCheck, color: '#00D1FF', label: 'Mejoras' },
  '### mejora':  { icon: FiCheck, color: '#00D1FF', label: 'Mejoras' },
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

  lines.forEach(line => {
    const trimmed = line.trim()
    if (!trimmed) return
    const sectionKey = Object.keys(SECTION_META).find(k => trimmed.toLowerCase().startsWith(k))
    if (sectionKey) { flushSection(); currentSection = SECTION_META[sectionKey]; return }
    if (trimmed.startsWith('## ')) { flushSection(); currentSection = null; blocks.push({ header: trimmed.slice(3) }); return }
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) { currentItems.push(trimmed.slice(2)); return }
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
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color }}>{meta.label}</span>
          </div>
        )}
        <ul className="space-y-1.5 pl-1">
          {block.items.map((item, ii) => (
            <li key={ii} className="flex items-start gap-2 text-sm text-white/55 leading-relaxed">
              <span className="mt-[6px] w-1 h-1 rounded-full shrink-0" style={{ background: color }} />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  })
}

/* ─── Main component ──────────────────────────────────────────────────────── */
export default function ChangelogModal() {
  const { user } = useAuth()
  const prefersReduced = useReducedMotion()

  const [novedades, setNovedades]         = useState([])  // all published, newest first
  const [currentIdx, setCurrentIdx]       = useState(0)
  const [open, setOpen]                   = useState(false)
  const [tab, setTab]                     = useState('notas')  // 'notas' | 'comparacion'
  const [generatingForId, setGeneratingForId] = useState(null)
  const hasMounted = useRef(false)

  const novedad   = novedades[currentIdx]     ?? null
  const prevNovedad = novedades[currentIdx + 1] ?? null   // older version (higher index)

  /* ── Load all published novedades, check if latest was seen ── */
  useEffect(() => {
    if (!user) return
    async function check() {
      const { data: all } = await supabase
        .from('novedades_version')
        .select('*')
        .eq('publicado', true)
        .order('fecha', { ascending: false })

      if (!all?.length) return
      setNovedades(all)

      const latest = all[0]
      const { data: vista } = await supabase
        .from('novedades_vistas')
        .select('novedad_id')
        .eq('usuario_id', user.id)
        .eq('novedad_id', latest.id)
        .maybeSingle()

      if (!vista) {
        setCurrentIdx(0)
        setTab('notas')
        setOpen(true)
      }
    }
    const t = setTimeout(check, 1400)
    return () => clearTimeout(t)
  }, [user])

  /* ── Listen for external open events (e.g. from notification click) ── */
  useEffect(() => {
    if (!user) return
    const handler = async (e) => {
      const targetId = e.detail?.id
      // Ensure novedades are loaded
      let list = novedades
      if (!list.length) {
        const { data } = await supabase
          .from('novedades_version')
          .select('*')
          .eq('publicado', true)
          .order('fecha', { ascending: false })
        list = data || []
        if (list.length) setNovedades(list)
      }
      if (targetId) {
        const idx = list.findIndex(n => n.id === targetId)
        if (idx !== -1) setCurrentIdx(idx)
      } else {
        setCurrentIdx(0)
      }
      setTab('notas')
      setOpen(true)
    }
    window.addEventListener('changelog:open', handler)
    return () => window.removeEventListener('changelog:open', handler)
  }, [user, novedades])

  /* ── Lazy AI comparison generation ── */
  useEffect(() => {
    if (tab !== 'comparacion') return
    if (!novedad || !prevNovedad) return
    if (novedad.ai_comparacion) return
    if (generatingForId === novedad.id) return

    async function generate() {
      setGeneratingForId(novedad.id)
      try {
        const text = await generateChangelogComparison(
          prevNovedad.version, prevNovedad.contenido,
          novedad.version, novedad.contenido
        )

        // Save to DB (SECURITY DEFINER RPC — only writes if still NULL)
        await supabase.rpc('save_ai_comparacion', {
          p_novedad_id: novedad.id,
          p_comparacion: text,
        })

        // Update local state so subsequent views skip generation
        setNovedades(prev =>
          prev.map(n => n.id === novedad.id ? { ...n, ai_comparacion: text } : n)
        )
      } catch (err) {
        console.error('[Changelog AI]', err)
      } finally {
        setGeneratingForId(null)
      }
    }
    generate()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, novedad?.id, prevNovedad?.id])

  /* ── Close: mark latest version as seen in DB ── */
  const handleClose = async () => {
    setOpen(false)
    if (user && novedades[0]) {
      await supabase
        .from('novedades_vistas')
        .upsert(
          { usuario_id: user.id, novedad_id: novedades[0].id },
          { onConflict: 'usuario_id,novedad_id', ignoreDuplicates: true }
        )
    }
  }

  /* ── Navigation ── */
  const goNext = () => {    // older version
    setCurrentIdx(i => Math.min(i + 1, novedades.length - 1))
    setTab('notas')
  }
  const goPrev = () => {    // newer version
    setCurrentIdx(i => Math.max(i - 1, 0))
    setTab('notas')
  }

  const spring = prefersReduced
    ? { type: 'tween', duration: 0.1 }
    : { type: 'spring', damping: 28, stiffness: 320 }

  const isGenerating = generatingForId === novedad?.id
  const hasPrev = currentIdx < novedades.length - 1
  const hasNext = currentIdx > 0
  const canCompare = !!prevNovedad

  return (
    <AnimatePresence>
      {open && novedad && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={prefersReduced ? { duration: 0.1 } : { duration: 0.2 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Panel */}
          <motion.div
            className="relative w-full max-w-lg rounded-2xl z-10 overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #0f0608 0%, #130a10 60%, #0f060e 100%)',
              border: '1px solid rgba(252,101,31,0.18)',
              boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(252,101,31,0.08)',
            }}
            initial={{ opacity: 0, scale: prefersReduced ? 1 : 0.93, y: prefersReduced ? 0 : 32 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: prefersReduced ? 1 : 0.93, y: prefersReduced ? 0 : 16 }}
            transition={spring}
          >
            {/* Top gradient bar */}
            <div className="h-[3px] w-full"
              style={{ background: 'linear-gradient(90deg, #FC651F, #8B5CF6, #00D1FF)' }} />

            {/* Decorative glow */}
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none opacity-[0.04]"
              style={{ background: '#FC651F', filter: 'blur(60px)', transform: 'translate(30%, -30%)' }} />

            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3">
              <div className="flex items-center gap-3 min-w-0">
                <motion.div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(252,101,31,0.12)', border: '1px solid rgba(252,101,31,0.25)' }}
                  animate={prefersReduced ? {} : { rotate: [0, -8, 8, -4, 0] }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                >
                  <FiZap size={16} className="text-[#FC651F]" />
                </motion.div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-white font-title">¿Qué hay de nuevo?</h2>
                    <span
                      className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: 'rgba(252,101,31,0.15)', color: '#FC651F', border: '1px solid rgba(252,101,31,0.2)' }}
                    >
                      v{novedad.version}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mt-0.5 truncate">{novedad.titulo}</p>
                </div>
              </div>

              {/* Version navigation */}
              <div className="flex items-center gap-1 shrink-0">
                {novedades.length > 1 && (
                  <>
                    <button
                      onClick={goNext}
                      disabled={!hasPrev}
                      className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                      title="Versión anterior"
                    >
                      <FiChevronLeft size={14} />
                    </button>
                    <span className="text-[10px] text-white/25 tabular-nums">
                      {novedades.length - currentIdx}/{novedades.length}
                    </span>
                    <button
                      onClick={goPrev}
                      disabled={!hasNext}
                      className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                      title="Versión más reciente"
                    >
                      <FiChevronRight size={14} />
                    </button>
                  </>
                )}
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg text-white/25 hover:text-white hover:bg-white/10 transition-colors ml-1"
                >
                  <FiX size={14} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            {canCompare && (
              <div className="flex gap-1 px-5 mb-1">
                {['notas', 'comparacion'].map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className="px-3 py-1 rounded-lg text-xs font-medium transition-all"
                    style={tab === t
                      ? { background: 'rgba(252,101,31,0.15)', color: '#FC651F', border: '1px solid rgba(252,101,31,0.2)' }
                      : { color: 'rgba(255,255,255,0.35)', border: '1px solid transparent' }
                    }
                  >
                    {t === 'notas' ? '📋 Notas' : '✨ Comparación IA'}
                  </button>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="px-5 pb-4">
              <div
                className="rounded-xl p-4 max-h-64 overflow-y-auto"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                {tab === 'notas' && renderContent(novedad.contenido)}

                {tab === 'comparacion' && (
                  <>
                    {isGenerating ? (
                      <div className="flex items-center gap-3 py-6 justify-center text-white/40">
                        <FiLoader size={15} className="animate-spin" style={{ color: '#FC651F' }} />
                        <span className="text-sm">Generando comparación con IA…</span>
                      </div>
                    ) : novedad.ai_comparacion ? (
                      <div>
                        <div className="flex items-center gap-1.5 mb-3">
                          <FiCpu size={11} style={{ color: '#8B5CF6' }} />
                          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: '#8B5CF6' }}>
                            v{prevNovedad?.version} → v{novedad.version}
                          </span>
                        </div>
                        <p className="text-sm text-white/60 leading-relaxed">{novedad.ai_comparacion}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 py-6 justify-center text-white/30">
                        <FiCpu size={15} />
                        <span className="text-sm">Sin comparación disponible</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex items-center justify-between gap-3">
              <span className="text-[11px] text-white/20">
                {new Date(novedad.fecha).toLocaleDateString('es-CO', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </span>
              <button
                onClick={handleClose}
                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
                style={{ background: 'linear-gradient(135deg, #FC651F, #8B5CF6)' }}
              >
                <FiCheck size={13} />
                ¡Entendido!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
