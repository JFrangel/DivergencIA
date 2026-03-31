import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  FiCalendar, FiChevronLeft, FiChevronRight, FiClock,
  FiMapPin, FiVideo, FiUsers, FiPlus, FiX, FiList, FiGrid,
  FiEdit2, FiTrash2, FiUser, FiAlertTriangle, FiPhone, FiMail,
  FiBell,
} from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { toast } from 'sonner'
import { createNotification } from '../../hooks/useNotifications'
import { sendEmailBatch, emailMeetingInvite } from '../../lib/emailService'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'

/* ── Type metadata ──────────────────────────────────────────────── */
const TYPE_META = {
  reunion:     { label: 'Reunion',      color: '#FC651F', icon: FiUsers },
  taller:      { label: 'Taller',       color: '#8B5CF6', icon: FiVideo },
  conferencia: { label: 'Conferencia',  color: '#00D1FF', icon: FiMapPin },
  deadline:    { label: 'Deadline',     color: '#EF4444', icon: FiClock },
  otro:        { label: 'Evento',       color: '#F59E0B', icon: FiCalendar },
}

const DAYS_ES = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom']
const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const EMPTY_FORM = { titulo: '', tipo: 'reunion', fecha: '', lugar: '', descripcion: '', proyecto_id: null, con_llamada: false, notificar_email: false }

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
function toDatetimeLocal(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/* ── Fade-up animation factory ──────────────────────────────────── */
const FU = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
})

/* ── Shared form input class ─────────────────────────────────────── */
const inputClass = "w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[var(--c-primary)]/50 transition-colors"

/* ── Event Form Component ────────────────────────────────────────── */
function EventForm({ formData, setFormData, proyectos = [] }) {
  return (
    <div className="space-y-4">
      {/* Titulo */}
      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5">Titulo</label>
        <input
          type="text"
          required
          value={formData.titulo}
          onChange={e => setFormData(p => ({ ...p, titulo: e.target.value }))}
          placeholder="Nombre del evento"
          className={inputClass}
        />
      </div>

      {/* Tipo */}
      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5">Tipo</label>
        <select
          value={formData.tipo}
          onChange={e => setFormData(p => ({ ...p, tipo: e.target.value }))}
          className={inputClass}
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
          className={inputClass}
        />
      </div>

      {/* Lugar */}
      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5">Lugar</label>
        <input
          type="text"
          value={formData.lugar}
          onChange={e => setFormData(p => ({ ...p, lugar: e.target.value }))}
          placeholder="Ubicacion o enlace"
          className={inputClass}
        />
      </div>

      {/* Descripcion */}
      <div>
        <label className="block text-xs font-medium text-white/50 mb-1.5">Descripcion</label>
        <textarea
          value={formData.descripcion}
          onChange={e => setFormData(p => ({ ...p, descripcion: e.target.value }))}
          placeholder="Detalles del evento..."
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Proyecto (opcional) */}
      {proyectos.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-white/50 mb-1.5">Proyecto (opcional)</label>
          <select
            value={formData.proyecto_id || ''}
            onChange={e => setFormData(p => ({ ...p, proyecto_id: e.target.value || null }))}
            className={inputClass}
          >
            <option value="" className="bg-[#0c0608] text-white">— Sin proyecto —</option>
            {proyectos.map(p => (
              <option key={p.id} value={p.id} className="bg-[#0c0608] text-white">{p.titulo}</option>
            ))}
          </select>
        </div>
      )}

      {/* Meeting options */}
      <div className="pt-1 space-y-2 border-t border-white/[0.06]">
        <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Opciones de reunión</p>

        <label className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] cursor-pointer hover:bg-white/[0.05] transition-colors group">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: formData.con_llamada ? 'rgba(252,101,31,0.15)' : 'rgba(255,255,255,0.04)' }}
          >
            <FiPhone size={14} style={{ color: formData.con_llamada ? '#FC651F' : 'rgba(255,255,255,0.3)' }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white/70 group-hover:text-white/90 transition-colors">Canal de reunión</p>
            <p className="text-[10px] text-white/30 mt-0.5">Crea un canal de chat + llamada para este evento</p>
          </div>
          <div
            className="w-9 h-5 rounded-full relative shrink-0 transition-colors"
            style={{ background: formData.con_llamada ? '#FC651F' : 'rgba(255,255,255,0.1)' }}
          >
            <div
              className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
              style={{ left: formData.con_llamada ? '18px' : '2px' }}
            />
          </div>
          <input
            type="checkbox"
            className="sr-only"
            checked={!!formData.con_llamada}
            onChange={e => setFormData(p => ({ ...p, con_llamada: e.target.checked }))}
          />
        </label>

        <label className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] cursor-pointer hover:bg-white/[0.05] transition-colors group">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: formData.notificar_email ? 'rgba(0,209,255,0.12)' : 'rgba(255,255,255,0.04)' }}
          >
            <FiMail size={14} style={{ color: formData.notificar_email ? '#00D1FF' : 'rgba(255,255,255,0.3)' }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-white/70 group-hover:text-white/90 transition-colors">Notificar por email</p>
            <p className="text-[10px] text-white/30 mt-0.5">Envía invitación por correo a todos los miembros activos</p>
          </div>
          <div
            className="w-9 h-5 rounded-full relative shrink-0 transition-colors"
            style={{ background: formData.notificar_email ? '#00D1FF' : 'rgba(255,255,255,0.1)' }}
          >
            <div
              className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
              style={{ left: formData.notificar_email ? '18px' : '2px' }}
            />
          </div>
          <input
            type="checkbox"
            className="sr-only"
            checked={!!formData.notificar_email}
            onChange={e => setFormData(p => ({ ...p, notificar_email: e.target.checked }))}
          />
        </label>
      </div>
    </div>
  )
}

/* ── Delete Confirmation Modal ───────────────────────────────────── */
function DeleteConfirmModal({ open, onClose, onConfirm, loading, eventTitle }) {
  return (
    <Modal open={open} onClose={onClose} title="Eliminar evento" size="sm">
      <div className="flex flex-col items-center gap-4 py-2">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
          <FiAlertTriangle size={22} className="text-red-400" />
        </div>
        <div className="text-center">
          <p className="text-sm text-white/70">
            Estas seguro de eliminar el evento
          </p>
          <p className="text-sm font-semibold text-white mt-1">&ldquo;{eventTitle}&rdquo;?</p>
          <p className="text-xs text-white/30 mt-2">Esta accion no se puede deshacer.</p>
        </div>
        <div className="flex items-center gap-3 w-full mt-2">
          <Button variant="ghost" size="sm" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 text-red-400 text-sm font-medium hover:bg-red-500/25 transition-all disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
            ) : (
              <>
                <FiTrash2 size={14} />
                Eliminar
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/* ── Calendar Page ──────────────────────────────────────────────── */
export default function Calendar() {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [editingEvent, setEditingEvent] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [mobileView, setMobileView] = useState('list')
  const [proyectos, setProyectos] = useState([])

  /* Fetch active projects once */
  useEffect(() => {
    supabase.from('proyectos').select('id, titulo')
      .not('estado', 'in', '(cancelado,finalizado)')
      .order('titulo', { ascending: true }).limit(50)
      .then(({ data }) => setProyectos(data || []))
  }, [])

  /* Fetch events for current month */
  const fetchEvents = async () => {
    setLoading(true)
    const start = startOfMonth(currentDate).toISOString()
    const end = endOfMonth(currentDate).toISOString()

    // Try fetching with creator + proyecto join
    let result = await supabase
      .from('eventos')
      .select('*, creador:creado_por(id, nombre, foto_url), proyecto:proyecto_id(id, titulo)')
      .gte('fecha', start)
      .lte('fecha', end)
      .order('fecha', { ascending: true })

    if (result.error) {
      // Fallback: columns may not exist yet
      result = await supabase
        .from('eventos')
        .select('*')
        .gte('fecha', start)
        .lte('fecha', end)
        .order('fecha', { ascending: true })
    }

    if (!result.error) setEvents(result.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchEvents() }, [currentDate])

  /* Build a map: day number -> events */
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
    let startOffset = firstDay.getDay() - 1
    if (startOffset < 0) startOffset = 6
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const cells = []
    for (let i = 0; i < startOffset; i++) cells.push(null)
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

  /* Can user edit/delete this event? */
  const canEditEvent = (ev) => {
    if (isAdmin) return true
    if (ev.creado_por === user?.id) return true
    return false
  }

  /* Create event — with optional meeting channel + email invites */
  const handleCreate = async (e) => {
    e?.preventDefault?.()
    if (!formData.titulo || !formData.fecha) return
    setSaving(true)

    try {
      let canal_id = null

      // 1. Create a meeting canal if requested
      if (formData.con_llamada) {
        const { data: canal } = await supabase.from('canales').insert({
          nombre: `📅 ${formData.titulo}`,
          tipo: 'grupo',
          descripcion: `Canal para la reunión: ${formData.titulo}`,
          creado_por: user?.id,
          privado: false,
          welcome_msg: `Bienvenido/a a la reunión "${formData.titulo}". ¡La llamada estará disponible aquí!`,
        }).select('id').single()
        canal_id = canal?.id || null

        // Add creator as admin member
        if (canal_id) {
          await supabase.from('canal_miembros').insert({ canal_id, usuario_id: user.id, rol_canal: 'admin', puede_escribir: true }).catch(() => {})
        }
      }

      // 2. Insert the event
      const { data: evento, error } = await supabase.from('eventos').insert([{
        titulo: formData.titulo,
        tipo: formData.tipo,
        fecha: formData.fecha,
        lugar: formData.lugar || null,
        descripcion: formData.descripcion || null,
        proyecto_id: formData.proyecto_id || null,
        con_llamada: !!formData.con_llamada,
        canal_id,
        creado_por: user?.id,
        estado: 'programado',
      }]).select('id').single()

      if (error) throw error

      // 3. Send email invites if requested
      if (formData.notificar_email) {
        const { data: miembros } = await supabase
          .from('usuarios')
          .select('correo, nombre')
          .eq('activo', true)
          .not('correo', 'is', null)
          .neq('id', user.id)

        if (miembros?.length) {
          const appUrl = window.location.origin
          const canalUrl = canal_id ? `${appUrl}/chat?canal=${canal_id}` : appUrl
          const batch = miembros.map(m => {
            const tpl = emailMeetingInvite({
              nombre: m.nombre,
              eventoTitulo: formData.titulo,
              fecha: formData.fecha,
              lugar: formData.lugar,
              descripcion: formData.descripcion,
              canalUrl: formData.con_llamada ? canalUrl : null,
            })
            return { to: m.correo, ...tpl }
          })
          sendEmailBatch(batch).catch(() => {}) // fire and forget
          toast.info(`Invitaciones enviadas a ${batch.length} miembros`)
        }
      }

      // 4. In-app notifications for all members
      const { data: todos } = await supabase
        .from('usuarios')
        .select('id')
        .eq('activo', true)
        .neq('id', user.id)

      if (todos?.length) {
        const notifs = todos.map(u => ({
          usuario_id: u.id,
          tipo: 'info',
          titulo: `Nuevo evento: ${formData.titulo}`,
          mensaje: `${new Date(formData.fecha).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}${formData.lugar ? ` · ${formData.lugar}` : ''}`,
          leida: false,
        }))
        supabase.from('notificaciones').insert(notifs).catch(() => {})
      }

      toast.success('Evento creado' + (canal_id ? ' · Canal de reunión creado' : ''))
      setShowCreateModal(false)
      setFormData(EMPTY_FORM)
      fetchEvents()
    } catch {
      toast.error('Error al crear evento')
    } finally {
      setSaving(false)
    }
  }

  /* Open edit modal */
  const openEdit = (ev) => {
    setEditingEvent(ev)
    setFormData({
      titulo: ev.titulo || '',
      tipo: ev.tipo || 'reunion',
      fecha: toDatetimeLocal(ev.fecha),
      lugar: ev.lugar || '',
      descripcion: ev.descripcion || '',
      proyecto_id: ev.proyecto_id || null,
    })
    setShowEditModal(true)
  }

  /* Save edit */
  const handleEdit = async (e) => {
    e?.preventDefault?.()
    if (!editingEvent || !formData.titulo || !formData.fecha) return
    setSaving(true)
    const { error } = await supabase
      .from('eventos')
      .update({
        titulo: formData.titulo,
        tipo: formData.tipo,
        fecha: formData.fecha,
        lugar: formData.lugar,
        descripcion: formData.descripcion,
        proyecto_id: formData.proyecto_id || null,
      })
      .eq('id', editingEvent.id)

    setSaving(false)
    if (!error) {
      toast.success('Evento actualizado')
      setShowEditModal(false)
      setEditingEvent(null)
      setFormData(EMPTY_FORM)
      // Update selectedDay events too
      setSelectedDay(null)
      fetchEvents()
    } else {
      toast.error('Error al actualizar evento')
    }
  }

  /* Open delete confirmation */
  const openDeleteConfirm = (ev) => {
    setEditingEvent(ev)
    setShowDeleteConfirm(true)
  }

  /* Delete event */
  const handleDelete = async () => {
    if (!editingEvent) return
    setDeleting(true)
    const { error } = await supabase
      .from('eventos')
      .delete()
      .eq('id', editingEvent.id)

    setDeleting(false)
    if (!error) {
      toast.success('Evento eliminado')
      setShowDeleteConfirm(false)
      setEditingEvent(null)
      setSelectedDay(null)
      fetchEvents()
    } else {
      toast.error('Error al eliminar evento')
    }
  }

  const todayDate = new Date()

  // ── Meeting countdown alert (checks every minute) ──────────────────────────
  useEffect(() => {
    const check = () => {
      const now = Date.now()
      events.forEach(ev => {
        if (!ev.canal_id) return
        const diff = new Date(ev.fecha).getTime() - now
        if (diff > 0 && diff <= 5 * 60 * 1000) {
          toast(
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(34,197,94,0.15)' }}>
                <FiBell size={14} style={{ color: '#22c55e' }} />
              </div>
              <div>
                <p className="font-semibold text-sm">La reunión "{ev.titulo}" empieza en {Math.ceil(diff / 60000)} min</p>
                <button
                  onClick={() => navigate(`/chat?canal=${ev.canal_id}`)}
                  className="text-xs text-[#22c55e] mt-0.5 hover:underline"
                >
                  Unirse ahora →
                </button>
              </div>
            </div>,
            { id: `meeting-${ev.id}`, duration: 20000 },
          )
        }
      })
    }
    check()
    const t = setInterval(check, 60000)
    return () => clearInterval(t)
  }, [events, navigate])

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <motion.div {...FU(0)} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-title text-white flex items-center gap-3">
            <FiCalendar className="text-[var(--c-primary)]" />
            Calendario
          </h1>
          <p className="text-white/40 text-sm mt-1">Eventos y actividades del colectivo</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-white/[0.05] rounded-lg p-0.5">
            <button
              onClick={() => setMobileView('grid')}
              className={`p-1.5 rounded-md transition-colors ${mobileView === 'grid' ? 'bg-[var(--c-primary)]/20 text-[var(--c-primary)]' : 'text-white/40'}`}
            >
              <FiGrid size={16} />
            </button>
            <button
              onClick={() => setMobileView('list')}
              className={`p-1.5 rounded-md transition-colors ${mobileView === 'list' ? 'bg-[var(--c-primary)]/20 text-[var(--c-primary)]' : 'text-white/40'}`}
            >
              <FiList size={16} />
            </button>
          </div>
          {isAdmin && (
            <Button
              variant="solid"
              size="sm"
              icon={<FiPlus size={15} />}
              onClick={() => { setFormData(EMPTY_FORM); setShowCreateModal(true) }}
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
                  className="text-xs text-[var(--c-primary)] hover:text-[var(--c-primary)]/80 transition-colors font-medium"
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

      {/* Calendar grid */}
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
                        ? 'bg-[var(--c-primary)]/10 border-2 border-[var(--c-primary)]/50'
                        : 'border border-white/[0.04] hover:border-white/[0.1] hover:bg-white/[0.04]'
                      }
                      ${hasEvents ? 'cursor-pointer' : 'cursor-default'}
                    `}
                    whileHover={hasEvents ? { scale: 1.05 } : {}}
                    whileTap={hasEvents ? { scale: 0.97 } : {}}
                  >
                    <span className={`text-sm font-medium ${today ? 'text-[var(--c-primary)] font-bold' : 'text-white/60'}`}>
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
            <FiClock size={12} className="text-[var(--c-primary)]" />
            Proximos eventos
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
              <p className="text-sm text-white/25">No hay eventos proximos este mes</p>
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
                            Manana
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
                        {ev.proyecto?.titulo && (
                          <span className="text-[11px] text-[#FC651F]/70 flex items-center gap-1 truncate">
                            🗂 {ev.proyecto.titulo}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Join meeting button */}
                    {ev.canal_id && (
                      <button
                        onClick={() => navigate(`/chat?canal=${ev.canal_id}`)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold shrink-0 transition-all hover:scale-105"
                        style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}
                        title="Unirse al canal de reunión"
                      >
                        <FiPhone size={11} /> Unirse
                      </button>
                    )}

                    {/* Edit/Delete buttons (visible on hover for admins/creators) */}
                    {canEditEvent(ev) && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={() => openEdit(ev)}
                          className="p-1.5 rounded-lg text-white/25 hover:text-[var(--c-accent)] hover:bg-[var(--c-accent)]/10 transition-all"
                          title="Editar evento"
                        >
                          <FiEdit2 size={13} />
                        </button>
                        <button
                          onClick={() => openDeleteConfirm(ev)}
                          className="p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-all"
                          title="Eliminar evento"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    )}
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
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-white">{ev.titulo}</h4>
                        {canEditEvent(ev) && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => { setSelectedDay(null); openEdit(ev) }}
                              className="p-1.5 rounded-lg text-white/25 hover:text-[var(--c-accent)] hover:bg-[var(--c-accent)]/10 transition-all"
                              title="Editar"
                            >
                              <FiEdit2 size={13} />
                            </button>
                            <button
                              onClick={() => { setSelectedDay(null); openDeleteConfirm(ev) }}
                              className="p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-all"
                              title="Eliminar"
                            >
                              <FiTrash2 size={13} />
                            </button>
                          </div>
                        )}
                      </div>
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
                        {ev.proyecto?.titulo && (
                          <span className="text-xs text-[#FC651F]/70 flex items-center gap-1">
                            🗂 {ev.proyecto.titulo}
                          </span>
                        )}
                      </div>
                      {ev.descripcion && (
                        <p className="text-xs text-white/30 mt-2 leading-relaxed">{ev.descripcion}</p>
                      )}
                      {/* Join meeting button */}
                      {ev.canal_id && (
                        <div className="mt-3">
                          <button
                            onClick={() => { setSelectedDay(null); navigate(`/chat?canal=${ev.canal_id}`) }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-105"
                            style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}
                          >
                            <FiPhone size={13} /> Unirse a la reunión
                          </button>
                        </div>
                      )}
                      {/* Show creator */}
                      {ev.creador && (
                        <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-white/[0.04]">
                          <FiUser size={10} className="text-white/20" />
                          <span className="text-[10px] text-white/25">
                            Creado por {ev.creador.nombre}
                          </span>
                        </div>
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
        <form onSubmit={handleCreate}>
          <EventForm formData={formData} setFormData={setFormData} proyectos={proyectos} />
        </form>
      </Modal>

      {/* ── Edit event modal ────────────────────────────────────── */}
      <Modal
        open={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingEvent(null); setFormData(EMPTY_FORM) }}
        title={
          <span className="flex items-center gap-2">
            <FiEdit2 size={15} className="text-[var(--c-accent)]" />
            Editar evento
          </span>
        }
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => { setShowEditModal(false); setEditingEvent(null); setFormData(EMPTY_FORM) }}>
              Cancelar
            </Button>
            <Button variant="solid" size="sm" loading={saving} onClick={handleEdit}>
              Guardar cambios
            </Button>
          </>
        }
      >
        <form onSubmit={handleEdit}>
          <EventForm formData={formData} setFormData={setFormData} proyectos={proyectos} />
        </form>
      </Modal>

      {/* ── Delete confirmation modal ───────────────────────────── */}
      <DeleteConfirmModal
        open={showDeleteConfirm}
        onClose={() => { setShowDeleteConfirm(false); setEditingEvent(null) }}
        onConfirm={handleDelete}
        loading={deleting}
        eventTitle={editingEvent?.titulo || ''}
      />
    </div>
  )
}
