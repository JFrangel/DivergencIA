import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { FiShield, FiUsers, FiInbox, FiBarChart2, FiSettings, FiCheck, FiX, FiTrash2, FiEdit2, FiCalendar, FiMail, FiPlus, FiClock, FiFlag, FiSliders, FiSearch, FiStar } from 'react-icons/fi'
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
import { toast } from 'sonner'
import { timeAgo } from '../../lib/utils'

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
              <option value="miembro">Miembro</option>
              <option value="admin">Admin</option>
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
