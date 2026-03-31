import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiPlus, FiEdit2, FiTrash2, FiCopy, FiChevronRight, FiChevronDown,
  FiUsers, FiSearch, FiX, FiCheck, FiZap, FiMove, FiUserPlus,
  FiArrowRight, FiMoreVertical, FiGrid, FiList, FiLock, FiUnlock,
  FiInbox, FiCheckCircle, FiXCircle,
} from 'react-icons/fi'
import { useNodos } from '../../hooks/useNodos'
import Avatar from '../ui/Avatar'
import Spinner from '../ui/Spinner'

const COLORS = ['#8B5CF6','#FC651F','#00D1FF','#22c55e','#F59E0B','#EF4444','#ec4899','#06b6d4']
const ICONOS = ['🔬','🧠','💡','🚀','📊','🎯','🔭','🧬','🤖','⚡','🌐','🔐','📡','🎓','🛸','🧪']
const ROLES_NODO = ['lider','coordinador','investigador','colaborador','miembro','asesor','tesista']

// ── NODO FORM MODAL ──────────────────────────────────────────────────────────
function NodoFormModal({ open, initial, parentId, parentName, allNodos, onClose, onSave }) {
  const [form, setForm] = useState({
    nombre: initial?.nombre || '',
    descripcion: initial?.descripcion || '',
    color: initial?.color || '#8B5CF6',
    icono: initial?.icono || '🔬',
    parent_id: parentId ?? initial?.parent_id ?? null,
    privado: initial?.privado ?? false,
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) return
    setSaving(true)
    await onSave({ ...form, nombre: form.nombre.trim() })
    setSaving(false)
    onClose()
  }

  if (!open) return null

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'rgba(12,6,8,0.98)', border: '1px solid rgba(255,255,255,0.08)' }}
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-lg"
              style={{ background: `${form.color}22` }}>
              {form.icono}
            </div>
            <h3 className="text-sm font-semibold text-white">
              {initial ? 'Editar nodo' : 'Nuevo nodo'}
            </h3>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white p-1 transition-colors">
            <FiX size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {parentName && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
              style={{ background: 'rgba(139,92,246,0.08)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,0.2)' }}>
              <FiArrowRight size={11} />
              Sub-nodo de <strong>{parentName}</strong>
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 block">Nombre</label>
            <input
              value={form.nombre}
              onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
              placeholder="Nombre del nodo"
              required autoFocus
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none focus:border-[#FC651F]/40 transition-colors"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 block">Descripción</label>
            <input
              value={form.descripcion}
              onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
              placeholder="¿De qué trata este nodo?"
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors"
            />
          </div>

          {/* Icono */}
          <div>
            <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 block">Ícono</label>
            <div className="flex flex-wrap gap-1.5">
              {ICONOS.map(ic => (
                <button key={ic} type="button" onClick={() => setForm(f => ({ ...f, icono: ic }))}
                  className="w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all"
                  style={form.icono === ic ? { background: `${form.color}25`, border: `1px solid ${form.color}60` } : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 block">Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f => ({ ...f, color: c }))}
                  className="w-6 h-6 rounded-full transition-all relative"
                  style={{ background: c }}>
                  {form.color === c && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <FiCheck size={11} className="text-white drop-shadow-md" />
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Parent (only for editing) */}
          {initial && !parentId && (
            <div>
              <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 block">Nodo padre (opcional)</label>
              <select
                value={form.parent_id || ''}
                onChange={e => setForm(f => ({ ...f, parent_id: e.target.value || null }))}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white outline-none focus:border-white/20 transition-colors"
              >
                <option value="">Sin padre (nodo raíz)</option>
                {allNodos.filter(n => n.id !== initial?.id).map(n => (
                  <option key={n.id} value={n.id}>{n.icono} {n.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Privacidad del chat */}
          <div>
            <label className="text-[10px] text-white/30 uppercase tracking-wider mb-2 block">Privacidad del chat</label>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, privado: !f.privado }))}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border transition-all text-left"
              style={form.privado
                ? { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }
                : { background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}
            >
              <span style={{ color: form.privado ? '#EF4444' : '#22c55e' }}>
                {form.privado ? <FiLock size={14} /> : <FiUnlock size={14} />}
              </span>
              <div className="flex-1">
                <p className="text-xs font-medium" style={{ color: form.privado ? '#EF4444' : '#22c55e' }}>
                  {form.privado ? 'Chat privado' : 'Chat público (solo lectura para no-miembros)'}
                </p>
                <p className="text-[10px] text-white/30 mt-0.5">
                  {form.privado
                    ? 'Solo los miembros del nodo pueden ver y escribir en el chat.'
                    : 'Cualquier miembro de la plataforma puede leer el chat, pero solo los del nodo pueden escribir.'}
                </p>
              </div>
              <div
                className="w-9 h-5 rounded-full relative transition-colors shrink-0"
                style={{ background: form.privado ? '#EF4444' : '#22c55e' }}
              >
                <div
                  className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                  style={{ left: form.privado ? '18px' : '2px' }}
                />
              </div>
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/[0.04] transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={!form.nombre.trim() || saving}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-30"
              style={{ background: `linear-gradient(135deg, ${form.color}, ${form.color}99)` }}>
              {saving ? <Spinner size="xs" /> : <FiCheck size={12} />}
              {initial ? 'Guardar' : 'Crear nodo'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ── ADD MEMBERS MODAL ────────────────────────────────────────────────────────
function AddMembersModal({ open, nodo, allMembers, onClose, onAdd }) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [rol, setRol] = useState('miembro')
  const [adding, setAdding] = useState(false)

  const existingIds = new Set(nodo?.miembros?.map(m => m.id) || [])
  const filtered = allMembers.filter(m =>
    !existingIds.has(m.id) &&
    (!search || m.nombre?.toLowerCase().includes(search.toLowerCase()))
  )

  const toggle = (id) => setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleAdd = async () => {
    if (!selected.size) return
    setAdding(true)
    await onAdd(nodo.id, [...selected], rol)
    setAdding(false)
    setSelected(new Set())
    onClose()
  }

  if (!open || !nodo) return null

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'rgba(12,6,8,0.98)', border: '1px solid rgba(255,255,255,0.08)' }}
        initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06]">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <FiUserPlus size={14} style={{ color: nodo.color }} />
            Agregar a {nodo.icono} {nodo.nombre}
          </h3>
          <button onClick={onClose} className="text-white/30 hover:text-white p-1"><FiX size={15} /></button>
        </div>

        <div className="p-4 space-y-3">
          {/* Rol selector */}
          <div>
            <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 block">Rol</label>
            <div className="flex flex-wrap gap-1">
              {ROLES_NODO.map(r => (
                <button key={r} onClick={() => setRol(r)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium border transition-all capitalize"
                  style={rol === r ? { background: `${nodo.color}22`, color: nodo.color, borderColor: `${nodo.color}40` } : { background: 'transparent', color: 'rgba(255,255,255,0.35)', borderColor: 'rgba(255,255,255,0.08)' }}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <FiSearch size={12} className="text-white/25 shrink-0" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Buscar miembro..." autoFocus
              className="flex-1 text-xs bg-transparent text-white placeholder-white/20 outline-none" />
          </div>

          {/* List */}
          <div className="max-h-52 overflow-y-auto space-y-0.5">
            {filtered.length === 0 ? (
              <p className="text-xs text-white/20 text-center py-6">
                {allMembers.length === existingIds.size ? 'Todos los miembros ya están en este nodo' : 'Sin resultados'}
              </p>
            ) : filtered.map(m => {
              const sel = selected.has(m.id)
              return (
                <button key={m.id} onClick={() => toggle(m.id)}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg transition-colors text-left"
                  style={{ background: sel ? `${nodo.color}10` : 'transparent' }}>
                  <div className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                    style={sel ? { background: nodo.color, borderColor: nodo.color } : { borderColor: 'rgba(255,255,255,0.15)' }}>
                    {sel && <FiCheck size={9} className="text-white" />}
                  </div>
                  <Avatar name={m.nombre} src={m.foto_url} area={m.area_investigacion} size="xs" />
                  <span className="text-xs flex-1 truncate" style={{ color: sel ? '#fff' : 'rgba(255,255,255,0.55)' }}>{m.nombre}</span>
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
            <span className="text-[11px] text-white/25">{selected.size} seleccionados</span>
            <button onClick={handleAdd} disabled={!selected.size || adding}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-30"
              style={{ background: nodo.color }}>
              {adding ? <Spinner size="xs" /> : <FiUserPlus size={11} />}
              Agregar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── MOVE MEMBERS MODAL ───────────────────────────────────────────────────────
function MoveMembersModal({ open, sourceNodo, targetOptions, selectedIds, onClose, onMove }) {
  const [targetId, setTargetId] = useState('')
  const [moving, setMoving] = useState(false)

  const handleMove = async () => {
    if (!targetId) return
    setMoving(true)
    await onMove(sourceNodo.id, targetId, selectedIds)
    setMoving(false)
    onClose()
  }

  if (!open) return null

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: 'rgba(12,6,8,0.98)', border: '1px solid rgba(255,255,255,0.08)' }}
        initial={{ scale: 0.95, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/[0.06]">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <FiMove size={14} className="text-[#00D1FF]" />
            Mover {selectedIds.length} miembro(s)
          </h3>
          <button onClick={onClose} className="text-white/30 hover:text-white p-1"><FiX size={15} /></button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-xs text-white/40">
            De <span className="font-medium" style={{ color: sourceNodo?.color }}>{sourceNodo?.icono} {sourceNodo?.nombre}</span> → a:
          </p>

          <div className="space-y-1.5">
            {targetOptions.map(n => (
              <button key={n.id} onClick={() => setTargetId(n.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-all"
                style={targetId === n.id
                  ? { background: `${n.color}15`, borderColor: `${n.color}40` }
                  : { background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                  style={{ background: `${n.color}20` }}>{n.icono}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{n.nombre}</p>
                  <p className="text-[10px] text-white/30">{n.miembros?.length || 0} miembros</p>
                </div>
                {targetId === n.id && <FiCheck size={13} style={{ color: n.color }} />}
              </button>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2 rounded-lg text-xs text-white/40 border border-white/[0.08] hover:text-white transition-colors">
              Cancelar
            </button>
            <button onClick={handleMove} disabled={!targetId || moving}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-30"
              style={{ background: 'linear-gradient(135deg, #00D1FF, #8B5CF6)' }}>
              {moving ? <Spinner size="xs" /> : <FiArrowRight size={12} />}
              Mover
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── NODO TREE NODE ───────────────────────────────────────────────────────────
function TreeNode({ nodo, depth = 0, selectedId, onSelect, onCreateChild, onEdit, onDuplicate, onDelete }) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = nodo.children?.length > 0
  const isSelected = selectedId === nodo.id

  return (
    <div>
      <div
        className="group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all"
        style={{
          marginLeft: depth * 16,
          background: isSelected ? `${nodo.color}15` : 'transparent',
          border: isSelected ? `1px solid ${nodo.color}30` : '1px solid transparent',
        }}
        onClick={() => onSelect(nodo)}
      >
        {/* Expand toggle */}
        <button
          className="w-4 h-4 flex items-center justify-center text-white/25 shrink-0"
          onClick={e => { e.stopPropagation(); setExpanded(p => !p) }}
        >
          {hasChildren
            ? (expanded ? <FiChevronDown size={11} /> : <FiChevronRight size={11} />)
            : <span className="w-2 h-2 rounded-full shrink-0" style={{ background: `${nodo.color}40` }} />
          }
        </button>

        {/* Icon */}
        <span className="text-sm shrink-0">{nodo.icono}</span>

        {/* Name */}
        <span className="text-xs font-medium flex-1 truncate" style={{ color: isSelected ? nodo.color : 'rgba(255,255,255,0.75)' }}>
          {nodo.nombre}
        </span>

        {/* Member count */}
        <span className="text-[10px] shrink-0" style={{ color: `${nodo.color}80` }}>
          {nodo.miembros?.length || 0}
        </span>

        {/* Actions (on hover) */}
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={() => onCreateChild(nodo)} title="Crear sub-nodo"
            className="w-5 h-5 rounded flex items-center justify-center text-white/25 hover:text-[var(--c-primary)] hover:bg-white/[0.06] transition-colors">
            <FiPlus size={10} />
          </button>
          <button onClick={() => onEdit(nodo)} title="Editar"
            className="w-5 h-5 rounded flex items-center justify-center text-white/25 hover:text-[#00D1FF] hover:bg-white/[0.06] transition-colors">
            <FiEdit2 size={10} />
          </button>
          <button onClick={() => onDuplicate(nodo.id)} title="Duplicar"
            className="w-5 h-5 rounded flex items-center justify-center text-white/25 hover:text-[#22c55e] hover:bg-white/[0.06] transition-colors">
            <FiCopy size={10} />
          </button>
          <button onClick={() => onDelete(nodo)} title="Eliminar"
            className="w-5 h-5 rounded flex items-center justify-center text-white/25 hover:text-red-400 hover:bg-red-400/[0.08] transition-colors">
            <FiTrash2 size={10} />
          </button>
        </div>
      </div>

      {/* Children */}
      <AnimatePresence>
        {expanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}>
            {nodo.children.map(child => (
              <TreeNode key={child.id} nodo={child} depth={depth + 1}
                selectedId={selectedId} onSelect={onSelect}
                onCreateChild={onCreateChild} onEdit={onEdit}
                onDuplicate={onDuplicate} onDelete={onDelete} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── NODO DETAIL PANEL ─────────────────────────────────────────────────────────
function NodoDetailPanel({ nodo, allNodos, members, onEdit, onDuplicate, onDelete, onAddMembers, onRemoveMembers, onMoveMembers, onUpdateMemberRole }) {
  const [search, setSearch] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState(new Set())
  const [showAdd, setShowAdd] = useState(false)
  const [showMove, setShowMove] = useState(false)

  const filteredMembers = useMemo(() =>
    (nodo.miembros || []).filter(m =>
      !search || m.nombre?.toLowerCase().includes(search.toLowerCase())
    ), [nodo.miembros, search])

  const toggleMember = (id) => setSelectedMemberIds(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const selectAll = () => setSelectedMemberIds(new Set(filteredMembers.map(m => m.id)))
  const clearSelection = () => setSelectedMemberIds(new Set())

  const moveTargets = allNodos.filter(n => n.id !== nodo.id && n.activo)

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Nodo header */}
      <div className="px-5 py-4 border-b border-white/[0.06] shrink-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
              style={{ background: `${nodo.color}20`, border: `1px solid ${nodo.color}30` }}>
              {nodo.icono}
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">{nodo.nombre}</h3>
              {nodo.descripcion && <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{nodo.descripcion}</p>}
              <p className="text-[11px] mt-1" style={{ color: `${nodo.color}80` }}>
                {nodo.miembros?.length || 0} miembro(s)
                {nodo.children?.length > 0 && ` · ${nodo.children.length} sub-nodo(s)`}
              </p>
            </div>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onEdit(nodo)} title="Editar"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-[#00D1FF] hover:bg-white/[0.06] transition-colors">
              <FiEdit2 size={13} />
            </button>
            <button onClick={() => onDuplicate(nodo.id)} title="Duplicar"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-[#22c55e] hover:bg-white/[0.06] transition-colors">
              <FiCopy size={13} />
            </button>
            <button onClick={() => onDelete(nodo)} title="Eliminar"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/30 hover:text-red-400 hover:bg-red-400/[0.06] transition-colors">
              <FiTrash2 size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Members toolbar */}
      <div className="px-4 py-2.5 border-b border-white/[0.04] flex items-center gap-2 shrink-0 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FiSearch size={12} className="text-white/25 shrink-0" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar miembro..."
            className="flex-1 text-xs bg-transparent text-white/70 placeholder-white/20 outline-none min-w-0" />
          {search && <button onClick={() => setSearch('')} className="text-white/25 hover:text-white/50"><FiX size={11} /></button>}
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all text-white"
          style={{ background: `${nodo.color}25`, border: `1px solid ${nodo.color}30` }}>
          <FiUserPlus size={11} /> Agregar
        </button>
        {selectedMemberIds.size > 0 && (
          <>
            <button onClick={() => setShowMove(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-[#00D1FF] border border-[#00D1FF]/20 bg-[#00D1FF]/08 transition-all hover:bg-[#00D1FF]/15">
              <FiMove size={11} /> Mover ({selectedMemberIds.size})
            </button>
            <button onClick={() => onRemoveMembers(nodo.id, [...selectedMemberIds]).then(() => clearSelection())}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-red-400 border border-red-400/20 bg-red-400/08 hover:bg-red-400/15 transition-all">
              <FiX size={11} /> Quitar
            </button>
            <button onClick={clearSelection} className="text-[11px] text-white/30 hover:text-white/60">
              Deseleccionar
            </button>
          </>
        )}
        {filteredMembers.length > 0 && selectedMemberIds.size === 0 && (
          <button onClick={selectAll} className="text-[11px] text-white/30 hover:text-white/60 transition-colors">
            Sel. todos
          </button>
        )}
      </div>

      {/* Members list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <AnimatePresence mode="popLayout">
          {filteredMembers.length === 0 ? (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center py-12 gap-3 text-white/20">
              <FiUsers size={28} />
              <p className="text-xs">{search ? 'Sin resultados' : 'Sin miembros aún'}</p>
              {!search && (
                <button onClick={() => setShowAdd(true)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 hover:text-white/40 transition-colors">
                  Agregar miembros
                </button>
              )}
            </motion.div>
          ) : filteredMembers.map(m => {
            const sel = selectedMemberIds.has(m.id)
            return (
              <motion.div key={m.id} layout
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg border transition-all group cursor-pointer"
                style={sel
                  ? { background: `${nodo.color}10`, borderColor: `${nodo.color}30` }
                  : { background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.04)' }}
                onClick={() => toggleMember(m.id)}>
                <div className="w-4 h-4 rounded border flex items-center justify-center shrink-0"
                  style={sel ? { background: nodo.color, borderColor: nodo.color } : { borderColor: 'rgba(255,255,255,0.12)' }}>
                  {sel && <FiCheck size={9} className="text-white" />}
                </div>
                <Avatar name={m.nombre} src={m.foto_url} area={m.area_investigacion} size="xs" />
                <span className="text-xs flex-1 truncate font-medium text-white/75">{m.nombre}</span>
                {/* Role selector */}
                <select
                  value={m.rol_nodo || 'miembro'}
                  onClick={e => e.stopPropagation()}
                  onChange={e => onUpdateMemberRole(nodo.id, m.id, e.target.value)}
                  className="text-[10px] rounded-md px-1.5 py-0.5 bg-white/[0.04] border border-white/[0.06] text-white/40 outline-none cursor-pointer hover:border-white/20 transition-colors"
                >
                  {ROLES_NODO.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Add / Move modals */}
      <AnimatePresence>
        {showAdd && (
          <AddMembersModal open nodo={nodo} allMembers={members}
            onClose={() => setShowAdd(false)} onAdd={onAddMembers} />
        )}
        {showMove && (
          <MoveMembersModal open sourceNodo={nodo} targetOptions={moveTargets}
            selectedIds={[...selectedMemberIds]}
            onClose={() => { setShowMove(false); clearSelection() }}
            onMove={onMoveMembers} />
        )}
      </AnimatePresence>
    </div>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function NodosManager() {
  const {
    nodos, tree, members, loading,
    createNodo, updateNodo, deleteNodo, duplicateNodo,
    addMembersToNodo, removeMembersFromNodo, moveMembersToNodo, updateMemberRole,
    getPendingSolicitudes, respondSolicitud,
  } = useNodos()

  const [selectedNodo, setSelectedNodo] = useState(null)
  const [solicitudes, setSolicitudes] = useState([])
  const [loadingSolicitudes, setLoadingSolicitudes] = useState(false)
  const [showSolicitudes, setShowSolicitudes] = useState(false)
  const [formModal, setFormModal] = useState(null) // { mode: 'create'|'edit', nodo?, parentId?, parentName? }
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [treeSearch, setTreeSearch] = useState('')

  // Keep selected nodo in sync when data refreshes
  const currentNodo = useMemo(() =>
    selectedNodo ? nodos.find(n => n.id === selectedNodo.id) || null : null
  , [nodos, selectedNodo])

  const loadSolicitudes = useCallback(async () => {
    setLoadingSolicitudes(true)
    const data = await getPendingSolicitudes()
    setSolicitudes(data)
    setLoadingSolicitudes(false)
  }, [getPendingSolicitudes])

  useEffect(() => { if (!loading) loadSolicitudes() }, [loading, loadSolicitudes])

  const handleRespond = async (solicitud, estado) => {
    const ok = await respondSolicitud(solicitud.id, estado, solicitud.nodo_id, solicitud.usuario_id)
    if (ok) setSolicitudes(prev => prev.filter(s => s.id !== solicitud.id))
  }

  const handleCreate = () => setFormModal({ mode: 'create' })
  const handleCreateChild = (parent) => setFormModal({ mode: 'create', parentId: parent.id, parentName: `${parent.icono} ${parent.nombre}` })
  const handleEdit = (nodo) => setFormModal({ mode: 'edit', nodo })
  const handleDelete = (nodo) => setDeleteConfirm(nodo)

  const handleFormSave = async (data) => {
    if (formModal.mode === 'create') {
      const newNodo = await createNodo({ ...data, parent_id: formModal.parentId || null })
      if (newNodo) setSelectedNodo(newNodo)
    } else {
      await updateNodo(formModal.nodo.id, data)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return
    await deleteNodo(deleteConfirm.id)
    if (currentNodo?.id === deleteConfirm.id) setSelectedNodo(null)
    setDeleteConfirm(null)
  }

  const filteredTree = useMemo(() => {
    if (!treeSearch) return tree
    const q = treeSearch.toLowerCase()
    const filterNodes = (nodes) => nodes.reduce((acc, n) => {
      const matches = n.nombre.toLowerCase().includes(q)
      const filteredChildren = filterNodes(n.children || [])
      if (matches || filteredChildren.length > 0) acc.push({ ...n, children: filteredChildren })
      return acc
    }, [])
    return filterNodes(tree)
  }, [tree, treeSearch])

  const totalMembers = nodos.reduce((s, n) => s + (n.miembros?.length || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="md" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #FC651F)' }}>
            <FiZap size={14} className="text-white" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white font-title">Nodos de Investigación</h2>
            <p className="text-[11px] text-white/30">{nodos.length} nodos · {totalMembers} asignaciones</p>
          </div>
        </div>
        <div className="ml-auto">
          <div className="flex items-center gap-2">
            {solicitudes.length > 0 && (
              <button
                onClick={() => setShowSolicitudes(s => !s)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all relative"
                style={{ background: 'rgba(252,101,31,0.12)', color: '#FC651F', border: '1px solid rgba(252,101,31,0.2)' }}
              >
                <FiInbox size={12} />
                Solicitudes
                <span className="ml-1 bg-[#FC651F] text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {solicitudes.length}
                </span>
              </button>
            )}
            <button onClick={handleCreate}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all"
              style={{ background: 'linear-gradient(135deg, #8B5CF6, #FC651F)' }}>
              <FiPlus size={13} /> Nuevo nodo
            </button>
          </div>
        </div>
      </div>

      {/* Solicitudes panel */}
      <AnimatePresence>
        {showSolicitudes && solicitudes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="rounded-xl border border-[#FC651F]/20 overflow-hidden"
            style={{ background: 'rgba(252,101,31,0.04)' }}
          >
            <div className="px-4 py-3 border-b border-[#FC651F]/10 flex items-center justify-between">
              <span className="text-xs font-semibold text-[#FC651F]">Solicitudes pendientes de ingreso</span>
              <button onClick={() => setShowSolicitudes(false)} className="text-white/30 hover:text-white/60"><FiX size={12} /></button>
            </div>
            <div className="divide-y divide-white/[0.04]">
              {loadingSolicitudes ? (
                <div className="py-4 flex justify-center"><span className="text-white/20 text-xs">Cargando...</span></div>
              ) : solicitudes.map(s => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center text-xs text-white/40 font-semibold shrink-0">
                    {s.usuario?.nombre?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white/80 truncate">{s.usuario?.nombre}</p>
                    <p className="text-[10px] text-white/30 truncate">
                      → {s.nodo?.icono} {s.nodo?.nombre}
                      {s.mensaje && <span className="ml-1 text-white/20">· "{s.mensaje}"</span>}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => handleRespond(s, 'aprobada')}
                      className="p-1.5 rounded-lg text-[#22c55e] hover:bg-[#22c55e]/10 transition-colors"
                      title="Aprobar"
                    >
                      <FiCheckCircle size={14} />
                    </button>
                    <button
                      onClick={() => handleRespond(s, 'rechazada')}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                      title="Rechazar"
                    >
                      <FiXCircle size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 min-h-0" style={{ height: 'calc(100vh - 280px)' }}>
        {/* Left: Tree */}
        <div className="rounded-xl border border-white/[0.06] overflow-hidden flex flex-col"
          style={{ background: 'rgba(255,255,255,0.015)' }}>
          <div className="px-3 py-2.5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <FiSearch size={11} className="text-white/25 shrink-0" />
              <input value={treeSearch} onChange={e => setTreeSearch(e.target.value)}
                placeholder="Buscar nodo..."
                className="flex-1 text-xs bg-transparent text-white/70 placeholder-white/20 outline-none" />
              {treeSearch && <button onClick={() => setTreeSearch('')} className="text-white/25 hover:text-white/50"><FiX size={10} /></button>}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {filteredTree.length === 0 ? (
              <div className="flex flex-col items-center py-12 gap-3 text-white/20">
                <FiGrid size={24} />
                <p className="text-xs text-center">
                  {treeSearch ? 'Sin resultados' : 'No hay nodos aún'}
                </p>
                {!treeSearch && (
                  <button onClick={handleCreate}
                    className="text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:border-[#8B5CF6]/40 hover:text-[#8B5CF6] transition-colors">
                    Crear primer nodo
                  </button>
                )}
              </div>
            ) : filteredTree.map(nodo => (
              <TreeNode key={nodo.id} nodo={nodo} depth={0}
                selectedId={currentNodo?.id}
                onSelect={n => setSelectedNodo(n)}
                onCreateChild={handleCreateChild}
                onEdit={handleEdit}
                onDuplicate={duplicateNodo}
                onDelete={handleDelete} />
            ))}
          </div>
        </div>

        {/* Right: Detail Panel */}
        <div className="rounded-xl border border-white/[0.06] overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.015)' }}>
          {currentNodo ? (
            <NodoDetailPanel
              nodo={currentNodo}
              allNodos={nodos}
              members={members}
              onEdit={handleEdit}
              onDuplicate={duplicateNodo}
              onDelete={handleDelete}
              onAddMembers={addMembersToNodo}
              onRemoveMembers={removeMembersFromNodo}
              onMoveMembers={moveMembersToNodo}
              onUpdateMemberRole={updateMemberRole}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-white/20">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                style={{ background: 'rgba(139,92,246,0.08)' }}>🔬</div>
              <div className="text-center">
                <p className="text-sm font-medium text-white/30">Selecciona un nodo</p>
                <p className="text-xs mt-1 text-white/15">para ver y gestionar sus miembros</p>
              </div>
              <button onClick={handleCreate}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium border border-white/10 text-white/40 hover:border-[#8B5CF6]/40 hover:text-[#8B5CF6] transition-colors">
                <FiPlus size={12} /> Crear nodo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {formModal && (
          <NodoFormModal
            open
            initial={formModal.nodo}
            parentId={formModal.parentId}
            parentName={formModal.parentName}
            allNodos={nodos}
            onClose={() => setFormModal(null)}
            onSave={handleFormSave}
          />
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDeleteConfirm(null)}>
            <motion.div className="w-full max-w-sm rounded-2xl p-5 space-y-4"
              style={{ background: 'rgba(12,6,8,0.98)', border: '1px solid rgba(255,255,255,0.08)' }}
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ background: `${deleteConfirm.color}15` }}>{deleteConfirm.icono}</div>
                <div>
                  <p className="text-sm font-semibold text-white">Eliminar "{deleteConfirm.nombre}"</p>
                  <p className="text-xs text-white/40">Los sub-nodos se moverán al padre. Los miembros serán desvinculados.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2 rounded-lg text-xs border border-white/10 text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors">
                  Cancelar
                </button>
                <button onClick={handleConfirmDelete}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold text-white bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 transition-colors">
                  Eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
