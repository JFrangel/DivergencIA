import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiCalendar, FiChevronLeft, FiChevronRight, FiClock,
  FiMapPin, FiVideo, FiUsers, FiPlus, FiX, FiList, FiGrid,
} from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'

/* ── Type metadata ──────────────────────────────────────────────── */
const TYPE_META = {
  reunion:     { label: 'Reunión',      color: '#FC651F', icon: FiUsers },
  taller:      { label: 'Taller',       color: '#8B5CF6', icon: FiVideo },
  conferencia: { label: 'Conferencia',  color: '#00D1FF', icon: FiMapPin },
  deadline:    { label: 'Deadline',     color: '#EF4444', icon: FiClock },
  otro:        { label: 'Evento',       color: '#F59E0B', icon: FiCalendar },
}

const DAYS_ES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const EMPTY_FORM = { titulo: '', tipo: 'reunion', fecha: '', lugar: '', descripcion: '' }

/* ── Helpers ────────────────────────────────────────────────────── */
function startOfMonth(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), 1)
  d.setHours(0, 0, 0, 0)
  return d
}
function endOfMonth(date) {
  const d = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  d.setHours(23, 59, 59, 999)
  return d
}
function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function isToday(date) {
  return isSameDay(date, new Date())
}
function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}
function formatFullDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

/* ── Fade-up animation factory ──────────────────────────────────── */
const FU = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
})

/* ── Calendar Page ──────────────────────────────────────────────── */
export default function Calendar() {
  const { isAdmin } = useAuth()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [mobileView, setMobileView] = useState('list') // 'grid' | 'list'

  /* Fetch events for current month */
  useEffect(() => {
    setLoading(true)
    const start = startOfMonth(currentDate).toISOString()
    const end = endOfMonth(currentDate).toISOString()

    supabase
      .from('eventos')
      .select('*')
      .gte('fecha', start)
      .lte('fecha', end)
      .order('fecha', { ascending: true })
      .then(({ data, error }) => {
        if (!error) setEvents(data || [])
        setLoading(false)
      })
  }, [currentDate])

  /* Build a map: day number → events */
  const eventsByDay = useMemo(() => {
    const map = {}
    events.forEach(ev => {
      const day = new Date(ev.fecha).getDate()
      if (!map[day]) map[day] = []
      map[day].push(ev)
    })
    return map
  }, [events])

  /* Build calendar grid cells */
  const calendarCells = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    // Monday = 0 ... Sunday = 6
    let startOffset = firstDay.getDay() - 1
    if (startOffset < 0) startOffset = 6
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const cells = []
    // Empty cells before first day
    for (let i = 0; i < startOffset; i++) cells.push(null)
    // Day cells
    for (let d = 1; d <= daysInMonth; d++) cells.push(d)
    return cells
  }, [currentDate])

  /* Upcoming events (from today onward in current month) */
  const upcomingEvents = useMemo(() => {
    const now = new Date()
    return events.filter(ev => new Date(ev.fecha) >= now)
  }, [events])

  /* Navigation */
  const prevMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const nextMonth = () => setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))
  const goToday = () => setCurrentDate(new Date())

  /* Day click */
  const handleDayClick = (day) => {
    if (!day) return
    const dayEvents = eventsByDay[day]
    if (dayEvents && dayEvents.length > 0) {
      setSelectedDay({ day, events: dayEvents })
    }
  }

  /* Create event */
  const handleCreate = async (e) => {
    e.preventDefault()
    if (!formData.titulo || !formData.fecha) return
    setSaving(true)
    const { error } = await supabase.from('eventos').insert([formData])
    setSaving(false)
    if (!error) {
      setShowCreateModal(false)
      setFormData(EMPTY_FORM)
      // Refresh events
      const start = startOfMonth(currentDate).toISOString()
      const end = endOfMonth(currentDate).toISOString()
      const { data } = await supabase
        .from('eventos')
        .select('*')
        .gte('fecha', start)
        .lte('fecha', end)
        .order('fecha', { ascending: true })
      setEvents(data || [])
    }
  }

  const todayDate = new Date()

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <motion.div {...FU(0)} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-title text-white flex items-center gap-3">
            <FiCalendar className="text-[#FC651F]" />
            Calendario
          </h1>
          <p className="text-white/40 text-sm mt-1">Eventos y actividades del colectivo</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile view toggle */}
          <div className="flex sm:hidden items-center gap-1 bg-white/[0.05] rounded-lg p-0.5">
            <button
              onClick={() => setMobileView('grid')}
              className={`p-1.5 rounded-md transition-colors ${mobileView === 'grid' ? 'bg-[#FC651F]/20 text-[#FC651F]' : 'text-white/40'}`}
            >
              <FiGrid size={16} />
            </button>
            <button
              onClick={() => setMobileView('list')}
              className={`p-1.5 rounded-md transition-colors ${mobileView === 'list' ? 'bg-[#FC651F]/20 text-[#FC651F]' : 'text-white/40'}`}
            >
              <FiList size={16} />
            </button>
          </div>
          {isAdmin && (
            <Button
              variant="solid"
              size="sm"
              icon={<FiPlus size={15} />}
              onClick={() => setShowCreateModal(true)}
            >
              Evento
            </Button>
          )}
        </div>
      </motion.div>

      {/* Month nav */}
      <motion.div {...FU(0.05)}>
        <Card className="!p-3">
          <div className="flex items-center justify-between">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <FiChevronLeft size={20} />
            </button>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold font-title text-white">
                {MONTHS_ES[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              {!(currentDate.getMonth() === todayDate.getMonth() && currentDate.getFullYear() === todayDate.getFullYear()) && (
                <button
                  onClick={goToday}
                  className="text-xs text-[#FC651F] hover:text-[#FC651F]/80 transition-colors font-medium"
                >
                  Hoy
                </button>
              )}
            </div>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <FiChevronRight size={20} />
            </button>
          </div>
        </Card>
      </motion.div>

      {/* Calendar grid — hidden on mobile if list view */}
      <motion.div {...FU(0.1)} className={mobileView === 'list' ? 'hidden sm:block' : ''}>
        <Card className="!p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {DAYS_ES.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-white/30 uppercase tracking-wider py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          {loading ? (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-white/[0.02] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((day, i) => {
                if (day === null) {
                  return <div key={`empty-${i}`} className="aspect-square" />
                }

                const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                const today = isToday(dayDate)
                const dayEvents = eventsByDay[day] || []
                const hasEvents = dayEvents.length > 0

                return (
                  <motion.button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className={`
                      aspect-square rounded-lg flex flex-col items-center justify-center gap-1
                      transition-all duration-150 relative
                      ${today
                        ? 'bg-[#FC651F]/10 border-2 border-[#FC651F]/50'
                        : 'border border-white/[0.04] hover:border-white/[0.1] hover:bg-white/[0.04]'
                      }
                      ${hasEvents ? 'cursor-pointer' : 'cursor-default'}
                    `}
                    whileHover={hasEvents ? { scale: 1.05 } : {}}
                    whileTap={hasEvents ? { scale: 0.97 } : {}}
                  >
                    <span className={`text-sm font-medium ${today ? 'text-[#FC651F] font-bold' : 'text-white/60'}`}>
                      {day}
                    </span>
                    {hasEvents && (
                      <div className="flex items-center gap-0.5">
                        {dayEvents.slice(0, 3).map((ev, idx) => {
                          const meta = TYPE_META[ev.tipo] || TYPE_META.otro
                          return (
                            <span
                              key={idx}
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: meta.color }}
                            />
                          )
                        })}
                        {dayEvents.length > 3 && (
                          <span className="text-[8px] text-white/30 ml-0.5">+{dayEvents.length - 3}</span>
                        )}
                      </div>
                    )}
                  </motion.button>
                )
              })}
            </div>
          )}
        </Card>
      </motion.div>

      {/* Upcoming events list */}
      <motion.div {...FU(0.15)}>
        <Card>
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2 mb-4">
            <FiClock size={12} className="text-[#FC651F]" />
            Próximos eventos
          </h3>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 rounded-lg bg-white/[0.03] animate-pulse" />
              ))}
            </div>
          ) : upcomingEvents.length === 0 ? (
            <div className="text-center py-8">
              <FiCalendar size={32} className="mx-auto text-white/10 mb-3" />
              <p className="text-sm text-white/25">No hay eventos próximos este mes</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingEvents.map((ev, i) => {
                const meta = TYPE_META[ev.tipo] || TYPE_META.otro
                const Icon = meta.icon
                const evDate = new Date(ev.fecha)
                const day = evDate.getDate()
                const month = evDate.toLocaleDateString('es-CO', { month: 'short' })
                const time = formatTime(ev.fecha)
                const today = isToday(evDate)
                const tomorrow = isSameDay(evDate, new Date(Date.now() + 86400000))

                return (
                  <motion.div
                    key={ev.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.03] transition-colors group"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    {/* Date block */}
                    <div
                      className="w-12 h-12 rounded-lg flex flex-col items-center justify-center shrink-0"
                      style={{ background: `${meta.color}12`, border: `1px solid ${meta.color}20` }}
                    >
                      <span className="text-sm font-bold leading-none" style={{ color: meta.color }}>{day}</span>
                      <span className="text-[9px] uppercase leading-none mt-0.5" style={{ color: `${meta.color}80` }}>{month}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white/80 truncate">{ev.titulo}</p>
                        {today && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#22c55e]/15 text-[#22c55e] font-semibold shrink-0">
                            Hoy
                          </span>
                        )}
                        {tomorrow && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#F59E0B]/15 text-[#F59E0B] font-semibold shrink-0">
                            Mañana
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[11px] text-white/25 flex items-center gap-1">
                          <FiClock size={10} /> {time}
                        </span>
                        <span className="text-[11px] flex items-center gap-1" style={{ color: `${meta.color}90` }}>
                          <Icon size={10} /> {meta.label}
                        </span>
                        {ev.lugar && (
                          <span className="text-[11px] text-white/25 flex items-center gap-1 truncate">
                            <FiMapPin size={10} /> {ev.lugar}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </Card>
      </motion.div>

      {/* ── Day detail modal ────────────────────────────────────── */}
      <Modal
        open={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? `Eventos del ${selectedDay.day} de ${MONTHS_ES[currentDate.getMonth()]}` : ''}
      >
        {selectedDay && (
          <div className="space-y-3">
            {selectedDay.events.map(ev => {
              const meta = TYPE_META[ev.tipo] || TYPE_META.otro
              const Icon = meta.icon
              return (
                <div
                  key={ev.id}
                  className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: `${meta.color}15` }}
                    >
                      <Icon size={18} style={{ color: meta.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-white">{ev.titulo}</h4>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        <span className="text-xs text-white/40 flex items-center gap-1">
                          <FiClock size={11} /> {formatTime(ev.fecha)}
                        </span>
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: `${meta.color}15`, color: meta.color }}
                        >
                          {meta.label}
                        </span>
                        {ev.lugar && (
                          <span className="text-xs text-white/40 flex items-center gap-1">
                            <FiMapPin size={11} /> {ev.lugar}
                          </span>
                        )}
                      </div>
                      {ev.descripcion && (
                        <p className="text-xs text-white/30 mt-2 leading-relaxed">{ev.descripcion}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Modal>

      {/* ── Create event modal ──────────────────────────────────── */}
      <Modal
        open={showCreateModal}
        onClose={() => { setShowCreateModal(false); setFormData(EMPTY_FORM) }}
        title="Nuevo evento"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => { setShowCreateModal(false); setFormData(EMPTY_FORM) }}>
              Cancelar
            </Button>
            <Button variant="solid" size="sm" loading={saving} onClick={handleCreate}>
              Crear evento
            </Button>
          </>
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          {/* Titulo */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Título</label>
            <input
              type="text"
              required
              value={formData.titulo}
              onChange={e => setFormData(p => ({ ...p, titulo: e.target.value }))}
              placeholder="Nombre del evento"
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#FC651F]/50 transition-colors"
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Tipo</label>
            <select
              value={formData.tipo}
              onChange={e => setFormData(p => ({ ...p, tipo: e.target.value }))}
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FC651F]/50 transition-colors"
            >
              {Object.entries(TYPE_META).map(([key, meta]) => (
                <option key={key} value={key} className="bg-[#0c0608] text-white">
                  {meta.label}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Fecha y hora</label>
            <input
              type="datetime-local"
              required
              value={formData.fecha}
              onChange={e => setFormData(p => ({ ...p, fecha: e.target.value }))}
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FC651F]/50 transition-colors"
            />
          </div>

          {/* Lugar */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Lugar</label>
            <input
              type="text"
              value={formData.lugar}
              onChange={e => setFormData(p => ({ ...p, lugar: e.target.value }))}
              placeholder="Ubicación o enlace"
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#FC651F]/50 transition-colors"
            />
          </div>

          {/* Descripcion */}
          <div>
            <label className="block text-xs font-medium text-white/50 mb-1.5">Descripción</label>
            <textarea
              value={formData.descripcion}
              onChange={e => setFormData(p => ({ ...p, descripcion: e.target.value }))}
              placeholder="Detalles del evento..."
              rows={3}
              className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#FC651F]/50 transition-colors resize-none"
            />
          </div>
        </form>
      </Modal>
    </div>
  )
}
