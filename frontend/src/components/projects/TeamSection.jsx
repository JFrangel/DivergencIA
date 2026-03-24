import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiUserPlus, FiShield, FiStar, FiX, FiSearch, FiAlertTriangle, FiExternalLink, FiUser, FiChevronDown } from 'react-icons/fi'
import { TbCrown } from 'react-icons/tb'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import Avatar from '../ui/Avatar'
import Badge from '../ui/Badge'

const roleIcon = {
  lider:    <FiStar size={12} className="text-[var(--c-primary)]" />,
  admin:    <FiShield size={12} className="text-[var(--c-primary)]" />,
}

const ROLES = [
  { value: 'lider', label: 'Líder' },
  { value: 'investigador', label: 'Investigador' },
  { value: 'colaborador', label: 'Colaborador' },
  { value: 'asesor', label: 'Asesor' },
  { value: 'coordinador', label: 'Coordinador' },
  { value: 'tesista', label: 'Tesista' },
  { value: 'auxiliar', label: 'Auxiliar' },
  { value: 'desarrollador', label: 'Desarrollador' },
  { value: 'analista', label: 'Analista' },
  { value: 'diseñador', label: 'Diseñador' },
  { value: 'documentador', label: 'Documentador' },
  { value: 'revisor', label: 'Revisor' },
  { value: 'ponente', label: 'Ponente' },
  { value: 'mentor', label: 'Mentor' },
  { value: 'gestor', label: 'Gestor' },
]

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', damping: 25, stiffness: 350 } },
  exit: { opacity: 0, scale: 0.95, y: 10, transition: { duration: 0.15 } },
}

/* ─── Invite Modal ─── */
function InviteModal({ open, onClose, members, onAddMember }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedRole, setSelectedRole] = useState('colaborador')
  const [inviting, setInviting] = useState(null)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  const memberIds = new Set(members.map(m => m.usuario?.id).filter(Boolean))

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) { setResults([]); return }

    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, foto_url, area_investigacion')
        .ilike('nombre', `%${query.trim()}%`)
        .limit(10)

      if (!error) {
        setResults((data || []).filter(u => !memberIds.has(u.id)))
      }
      setSearching(false)
    }, 300)

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, members])

  const handleInvite = async (user) => {
    setInviting(user.id)
    const result = await onAddMember(user.id, selectedRole)
    setInviting(null)
    if (!result?.error) {
      setResults(r => r.filter(u => u.id !== user.id))
    }
  }

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[var(--c-bg-card,#0d0a0e)] p-6 shadow-2xl"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 rounded-lg p-1.5 text-white/30 transition-colors hover:bg-white/5 hover:text-white/60"
            >
              <FiX size={16} />
            </button>

            <h2 className="mb-4 text-lg font-semibold text-white font-title">
              Invitar miembro
            </h2>

            {/* Search */}
            <div className="relative mb-3">
              <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar por nombre..."
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-4 text-sm text-white placeholder-white/25 outline-none transition-colors focus:border-[var(--c-primary)]/40 focus:ring-1 focus:ring-[var(--c-primary)]/20"
              />
            </div>

            {/* Role selector */}
            <div className="mb-4">
              <span className="text-xs text-white/40 block mb-1.5">Rol:</span>
              <div className="flex gap-1.5 flex-wrap">
                {ROLES.map(r => (
                  <button
                    key={r.value}
                    onClick={() => setSelectedRole(r.value)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                      selectedRole === r.value
                        ? 'bg-[var(--c-primary)]/20 text-[var(--c-primary)] border border-[var(--c-primary)]/30'
                        : 'border border-white/10 bg-white/5 text-white/40 hover:text-white/60'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Results */}
            <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
              {searching && (
                <p className="py-6 text-center text-xs text-white/25">Buscando...</p>
              )}

              {!searching && query.trim() && results.length === 0 && (
                <p className="py-6 text-center text-xs text-white/25">
                  No se encontraron usuarios
                </p>
              )}

              {!searching && results.map(u => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.05]"
                >
                  <Avatar name={u.nombre} src={u.foto_url} area={u.area_investigacion} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{u.nombre}</p>
                    {u.area_investigacion && (
                      <p className="truncate text-xs text-white/30">{u.area_investigacion}</p>
                    )}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    disabled={inviting === u.id}
                    onClick={() => handleInvite(u)}
                    className="shrink-0 rounded-lg bg-[var(--c-primary)]/15 px-3 py-1.5 text-xs font-medium text-[var(--c-primary)] transition-colors hover:bg-[var(--c-primary)]/25 disabled:opacity-50"
                  >
                    {inviting === u.id ? 'Agregando...' : 'Invitar'}
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─── Remove Confirmation Dialog ─── */
function RemoveConfirmDialog({ open, memberName, onConfirm, onCancel, removing }) {
  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          variants={overlayVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onCancel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-[var(--c-bg-card,#0d0a0e)] p-6 shadow-2xl"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
                <FiAlertTriangle size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Remover miembro</h3>
                <p className="text-xs text-white/40">Esta accion se puede deshacer</p>
              </div>
            </div>

            <p className="mb-5 text-sm text-white/50">
              Estas seguro de que quieres remover a{' '}
              <span className="font-medium text-white">{memberName}</span> del proyecto?
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={onCancel}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/60 transition-colors hover:bg-white/10"
              >
                Cancelar
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={removing}
                onClick={onConfirm}
                className="rounded-lg bg-red-500/15 px-4 py-2 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/25 disabled:opacity-50"
              >
                {removing ? 'Removiendo...' : 'Remover'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const MAX_VISIBLE = 3

/* ─── Member Manage Modal ─── */
function MemberManageModal({ open, member, onClose, onUpdateRole, onRemove, creadorId }) {
  const [selectedRoles, setSelectedRoles] = useState([])
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState(false)

  useEffect(() => {
    if (member) {
      const existing = member.roles?.length ? member.roles : (member.rol_equipo ? [member.rol_equipo] : [])
      setSelectedRoles(existing)
      setConfirmRemove(false)
    }
  }, [member])

  const toggleRole = (val) => {
    setSelectedRoles(prev =>
      prev.includes(val) ? prev.filter(r => r !== val) : [...prev, val]
    )
  }

  if (!open || !member) return null
  const { usuario } = member
  const isCreator = creadorId && usuario.id === creadorId

  const handleSaveRole = async () => {
    if (!onUpdateRole) return
    setSaving(true)
    // Pass first role as rol_equipo for backward compat + full array
    const primaryRole = selectedRoles[0] ?? 'colaborador'
    await onUpdateRole(usuario.id, primaryRole, selectedRoles)
    setSaving(false)
    onClose()
  }

  const handleRemove = async () => {
    setRemoving(true)
    await onRemove(usuario.id)
    setRemoving(false)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            className="relative w-full max-w-sm rounded-2xl border border-white/10 p-6 shadow-2xl space-y-5"
            style={{ background: 'rgba(12,6,8,0.97)' }}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors">
              <FiX size={15} />
            </button>

            {/* Member info */}
            <div className="flex items-center gap-3">
              <Avatar name={usuario.nombre} src={usuario.foto_url} area={usuario.area_investigacion} size="lg" isFounded={usuario.es_fundador} />
              <div className="min-w-0">
                <p className="font-semibold text-white">{usuario.nombre}</p>
                {usuario.carrera && <p className="text-xs text-white/40 truncate">{usuario.carrera}</p>}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {isCreator && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border"
                      style={{ background: 'rgba(252,101,31,0.12)', color: '#FC651F', borderColor: 'rgba(252,101,31,0.25)' }}>
                      <TbCrown size={10} /> Creador
                    </span>
                  )}
                  <Badge rol={member.rol_equipo} size="xs" />
                  {usuario.area_investigacion && <Badge area={usuario.area_investigacion} size="xs" />}
                </div>
              </div>
            </div>

            {/* Role selector — multi-select */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-white/40 font-medium uppercase tracking-wider">
                  Roles en el proyecto
                  {selectedRoles.length > 0 && (
                    <span className="ml-1.5 text-[var(--c-primary)]">({selectedRoles.length})</span>
                  )}
                </p>
                {selectedRoles.length > 0 && (
                  <button
                    onClick={() => setSelectedRoles([])}
                    className="flex items-center gap-1 text-[10px] text-red-400/60 hover:text-red-400 transition-colors"
                  >
                    <FiX size={11} /> Quitar todos
                  </button>
                )}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {ROLES.map(r => {
                  const active = selectedRoles.includes(r.value)
                  return (
                    <button
                      key={r.value}
                      onClick={() => toggleRole(r.value)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all border ${
                        active
                          ? 'bg-[var(--c-primary)]/20 text-[var(--c-primary)] border-[var(--c-primary)]/30'
                          : 'border-white/10 bg-white/5 text-white/40 hover:text-white/60'
                      }`}
                    >
                      {r.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleSaveRole}
                disabled={saving}
                className="flex-1 rounded-lg py-2 text-sm font-medium text-white transition-all bg-[var(--c-primary)]/20 hover:bg-[var(--c-primary)]/30 border border-[var(--c-primary)]/20 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Guardar rol'}
              </button>
              <Link
                to={`/members/${usuario.id}`}
                onClick={onClose}
                className="flex items-center justify-center w-9 h-9 rounded-lg border border-white/10 bg-white/5 text-white/40 hover:text-white/70 transition-colors"
                title="Ver perfil"
              >
                <FiExternalLink size={14} />
              </Link>
            </div>

            {/* Remove section */}
            {!confirmRemove ? (
              <button
                onClick={() => setConfirmRemove(true)}
                className="w-full text-xs text-red-400/60 hover:text-red-400 transition-colors pt-1 border-t border-white/[0.06]"
              >
                Quitar del proyecto
              </button>
            ) : (
              <div className="pt-1 border-t border-white/[0.06] space-y-2">
                <p className="text-xs text-white/50 text-center">¿Confirmar quitar a <span className="text-white font-medium">{usuario.nombre}</span>?</p>
                <div className="flex gap-2">
                  <button onClick={() => setConfirmRemove(false)} className="flex-1 rounded-lg py-1.5 text-xs border border-white/10 text-white/40 hover:text-white/60 transition-colors">
                    Cancelar
                  </button>
                  <button
                    onClick={handleRemove}
                    disabled={removing}
                    className="flex-1 rounded-lg py-1.5 text-xs bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors disabled:opacity-50"
                  >
                    {removing ? 'Quitando...' : 'Sí, quitar'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ─── TeamSection ─── */
export default function TeamSection({
  members = [],
  canInvite = false,
  isOwner = false,
  creadorId = null,
  onAddMember,
  onRemoveMember,
  onUpdateRole,
}) {
  const [showInvite, setShowInvite] = useState(false)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [removing, setRemoving] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [manageMember, setManageMember] = useState(null) // member object to manage

  const handleRemove = async () => {
    if (!removeTarget || !onRemoveMember) return
    setRemoving(true)
    await onRemoveMember(removeTarget.id)
    setRemoving(false)
    setRemoveTarget(null)
  }

  const visible = expanded ? members : members.slice(0, MAX_VISIBLE)
  const hiddenCount = members.length - MAX_VISIBLE

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white font-title">
          Equipo
          <span className="ml-2 text-sm font-normal text-white/30">
            {members.length}
          </span>
        </h2>

        {canInvite && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowInvite(true)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60 transition-colors hover:border-[var(--c-primary)]/40 hover:text-[var(--c-primary)]"
          >
            <FiUserPlus size={13} />
            Añadir
          </motion.button>
        )}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((member, i) => {
          const { usuario } = member
          if (!usuario) return null
          const isFounder = usuario.es_fundador
          const isCreator = creadorId && usuario.id === creadorId
          const memberRoles = member.roles?.length ? member.roles : (member.rol_equipo ? [member.rol_equipo] : [])

          return (
            <motion.div
              key={usuario.id}
              className="h-full"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <div className="relative group">
                {/* Manage indicator — visible to owner/admin on hover */}
                {isOwner && (
                  <span className="absolute -top-1.5 -right-1.5 z-10 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium border border-white/10 bg-[#0d0a0e] text-white/30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <FiUser size={8} /> Gestionar
                  </span>
                )}

                {/* Clickable card — opens manage modal for owners, goes to profile for others */}
                {isOwner ? (
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    onClick={() => setManageMember(member)}
                    className={`flex h-full items-center gap-3 rounded-2xl border bg-white/[0.03] p-3.5 backdrop-blur-xl transition-shadow cursor-pointer ${
                      isFounder
                        ? 'border-[#F59E0B]/25 hover:shadow-[0_0_20px_rgba(245,158,11,0.12)]'
                        : 'border-white/[0.06] hover:shadow-[0_0_20px_rgba(252,101,31,0.08)]'
                    }`}
                  >
                    {isFounder && (
                      <span className="absolute -top-2 -left-1 text-[#F59E0B] drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]">
                        <FiStar size={14} fill="currentColor" />
                      </span>
                    )}
                    <Avatar name={usuario.nombre} src={usuario.foto_url} area={usuario.area_investigacion} size="md" isFounded={isFounder} />
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium text-white group-hover:text-[var(--c-primary)] transition-colors">{usuario.nombre}</span>
                        {memberRoles.includes('lider') && roleIcon.lider}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {isCreator && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border"
                            style={{ background: 'rgba(252,101,31,0.12)', color: '#FC651F', borderColor: 'rgba(252,101,31,0.25)' }}>
                            <TbCrown size={10} /> Creador
                          </span>
                        )}
                        {memberRoles.map(r => <Badge key={r} rol={r} size="xs" />)}
                        {usuario.area_investigacion && <Badge area={usuario.area_investigacion} size="xs" />}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <Link to={`/members/${usuario.id}`}>
                    <motion.div
                      whileHover={{ scale: 1.03 }}
                      className={`flex h-full items-center gap-3 rounded-2xl border bg-white/[0.03] p-3.5 backdrop-blur-xl transition-shadow ${
                        isFounder
                          ? 'border-[#F59E0B]/25 hover:shadow-[0_0_20px_rgba(245,158,11,0.12)]'
                          : 'border-white/[0.06] hover:shadow-[0_0_20px_rgba(252,101,31,0.08)]'
                      }`}
                    >
                      {isFounder && (
                        <span className="absolute -top-2 -left-1 text-[#F59E0B] drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]">
                          <FiStar size={14} fill="currentColor" />
                        </span>
                      )}
                      <Avatar name={usuario.nombre} src={usuario.foto_url} area={usuario.area_investigacion} size="md" isFounded={isFounder} />
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium text-white group-hover:text-[var(--c-primary)] transition-colors">{usuario.nombre}</span>
                          {memberRoles.includes('lider') && roleIcon.lider}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {memberRoles.map(r => <Badge key={r} rol={r} size="xs" />)}
                          {usuario.area_investigacion && <Badge area={usuario.area_investigacion} size="xs" />}
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                )}
              </div>
            </motion.div>
          )
        })}

        {/* +N expand tile */}
        {!expanded && hiddenCount > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: MAX_VISIBLE * 0.06 }}
            onClick={() => setExpanded(true)}
            className="flex items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-3.5 text-sm font-medium text-white/40 transition-all hover:border-white/20 hover:text-white/60 hover:bg-white/[0.04]"
          >
            +{hiddenCount} más
          </motion.button>
        )}

        {/* Collapse button when expanded */}
        {expanded && members.length > MAX_VISIBLE && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            onClick={() => setExpanded(false)}
            className="flex items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-3.5 text-xs text-white/30 transition-all hover:text-white/50"
          >
            Ver menos
          </motion.button>
        )}
      </div>

      {members.length === 0 && (
        <p className="py-8 text-center text-sm text-white/25">
          No hay miembros en este proyecto todavia.
        </p>
      )}

      {/* Invite Modal */}
      <InviteModal
        open={showInvite}
        onClose={() => setShowInvite(false)}
        members={members}
        onAddMember={onAddMember}
      />

      {/* Member Manage Modal */}
      <MemberManageModal
        open={!!manageMember}
        member={manageMember}
        onClose={() => setManageMember(null)}
        onUpdateRole={onUpdateRole}
        onRemove={onRemoveMember}
        creadorId={creadorId}
      />

      {/* Remove Confirmation (kept for legacy X button, now unused but harmless) */}
      <RemoveConfirmDialog
        open={!!removeTarget}
        memberName={removeTarget?.nombre || ''}
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
        removing={removing}
      />
    </section>
  )
}
