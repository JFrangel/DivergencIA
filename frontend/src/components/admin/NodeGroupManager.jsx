import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCorners, useDroppable, useDraggable,
} from '@dnd-kit/core'
import {
  FiSearch, FiX, FiUsers, FiMove, FiCheck, FiChevronDown, FiPlus,
  FiEye, FiGrid, FiList, FiUserPlus,
} from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import Avatar from '../ui/Avatar'
import Spinner from '../ui/Spinner'
import { NODE_GROUPS } from '../ui/NodeGroupBadge'

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
function detectGroup(user) {
  if (user.es_fundador) return 'fundadores'
  if (user.rol === 'egresado') return 'egresados'
  if (user.rol === 'invitado') return 'visitantes'
  if (user.fecha_registro) {
    const days = (Date.now() - new Date(user.fecha_registro).getTime()) / 86400000
    if (days <= 60) return 'nuevos'
  }
  return 'investigadores'
}

function getUserGroups(user) {
  if (user.grupos_nodo?.length) return user.grupos_nodo
  if (user.grupo_nodo) return [user.grupo_nodo]
  return [detectGroup(user)]
}

/* ─── Mini group badge ────────────────────────────────────────────────────── */
function GroupPip({ groupKey }) {
  const info = NODE_GROUPS[groupKey]
  if (!info) return null
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium border"
      style={{ background: `${info.color}15`, color: info.color, borderColor: `${info.color}25` }}
      title={info.label}
    >
      {info.icon} {info.label}
    </span>
  )
}

/* ─── Draggable User Card ─────────────────────────────────────────────────── */
function UserCard({ user, columnKey, isDragging, isSelected, onToggleSelect, onRemoveFromGroup, showOtherGroups }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `${user.id}::${columnKey}`,
    data: { user, sourceGroup: columnKey },
  })

  const groups = getUserGroups(user)
  const otherGroups = groups.filter(g => g !== columnKey)

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 1000 }
    : {}

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-2 p-2.5 rounded-xl border transition-all select-none ${
        isDragging ? 'opacity-30' : ''
      } ${isSelected
        ? 'border-[#FC651F]/40 bg-[#FC651F]/08'
        : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10'
      }`}
    >
      {/* Checkbox */}
      <button
        className="shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-all"
        style={isSelected ? { background: '#FC651F', borderColor: '#FC651F' } : { borderColor: 'rgba(255,255,255,0.12)' }}
        onClick={e => { e.stopPropagation(); onToggleSelect(`${user.id}::${columnKey}`) }}
      >
        {isSelected && <FiCheck size={9} className="text-white" />}
      </button>

      {/* Drag handle */}
      <button
        {...listeners}
        {...attributes}
        className="shrink-0 cursor-grab active:cursor-grabbing text-white/15 hover:text-white/40 touch-none"
        onClick={e => e.stopPropagation()}
        title="Arrastrar para copiar a otro grupo"
      >
        <svg width="8" height="12" viewBox="0 0 8 12" fill="currentColor">
          <circle cx="1.5" cy="1.5" r="1.5"/><circle cx="6.5" cy="1.5" r="1.5"/>
          <circle cx="1.5" cy="6" r="1.5"/><circle cx="6.5" cy="6" r="1.5"/>
          <circle cx="1.5" cy="10.5" r="1.5"/><circle cx="6.5" cy="10.5" r="1.5"/>
        </svg>
      </button>

      <Avatar name={user.nombre || ''} src={user.foto_url} area={user.area_investigacion} size="sm" isFounded={user.es_fundador} />

      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white/85 truncate">{user.nombre || 'Sin nombre'}</p>
        <p className="text-[10px] text-white/35 truncate">{user.correo}</p>
        {showOtherGroups && otherGroups.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-1">
            {otherGroups.map(g => <GroupPip key={g} groupKey={g} />)}
          </div>
        )}
      </div>

      {/* Multi-group indicator */}
      {groups.length > 1 && (
        <span className="shrink-0 text-[9px] font-bold px-1 py-0.5 rounded text-white/40 border border-white/10"
          title={`En ${groups.length} grupos`}>
          ×{groups.length}
        </span>
      )}

      {/* Remove from THIS group */}
      <button
        onClick={e => { e.stopPropagation(); onRemoveFromGroup(user.id, columnKey) }}
        className="shrink-0 w-5 h-5 rounded flex items-center justify-center text-white/15 hover:text-red-400 hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
        title="Quitar de este grupo"
      >
        <FiX size={10} />
      </button>
    </div>
  )
}

/* ─── Ghost overlay ───────────────────────────────────────────────────────── */
function GhostCard({ user, sourceGroup }) {
  const info = NODE_GROUPS[sourceGroup]
  return (
    <div className="w-56 flex items-center gap-2.5 p-2.5 rounded-xl border shadow-2xl shadow-black/60 rotate-1 cursor-grabbing"
      style={{ background: 'rgba(20,10,14,0.97)', borderColor: info ? `${info.color}50` : 'rgba(255,255,255,0.15)' }}>
      <Avatar name={user.nombre || ''} src={user.foto_url} area={user.area_investigacion} size="sm" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-white truncate">{user.nombre}</p>
        {info && <p className="text-[10px]" style={{ color: info.color }}>{info.icon} → ...</p>}
      </div>
    </div>
  )
}

/* ─── Droppable Column ────────────────────────────────────────────────────── */
function GroupColumn({
  groupKey, info, members, search, selected,
  onToggleSelect, onRemoveFromGroup, onAddSelected, draggingId, allGroups, showOtherGroups, onAddDirect,
}) {
  const { setNodeRef, isOver } = useDroppable({ id: groupKey })
  const [batchOpen, setBatchOpen] = useState(false)

  const filtered = useMemo(() =>
    members.filter(u =>
      !search || (u.nombre || '').toLowerCase().includes(search.toLowerCase())
        || (u.correo || '').toLowerCase().includes(search.toLowerCase())
    ), [members, search])

  const selectedHere = filtered.filter(m => selected.has(`${m.id}::${groupKey}`))
  const targetGroups = Object.entries(allGroups).filter(([k]) => k !== groupKey)

  return (
    <div
      className="flex flex-col rounded-xl border transition-all"
      style={{
        borderColor: isOver ? `${info.color}60` : 'rgba(255,255,255,0.06)',
        background: isOver ? `${info.color}06` : 'rgba(255,255,255,0.015)',
        boxShadow: isOver ? `0 0 0 2px ${info.color}30` : 'none',
        minHeight: 180,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] shrink-0 rounded-t-xl"
        style={{ background: `${info.color}07` }}>
        <span className="w-3 h-3 rounded-full" style={{ background: info.color }} />
        <span className="text-base">{info.icon}</span>
        <span className="text-sm font-semibold text-white flex-1">{info.label}</span>
        <span className="text-xs font-bold text-white/40">{members.length}</span>
        <button
          onClick={() => onAddDirect(groupKey)}
          title={`Agregar miembro a ${info.label}`}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all ml-1"
        >
          <FiUserPlus size={12} />
        </button>
      </div>

      <p className="text-[10px] text-white/25 px-4 pt-2">{info.description}</p>

      {/* Batch toolbar */}
      {selectedHere.length > 0 && (
        <div className="mx-3 mt-1 px-2 py-1.5 rounded-lg flex items-center gap-2 relative"
          style={{ background: 'rgba(252,101,31,0.07)', border: '1px solid rgba(252,101,31,0.18)' }}>
          <span className="text-[10px] text-[#FC651F] flex-1">{selectedHere.length} selec.</span>
          <div className="relative">
            <button onClick={() => setBatchOpen(p => !p)}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium text-white bg-[#FC651F]/20 hover:bg-[#FC651F]/30 transition-colors">
              <FiPlus size={9} /> Agregar a <FiChevronDown size={8} />
            </button>
            <AnimatePresence>
              {batchOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="absolute right-0 bottom-full mb-1 w-44 rounded-xl border border-white/10 bg-[#18101a] shadow-xl z-50 overflow-hidden">
                  {targetGroups.map(([key, tInfo]) => (
                    <button key={key}
                      onClick={() => {
                        onAddSelected(selectedHere.map(m => m.id), key)
                        setBatchOpen(false)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-white/[0.06] transition-colors">
                      <span className="w-2 h-2 rounded-full" style={{ background: tInfo.color }} />
                      <span className="text-base leading-none">{tInfo.icon}</span>
                      <span className="text-white/65">{tInfo.label}</span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={() => setBatchOpen(false)} className="text-white/20 hover:text-white/40">
            <FiX size={10} />
          </button>
        </div>
      )}

      {/* Drop zone */}
      <div ref={setNodeRef} className="flex-1 p-3 space-y-1.5 overflow-y-auto"
        onClick={() => setBatchOpen(false)}>
        {isOver && (
          <div className="h-10 rounded-xl border-2 border-dashed flex items-center justify-center text-[11px] font-medium mb-1"
            style={{ borderColor: `${info.color}60`, color: info.color, background: `${info.color}08` }}>
            <FiPlus size={12} className="mr-1" /> Agregar aquí
          </div>
        )}

        <AnimatePresence mode="popLayout">
          {filtered.length === 0 ? (
            <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center text-xs text-white/15 italic py-8">
              Sin miembros
            </motion.p>
          ) : filtered.map(u => (
            <motion.div key={`${u.id}::${groupKey}`} layout
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
              <UserCard
                user={u}
                columnKey={groupKey}
                isDragging={draggingId?.startsWith(u.id)}
                isSelected={selected.has(`${u.id}::${groupKey}`)}
                onToggleSelect={onToggleSelect}
                onRemoveFromGroup={onRemoveFromGroup}
                showOtherGroups={showOtherGroups}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ─── Member overview row (list view) ────────────────────────────────────── */
function MemberRow({ user, allGroupKeys, onAddToGroup, onRemoveFromGroup }) {
  const groups = getUserGroups(user)
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
      <Avatar name={user.nombre || ''} src={user.foto_url} area={user.area_investigacion} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-white/85 truncate">{user.nombre}</p>
        <p className="text-[10px] text-white/30 truncate">{user.correo}</p>
      </div>
      {/* Group pills — click to toggle */}
      <div className="flex flex-wrap gap-1 justify-end">
        {allGroupKeys.map(key => {
          const info = NODE_GROUPS[key]
          const inGroup = groups.includes(key)
          return (
            <button
              key={key}
              title={inGroup ? `Quitar de ${info.label}` : `Agregar a ${info.label}`}
              onClick={() => inGroup ? onRemoveFromGroup(user.id, key) : onAddToGroup(user.id, key)}
              className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium border transition-all"
              style={inGroup
                ? { background: `${info.color}18`, color: info.color, borderColor: `${info.color}30` }
                : { background: 'transparent', color: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.07)' }
              }
            >
              {info.icon}
              {inGroup && <FiCheck size={8} />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Quick-add panel (slide-in from column header +) ───────────────────── */
function AddDirectModal({ groupKey, info, allUsers, grouped, onAdd, onClose }) {
  const [q, setQ] = useState('')
  const notInGroup = useMemo(() => {
    const inGroupIds = new Set((grouped[groupKey] || []).map(u => u.id))
    return allUsers.filter(u => !inGroupIds.has(u.id) &&
      (!q || (u.nombre || '').toLowerCase().includes(q.toLowerCase()) || (u.correo || '').toLowerCase().includes(q.toLowerCase()))
    )
  }, [allUsers, grouped, groupKey, q])

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div
        className="w-80 rounded-2xl border border-white/10 overflow-hidden shadow-2xl shadow-black/60"
        style={{ background: '#110a13' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06]"
          style={{ background: `${info.color}10` }}>
          <span className="text-base">{info.icon}</span>
          <span className="text-sm font-semibold text-white flex-1">Agregar a {info.label}</span>
          <button onClick={onClose} className="text-white/30 hover:text-white/60"><FiX size={14} /></button>
        </div>
        <div className="px-3 pt-3">
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
            <FiSearch size={11} className="text-white/25 shrink-0" />
            <input
              autoFocus
              placeholder="Buscar miembro..."
              value={q}
              onChange={e => setQ(e.target.value)}
              className="text-xs bg-transparent text-white placeholder-white/20 outline-none flex-1"
            />
          </div>
        </div>
        <div className="overflow-y-auto max-h-64 py-2">
          {notInGroup.length === 0 ? (
            <p className="text-center text-xs text-white/20 py-8">
              {q ? 'Sin resultados' : 'Todos ya están en este grupo'}
            </p>
          ) : notInGroup.map(u => (
            <button
              key={u.id}
              onClick={() => { onAdd(u.id, groupKey); onClose() }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-white/[0.05] transition-colors text-left"
            >
              <Avatar name={u.nombre || ''} src={u.foto_url} area={u.area_investigacion} size="xs" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-white/80 truncate">{u.nombre}</p>
                <p className="text-[10px] text-white/30 truncate">{u.correo}</p>
              </div>
              <FiPlus size={11} className="text-white/20 shrink-0" style={{ color: info.color }} />
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

/* ─── Main ────────────────────────────────────────────────────────────────── */
export default function NodeGroupManager() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [draggingData, setDraggingData] = useState(null)   // { user, sourceGroup }
  const [viewMode, setViewMode] = useState('kanban')        // 'kanban' | 'list'
  const [showOtherGroups, setShowOtherGroups] = useState(true)
  const [addingToGroup, setAddingToGroup] = useState(null)  // groupKey | null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  /* ─── Fetch ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    supabase
      .from('usuarios')
      .select('id, nombre, correo, foto_url, rol, area_investigacion, es_fundador, fecha_registro, grupo_nodo, grupos_nodo, activo')
      .order('nombre')
      .then(({ data, error }) => {
        if (error) toast.error('Error cargando usuarios')
        setUsers(data || [])
        setLoading(false)
      })
  }, [])

  /* ─── DB helpers ──────────────────────────────────────────────────────────── */
  const saveGroups = useCallback(async (userId, newGroups) => {
    const unique = [...new Set(newGroups)].filter(g => !!NODE_GROUPS[g])
    const primary = unique[0] || null
    const { error } = await supabase.from('usuarios')
      .update({ grupos_nodo: unique, grupo_nodo: primary })
      .eq('id', userId)
    if (error) { toast.error('Error al actualizar grupos'); return false }
    // Sync canal_miembros so chat channels stay in sync
    supabase.rpc('sync_user_group_channels', { p_user_id: userId, p_groups: unique })
    return true
  }, [])

  const addToGroup = useCallback(async (userId, targetGroup) => {
    const user = users.find(u => u.id === userId)
    if (!user) return
    const current = getUserGroups(user)
    if (current.includes(targetGroup)) { toast.info(`Ya está en ${NODE_GROUPS[targetGroup]?.label}`); return }
    const newGroups = [...current, targetGroup]
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, grupos_nodo: newGroups } : u))
    const ok = await saveGroups(userId, newGroups)
    if (!ok) setUsers(prev => prev.map(u => u.id === userId ? { ...u, grupos_nodo: current } : u))
    else toast.success(`${user.nombre} agregado a ${NODE_GROUPS[targetGroup]?.label}`)
  }, [users, saveGroups])

  const removeFromGroup = useCallback(async (userId, groupKey) => {
    const user = users.find(u => u.id === userId)
    if (!user) return
    const current = getUserGroups(user)
    if (current.length <= 1) { toast.warning('El miembro debe estar en al menos un grupo'); return }
    const newGroups = current.filter(g => g !== groupKey)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, grupos_nodo: newGroups } : u))
    const ok = await saveGroups(userId, newGroups)
    if (!ok) setUsers(prev => prev.map(u => u.id === userId ? { ...u, grupos_nodo: current } : u))
    else toast.success(`${user.nombre} quitado de ${NODE_GROUPS[groupKey]?.label}`)
  }, [users, saveGroups])

  const addMultipleToGroup = useCallback(async (userIds, targetGroup) => {
    const updates = userIds.map(uid => {
      const user = users.find(u => u.id === uid)
      if (!user) return null
      const current = getUserGroups(user)
      if (current.includes(targetGroup)) return null
      return { uid, newGroups: [...current, targetGroup] }
    }).filter(Boolean)

    if (!updates.length) { toast.info('Ya están todos en ese grupo'); return }

    setUsers(prev => prev.map(u => {
      const upd = updates.find(x => x.uid === u.id)
      return upd ? { ...u, grupos_nodo: upd.newGroups } : u
    }))

    await Promise.all(updates.map(({ uid, newGroups }) => saveGroups(uid, newGroups)))
    toast.success(`${updates.length} miembro(s) agregado(s) a ${NODE_GROUPS[targetGroup]?.label}`)
    setSelected(new Set())
  }, [users, saveGroups])

  /* ─── Drag ────────────────────────────────────────────────────────────────── */
  const handleDragStart = ({ active }) => setDraggingData(active.data.current)

  const handleDragEnd = useCallback(async ({ active, over }) => {
    setDraggingData(null)
    if (!over) return
    const { user, sourceGroup } = active.data.current || {}
    const targetGroup = over.id
    if (!user || !NODE_GROUPS[targetGroup]) return
    if (sourceGroup === targetGroup) return
    // Always ADD (not move) — user keeps original group
    await addToGroup(user.id, targetGroup)
  }, [addToGroup])

  /* ─── Grouped data ────────────────────────────────────────────────────────── */
  const grouped = useMemo(() => {
    const groups = {}
    Object.keys(NODE_GROUPS).forEach(k => { groups[k] = [] })
    users.forEach(u => {
      const gs = getUserGroups(u)
      gs.forEach(g => { if (groups[g]) groups[g].push(u) })
    })
    return groups
  }, [users])

  const allGroupKeys = Object.keys(NODE_GROUPS)

  const filteredUsers = useMemo(() =>
    search
      ? users.filter(u => (u.nombre || '').toLowerCase().includes(search.toLowerCase()) || (u.correo || '').toLowerCase().includes(search.toLowerCase()))
      : users,
    [users, search]
  )

  const totalAssignments = Object.values(grouped).reduce((s, arr) => s + arr.length, 0)

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Spinner size="md" /></div>
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <FiUsers size={16} className="text-[var(--c-primary)]" />
            <h2 className="text-base font-semibold text-white">Grupos de Usuarios</h2>
            <span className="text-xs text-white/30">{users.length} miembros · {totalAssignments} asignaciones</span>
          </div>

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {/* Show other groups toggle */}
            <button
              onClick={() => setShowOtherGroups(p => !p)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] border transition-all"
              style={showOtherGroups
                ? { background: 'rgba(0,209,255,0.1)', color: '#00D1FF', borderColor: 'rgba(0,209,255,0.2)' }
                : { color: 'rgba(255,255,255,0.35)', borderColor: 'rgba(255,255,255,0.06)' }}
              title="Mostrar otros grupos del miembro"
            >
              <FiEye size={11} /> Otros grupos
            </button>

            {/* View toggle */}
            <div className="flex rounded-lg overflow-hidden border border-white/[0.07]">
              {[['kanban', FiGrid], ['list', FiList]].map(([mode, Icon]) => (
                <button key={mode} onClick={() => setViewMode(mode)}
                  className="px-2.5 py-1.5 transition-colors"
                  style={viewMode === mode ? { background: 'rgba(255,255,255,0.1)', color: '#fff' } : { color: 'rgba(255,255,255,0.3)' }}>
                  <Icon size={13} />
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06]">
              <FiSearch size={12} className="text-white/25 shrink-0" />
              <input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
                className="text-xs bg-transparent text-white placeholder-white/20 outline-none w-36" />
              {search && <button onClick={() => setSearch('')} className="text-white/25 hover:text-white/50"><FiX size={11} /></button>}
            </div>
          </div>
        </div>

        {/* Summary pills */}
        <div className="flex gap-1.5 flex-wrap items-center">
          {Object.entries(NODE_GROUPS).map(([key, info]) => (
            <div key={key} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] border border-white/[0.06] bg-white/[0.02]">
              <span className="w-2 h-2 rounded-full" style={{ background: info.color }} />
              <span className="text-white/50">{info.label}</span>
              <span className="font-bold text-white">{grouped[key]?.length || 0}</span>
            </div>
          ))}
          <p className="text-[10px] text-white/20 ml-2 flex items-center gap-1">
            <FiMove size={9} /> Arrastra para agregar · <FiX size={9} /> para quitar del grupo
          </p>
        </div>

        {/* ── KANBAN VIEW ── */}
        {viewMode === 'kanban' && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {Object.entries(NODE_GROUPS).map(([key, info]) => (
              <GroupColumn
                key={key}
                groupKey={key}
                info={info}
                members={grouped[key] || []}
                search={search}
                selected={selected}
                onToggleSelect={id => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })}
                onRemoveFromGroup={removeFromGroup}
                onAddSelected={addMultipleToGroup}
                draggingId={draggingData?.user?.id}
                allGroups={NODE_GROUPS}
                showOtherGroups={showOtherGroups}
                onAddDirect={setAddingToGroup}
              />
            ))}
          </div>
        )}

        {/* ── LIST VIEW ── */}
        {viewMode === 'list' && (
          <div className="rounded-xl border border-white/[0.06] overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.015)' }}>
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-2">
              <span className="text-xs text-white/50 font-medium">Miembro</span>
              <span className="ml-auto text-[10px] text-white/30">Haz clic en un grupo para agregar/quitar</span>
            </div>
            <div className="divide-y divide-white/[0.04] max-h-[600px] overflow-y-auto">
              {filteredUsers.map(user => (
                <MemberRow
                  key={user.id}
                  user={user}
                  allGroupKeys={allGroupKeys}
                  onAddToGroup={addToGroup}
                  onRemoveFromGroup={removeFromGroup}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Drag overlay */}
      <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
        {draggingData ? (
          <div className="w-56">
            <GhostCard user={draggingData.user} sourceGroup={draggingData.sourceGroup} />
          </div>
        ) : null}
      </DragOverlay>

      {/* Quick-add modal */}
      <AnimatePresence>
        {addingToGroup && NODE_GROUPS[addingToGroup] && (
          <AddDirectModal
            key={addingToGroup}
            groupKey={addingToGroup}
            info={NODE_GROUPS[addingToGroup]}
            allUsers={users}
            grouped={grouped}
            onAdd={addToGroup}
            onClose={() => setAddingToGroup(null)}
          />
        )}
      </AnimatePresence>
    </DndContext>
  )
}
