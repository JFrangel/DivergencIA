import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiShield, FiUsers, FiInbox, FiBarChart2, FiSettings, FiCheck, FiX, FiTrash2, FiEdit2, FiCalendar, FiMail, FiPlus, FiClock, FiFlag, FiSliders } from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Tabs from '../../components/ui/Tabs'
import Avatar from '../../components/ui/Avatar'
import Spinner from '../../components/ui/Spinner'
import ContentModerator from '../../components/admin/ContentModerator'
import PlatformConfig from '../../components/admin/PlatformConfig'
import { toast } from 'sonner'
import { timeAgo } from '../../lib/utils'

const tabs = [
  { id: 'users', label: 'Usuarios' },
  { id: 'requests', label: 'Solicitudes' },
  { id: 'events', label: 'Eventos' },
  { id: 'messages', label: 'Mensajes' },
  { id: 'moderation', label: 'Moderación' },
  { id: 'reports', label: 'Reportes' },
  { id: 'config', label: 'Configuración' },
]

/* ──────── User Table ──────── */
function UserTable() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('usuarios').select('*').order('fecha_registro', { ascending: false })
      .then(({ data }) => { setUsers(data || []); setLoading(false) })
  }, [])

  const toggleRole = async (user) => {
    const newRol = user.rol === 'admin' ? 'miembro' : 'admin'
    const { error } = await supabase.from('usuarios').update({ rol: newRol }).eq('id', user.id)
    if (error) { toast.error('Error al cambiar rol'); return }
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, rol: newRol } : u))
    toast.success(`${user.nombre} ahora es ${newRol}`)
  }

  const toggleActive = async (user) => {
    const newActive = !user.activo
    const { error } = await supabase.from('usuarios').update({ activo: newActive }).eq('id', user.id)
    if (error) { toast.error('Error'); return }
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, activo: newActive } : u))
    toast.success(newActive ? 'Usuario reactivado' : 'Usuario desactivado')
  }

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>

  return (
    <Card className="overflow-hidden !p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              {['Usuario', 'Correo', 'Área', 'Rol', 'Estado', 'Registro', 'Acciones'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] text-white/30 uppercase tracking-wider font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={u.nombre || ''} area={u.area_investigacion} size="xs" isFounded={u.es_fundador} />
                    <div>
                      <p className="text-white/80 font-medium text-xs">{u.nombre}</p>
                      <p className="text-[10px] text-white/25">{u.carrera || '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-white/40">{u.correo}</td>
                <td className="px-4 py-3">{u.area_investigacion ? <Badge area={u.area_investigacion} size="xs" /> : <span className="text-white/20 text-xs">—</span>}</td>
                <td className="px-4 py-3"><Badge rol={u.rol} size="xs" /></td>
                <td className="px-4 py-3">
                  <span className={`text-xs flex items-center gap-1 ${u.activo ? 'text-[#22c55e]' : 'text-[#EF4444]'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${u.activo ? 'bg-[#22c55e]' : 'bg-[#EF4444]'}`} />
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-white/25">{timeAgo(u.fecha_registro)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleRole(u)}
                      className="px-2 py-1 rounded text-[10px] text-white/30 hover:text-[#8B5CF6] hover:bg-[#8B5CF6]/10 transition-all"
                      title="Cambiar rol"
                    >
                      <FiShield size={12} />
                    </button>
                    <button
                      onClick={() => toggleActive(u)}
                      className={`px-2 py-1 rounded text-[10px] transition-all ${u.activo ? 'text-white/30 hover:text-[#EF4444] hover:bg-[#EF4444]/10' : 'text-white/30 hover:text-[#22c55e] hover:bg-[#22c55e]/10'}`}
                      title={u.activo ? 'Desactivar' : 'Reactivar'}
                    >
                      {u.activo ? <FiX size={12} /> : <FiCheck size={12} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

/* ──────── Requests Panel ──────── */
function RequestsPanel() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('solicitudes_ingreso').select('*').order('fecha', { ascending: false })
      .then(({ data }) => { setRequests(data || []); setLoading(false) })
  }, [])

  const handleAction = async (id, estado) => {
    const { error } = await supabase.from('solicitudes_ingreso').update({ estado }).eq('id', id)
    if (error) { toast.error('Error'); return }
    setRequests(prev => prev.map(r => r.id === id ? { ...r, estado } : r))
    toast.success(estado === 'aprobada' ? 'Solicitud aprobada' : 'Solicitud rechazada')
  }

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>

  return (
    <div className="space-y-3">
      {requests.length === 0 ? (
        <Card className="text-center py-10">
          <FiInbox size={28} className="mx-auto text-white/10 mb-3" />
          <p className="text-white/30 text-sm">No hay solicitudes pendientes</p>
        </Card>
      ) : (
        requests.map(r => (
          <Card key={r.id}>
            <div className="flex items-start gap-4">
              <Avatar name={r.nombre || ''} size="sm" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-white">{r.nombre}</p>
                  <Badge
                    preset={r.estado === 'aprobada' ? 'aprobada' : r.estado === 'rechazada' ? 'rechazada' : 'pendiente'}
                    size="xs"
                  />
                </div>
                <p className="text-xs text-white/40">{r.correo} · {r.carrera || '—'}</p>
                {r.motivacion && <p className="text-xs text-white/30 mt-2 italic border-l-2 border-white/10 pl-2">{r.motivacion}</p>}
                <p className="text-[10px] text-white/20 mt-2">{timeAgo(r.fecha)}</p>
              </div>
              {r.estado === 'pendiente' && (
                <div className="flex gap-1.5 shrink-0">
                  <Button variant="solid" size="xs" className="gap-1" onClick={() => handleAction(r.id, 'aprobada')}>
                    <FiCheck size={11} /> Aprobar
                  </Button>
                  <Button variant="danger" size="xs" className="gap-1" onClick={() => handleAction(r.id, 'rechazada')}>
                    <FiX size={11} /> Rechazar
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  )
}

/* ──────── Reports Panel ──────── */
function ReportsPanel() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('usuarios').select('area_investigacion, rol'),
      supabase.from('proyectos').select('estado'),
      supabase.from('avances').select('fecha'),
      supabase.from('ideas').select('estado, votos_favor'),
      supabase.from('archivos').select('tipo, descargas'),
    ]).then(([{ data: users }, { data: proys }, { data: avs }, { data: ideas }, { data: files }]) => {
      // Area distribution
      const areaCounts = {}
      ;(users || []).forEach(u => { areaCounts[u.area_investigacion || 'Sin área'] = (areaCounts[u.area_investigacion || 'Sin área'] || 0) + 1 })

      // Project states
      const estadoCounts = {}
      ;(proys || []).forEach(p => { estadoCounts[p.estado] = (estadoCounts[p.estado] || 0) + 1 })

      // Idea states
      const ideaEstados = {}
      ;(ideas || []).forEach(i => { ideaEstados[i.estado] = (ideaEstados[i.estado] || 0) + 1 })

      // File types
      const fileCounts = {}
      let totalDownloads = 0
      ;(files || []).forEach(f => { fileCounts[f.tipo || 'otro'] = (fileCounts[f.tipo || 'otro'] || 0) + 1; totalDownloads += f.descargas || 0 })

      setStats({
        totalUsers: users?.length || 0,
        admins: (users || []).filter(u => u.rol === 'admin').length,
        areaCounts,
        totalProjects: proys?.length || 0,
        estadoCounts,
        totalAvances: avs?.length || 0,
        totalIdeas: ideas?.length || 0,
        ideaEstados,
        totalFiles: files?.length || 0,
        fileCounts,
        totalDownloads,
      })
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>

  const AREA_COLOR = { ML: '#FC651F', NLP: '#8B5CF6', Vision: '#00D1FF', Datos: '#22c55e', General: '#F59E0B', 'Sin área': '#6b7280' }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* General stats */}
      {[
        { label: 'Investigadores', value: stats.totalUsers, color: '#FC651F' },
        { label: 'Admins', value: stats.admins, color: '#8B5CF6' },
        { label: 'Proyectos', value: stats.totalProjects, color: '#00D1FF' },
        { label: 'Avances', value: stats.totalAvances, color: '#22c55e' },
        { label: 'Ideas', value: stats.totalIdeas, color: '#F59E0B' },
        { label: 'Archivos', value: stats.totalFiles, color: '#EC4899' },
      ].map(s => (
        <Card key={s.label}>
          <p className="text-3xl font-bold font-title" style={{ color: s.color }}>{s.value}</p>
          <p className="text-xs text-white/35 mt-1">{s.label}</p>
        </Card>
      ))}

      {/* Area distribution */}
      <Card className="md:col-span-2">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Distribución por área</h3>
        <div className="space-y-2">
          {Object.entries(stats.areaCounts).map(([area, count]) => (
            <div key={area} className="flex items-center gap-3">
              <span className="text-xs text-white/50 w-20">{area}</span>
              <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: AREA_COLOR[area] || '#6b7280' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(count / stats.totalUsers) * 100}%` }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                />
              </div>
              <span className="text-xs text-white/30 w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Project states */}
      <Card>
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Estado de proyectos</h3>
        <div className="space-y-2">
          {Object.entries(stats.estadoCounts).map(([estado, count]) => (
            <div key={estado} className="flex justify-between items-center">
              <Badge estado={estado} size="xs" />
              <span className="text-sm font-semibold text-white/60">{count}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* File types */}
      <Card>
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Archivos por tipo</h3>
        <div className="space-y-2">
          {Object.entries(stats.fileCounts).map(([tipo, count]) => (
            <div key={tipo} className="flex justify-between items-center">
              <span className="text-xs text-white/50 capitalize">{tipo}</span>
              <span className="text-sm font-semibold text-white/60">{count}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-white/[0.06]">
          <p className="text-xs text-white/25">Total descargas: <span className="text-[#00D1FF] font-semibold">{stats.totalDownloads}</span></p>
        </div>
      </Card>
    </div>
  )
}

/* ──────── Events Manager ──────── */
function EventsManager() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ titulo: '', tipo: 'reunion', fecha: '', lugar: '', descripcion: '' })

  useEffect(() => {
    supabase.from('eventos').select('*').order('fecha', { ascending: false })
      .then(({ data }) => { setEvents(data || []); setLoading(false) })
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.titulo || !form.fecha) return
    const { data, error } = await supabase.from('eventos').insert(form).select().single()
    if (error) { toast.error('Error al crear evento'); return }
    setEvents(prev => [data, ...prev])
    setShowForm(false)
    setForm({ titulo: '', tipo: 'reunion', fecha: '', lugar: '', descripcion: '' })
    toast.success('Evento creado')
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('eventos').delete().eq('id', id)
    if (!error) {
      setEvents(prev => prev.filter(e => e.id !== id))
      toast.success('Evento eliminado')
    }
  }

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>

  const TYPE_COLORS = { reunion: '#FC651F', taller: '#8B5CF6', conferencia: '#00D1FF', deadline: '#EF4444', otro: '#F59E0B' }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/40">{events.length} eventos registrados</p>
        <Button variant="solid" size="xs" className="gap-1.5" onClick={() => setShowForm(!showForm)}>
          <FiPlus size={12} /> Nuevo evento
        </Button>
      </div>

      {showForm && (
        <Card>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none focus:border-[#FC651F]/40"
                placeholder="Título del evento"
                value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                required
              />
              <select
                className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white outline-none"
                value={form.tipo}
                onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
              >
                <option value="reunion">Reunión</option>
                <option value="taller">Taller</option>
                <option value="conferencia">Conferencia</option>
                <option value="deadline">Deadline</option>
                <option value="otro">Otro</option>
              </select>
              <input
                type="datetime-local"
                className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white outline-none"
                value={form.fecha}
                onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                required
              />
              <input
                className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none"
                placeholder="Lugar (opcional)"
                value={form.lugar}
                onChange={e => setForm(f => ({ ...f, lugar: e.target.value }))}
              />
            </div>
            <textarea
              className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none resize-none"
              placeholder="Descripción (opcional)"
              rows={2}
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="xs" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button variant="solid" size="xs" className="gap-1"><FiCheck size={11} /> Crear</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-2">
        {events.length === 0 ? (
          <Card className="text-center py-10">
            <FiCalendar size={28} className="mx-auto text-white/10 mb-3" />
            <p className="text-white/30 text-sm">No hay eventos</p>
          </Card>
        ) : events.map((ev, i) => {
          const color = TYPE_COLORS[ev.tipo] || '#6b7280'
          const d = new Date(ev.fecha)
          const isPast = d < new Date()
          return (
            <motion.div
              key={ev.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={`flex items-center gap-4 ${isPast ? 'opacity-50' : ''}`}>
                <div className="w-11 h-11 rounded-lg flex flex-col items-center justify-center shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                  <span className="text-sm font-bold leading-none" style={{ color }}>{d.getDate()}</span>
                  <span className="text-[8px] uppercase" style={{ color: `${color}80` }}>{d.toLocaleDateString('es-CO', { month: 'short' })}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white/80 truncate">{ev.titulo}</p>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold" style={{ background: `${color}15`, color }}>{ev.tipo}</span>
                    {isPast && <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-white/30">Pasado</span>}
                  </div>
                  <p className="text-[10px] text-white/30 mt-0.5 flex items-center gap-2">
                    <span className="flex items-center gap-1"><FiClock size={9} /> {d.toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    {ev.lugar && <span>· {ev.lugar}</span>}
                  </p>
                </div>
                <button onClick={() => handleDelete(ev.id)} className="p-2 rounded text-white/20 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all" title="Eliminar">
                  <FiTrash2 size={13} />
                </button>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

/* ──────── Messages Panel (Contact form submissions) ──────── */
function MessagesPanel() {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('contacto').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { setMessages(data || []); setLoading(false) })
  }, [])

  const markRead = async (id) => {
    await supabase.from('contacto').update({ leido: true }).eq('id', id)
    setMessages(prev => prev.map(m => m.id === id ? { ...m, leido: true } : m))
  }

  const handleDelete = async (id) => {
    await supabase.from('contacto').delete().eq('id', id)
    setMessages(prev => prev.filter(m => m.id !== id))
    toast.success('Mensaje eliminado')
  }

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>

  const unread = messages.filter(m => !m.leido).length

  return (
    <div className="space-y-4">
      <p className="text-sm text-white/40">
        {messages.length} mensajes · <span className="text-[#FC651F]">{unread} sin leer</span>
      </p>
      {messages.length === 0 ? (
        <Card className="text-center py-10">
          <FiMail size={28} className="mx-auto text-white/10 mb-3" />
          <p className="text-white/30 text-sm">No hay mensajes de contacto</p>
        </Card>
      ) : messages.map((m, i) => (
        <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
          <Card className={`${!m.leido ? 'border-l-2 border-l-[#FC651F]' : ''}`}>
            <div className="flex items-start gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${!m.leido ? 'bg-[#FC651F]/15 text-[#FC651F]' : 'bg-white/[0.05] text-white/20'}`}>
                <FiMail size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-white/80">{m.nombre}</p>
                  {!m.leido && <span className="w-2 h-2 rounded-full bg-[#FC651F]" />}
                </div>
                <p className="text-xs text-white/40 mb-2">{m.correo}</p>
                <p className="text-sm text-white/50 leading-relaxed">{m.mensaje}</p>
                <p className="text-[10px] text-white/20 mt-2">{timeAgo(m.created_at)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!m.leido && (
                  <button onClick={() => markRead(m.id)} className="p-1.5 rounded text-white/20 hover:text-[#22c55e] hover:bg-[#22c55e]/10 transition-all" title="Marcar como leído">
                    <FiCheck size={13} />
                  </button>
                )}
                <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded text-white/20 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all" title="Eliminar">
                  <FiTrash2 size={13} />
                </button>
              </div>
            </div>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}

/* ──────── Main Admin Panel ──────── */
export default function AdminPanel() {
  const [tab, setTab] = useState('users')

  return (
    <div className="space-y-6 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#FC651F]/15 text-[#FC651F]">
          <FiShield size={18} />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-title text-white">Panel Admin</h1>
          <p className="text-white/40 text-sm mt-0.5">Gestión completa del semillero.</p>
        </div>
        <Badge variant="admin" className="ml-auto" />
      </motion.div>

      <Tabs tabs={tabs} defaultTab="users" onChange={setTab} />

      {tab === 'users' && <UserTable />}
      {tab === 'requests' && <RequestsPanel />}
      {tab === 'events' && <EventsManager />}
      {tab === 'messages' && <MessagesPanel />}
      {tab === 'moderation' && <ContentModerator />}
      {tab === 'reports' && <ReportsPanel />}
      {tab === 'config' && <PlatformConfig />}
    </div>
  )
}
