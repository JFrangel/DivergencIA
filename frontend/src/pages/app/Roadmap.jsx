import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiMap, FiTarget, FiCheckCircle, FiLoader, FiCircle, FiLock,
  FiEdit2, FiCheck, FiChevronDown, FiChevronUp, FiPlus, FiX,
  FiList, FiClock, FiCalendar, FiTrendingUp, FiFlag, FiUsers, FiActivity,
} from 'react-icons/fi'
import { useTimeline } from '../../hooks/useTimeline'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { useRoadmap } from '../../hooks/useRoadmap'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'

const FU = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
})

const ESTADO_OPTIONS = [
  { value: 'completada', label: 'Completada',  color: '#22c55e' },
  { value: 'actual',     label: 'Fase actual', color: '#FC651F' },
  { value: 'proxima',    label: 'Proxima',     color: '#8B5CF6' },
  { value: 'bloqueada',  label: 'Bloqueada',   color: '#ef4444' },
]

const STATE_META = {
  completado:  { icon: FiCheckCircle, color: '#22c55e', label: 'Completada' },
  en_progreso: { icon: FiLoader,      color: '#FC651F', label: 'En progreso' },
  pendiente:   { icon: FiCircle,      color: '#8B5CF6', label: 'Proxima' },
  bloqueado:   { icon: FiLock,        color: '#ef4444', label: 'Bloqueada' },
}

/* ── Progress ring ───────────────────────────────────────────────── */
function PhaseProgressRing({ pct, color, size = 44 }) {
  const r = (size - 8) / 2
  const circumference = 2 * Math.PI * r
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - pct / 100) }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-bold" style={{ color }}>{pct}%</span>
      </div>
    </div>
  )
}

function ProgressBar({ pct, color, className = '' }) {
  return (
    <div className={`h-1.5 rounded-full bg-white/[0.04] overflow-hidden ${className}`}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${color}, ${color}aa)` }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </div>
  )
}

/* ── Custom status dropdown (replaces native <select>) ───────────── */
function EstadoDropdown({ phase, onChange }) {
  const [open, setOpen] = useState(false)
  const current = ESTADO_OPTIONS.find(o => o.value === phase.estadoOriginal) || ESTADO_OPTIONS[2]

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(p => !p) }}
        className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-lg border transition-colors"
        style={{ background: `${current.color}15`, borderColor: `${current.color}30`, color: current.color }}
      >
        {current.label}
        <FiChevronDown size={9} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute top-full left-0 mt-1 z-50 w-36 rounded-xl overflow-hidden shadow-xl"
              style={{ background: '#1a0e12', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              {ESTADO_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={(e) => { e.stopPropagation(); onChange(phase.id, opt.value); setOpen(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-medium hover:bg-white/10 transition-colors text-left"
                  style={{ color: opt.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: opt.color }} />
                  {opt.label}
                  {opt.value === phase.estadoOriginal && <FiCheck size={10} className="ml-auto" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Cronología View (premium vertical timeline) ──────────────────── */
const EVENT_META = {
  fase:     { label: 'Fase del Roadmap', emoji: '🗺',  defaultColor: '#8B5CF6' },
  miembro:  { label: 'Nuevo miembro',    emoji: '👤',  defaultColor: '#00D1FF' },
  proyecto: { label: 'Proyecto',         emoji: '📁',  defaultColor: '#FC651F' },
}

function CronologiaView({ roadmap }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function build() {
      const [{ data: members }, { data: projects }] = await Promise.all([
        supabase.from('usuarios')
          .select('id,nombre,foto_url,area_investigacion,fecha_registro')
          .order('fecha_registro', { ascending: true }),
        supabase.from('proyectos')
          .select('id,titulo,estado,area,created_at')
          .order('created_at', { ascending: true }),
      ])

      const faseEvents = (roadmap || [])
        .filter(p => p.fecha_estimada)
        .map(p => ({
          id: `fase-${p.id}`,
          tipo: 'fase',
          titulo: p.titulo,
          desc: p.descripcion,
          date: new Date(p.fecha_estimada),
          color: p.color || STATE_META[p.estado]?.color || '#8B5CF6',
          estado: p.estado,
          orden: p.orden,
          progressPct: p.progressPct,
          totalHitos: p.totalHitos,
          completedHitos: p.completedHitos,
        }))

      const memberEvents = (members || []).map(m => ({
        id: `miembro-${m.id}`,
        tipo: 'miembro',
        titulo: m.nombre,
        desc: m.area_investigacion || 'Investigador',
        date: new Date(m.created_at),
        avatar: m.foto_url,
        color: '#00D1FF',
      }))

      const projectEvents = (projects || []).map(p => ({
        id: `proyecto-${p.id}`,
        tipo: 'proyecto',
        titulo: p.titulo || '(sin nombre)',
        desc: [p.area, p.estado].filter(Boolean).join(' · ') || 'Iniciado',
        projectId: p.id,
        date: new Date(p.created_at),
        color: '#FC651F',
      }))

      const all = [...faseEvents, ...memberEvents, ...projectEvents]
        .filter(e => e.date && !isNaN(e.date))
        .sort((a, b) => a.date - b.date)

      setEvents(all)
      setLoading(false)
    }
    build()
  }, [roadmap])

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>

  if (!events.length) {
    return (
      <Card className="!p-8">
        <div className="text-center space-y-2">
          <FiClock size={28} className="mx-auto text-white/10" />
          <p className="text-sm text-white/30">La cronología se llenará con eventos de la plataforma</p>
          <p className="text-xs text-white/15">Agrega fechas estimadas a las fases del roadmap para verlas aquí</p>
        </div>
      </Card>
    )
  }

  // Group by year
  const byYear = {}
  for (const ev of events) {
    const y = ev.date.getFullYear()
    if (!byYear[y]) byYear[y] = []
    byYear[y].push(ev)
  }

  const fmtDate = (d) => d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' })
  const sortedYears = Object.entries(byYear).sort(([a], [b]) => Number(a) - Number(b))

  return (
    <Card className="!p-6 !pt-4">
      {sortedYears.map(([year, yearEvents], yi) => (
        <div key={year}>
          {/* Year header */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: yi * 0.06 }}
            className="flex items-center gap-3 py-3"
          >
            <span className="text-[10px] font-bold tracking-[0.2em] text-white/20 uppercase">{year}</span>
            <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.06), transparent)' }} />
          </motion.div>

          {/* Events */}
          <div className="relative ml-1 mb-2">
            {/* Vertical spine */}
            <div className="absolute left-[15px] top-2 bottom-2 w-px"
              style={{ background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.06) 8%, rgba(255,255,255,0.06) 92%, transparent)' }} />

            <div className="space-y-1">
              {yearEvents.map((ev, i) => {
                const meta = EVENT_META[ev.tipo] || EVENT_META.proyecto
                const col = ev.color || meta.defaultColor
                const isActive = ev.tipo === 'fase' && ev.estado === 'en_progreso'
                const isDone = ev.tipo === 'fase' && ev.estado === 'completado'

                return (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: yi * 0.08 + i * 0.04, duration: 0.3 }}
                    className="flex items-start gap-4 py-3 group"
                  >
                    {/* Dot */}
                    <div className="relative z-10 shrink-0 mt-0.5">
                      <motion.div
                        className="w-8 h-8 rounded-full flex items-center justify-center border"
                        style={{
                          background: `${col}12`,
                          borderColor: isDone ? `${col}50` : isActive ? col : `${col}28`,
                        }}
                        animate={isActive ? {
                          boxShadow: [`0 0 0 0 ${col}00`, `0 0 10px 3px ${col}35`, `0 0 0 0 ${col}00`],
                        } : {}}
                        transition={{ repeat: Infinity, duration: 2.5 }}
                      >
                        {ev.avatar
                          ? <img src={ev.avatar} alt="" className="w-full h-full rounded-full object-cover opacity-80" />
                          : <span className="text-sm leading-none select-none">{meta.emoji}</span>
                        }
                      </motion.div>
                      {isDone && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 flex items-center justify-center">
                          <FiCheckCircle size={8} className="text-white" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-3 border-b border-white/[0.03] group-last:border-0">
                      {/* Type + date */}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded"
                          style={{ background: `${col}14`, color: `${col}99` }}>
                          {meta.label}
                          {ev.tipo === 'fase' && ev.orden ? ` ${ev.orden}` : ''}
                        </span>
                        {ev.tipo === 'fase' && ev.estado && (
                          <span className="text-[9px] uppercase tracking-wider"
                            style={{ color: `${STATE_META[ev.estado]?.color || col}60` }}>
                            {STATE_META[ev.estado]?.label}
                          </span>
                        )}
                        <span className="ml-auto text-[10px] text-white/20 tabular-nums">{fmtDate(ev.date)}</span>
                      </div>

                      {ev.tipo === 'proyecto' && ev.projectId ? (
                        <Link
                          to={`/projects/${ev.projectId}`}
                          className="text-sm font-semibold text-white/85 leading-snug mb-0.5 hover:text-[#FC651F] transition-colors inline-block"
                        >
                          {ev.titulo}
                        </Link>
                      ) : (
                        <p className="text-sm font-semibold text-white/85 leading-snug mb-0.5">{ev.titulo}</p>
                      )}
                      {ev.desc && <p className="text-xs text-white/30 leading-relaxed">{ev.desc}</p>}

                      {/* Fase progress bar */}
                      {ev.tipo === 'fase' && ev.totalHitos > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                          <div className="flex-1 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                            <motion.div className="h-full rounded-full"
                              style={{ background: `linear-gradient(90deg, ${col}, ${col}80)` }}
                              initial={{ width: 0 }}
                              animate={{ width: `${ev.progressPct}%` }}
                              transition={{ duration: 1, delay: yi * 0.08 + i * 0.04 + 0.3 }}
                            />
                          </div>
                          <span className="text-[9px] text-white/25 tabular-nums">
                            {ev.completedHitos}/{ev.totalHitos} hitos
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </div>
      ))}
    </Card>
  )
}

/* ── Milestone row ────────────────────────────────────────────────── */
function MilestoneRow({ hito, phaseId, phaseColor, isAdmin, onToggle, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.25 }}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${
        isAdmin ? 'cursor-pointer hover:bg-white/[0.03]' : ''
      } ${hito.completado ? 'bg-emerald-500/[0.04]' : 'bg-white/[0.01]'}`}
      onClick={isAdmin ? () => onToggle(phaseId, hito.titulo) : undefined}
    >
      <motion.div className="shrink-0" animate={hito.completado ? { scale: [1, 1.2, 1] } : {}} transition={{ duration: 0.3 }}>
        {hito.completado
          ? <FiCheckCircle size={14} className="text-emerald-400" />
          : <FiCircle size={14} style={{ color: `${phaseColor}50` }} />
        }
      </motion.div>
      <span className={`text-sm flex-1 ${hito.completado ? 'text-white/60 line-through' : 'text-white/45'}`}>
        {hito.titulo}
      </span>
      {hito.completado && (
        <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
          className="text-[9px] text-emerald-400/60 uppercase tracking-wider font-bold">
          Listo
        </motion.span>
      )}
    </motion.div>
  )
}

/* Map roadmap phase estado → proyectos estado values */
const PHASE_TO_ESTADOS = {
  completado:  ['finalizado'],
  en_progreso: ['activo', 'investigacion', 'desarrollo'],
  pendiente:   ['idea'],
  bloqueado:   ['pausa'],
}

/* ── Activity View ───────────────────────────────────────────────── */
const TIPO_COLORS = {
  proyecto_creado: '#FC651F',
  tarea_completada: '#22c55e',
  idea_creada: '#8B5CF6',
  miembro_unido: '#00D1FF',
  mensaje_enviado: '#F59E0B',
  archivo_subido: '#EC4899',
}

function ActivityView() {
  const { items, loading, loadingMore, hasMore, fetchMore } = useTimeline()

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-12">
          <Spinner />
        </div>
      </Card>
    )
  }

  if (!items.length) {
    return (
      <Card>
        <div className="text-center py-12">
          <FiActivity size={24} className="mx-auto text-white/10 mb-3" />
          <p className="text-white/30 text-sm">Sin actividad registrada</p>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <h3 className="text-sm font-semibold text-white/60 mb-4 flex items-center gap-2">
        <FiActivity size={14} className="text-[#FC651F]" />
        Actividad del semillero
      </h3>
      <div className="space-y-1">
        {items.map((item, i) => {
          const color = TIPO_COLORS[item.tipo] || '#6b7280'
          const date = new Date(item.created_at)
          const dateStr = date.toLocaleDateString('es', { day: '2-digit', month: 'short' })
          const timeStr = date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-start gap-3 py-2.5 border-b border-white/[0.04] last:border-0"
            >
              {/* Timeline dot */}
              <div className="flex flex-col items-center mt-1 shrink-0">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white/70 leading-snug">
                  {item.titulo}
                </p>
                {item.descripcion && (
                  <p className="text-xs text-white/30 mt-0.5 line-clamp-1">{item.descripcion}</p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  {item.usuario && (
                    <span className="text-[10px] text-white/25">{item.usuario.nombre}</span>
                  )}
                  {item.proyecto && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: `${color}15`, color }}>
                      {item.proyecto.titulo}
                    </span>
                  )}
                </div>
              </div>
              {/* Date */}
              <div className="text-right shrink-0">
                <p className="text-[10px] text-white/25">{dateStr}</p>
                <p className="text-[10px] text-white/15">{timeStr}</p>
              </div>
            </motion.div>
          )
        })}
      </div>
      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={fetchMore}
            disabled={loadingMore}
            className="text-xs text-white/30 hover:text-white/60 transition-colors disabled:opacity-50"
          >
            {loadingMore ? 'Cargando...' : 'Cargar más actividad'}
          </button>
        </div>
      )}
    </Card>
  )
}

/* ── Main Roadmap page ───────────────────────────────────────────── */
export default function Roadmap() {
  const { roadmap, loading, updatePhase, toggleMilestone, updatePhaseEstado, createPhase } = useRoadmap()
  const { isAdmin } = useAuth()

  const [searchParams] = useSearchParams()
  const [view, setView] = useState(() => {
    const v = searchParams.get('view')
    return ['kanban', 'timeline', 'actividad'].includes(v) ? v : 'kanban'
  })
  const [editingPhase, setEditingPhase] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [newHitoInput, setNewHitoInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [expandedPhases, setExpandedPhases] = useState({})
  const [showNewPhase, setShowNewPhase] = useState(false)
  const [newPhaseForm, setNewPhaseForm] = useState({ titulo: '', descripcion: '', color: '#8B5CF6', fecha_estimada: '' })
  const [creatingPhase, setCreatingPhase] = useState(false)
  const [allProyectos, setAllProyectos] = useState([])

  useEffect(() => {
    supabase.from('proyectos').select('id, titulo, estado').order('titulo', { ascending: true })
      .then(({ data }) => setAllProyectos(data || []))
  }, [])

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  const completed = roadmap.filter(r => r.estado === 'completado').length
  const inProgress = roadmap.filter(r => r.estado === 'en_progreso').length
  const pending = roadmap.filter(r => r.estado === 'pendiente').length
  const totalHitos = roadmap.reduce((acc, r) => acc + (r.totalHitos || 0), 0)
  const completedHitos = roadmap.reduce((acc, r) => acc + (r.completedHitos || 0), 0)
  const pct = totalHitos ? Math.round((completedHitos / totalHitos) * 100) : 0

  function toggleExpand(id) {
    setExpandedPhases(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function openEditModal(phase) {
    setEditForm({
      titulo: phase.titulo,
      descripcion: phase.descripcion,
      fecha_estimada: phase.fecha_estimada || '',
      color: phase.color || '#8B5CF6',
      hitos: phase.hitos ? phase.hitos.map(h => ({ ...h })) : [],
    })
    setNewHitoInput('')
    setEditingPhase(phase)
  }

  function addHitoToForm() {
    if (!newHitoInput.trim()) return
    setEditForm(f => ({ ...f, hitos: [...(f.hitos || []), { titulo: newHitoInput.trim(), completado: false }] }))
    setNewHitoInput('')
  }

  async function handleSaveEdit() {
    if (!editingPhase) return
    setSaving(true)
    try {
      await updatePhase(editingPhase.id, {
        titulo: editForm.titulo,
        descripcion: editForm.descripcion,
        fecha_estimada: editForm.fecha_estimada || null,
        color: editForm.color,
        milestones: (editForm.hitos || []).map(h => ({ titulo: h.titulo, completado: h.completado })),
      })
      toast.success('Fase actualizada')
      setEditingPhase(null)
    } catch {
      toast.error('Error al guardar la fase')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleMilestone(phaseId, milestoneTitle) {
    try { await toggleMilestone(phaseId, milestoneTitle) }
    catch { toast.error('Error al actualizar el hito') }
  }

  async function handleEstadoChange(phaseId, newEstado) {
    try { await updatePhaseEstado(phaseId, newEstado); toast.success('Estado actualizado') }
    catch { toast.error('Error al cambiar el estado') }
  }

  async function handleCreatePhase() {
    if (!newPhaseForm.titulo.trim()) return
    setCreatingPhase(true)
    try {
      await createPhase(newPhaseForm)
      toast.success('Fase creada')
      setShowNewPhase(false)
      setNewPhaseForm({ titulo: '', descripcion: '', color: '#8B5CF6', fecha_estimada: '' })
    } catch {
      toast.error('Error al crear la fase')
    } finally {
      setCreatingPhase(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <motion.div {...FU(0)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center border border-[var(--c-primary)]/20"
              style={{ background: 'color-mix(in srgb, var(--c-primary) 10%, transparent)' }}
            >
              <FiMap size={18} className="text-[var(--c-primary)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-title text-white">Roadmap</h1>
              <p className="text-white/30 text-sm">La hoja de ruta de ATHENIA</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center gap-1 bg-white/[0.04] rounded-xl p-0.5">
              <button
                onClick={() => setView('kanban')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  view === 'kanban' ? 'bg-[var(--c-primary)] text-white' : 'text-white/40 hover:text-white'
                }`}
              >
                <FiList size={12} /> Fases
              </button>
              <button
                onClick={() => setView('timeline')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  view === 'timeline' ? 'bg-[var(--c-primary)] text-white' : 'text-white/40 hover:text-white'
                }`}
              >
                <FiClock size={12} /> Cronología
              </button>
              <button
                onClick={() => setView('actividad')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  view === 'actividad' ? 'bg-[var(--c-primary)] text-white' : 'text-white/40 hover:text-white'
                }`}
              >
                <FiActivity size={12} /> Actividad
              </button>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowNewPhase(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[var(--c-primary)]/15 text-[var(--c-primary)] hover:bg-[var(--c-primary)]/25 transition-colors border border-[var(--c-primary)]/20"
              >
                <FiPlus size={13} /> Nueva fase
              </button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Global progress */}
      <motion.div {...FU(0.06)}>
        <Card>
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            <div className="relative w-28 h-28 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
                <motion.circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke="url(#roadmapGrad)"
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - pct / 100) }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                />
                <defs>
                  <linearGradient id="roadmapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--c-primary)" />
                    <stop offset="100%" stopColor="var(--c-secondary)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold font-title gradient-text">{pct}%</span>
                <span className="text-[8px] text-white/20">completado</span>
              </div>
            </div>

            <div className="flex-1 w-full space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Completadas',  value: completed,                     icon: FiCheckCircle, color: '#22c55e' },
                  { label: 'En progreso',  value: inProgress,                    icon: FiLoader,      color: '#FC651F' },
                  { label: 'Proximas',     value: pending,                       icon: FiCircle,      color: '#8B5CF6' },
                  { label: 'Hitos hechos', value: `${completedHitos}/${totalHitos}`, icon: FiTarget,  color: '#00D1FF' },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    className="text-center p-3 rounded-xl bg-white/[0.02]"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.08 }}
                  >
                    <s.icon size={16} className="mx-auto mb-1.5" style={{ color: s.color }} />
                    <p className="text-xl font-bold font-title" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">{s.label}</p>
                  </motion.div>
                ))}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] text-white/30 uppercase tracking-wider">Progreso global</span>
                  <span className="text-[10px] font-bold text-white/50">{pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/[0.04] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, var(--c-primary), var(--c-secondary), var(--c-accent))' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Timeline view */}
      <AnimatePresence mode="wait">
        {view === 'timeline' && (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <CronologiaView roadmap={roadmap} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activity view */}
      <AnimatePresence mode="wait">
        {view === 'actividad' && (
          <motion.div
            key="actividad"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <ActivityView />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kanban phase cards */}
      <AnimatePresence mode="wait">
        {view === 'kanban' && (
          <motion.div
            key="kanban"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {roadmap.length === 0 && (
              <Card>
                <div className="text-center py-8">
                  <FiFlag size={32} className="mx-auto text-white/10 mb-3" />
                  <p className="text-sm text-white/30">No hay fases definidas aún</p>
                  {isAdmin && (
                    <button
                      onClick={() => setShowNewPhase(true)}
                      className="mt-4 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--c-primary)]/15 text-[var(--c-primary)] hover:bg-[var(--c-primary)]/25 transition-colors"
                    >
                      Crear primera fase
                    </button>
                  )}
                </div>
              </Card>
            )}
            {[...roadmap].sort((a, b) => {
              // Sort by fecha_estimada when available, fallback to orden
              if (a.fecha_estimada && b.fecha_estimada) return new Date(a.fecha_estimada) - new Date(b.fecha_estimada)
              if (a.fecha_estimada) return -1
              if (b.fecha_estimada) return 1
              return (a.orden || 0) - (b.orden || 0)
            }).map((phase, i) => {
              const phaseColor = phase.color || '#8B5CF6'
              const meta = STATE_META[phase.estado] || STATE_META.pendiente
              const StateIcon = meta.icon
              const isActive = phase.estado === 'en_progreso'
              const isCompleted = phase.estado === 'completado'
              const isExpanded = expandedPhases[phase.id] !== false

              return (
                <motion.div
                  key={phase.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.08, duration: 0.4 }}
                >
                  <Card
                    className="relative overflow-hidden"
                    style={{ borderColor: isActive ? `${phaseColor}30` : isCompleted ? '#22c55e15' : undefined }}
                  >
                    {isActive && (
                      <motion.div
                        className="absolute top-0 left-0 w-full h-0.5"
                        style={{ background: `linear-gradient(90deg, ${phaseColor}, var(--c-secondary))` }}
                        animate={{ opacity: [0.6, 1, 0.6] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      />
                    )}
                    {isCompleted && <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-500/40" />}

                    <div className="flex items-start gap-3">
                      <div className="shrink-0 mt-0.5">
                        {phase.totalHitos > 0 ? (
                          <PhaseProgressRing pct={phase.progressPct} color={phaseColor} size={44} />
                        ) : (
                          <motion.div
                            className="w-11 h-11 rounded-xl flex items-center justify-center border"
                            style={{ background: `${phaseColor}10`, borderColor: `${phaseColor}25` }}
                            animate={isActive ? {
                              boxShadow: [`0 0 0 ${phaseColor}00`, `0 0 14px ${phaseColor}30`, `0 0 0 ${phaseColor}00`],
                            } : {}}
                            transition={{ repeat: Infinity, duration: 2.5 }}
                          >
                            <StateIcon size={16} style={{ color: phaseColor }} />
                          </motion.div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                            style={{ background: `${meta.color}12`, color: `${meta.color}cc` }}
                          >
                            Fase {phase.orden} — {meta.label}
                          </span>
                          {phase.totalHitos > 0 && (
                            <span className="text-[9px] text-white/25">{phase.completedHitos}/{phase.totalHitos} hitos</span>
                          )}
                          {phase.fecha_estimada && (
                            <span className="text-[9px] text-white/20 flex items-center gap-0.5">
                              <FiCalendar size={8} />
                              Meta: {new Date(phase.fecha_estimada).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                          {isAdmin && <EstadoDropdown phase={phase} onChange={handleEstadoChange} />}
                          <div className="ml-auto flex items-center gap-1">
                            {isAdmin && (
                              <button
                                onClick={() => openEditModal(phase)}
                                className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors"
                                title="Editar fase"
                              >
                                <FiEdit2 size={13} />
                              </button>
                            )}
                            {phase.hitos?.length > 0 && (
                              <button
                                onClick={() => toggleExpand(phase.id)}
                                className="p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/10 transition-colors"
                              >
                                {isExpanded ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
                              </button>
                            )}
                          </div>
                        </div>

                        <h3 className="text-base font-bold font-title text-white">{phase.titulo}</h3>
                        <p className="text-sm text-white/40 mt-0.5 mb-2">{phase.descripcion}</p>

                        {/* Related projects */}
                        {(() => {
                          const estadosFase = PHASE_TO_ESTADOS[phase.estado] || []
                          const related = allProyectos.filter(p => estadosFase.includes(p.estado)).slice(0, 3)
                          if (!related.length) return null
                          return (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {related.map(p => (
                                <Link
                                  key={p.id}
                                  to={`/projects/${p.id}`}
                                  className="text-[10px] px-2 py-0.5 rounded-full bg-[#FC651F]/10 text-[#FC651F]/80 hover:bg-[#FC651F]/20 transition-colors flex items-center gap-1"
                                  onClick={e => e.stopPropagation()}
                                >
                                  📁 {p.titulo}
                                </Link>
                              ))}
                            </div>
                          )
                        })()}

                        {phase.totalHitos > 0 && (
                          <ProgressBar pct={phase.progressPct} color={phaseColor} className="mb-3" />
                        )}

                        <AnimatePresence>
                          {isExpanded && phase.hitos?.length > 0 && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="space-y-1.5 pt-1">
                                {phase.hitos.map((hito, hi) => (
                                  <MilestoneRow
                                    key={hito.titulo}
                                    hito={hito}
                                    phaseId={phase.id}
                                    phaseColor={phaseColor}
                                    isAdmin={isAdmin}
                                    onToggle={handleToggleMilestone}
                                    delay={hi * 0.04}
                                  />
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Phase Modal */}
      <Modal
        open={!!editingPhase}
        onClose={() => setEditingPhase(null)}
        title={`Editar — ${editingPhase?.titulo || ''}`}
        footer={
          <>
            <button
              onClick={() => setEditingPhase(null)}
              className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-[var(--c-primary)] text-white hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <FiLoader size={14} className="animate-spin" /> : <FiCheck size={14} />}
              Guardar
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Titulo</label>
            <input
              type="text"
              value={editForm.titulo || ''}
              onChange={(e) => setEditForm(f => ({ ...f, titulo: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[var(--c-primary)]/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Descripcion</label>
            <textarea
              value={editForm.descripcion || ''}
              onChange={(e) => setEditForm(f => ({ ...f, descripcion: e.target.value }))}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[var(--c-primary)]/50 transition-colors resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Fecha estimada</label>
              <input
                type="date"
                value={editForm.fecha_estimada || ''}
                onChange={(e) => setEditForm(f => ({ ...f, fecha_estimada: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[var(--c-primary)]/50 transition-colors"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={editForm.color || '#8B5CF6'}
                  onChange={(e) => setEditForm(f => ({ ...f, color: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={editForm.color || ''}
                  onChange={(e) => setEditForm(f => ({ ...f, color: e.target.value }))}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/60 outline-none focus:border-[var(--c-primary)]/50 transition-colors font-mono"
                  placeholder="#8B5CF6"
                />
              </div>
            </div>
          </div>

          {/* Milestone management */}
          <div>
            <label className="block text-xs text-white/40 mb-2">Hitos / Tareas ({(editForm.hitos || []).length})</label>
            <div className="space-y-1.5 mb-2 max-h-48 overflow-y-auto">
              {(editForm.hitos || []).length === 0 && (
                <p className="text-xs text-white/20 py-2 text-center">Sin hitos — agrega uno abajo</p>
              )}
              <AnimatePresence>
                {(editForm.hitos || []).map((h, i) => (
                  <motion.div
                    key={`${h.titulo}-${i}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8, height: 0 }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.04]"
                  >
                    <button
                      onClick={() => setEditForm(f => ({
                        ...f,
                        hitos: f.hitos.map((hh, j) => j === i ? { ...hh, completado: !hh.completado } : hh)
                      }))}
                      className="shrink-0"
                    >
                      {h.completado
                        ? <FiCheckCircle size={13} className="text-emerald-400" />
                        : <FiCircle size={13} className="text-white/25" />
                      }
                    </button>
                    <span className={`flex-1 text-sm ${h.completado ? 'text-white/40 line-through' : 'text-white/70'}`}>
                      {h.titulo}
                    </span>
                    <button
                      onClick={() => setEditForm(f => ({ ...f, hitos: f.hitos.filter((_, j) => j !== i) }))}
                      className="text-white/20 hover:text-red-400 transition-colors shrink-0"
                    >
                      <FiX size={13} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nuevo hito o tarea..."
                value={newHitoInput}
                onChange={e => setNewHitoInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addHitoToForm()}
                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-[var(--c-primary)]/50 transition-colors"
              />
              <button
                onClick={addHitoToForm}
                disabled={!newHitoInput.trim()}
                className="px-3 py-2 rounded-lg bg-[var(--c-primary)]/15 text-[var(--c-primary)] hover:bg-[var(--c-primary)]/25 transition-colors disabled:opacity-30"
              >
                <FiPlus size={15} />
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Create Phase Modal */}
      <Modal
        open={showNewPhase}
        onClose={() => setShowNewPhase(false)}
        title="Nueva fase"
        footer={
          <>
            <button onClick={() => setShowNewPhase(false)} className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors">
              Cancelar
            </button>
            <button
              onClick={handleCreatePhase}
              disabled={creatingPhase || !newPhaseForm.titulo.trim()}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-[var(--c-primary)] text-white hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {creatingPhase ? <FiLoader size={14} className="animate-spin" /> : <FiPlus size={14} />}
              Crear fase
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Titulo</label>
            <input
              type="text"
              placeholder="Nombre de la fase..."
              value={newPhaseForm.titulo}
              onChange={e => setNewPhaseForm(f => ({ ...f, titulo: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[var(--c-primary)]/50 transition-colors"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Descripcion</label>
            <textarea
              placeholder="Que cubre esta fase..."
              value={newPhaseForm.descripcion}
              onChange={e => setNewPhaseForm(f => ({ ...f, descripcion: e.target.value }))}
              rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 outline-none focus:border-[var(--c-primary)]/50 transition-colors resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Fecha estimada</label>
              <input
                type="date"
                value={newPhaseForm.fecha_estimada}
                onChange={e => setNewPhaseForm(f => ({ ...f, fecha_estimada: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[var(--c-primary)]/50 transition-colors"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={newPhaseForm.color}
                  onChange={e => setNewPhaseForm(f => ({ ...f, color: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                />
                <span className="text-xs text-white/30 font-mono">{newPhaseForm.color}</span>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
