import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FiFilter, FiRefreshCw, FiUser, FiFolder, FiCalendar } from 'react-icons/fi'
import { useTimeline } from '../../hooks/useTimeline'
import { timeAgo } from '../../lib/utils'
import Spinner from '../../components/ui/Spinner'
import Avatar from '../../components/ui/Avatar'

/* ── Type config ── */
const TIPO_META = {
  proyecto_nuevo:  { label: 'Proyecto',    color: '#FC651F', bg: 'rgba(252,101,31,0.12)'  },
  proyecto_estado: { label: 'Estado',      color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  avance:          { label: 'Avance',      color: '#22c55e', bg: 'rgba(34,197,94,0.12)'   },
  idea_aprobada:   { label: 'Idea',        color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)'  },
  evento_creado:   { label: 'Evento',      color: '#00D1FF', bg: 'rgba(0,209,255,0.12)'   },
  nodo_aprobado:   { label: 'Grupo',       color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  archivo_subido:  { label: 'Biblioteca',  color: '#6b7280', bg: 'rgba(107,114,128,0.12)' },
}

const TIPO_HREF = {
  proyecto_nuevo:  (item) => item.proyecto_id ? `/projects/${item.proyecto_id}` : '/projects',
  proyecto_estado: (item) => item.proyecto_id ? `/projects/${item.proyecto_id}` : '/projects',
  avance:          (item) => item.proyecto_id ? `/projects/${item.proyecto_id}` : '/projects',
  idea_aprobada:   (item) => item.referencia_id ? `/ideas/${item.referencia_id}` : '/ideas',
  evento_creado:   () => '/calendar',
  nodo_aprobado:   () => '/nodos',
  archivo_subido:  () => '/library',
}

const FILTER_OPTS = [
  { value: '',                label: 'Todo' },
  { value: 'proyecto_nuevo',  label: '🔬 Proyectos' },
  { value: 'avance',          label: '📈 Avances' },
  { value: 'idea_aprobada',   label: '💡 Ideas' },
  { value: 'evento_creado',   label: '📅 Eventos' },
  { value: 'archivo_subido',  label: '📎 Archivos' },
  { value: 'nodo_aprobado',   label: '🏛️ Grupos' },
]

/* ── Single card ── */
function TimelineCard({ item, index }) {
  const meta = TIPO_META[item.tipo] || { label: item.tipo, color: '#6b7280', bg: 'rgba(107,114,128,0.12)' }
  const href = TIPO_HREF[item.tipo]?.(item)

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3), duration: 0.3 }}
      className="flex gap-4 group"
    >
      {/* Timeline spine */}
      <div className="flex flex-col items-center shrink-0">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0 z-10"
          style={{ background: meta.bg, border: `1px solid ${meta.color}30` }}
        >
          {item.icono || '📌'}
        </div>
        <div className="w-px flex-1 mt-2" style={{ background: 'rgba(255,255,255,0.05)', minHeight: 24 }} />
      </div>

      {/* Card */}
      <div className="flex-1 pb-6 min-w-0">
        <div
          className="rounded-2xl border p-4 transition-all group-hover:border-white/10"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
        >
          {/* Header */}
          <div className="flex items-start gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ background: meta.bg, color: meta.color, border: `1px solid ${meta.color}30` }}
                >
                  {meta.label}
                </span>
                {item.proyecto?.titulo && (
                  <span className="flex items-center gap-1 text-[10px] text-white/30">
                    <FiFolder size={9} />
                    {item.proyecto.titulo}
                  </span>
                )}
              </div>

              {href ? (
                <Link
                  to={href}
                  className="text-sm font-semibold text-white/85 hover:text-white transition-colors line-clamp-2"
                >
                  {item.titulo}
                </Link>
              ) : (
                <p className="text-sm font-semibold text-white/85 line-clamp-2">{item.titulo}</p>
              )}
            </div>
          </div>

          {item.descripcion && (
            <p className="text-xs text-white/40 line-clamp-2 mb-3">{item.descripcion}</p>
          )}

          {/* Footer */}
          <div className="flex items-center gap-3 mt-2">
            {item.usuario ? (
              <div className="flex items-center gap-1.5">
                <Avatar name={item.usuario.nombre} area={item.usuario.area_investigacion} size="xs" />
                <span className="text-[11px] text-white/35">{item.usuario.nombre}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-[11px] text-white/25">
                <FiUser size={10} />
                Sistema
              </div>
            )}
            <span className="text-white/20 text-[10px] ml-auto flex items-center gap-1">
              <FiCalendar size={9} />
              {timeAgo(item.created_at)}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ══════════════════════════════════
   Main page
   ══════════════════════════════════ */
export default function Timeline() {
  const [tipoFilter, setTipoFilter] = useState('')
  const { items, loading, loadingMore, hasMore, fetchMore, refetch } = useTimeline({ tipo: tipoFilter || null })

  /* Infinite scroll observer */
  const observerRef = useRef(null)
  const sentinelRef = useCallback((node) => {
    if (observerRef.current) observerRef.current.disconnect()
    if (!node) return
    observerRef.current = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasMore && !loadingMore) fetchMore()
    }, { threshold: 0.1 })
    observerRef.current.observe(node)
  }, [hasMore, loadingMore, fetchMore])

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-title text-white">Timeline</h1>
          <p className="text-white/40 text-sm mt-0.5">Actividad reciente del semillero</p>
        </div>
        <button
          onClick={refetch}
          className="p-2 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
          title="Actualizar"
        >
          <FiRefreshCw size={15} />
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_OPTS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setTipoFilter(opt.value)}
            className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all"
            style={tipoFilter === opt.value
              ? { background: 'rgba(252,101,31,0.15)', color: '#FC651F', border: '1px solid rgba(252,101,31,0.3)' }
              : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.08)' }
            }
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-3">📭</div>
          <p className="text-white/40 text-sm">No hay actividad registrada aún</p>
          <p className="text-white/20 text-xs mt-1">Los eventos aparecerán aquí automáticamente</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div>
            {items.map((item, i) => (
              <TimelineCard key={item.id} item={item} index={i} />
            ))}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="flex justify-center py-4">
              {loadingMore && <Spinner size="sm" />}
              {!hasMore && items.length > 0 && (
                <p className="text-white/20 text-xs">— Fin del timeline —</p>
              )}
            </div>
          </div>
        </AnimatePresence>
      )}
    </div>
  )
}
