import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiX, FiCalendar, FiArrowLeft, FiFilter } from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/ui/Spinner'

const TIPOS = ['evento', 'reunion', 'logro', 'taller', 'conferencia', 'otro']
const TIPO_COLORS = {
  evento: '#FC651F', reunion: '#8B5CF6', logro: '#F59E0B',
  taller: '#00D1FF', conferencia: '#22c55e', otro: '#6b7280',
}

/* ── inline markdown: **bold**, *italic*, `code` ── */
function renderInline(text) {
  const parts = []
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g
  let last = 0, m
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[2] != null) parts.push(<strong key={m.index} className="text-white font-semibold">{m[2]}</strong>)
    else if (m[3] != null) parts.push(<em key={m.index} className="text-white/80 italic">{m[3]}</em>)
    else if (m[4] != null) parts.push(<code key={m.index} className="px-1 py-0.5 rounded text-[11px] font-mono" style={{ background: 'rgba(252,101,31,0.12)', color: '#FC651F' }}>{m[4]}</code>)
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length ? parts : text
}

/* ── simple markdown renderer ── */
function SimpleMarkdown({ text }) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />
        if (line.startsWith('# '))  return <h2 key={i} className="text-xl font-bold text-white mt-5">{renderInline(line.slice(2))}</h2>
        if (line.startsWith('## ')) return <h3 key={i} className="text-base font-semibold text-white/80 mt-4">{renderInline(line.slice(3))}</h3>
        if (line.startsWith('### ')) return <h4 key={i} className="text-sm font-semibold text-white/70 mt-3">{renderInline(line.slice(4))}</h4>
        if (line.startsWith('- ') || line.startsWith('* '))
          return (
            <p key={i} className="text-sm text-white/60 flex items-start gap-2">
              <span className="text-[#FC651F] mt-1 shrink-0">•</span>
              <span>{renderInline(line.slice(2))}</span>
            </p>
          )
        if (line.startsWith('> '))
          return (
            <blockquote key={i} className="border-l-2 border-[#FC651F]/40 pl-4 text-sm text-white/50 italic">
              {renderInline(line.slice(2))}
            </blockquote>
          )
        return <p key={i} className="text-sm text-white/55 leading-relaxed">{renderInline(line)}</p>
      })}
    </div>
  )
}

/* ── Gallery card ── */
function GaleriaCard({ item, onClick, i }) {
  const color = TIPO_COLORS[item.tipo] || '#6b7280'
  const cardRef = (el) => {
    if (!el) return
    el.onmousemove = (e) => {
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = (e.clientX - cx) / (rect.width / 2)
      const dy = (e.clientY - cy) / (rect.height / 2)
      el.style.transform = `perspective(700px) rotateY(${dx * 6}deg) rotateX(${-dy * 4}deg) translateY(-4px) scale(1.015)`
    }
    el.onmouseleave = () => { el.style.transform = '' }
  }

  return (
    <motion.button
      ref={cardRef}
      onClick={() => onClick(item)}
      className={`group text-left rounded-2xl overflow-hidden border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] transition-all duration-300 ${item.destacado ? 'md:col-span-2' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: i * 0.05 }}
      style={{ transformStyle: 'preserve-3d', willChange: 'transform' }}
    >
      {/* Imagen */}
      <div className={`relative overflow-hidden ${item.destacado ? 'h-60' : 'h-48'}`} style={{ background: `${color}10` }}>
        {item.imagen_url ? (
          <img
            src={item.imagen_url}
            alt={item.titulo}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl opacity-15">🎓</div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <span
          className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg"
          style={{ background: `${color}25`, color, backdropFilter: 'blur(8px)', border: `1px solid ${color}30` }}
        >
          {item.tipo}
        </span>
        {item.destacado && (
          <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-1 rounded-lg"
            style={{ background: 'rgba(245,158,11,0.2)', color: '#F59E0B', backdropFilter: 'blur(8px)' }}>
            ⭐ Destacado
          </span>
        )}
      </div>

      {/* Contenido */}
      <div className="p-5">
        <h3 className="text-sm font-semibold text-white/90 leading-snug mb-1.5 group-hover:text-white transition-colors">
          {item.titulo}
        </h3>
        {item.descripcion && (
          <p className="text-xs text-white/40 leading-relaxed line-clamp-2 mb-3">{item.descripcion}</p>
        )}
        <div className="flex items-center justify-between">
          {item.fecha_evento ? (
            <span className="text-[10px] text-white/25 flex items-center gap-1">
              <FiCalendar size={9} />
              {new Date(item.fecha_evento + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          ) : <span />}
          <span className="text-[10px] transition-colors" style={{ color: `${color}80` }}>
            Ver más →
          </span>
        </div>
        {item.tags?.length > 0 && (
          <div className="flex gap-1 mt-2.5 flex-wrap">
            {item.tags.slice(0, 4).map(tag => (
              <span key={tag} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.05] text-white/30">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </motion.button>
  )
}

/* ── Modal detalle ── */
function GaleriaModal({ item, onClose }) {
  if (!item) return null
  const color = TIPO_COLORS[item.tipo] || '#6b7280'

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/85 backdrop-blur-xl" />
      <motion.div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: 'rgba(10,4,6,0.98)', border: '1px solid rgba(255,255,255,0.08)' }}
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Hero image */}
        {item.imagen_url && (
          <div className="h-56 overflow-hidden rounded-t-2xl">
            <img src={item.imagen_url} alt={item.titulo} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg"
                  style={{ background: `${color}20`, color }}>
                  {item.tipo}
                </span>
                {item.destacado && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-[#F59E0B]/15 text-[#F59E0B]">
                    ⭐ Destacado
                  </span>
                )}
                {item.fecha_evento && (
                  <span className="text-[10px] text-white/30 flex items-center gap-1">
                    <FiCalendar size={9} />
                    {new Date(item.fecha_evento + 'T12:00:00').toLocaleDateString('es-CO', { dateStyle: 'long' })}
                  </span>
                )}
              </div>
              <h2 className="text-2xl font-bold font-title text-white">{item.titulo}</h2>
              {item.descripcion && (
                <p className="text-sm text-white/50 mt-1.5 leading-relaxed">{item.descripcion}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="shrink-0 w-8 h-8 rounded-xl flex items-center justify-center text-white/30 hover:text-white hover:bg-white/[0.08] transition-all"
            >
              <FiX size={16} />
            </button>
          </div>

          {/* Markdown content */}
          {item.contenido && (
            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <SimpleMarkdown text={item.contenido} />
            </div>
          )}

          {/* Tags */}
          {item.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-5 pt-4 border-t border-white/[0.06]">
              {item.tags.map(tag => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/35">{tag}</span>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Main page ── */
export default function Galeria() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 12

  useEffect(() => {
    setLoading(true)
    supabase
      .from('galeria_eventos')
      .select('*')
      .eq('publicado', true)
      .order('destacado', { ascending: false })
      .order('fecha_evento', { ascending: false })
      .then(({ data }) => {
        setItems(data || [])
        setLoading(false)
      })
  }, [])

  const filtered = items.filter(item => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      item.titulo?.toLowerCase().includes(q) ||
      item.descripcion?.toLowerCase().includes(q) ||
      item.tags?.some(t => t.toLowerCase().includes(q))
    const matchTipo = !tipoFilter || item.tipo === tipoFilter
    return matchSearch && matchTipo
  })

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const featured = paginated.filter(i => i.destacado)
  const regular = paginated.filter(i => !i.destacado)

  return (
    <div className="min-h-screen" style={{ background: 'var(--c-bg)' }}>
      {/* Header */}
      <div className="border-b border-white/[0.06] px-6 py-8 max-w-6xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors mb-6"
        >
          <FiArrowLeft size={12} /> Volver al inicio
        </Link>
        <motion.h1
          className="text-4xl md:text-5xl font-bold font-title text-white"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Galería del<br />
          <span style={{ color: 'var(--c-primary)' }}>Semillero</span>
        </motion.h1>
        <p className="text-white/40 text-sm mt-3">
          Eventos, talleres y logros que han marcado nuestra historia · {items.length} entradas
        </p>
      </div>

      {/* Filters */}
      <div className="px-6 py-5 max-w-6xl mx-auto flex flex-wrap gap-3 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-48 max-w-xs">
          <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="Buscar por título, tags..."
            className="w-full pl-8 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none focus:border-white/20"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60">
              <FiX size={12} />
            </button>
          )}
        </div>

        {/* Tipo filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <FiFilter size={12} className="text-white/25" />
          <button
            onClick={() => { setTipoFilter(''); setPage(0) }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={!tipoFilter
              ? { background: 'var(--c-primary)', color: 'white' }
              : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
          >
            Todos
          </button>
          {TIPOS.map(t => {
            const active = tipoFilter === t
            const c = TIPO_COLORS[t]
            return (
              <button
                key={t}
                onClick={() => { setTipoFilter(t); setPage(0) }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                style={active
                  ? { background: `${c}25`, color: c, border: `1px solid ${c}40` }
                  : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                {t}
              </button>
            )
          })}
        </div>

        {filtered.length !== items.length && (
          <span className="text-xs text-white/30 ml-auto">{filtered.length} resultados</span>
        )}
      </div>

      {/* Content */}
      <div className="px-6 pb-16 max-w-6xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-24"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-4 opacity-20">🎓</p>
            <p className="text-white/30 text-sm">Sin entradas que coincidan</p>
          </div>
        ) : (
          <>
            {/* Featured items — span 2 cols */}
            {featured.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                {featured.map((item, i) => (
                  <GaleriaCard key={item.id} item={item} onClick={setModal} i={i} />
                ))}
              </div>
            )}

            {/* Regular grid */}
            {regular.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {regular.map((item, i) => (
                  <GaleriaCard key={item.id} item={item} onClick={setModal} i={i + featured.length} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-12">
                <button
                  disabled={page === 0}
                  onClick={() => setPage(p => p - 1)}
                  className="px-4 py-2 rounded-xl text-xs font-medium border border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20 disabled:opacity-30 transition-all"
                >
                  ← Anterior
                </button>
                {Array.from({ length: totalPages }).map((_, pi) => (
                  <button
                    key={pi}
                    onClick={() => setPage(pi)}
                    className="w-8 h-8 rounded-lg text-xs font-medium transition-all"
                    style={pi === page
                      ? { background: 'var(--c-primary)', color: 'white' }
                      : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
                  >
                    {pi + 1}
                  </button>
                ))}
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage(p => p + 1)}
                  className="px-4 py-2 rounded-xl text-xs font-medium border border-white/[0.08] text-white/40 hover:text-white/70 hover:border-white/20 disabled:opacity-30 transition-all"
                >
                  Siguiente →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {modal && <GaleriaModal item={modal} onClose={() => setModal(null)} />}
      </AnimatePresence>
    </div>
  )
}
