import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { FiShield, FiUsers, FiInbox, FiBarChart2, FiSettings, FiCheck, FiX, FiTrash2, FiEdit2, FiCalendar, FiMail, FiPlus, FiClock, FiFlag, FiSliders, FiSearch, FiStar, FiTrendingUp, FiTrendingDown, FiMinus, FiSend } from 'react-icons/fi'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Tabs from '../../components/ui/Tabs'
import Avatar from '../../components/ui/Avatar'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'
import ContentModerator from '../../components/admin/ContentModerator'
import PlatformConfig from '../../components/admin/PlatformConfig'
import NodosManager from '../../components/admin/NodosManager'
import NodeGroupManager from '../../components/admin/NodeGroupManager'
import BroadcastPanel from '../../components/notifications/BroadcastPanel'
import GaleriaManager from '../../components/admin/GaleriaManager'
import { toast } from 'sonner'
import { timeAgo } from '../../lib/utils'
import { useNodos } from '../../hooks/useNodos'
import { useAuth } from '../../context/AuthContext'

const AREAS = ['ML', 'NLP', 'Vision', 'Datos', 'General']
const AREA_COLORS = { ML: '#FC651F', NLP: '#8B5CF6', Vision: '#00D1FF', Datos: '#22c55e', General: '#F59E0B' }

/* ──────── User Edit Modal ──────── */
function UserEditModal({ user, open, onClose, onSave }) {
  const [form, setForm] = useState({
    nombre: '',
    rol: 'miembro',
    area_investigacion: '',
    carrera: '',
    semestre: '',
    es_fundador: false,
    activo: true,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({
        nombre: user.nombre || '',
        rol: user.rol || 'miembro',
        area_investigacion: user.area_investigacion || '',
        carrera: user.carrera || '',
        semestre: user.semestre || '',
        es_fundador: !!user.es_fundador,
        activo: user.activo !== false,
      })
    }
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    const updates = {
      nombre: form.nombre,
      rol: form.rol,
      area_investigacion: form.area_investigacion || null,
      carrera: form.carrera || null,
      semestre: form.semestre ? Number(form.semestre) : null,
      es_fundador: form.es_fundador,
      activo: form.activo,
    }
    const { error } = await supabase.from('usuarios').update(updates).eq('id', user.id)
    setSaving(false)
    if (error) { toast.error('Error al actualizar usuario'); return }
    onSave({ ...user, ...updates })
    toast.success(`${form.nombre} actualizado`)
    onClose()
  }

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none focus:border-[#FC651F]/40 transition-colors'
  const labelClass = 'block text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1.5'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Editar usuario — ${user?.nombre || ''}`}
      size="md"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
          <Button variant="solid" size="sm" onClick={handleSubmit} disabled={saving} className="gap-1.5">
            {saving ? <Spinner size="xs" /> : <FiCheck size={13} />}
            Guardar
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>Nombre</label>
          <input className={inputClass} value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Rol</label>
            <select className={inputClass} value={form.rol} onChange={e => setForm(f => ({ ...f, rol: e.target.value }))}>
              <option value="invitado">Invitado</option>
              <option value="miembro">Miembro</option>
              <option value="egresado">Egresado</option>
              <option value="colaborador">Colaborador</option>
              <option value="admin">Admin</option>
              <option value="directora">Director(a)</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Área de investigación</label>
            <select className={inputClass} value={form.area_investigacion} onChange={e => setForm(f => ({ ...f, area_investigacion: e.target.value }))}>
              <option value="">Sin área</option>
              {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Carrera</label>
            <input className={inputClass} value={form.carrera} onChange={e => setForm(f => ({ ...f, carrera: e.target.value }))} placeholder="Ej: Ingeniería de Sistemas" />
          </div>
          <div>
            <label className={labelClass}>Semestre</label>
            <input type="number" min={1} max={12} className={inputClass} value={form.semestre} onChange={e => setForm(f => ({ ...f, semestre: e.target.value }))} placeholder="1-12" />
          </div>
        </div>

        <div className="flex items-center gap-6 pt-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input type="checkbox" checked={form.es_fundador} onChange={e => setForm(f => ({ ...f, es_fundador: e.target.checked }))}
              className="w-4 h-4 rounded border-white/20 bg-white/[0.04] accent-[#FC651F]" />
            <span className="text-sm text-white/50 group-hover:text-white/70 transition-colors flex items-center gap-1">
              <FiStar size={12} className="text-[#F59E0B]" /> Fundador
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer group">
            <input type="checkbox" checked={form.activo} onChange={e => setForm(f => ({ ...f, activo: e.target.checked }))}
              className="w-4 h-4 rounded border-white/20 bg-white/[0.04] accent-[#22c55e]" />
            <span className="text-sm text-white/50 group-hover:text-white/70 transition-colors">Activo</span>
          </label>
        </div>
      </form>
    </Modal>
  )
}

const tabs = [
  { id: 'users', label: 'Usuarios' },
  { id: 'requests', label: 'Solicitudes' },
  { id: 'events', label: 'Eventos' },
  { id: 'messages', label: 'Mensajes' },
  { id: 'moderation', label: 'Moderación' },
  { id: 'reports', label: 'Reportes' },
  { id: 'nodes', label: 'Nodos' },
  { id: 'pending-nodes', label: 'Nodos Pendientes' },
  { id: 'galeria', label: 'Galería' },
  { id: 'broadcast', label: 'Broadcast' },
  { id: 'config', label: 'Configuración' },
]

/* ──────── User Table ──────── */
function UserTable() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [editingUser, setEditingUser] = useState(null)

  useEffect(() => {
    supabase.from('usuarios').select('*').order('fecha_registro', { ascending: false })
      .then(({ data }) => { setUsers(data || []); setLoading(false) })
  }, [])

  /* ── Filtering ── */
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesSearch = !search ||
        (u.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
        (u.correo || '').toLowerCase().includes(search.toLowerCase())
      const matchesRole = roleFilter === 'all' || u.rol === roleFilter
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && u.activo) ||
        (statusFilter === 'inactive' && !u.activo)
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, search, roleFilter, statusFilter])

  /* ── Inline role change ── */
  const changeRole = async (user, newRol) => {
    if (newRol === user.rol) return
    const { error } = await supabase.from('usuarios').update({ rol: newRol }).eq('id', user.id)
    if (error) { toast.error('Error al cambiar rol'); return }
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, rol: newRol } : u))
    toast.success(`${user.nombre} ahora es ${newRol}`)
  }

  /* ── Inline founder toggle ── */
  const toggleFounder = async (user) => {
    const newVal = !user.es_fundador
    const { error } = await supabase.from('usuarios').update({ es_fundador: newVal }).eq('id', user.id)
    if (error) { toast.error('Error'); return }
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, es_fundador: newVal } : u))
    toast.success(newVal ? `${user.nombre} marcado como fundador` : `${user.nombre} ya no es fundador`)
  }

  const toggleActive = async (user) => {
    const newActive = !user.activo
    const { error } = await supabase.from('usuarios').update({ activo: newActive }).eq('id', user.id)
    if (error) { toast.error('Error'); return }
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, activo: newActive } : u))
    toast.success(newActive ? 'Usuario reactivado' : 'Usuario desactivado')
  }

  /* ── Bulk actions ── */
  const allFilteredSelected = filteredUsers.length > 0 && filteredUsers.every(u => selectedIds.has(u.id))

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredUsers.map(u => u.id)))
    }
  }

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const bulkSetActive = async (activo) => {
    const ids = [...selectedIds]
    if (ids.length === 0) return
    const { error } = await supabase.from('usuarios').update({ activo }).in('id', ids)
    if (error) { toast.error('Error en acción masiva'); return }
    setUsers(prev => prev.map(u => ids.includes(u.id) ? { ...u, activo } : u))
    setSelectedIds(new Set())
    toast.success(`${ids.length} usuario(s) ${activo ? 'activados' : 'desactivados'}`)
  }

  /* ── Edit modal save handler ── */
  const handleEditSave = (updatedUser) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u))
  }

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>

  /* ── Stats ── */
  const totalUsers = users.length
  const activeUsers = users.filter(u => u.activo).length
  const adminUsers = users.filter(u => u.rol === 'admin').length
  const areaCounts = {}
  users.forEach(u => {
    const area = u.area_investigacion || 'Sin área'
    areaCounts[area] = (areaCounts[area] || 0) + 1
  })

  const filterBtnClass = (active) =>
    `px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${active ? 'bg-[#FC651F]/15 text-[#FC651F] border border-[#FC651F]/25' : 'text-white/30 hover:text-white/50 hover:bg-white/[0.04] border border-transparent'}`

  return (
    <div className="space-y-4">
      {/* ── Stats Header ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="!py-3 !px-4">
          <p className="text-xl font-bold font-title text-white">{totalUsers}</p>
          <p className="text-[10px] text-white/30 mt-0.5">Total usuarios</p>
        </Card>
        <Card className="!py-3 !px-4">
          <p className="text-xl font-bold font-title text-[#22c55e]">{activeUsers}</p>
          <p className="text-[10px] text-white/30 mt-0.5">Activos</p>
        </Card>
        <Card className="!py-3 !px-4">
          <p className="text-xl font-bold font-title text-[#8B5CF6]">{adminUsers}</p>
          <p className="text-[10px] text-white/30 mt-0.5">Admins</p>
        </Card>
        <Card className="!py-3 !px-4">
          <div className="flex items-center gap-1.5 flex-wrap">
            {Object.entries(areaCounts).map(([area, count]) => (
              <span key={area} className="flex items-center gap-1 text-[10px] text-white/40" title={`${area}: ${count}`}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: AREA_COLORS[area] || '#6b7280' }} />
                {count}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-white/30 mt-1">Por área</p>
        </Card>
      </div>

      {/* ── Search & Filters ── */}
      <Card className="!py-3 !px-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full sm:w-auto">
            <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
            <input
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none focus:border-[#FC651F]/40 transition-colors"
              placeholder="Buscar por nombre o correo..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Role filter */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-white/20 mr-1">Rol:</span>
            {[['all', 'Todos'], ['admin', 'Admin'], ['miembro', 'Miembro']].map(([val, label]) => (
              <button key={val} className={filterBtnClass(roleFilter === val)} onClick={() => setRoleFilter(val)}>{label}</button>
            ))}
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-white/20 mr-1">Estado:</span>
            {[['all', 'Todos'], ['active', 'Activos'], ['inactive', 'Inactivos']].map(([val, label]) => (
              <button key={val} className={filterBtnClass(statusFilter === val)} onClick={() => setStatusFilter(val)}>{label}</button>
            ))}
          </div>
        </div>
      </Card>

      {/* ── Bulk Actions Bar ── */}
      {selectedIds.size > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#FC651F]/10 border border-[#FC651F]/20">
          <span className="text-xs text-[#FC651F] font-semibold">{selectedIds.size} seleccionado(s)</span>
          <div className="flex-1" />
          <Button variant="solid" size="xs" className="gap-1 !bg-[#22c55e] hover:!bg-[#16a34a]" onClick={() => bulkSetActive(true)}>
            <FiCheck size={11} /> Activar todos
          </Button>
          <Button variant="danger" size="xs" className="gap-1" onClick={() => bulkSetActive(false)}>
            <FiX size={11} /> Desactivar todos
          </Button>
          <button onClick={() => setSelectedIds(new Set())} className="text-[10px] text-white/30 hover:text-white/50 transition-colors ml-1">Limpiar</button>
        </motion.div>
      )}

      {/* ── Table ── */}
      <Card className="overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-3 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAll}
                    className="w-3.5 h-3.5 rounded border-white/20 bg-white/[0.04] accent-[#FC651F] cursor-pointer"
                  />
                </th>
                {['Usuario', 'Correo', 'Área', 'Rol', 'Estado', 'Registro', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] text-white/30 uppercase tracking-wider font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-white/20 text-sm">No se encontraron usuarios</td>
                </tr>
              ) : filteredUsers.map(u => (
                <tr key={u.id} className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${selectedIds.has(u.id) ? 'bg-[#FC651F]/[0.03]' : ''}`}>
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(u.id)}
                      onChange={() => toggleSelect(u.id)}
                      className="w-3.5 h-3.5 rounded border-white/20 bg-white/[0.04] accent-[#FC651F] cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.nombre || ''} area={u.area_investigacion} size="xs" isFounded={u.es_fundador} />
                      <div>
                        <p className="text-white/80 font-medium text-xs flex items-center gap-1">
                          {u.nombre}
                          {u.es_fundador && <FiStar size={10} className="text-[#F59E0B]" title="Fundador" />}
                        </p>
                        <p className="text-[10px] text-white/25">{u.carrera || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-white/40">{u.correo}</td>
                  <td className="px-4 py-3">{u.area_investigacion ? <Badge area={u.area_investigacion} size="xs" /> : <span className="text-white/20 text-xs">—</span>}</td>
                  <td className="px-4 py-3">
                    <select
                      value={u.rol}
                      onChange={e => changeRole(u, e.target.value)}
                      className="text-[11px] px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-white/60 outline-none cursor-pointer hover:border-[#8B5CF6]/30 transition-colors"
                    >
                      <option value="miembro">Miembro</option>
                      <option value="admin">Admin</option>
                      <option value="directora">Director(a)</option>
                      <option value="egresado">Egresado</option>
                      <option value="colaborador">Colaborador</option>
                    </select>
                  </td>
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
                        onClick={() => setEditingUser(u)}
                        className="px-2 py-1 rounded text-[10px] text-white/30 hover:text-[#FC651F] hover:bg-[#FC651F]/10 transition-all"
                        title="Editar usuario"
                      >
                        <FiEdit2 size={12} />
                      </button>
                      <button
                        onClick={() => toggleFounder(u)}
                        className={`px-2 py-1 rounded text-[10px] transition-all ${u.es_fundador ? 'text-[#F59E0B] hover:text-[#F59E0B]/60 hover:bg-[#F59E0B]/10' : 'text-white/30 hover:text-[#F59E0B] hover:bg-[#F59E0B]/10'}`}
                        title={u.es_fundador ? 'Quitar fundador' : 'Hacer fundador'}
                      >
                        <FiStar size={12} />
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
        {/* Table footer with count */}
        <div className="px-4 py-2.5 border-t border-white/[0.06] text-[10px] text-white/20">
          Mostrando {filteredUsers.length} de {totalUsers} usuarios
        </div>
      </Card>

      {/* ── Edit Modal ── */}
      <UserEditModal
        user={editingUser}
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSave={handleEditSave}
      />
    </div>
  )
}

/* ──────── Requests Panel ──────── */
function RequestsPanel() {
  const { user } = useAuth()
  const [signupRequests, setSignupRequests] = useState([])
  const [nodoRequests, setNodoRequests] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('solicitudes_ingreso').select('*').order('fecha', { ascending: false }),
      supabase.from('nodo_solicitudes')
        .select('*, usuario:usuarios!nodo_solicitudes_usuario_id_fkey(id, nombre, correo, foto_url), nodo:nodos!nodo_solicitudes_nodo_id_fkey(id, nombre)')
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: false })
    ]).then(([{ data: signup }, { data: nodo }]) => {
      setSignupRequests(signup || [])
      setNodoRequests(nodo || [])
      setLoading(false)
    })
  }, [])

  const handleSignupAction = async (id, estado) => {
    const { error } = await supabase.from('solicitudes_ingreso').update({ estado }).eq('id', id)
    if (error) { toast.error('Error'); return }
    setSignupRequests(prev => prev.map(r => r.id === id ? { ...r, estado } : r))
    toast.success(estado === 'aprobada' ? 'Solicitud aprobada' : 'Solicitud rechazada')
  }

  const handleNodoAction = async (id, estado, nodoId, usuarioId) => {
    const { error } = await supabase.from('nodo_solicitudes').update({ estado, respondido_por: user?.id, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) { toast.error('Error'); return }

    if (estado === 'aprobada' && nodoId && usuarioId) {
      // Add user as nodo member
      await supabase.from('nodo_miembros').upsert(
        { nodo_id: nodoId, usuario_id: usuarioId, rol: 'miembro' },
        { onConflict: 'nodo_id,usuario_id' }
      )
      // Notify the applicant
      await supabase.from('notificaciones').insert({
        usuario_id: usuarioId,
        tipo: 'nodo_solicitud',
        titulo: '¡Solicitud aprobada!',
        mensaje: `Tu solicitud de ingreso al nodo fue aprobada`,
        referencia_id: nodoId,
        leida: false,
        fecha: new Date().toISOString(),
      }).catch(() => {})
    } else if (estado === 'rechazada' && usuarioId) {
      // Notify the applicant of rejection
      await supabase.from('notificaciones').insert({
        usuario_id: usuarioId,
        tipo: 'nodo_solicitud',
        titulo: 'Solicitud rechazada',
        mensaje: `Tu solicitud de ingreso al nodo fue rechazada`,
        referencia_id: nodoId,
        leida: false,
        fecha: new Date().toISOString(),
      }).catch(() => {})
    }

    setNodoRequests(prev => prev.filter(r => r.id !== id))
    toast.success(estado === 'aprobada' ? 'Usuario añadido al nodo' : 'Solicitud rechazada')
  }

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>

  const hasPending = signupRequests.filter(r => r.estado === 'pendiente').length > 0 ||
    nodoRequests.filter(r => r.estado === 'pendiente').length > 0

  return (
    <div className="space-y-6">
      {/* Signup Requests */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <FiUsers size={14} /> Solicitudes de Ingreso
          {signupRequests.filter(r => r.estado === 'pendiente').length > 0 && (
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-[#FC651F]/20 text-[#FC651F]">
              {signupRequests.filter(r => r.estado === 'pendiente').length}
            </span>
          )}
        </h3>
        <div className="space-y-3">
          {signupRequests.length === 0 ? (
            <Card className="text-center py-8">
              <FiInbox size={24} className="mx-auto text-white/10 mb-2" />
              <p className="text-white/30 text-xs">No hay solicitudes de ingreso</p>
            </Card>
          ) : (
            signupRequests.map(r => (
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
                      <Button variant="solid" size="xs" className="gap-1" onClick={() => handleSignupAction(r.id, 'aprobada')}>
                        <FiCheck size={11} /> Aprobar
                      </Button>
                      <Button variant="danger" size="xs" className="gap-1" onClick={() => handleSignupAction(r.id, 'rechazada')}>
                        <FiX size={11} /> Rechazar
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Nodo Join Requests */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <FiUsers size={14} /> Solicitudes de Nodos
          {nodoRequests.length > 0 && (
            <span className="text-xs font-bold px-2 py-1 rounded-full bg-[#8B5CF6]/20 text-[#8B5CF6]">
              {nodoRequests.length}
            </span>
          )}
        </h3>
        <div className="space-y-3">
          {nodoRequests.length === 0 ? (
            <Card className="text-center py-8">
              <FiInbox size={24} className="mx-auto text-white/10 mb-2" />
              <p className="text-white/30 text-xs">No hay solicitudes pendientes de nodos</p>
            </Card>
          ) : (
            nodoRequests.map(r => (
              <Card key={r.id}>
                <div className="flex items-start gap-4">
                  <Avatar name={r.usuario?.nombre || ''} src={r.usuario?.foto_url} size="sm" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-white">{r.usuario?.nombre || 'Usuario'}</p>
                      <Badge label={r.nodo?.nombre || 'Nodo'} variant="secondary" size="xs" />
                    </div>
                    <p className="text-xs text-white/40">{r.usuario?.correo}</p>
                    {r.mensaje && <p className="text-xs text-white/30 mt-2 italic border-l-2 border-white/10 pl-2">{r.mensaje}</p>}
                    <p className="text-[10px] text-white/20 mt-2">{timeAgo(r.created_at)}</p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button variant="solid" size="xs" className="gap-1" onClick={() => handleNodoAction(r.id, 'aprobada', r.nodo_id, r.usuario_id)}>
                      <FiCheck size={11} /> Aprobar
                    </Button>
                    <Button variant="danger" size="xs" className="gap-1" onClick={() => handleNodoAction(r.id, 'rechazada', r.nodo_id, r.usuario_id)}>
                      <FiX size={11} /> Rechazar
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>

      {!hasPending && signupRequests.length === 0 && nodoRequests.length === 0 && (
        <Card className="text-center py-10">
          <FiCheck size={28} className="mx-auto text-green-500/30 mb-3" />
          <p className="text-white/30 text-sm">Todo al día — sin solicitudes pendientes</p>
        </Card>
      )}
    </div>
  )
}

/* ──────── Custom Tooltip for Charts ──────── */
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-xs text-white">
      {label && <p className="text-white/50 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: <span className="font-semibold">{p.value}</span>
        </p>
      ))}
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
      supabase.from('nodo_solicitudes').select('estado'),
    ]).then(([{ data: users }, { data: proys }, { data: avs }, { data: ideas }, { data: files }, { data: sols }]) => {
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

      // Nodo solicitudes
      const solicitudCounts = {}
      ;(sols || []).forEach(s => { solicitudCounts[s.estado] = (solicitudCounts[s.estado] || 0) + 1 })

      // Monthly activity from avances
      const monthlyActivity = {}
      ;(avs || []).forEach(a => {
        if (!a.fecha) return
        const d = new Date(a.fecha)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        monthlyActivity[key] = (monthlyActivity[key] || 0) + 1
      })
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      const activityData = Object.entries(monthlyActivity)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([key, count]) => {
          const [, m] = key.split('-')
          return { name: monthNames[parseInt(m, 10) - 1], avances: count }
        })

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
        totalNodoSolicitudes: sols?.length || 0,
        solicitudCounts,
        activityData,
      })
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>

  const AREA_COLOR = { ML: '#FC651F', NLP: '#8B5CF6', Vision: '#00D1FF', Datos: '#22c55e', General: '#F59E0B', 'Sin área': '#6b7280' }
  const STATE_COLOR = { idea: '#F59E0B', desarrollo: '#FC651F', investigacion: '#8B5CF6', pruebas: '#00D1FF', finalizado: '#22c55e', cancelado: '#EF4444', pausa: '#6b7280' }

  const pieData = Object.entries(stats.areaCounts).map(([name, value]) => ({ name, value }))
  const barData = Object.entries(stats.estadoCounts).map(([name, value]) => ({ name, value, fill: STATE_COLOR[name] || '#6b7280' }))
  const radarData = Object.entries(stats.ideaEstados).map(([name, value]) => ({ subject: name, count: value, fullMark: Math.max(...Object.values(stats.ideaEstados), 1) }))
  const fileBarData = Object.entries(stats.fileCounts).map(([name, value]) => ({ name, archivos: value }))

  const metricCards = [
    { label: 'Investigadores', value: stats.totalUsers, color: '#FC651F', icon: FiUsers, trend: stats.totalUsers > 5 ? 'up' : 'neutral' },
    { label: 'Admins', value: stats.admins, color: '#8B5CF6', icon: FiShield, trend: 'neutral' },
    { label: 'Proyectos', value: stats.totalProjects, color: '#00D1FF', icon: FiFlag, trend: stats.totalProjects > 3 ? 'up' : 'neutral' },
    { label: 'Avances', value: stats.totalAvances, color: '#22c55e', icon: FiBarChart2, trend: stats.totalAvances > 10 ? 'up' : 'neutral' },
    { label: 'Ideas', value: stats.totalIdeas, color: '#F59E0B', icon: FiStar, trend: stats.totalIdeas > 5 ? 'up' : 'neutral' },
    { label: 'Archivos', value: stats.totalFiles, color: '#EC4899', icon: FiInbox, trend: stats.totalFiles > 0 ? 'up' : 'neutral' },
    { label: 'Solicitudes', value: stats.totalNodoSolicitudes, color: '#8B5CF6', icon: FiClock, trend: (stats.solicitudCounts?.pendiente || 0) > 0 ? 'up' : 'neutral' },
  ]

  const TrendIcon = ({ trend, color }) => {
    if (trend === 'up') return <FiTrendingUp className="w-3.5 h-3.5" style={{ color }} />
    if (trend === 'down') return <FiTrendingDown className="w-3.5 h-3.5 text-red-400" />
    return <FiMinus className="w-3.5 h-3.5 text-white/20" />
  }

  return (
    <div className="space-y-4">
      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {metricCards.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.05 }}>
            <Card className="relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-3xl font-bold font-title" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-xs text-white/35 mt-1">{s.label}</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <s.icon className="w-4 h-4 text-white/15" />
                  <TrendIcon trend={s.trend} color={s.color} />
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${s.color}40, transparent)` }} />
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── Charts Row 1: Pie + Bar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart - User distribution by area */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
          <Card>
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Distribución por área</h3>
            {pieData.length > 0 ? (
              <div className="flex items-center gap-4">
                <div className="w-1/2">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                        {pieData.map((entry) => (
                          <Cell key={entry.name} fill={AREA_COLOR[entry.name] || '#6b7280'} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 space-y-2">
                  {pieData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: AREA_COLOR[entry.name] || '#6b7280' }} />
                      <span className="text-xs text-white/50 flex-1 truncate">{entry.name}</span>
                      <span className="text-xs font-semibold text-white/70">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-white/25 text-center py-8">Sin datos</p>
            )}
          </Card>
        </motion.div>

        {/* Bar chart - Project states */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}>
          <Card>
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Estado de proyectos</h3>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                  <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
                    {barData.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-white/25 text-center py-8">Sin datos</p>
            )}
          </Card>
        </motion.div>
      </div>

      {/* ── Charts Row 2: Area Chart (full width) ── */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
        <Card>
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Actividad mensual (avances)</h3>
          {stats.activityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={stats.activityData} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00D1FF" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#00D1FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="avances" stroke="#00D1FF" strokeWidth={2} fill="url(#areaGrad)" dot={{ fill: '#00D1FF', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: '#00D1FF', stroke: '#0a0a0f', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-xs text-white/25 text-center py-8">Sin datos de actividad</p>
          )}
        </Card>
      </motion.div>

      {/* ── Charts Row 3: Radar + File Types ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Radar chart - Ideas by state */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
          <Card>
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Ideas por estado</h3>
            {radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fill: 'rgba(255,255,255,0.2)', fontSize: 9 }} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Radar name="Ideas" dataKey="count" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.2} strokeWidth={2} dot={{ fill: '#F59E0B', r: 3 }} />
                </RadarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-white/25 text-center py-8">Sin ideas</p>
            )}
          </Card>
        </motion.div>

        {/* Horizontal bar - File types */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }}>
          <Card>
            <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">Archivos por tipo</h3>
            {fileBarData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={fileBarData} layout="vertical" margin={{ top: 0, right: 4, bottom: 0, left: 10 }}>
                    <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="archivos" fill="#EC4899" radius={[0, 4, 4, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
                  <p className="text-xs text-white/25">Total descargas</p>
                  <p className="text-sm font-semibold text-[#00D1FF]">{stats.totalDownloads}</p>
                </div>
              </>
            ) : (
              <p className="text-xs text-white/25 text-center py-8">Sin archivos</p>
            )}
          </Card>
        </motion.div>
      </div>
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

/* ──────── Nodes Tab (research nodos + group classification) ──────── */
function NodesTabContent() {
  const [subTab, setSubTab] = useState('investigacion')
  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'rgba(255,255,255,0.04)' }}>
        {[
          { id: 'investigacion', label: '🔬 Nodos de Investigación' },
          { id: 'grupos', label: '👥 Grupos de Usuarios' },
        ].map(t => (
          <button key={t.id} onClick={() => setSubTab(t.id)}
            className="px-4 py-2 rounded-lg text-xs font-medium transition-all"
            style={subTab === t.id
              ? { background: 'rgba(255,255,255,0.1)', color: '#fff' }
              : { color: 'rgba(255,255,255,0.4)' }}>
            {t.label}
          </button>
        ))}
      </div>
      {subTab === 'investigacion' && <NodosManager />}
      {subTab === 'grupos' && <NodeGroupManager />}
    </div>
  )
}

/* ──────── Main Admin Panel ──────── */
/* ──────── Pending Nodes Manager ──────── */
function PendingNodesManager() {
  const { getPendingNodos, approvePendingNodo, rejectPendingNodo } = useNodos()
  const [pendingNodos, setPendingNodos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadPendingNodos = async () => {
      setLoading(true)
      const nodos = await getPendingNodos()
      setPendingNodos(nodos)
      setLoading(false)
    }
    loadPendingNodos()
  }, [getPendingNodos])

  const handleApprove = async (nodoId) => {
    const approved = await approvePendingNodo(nodoId)
    if (approved) {
      setPendingNodos(prev => prev.filter(n => n.id !== nodoId))
    }
  }

  const handleReject = async (nodoId) => {
    const rejected = await rejectPendingNodo(nodoId)
    if (rejected) {
      setPendingNodos(prev => prev.filter(n => n.id !== nodoId))
    }
  }

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>

  return (
    <div className="space-y-4">
      {pendingNodos.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-white/30 text-sm">No hay nodos pendientes de aprobación</p>
        </Card>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="divide-y divide-white/[0.06]">
            {pendingNodos.map((nodo, i) => (
              <motion.div
                key={nodo.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-white">{nodo.nombre}</h3>
                    {nodo.descripcion && (
                      <p className="text-xs text-white/40 mt-1">{nodo.descripcion}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2">
                      {nodo.creator && (
                        <span className="text-xs text-white/40 flex items-center gap-1.5">
                          <FiUsers size={12} />
                          Creado por {nodo.creator.nombre}
                        </span>
                      )}
                      <span className="text-xs text-white/30 flex items-center gap-1">
                        <FiClock size={12} />
                        {timeAgo(nodo.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="solid"
                      size="sm"
                      className="gap-1.5 !bg-[#22c55e] hover:!bg-[#16a34a]"
                      onClick={() => handleApprove(nodo.id)}
                    >
                      <FiCheck size={14} />
                      Aprobar
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => handleReject(nodo.id)}
                    >
                      <FiX size={14} />
                      Rechazar
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

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

      <Tabs tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'users' && <UserTable />}
      {tab === 'requests' && <RequestsPanel />}
      {tab === 'events' && <EventsManager />}
      {tab === 'messages' && <MessagesPanel />}
      {tab === 'moderation' && <ContentModerator />}
      {tab === 'reports' && <ReportsPanel />}
      {tab === 'nodes' && <NodesTabContent />}
      {tab === 'pending-nodes' && <PendingNodesManager />}
      {tab === 'galeria' && <GaleriaManager />}
      {tab === 'broadcast' && <BroadcastPanel />}
      {tab === 'config' && <PlatformConfig />}
    </div>
  )
}
