import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiHash, FiMessageSquare, FiUsers, FiZap, FiLock, FiUnlock,
  FiX, FiExternalLink, FiSettings, FiShield, FiChevronDown, FiTrash2, FiAlertTriangle,
  FiPhone, FiVideo, FiPhoneOff, FiClock,
} from 'react-icons/fi'
import { useChat } from '../../hooks/useChat'
import { useCallContext } from '../../context/CallContext'
import { useAuth } from '../../context/AuthContext'
import { useCallHistory } from '../../hooks/useCallHistory'
import MessageBubble from './MessageBubble'
import ChatInput from './ChatInput'
import Spinner from '../ui/Spinner'
import Avatar from '../ui/Avatar'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

const TIPO_META = {
  global:  { icon: FiHash,          color: '#00D1FF', label: 'Canal' },
  directo: { icon: FiMessageSquare, color: '#22c55e', label: 'DM' },
  grupo:   { icon: FiUsers,         color: '#8B5CF6', label: 'Grupo' },
  nodo:    { icon: FiZap,           color: '#FC651F', label: 'Nodo' },
}

const ROL_CANAL_OPTIONS = [
  { value: 'admin',      label: 'Admin',      color: '#FC651F', icon: '👑' },
  { value: 'moderador',  label: 'Moderador',  color: '#8B5CF6', icon: '🛡️' },
  { value: 'decano',     label: 'Decano',     color: '#F59E0B', icon: '🎓' },
  { value: 'miembro',    label: 'Miembro',    color: '#6b7280', icon: '👤' },
]

function RolBadge({ rol }) {
  const opt = ROL_CANAL_OPTIONS.find(o => o.value === rol) || ROL_CANAL_OPTIONS[3]
  if (rol === 'miembro') return null
  return (
    <span
      className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0"
      style={{ background: `${opt.color}20`, color: opt.color }}
    >
      {opt.icon} {opt.label}
    </span>
  )
}

/* ── Members panel ─────────────────────────────────────────────────────────── */
function MembersPanel({ members, onClose, currentUserId, onGoToProfile }) {
  return (
    <motion.div
      className="w-52 shrink-0 flex flex-col border-l border-white/[0.06] overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.01)' }}
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 208, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.25 }}
    >
      <div className="flex items-center justify-between px-3 py-3 border-b border-white/[0.06]">
        <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
          Miembros ({members.length})
        </span>
        <button onClick={onClose} className="text-white/25 hover:text-white/60 p-0.5 transition-colors">
          <FiX size={13} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {members.map(m => (
          <button
            key={m.id}
            onClick={() => onGoToProfile(m.id)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.06] transition-colors text-left group"
          >
            <Avatar name={m.nombre} src={m.foto_url} area={m.area_investigacion} size="xs" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 flex-wrap">
                <p className="text-xs text-white/70 truncate group-hover:text-white/90 transition-colors">
                  {m.nombre}
                  {m.id === currentUserId && <span className="text-white/25 ml-1">(tú)</span>}
                </p>
                <RolBadge rol={m.rol_canal} />
              </div>
              {m.area_investigacion && (
                <p className="text-[10px] text-white/25 truncate">{m.area_investigacion}</p>
              )}
            </div>
            <FiExternalLink size={10} className="text-white/0 group-hover:text-white/30 transition-colors shrink-0" />
          </button>
        ))}
        {members.length === 0 && (
          <p className="text-xs text-white/20 text-center py-6">Sin miembros</p>
        )}
      </div>
    </motion.div>
  )
}

/* ── Settings panel ────────────────────────────────────────────────────────── */
function SettingsPanel({ channel, members, currentUserId, onClose, onUpdateRol, onTogglePrivacy, isPrivado, onDeleteChannel, canDelete, onUpdateChannel }) {
  const [saving, setSaving] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editName, setEditName] = useState(channel?.nombre || '')
  const [editDesc, setEditDesc] = useState(channel?.descripcion || '')
  const [editWelcome, setEditWelcome] = useState(channel?.welcome_msg || '')
  const [slowmode, setSlowmode] = useState(channel?.slowmode_seconds || 0)

  const handleRolChange = async (userId, rol) => {
    setSaving(userId)
    await onUpdateRol(userId, rol)
    setSaving(null)
  }

  const handlePrivacy = async () => {
    setSaving('privacy')
    await onTogglePrivacy(!isPrivado)
    setSaving(null)
    toast.success(isPrivado ? 'Canal ahora es público' : 'Canal ahora es privado')
  }

  const handleSaveInfo = async () => {
    setSaving('info')
    await onUpdateChannel({ nombre: editName.trim(), descripcion: editDesc.trim(), welcome_msg: editWelcome.trim(), slowmode_seconds: slowmode })
    setSaving(null)
    toast.success('Canal actualizado')
  }

  return (
    <motion.div
      className="w-64 shrink-0 flex flex-col border-l border-white/[0.06] overflow-hidden"
      style={{ background: 'rgba(10,5,8,0.98)' }}
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 256, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.25 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <FiSettings size={13} className="text-white/40" />
          <span className="text-[11px] font-semibold text-white/60 uppercase tracking-wider">Config. del canal</span>
        </div>
        <button onClick={onClose} className="text-white/25 hover:text-white/60 p-0.5 transition-colors">
          <FiX size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-3 space-y-5 px-4">
        {/* Channel info */}
        <div className="space-y-2.5">
          <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Información</p>
          <div>
            <label className="text-[10px] text-white/25 mb-1 block">Nombre</label>
            <input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg text-xs text-white bg-white/[0.04] border border-white/[0.08] outline-none focus:border-[#FC651F]/30 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] text-white/25 mb-1 block">Descripción</label>
            <input
              value={editDesc}
              onChange={e => setEditDesc(e.target.value)}
              placeholder="Descripción del canal..."
              className="w-full px-2.5 py-1.5 rounded-lg text-xs text-white bg-white/[0.04] border border-white/[0.08] outline-none focus:border-[#FC651F]/30 transition-colors placeholder-white/15"
            />
          </div>
          <div>
            <label className="text-[10px] text-white/25 mb-1 block">Mensaje de bienvenida</label>
            <textarea
              value={editWelcome}
              onChange={e => setEditWelcome(e.target.value)}
              rows={2}
              placeholder="Se muestra al entrar al canal..."
              className="w-full px-2.5 py-1.5 rounded-lg text-xs text-white bg-white/[0.04] border border-white/[0.08] outline-none focus:border-[#FC651F]/30 transition-colors placeholder-white/15 resize-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-white/25 mb-1 block">Modo lento (segundos entre mensajes)</label>
            <div className="flex items-center gap-2">
              {[0, 5, 10, 30, 60].map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSlowmode(s)}
                  className="px-2 py-1 rounded text-[10px] font-medium transition-all"
                  style={slowmode === s
                    ? { background: 'rgba(252,101,31,0.2)', color: '#FC651F', border: '1px solid rgba(252,101,31,0.3)' }
                    : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {s === 0 ? 'Off' : `${s}s`}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleSaveInfo}
            disabled={saving === 'info' || !editName.trim()}
            className="w-full py-1.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-40 flex items-center justify-center gap-1.5"
            style={{ background: 'linear-gradient(135deg, #FC651F, #FC651F99)' }}
          >
            {saving === 'info' ? <Spinner size="xs" /> : 'Guardar cambios'}
          </button>
        </div>

        {/* Privacy toggle */}
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-semibold">Privacidad</p>
          <button
            onClick={handlePrivacy}
            disabled={saving === 'privacy'}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl border transition-all text-left"
            style={isPrivado
              ? { background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }
              : { background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}
          >
            <span style={{ color: isPrivado ? '#EF4444' : '#22c55e' }}>
              {saving === 'privacy' ? <Spinner size="xs" /> : isPrivado ? <FiLock size={14} /> : <FiUnlock size={14} />}
            </span>
            <div className="flex-1">
              <p className="text-xs font-medium" style={{ color: isPrivado ? '#EF4444' : '#22c55e' }}>
                {isPrivado ? 'Privado' : 'Público (solo lectura)'}
              </p>
              <p className="text-[9px] text-white/25 mt-0.5 leading-relaxed">
                {isPrivado
                  ? 'Solo miembros pueden ver el chat.'
                  : 'No-miembros pueden leer, pero no escribir.'}
              </p>
            </div>
            <div
              className="w-9 h-5 rounded-full relative shrink-0"
              style={{ background: isPrivado ? '#EF4444' : '#22c55e' }}
            >
              <div
                className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                style={{ left: isPrivado ? '18px' : '2px' }}
              />
            </div>
          </button>
        </div>

        {/* Danger zone */}
        {canDelete && (
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-semibold flex items-center gap-1.5">
              <FiAlertTriangle size={10} className="text-red-500/60" /> Zona peligrosa
            </p>
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-medium transition-all"
                style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#EF4444' }}
              >
                <FiTrash2 size={12} /> Eliminar canal
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={async () => { setSaving('delete'); await onDeleteChannel(); setSaving(null) }}
                  disabled={saving === 'delete'}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: '#EF4444', color: 'white' }}
                >
                  {saving === 'delete' ? <Spinner size="xs" /> : <><FiTrash2 size={11} /> Confirmar</>}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="px-3 py-2 rounded-xl text-xs text-white/40 hover:text-white/70 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Member roles */}
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 font-semibold flex items-center gap-1.5">
            <FiShield size={10} /> Roles de miembros
          </p>
          <div className="space-y-1.5">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-2">
                <Avatar name={m.nombre} src={m.foto_url} area={m.area_investigacion} size="xs" />
                <p className="text-xs text-white/60 flex-1 truncate min-w-0">{m.nombre}</p>
                {m.id === currentUserId ? (
                  <span className="text-[9px] text-white/20 italic shrink-0">tú</span>
                ) : (
                  <div className="relative shrink-0">
                    <select
                      value={m.rol_canal || 'miembro'}
                      onChange={e => handleRolChange(m.id, e.target.value)}
                      disabled={saving === m.id}
                      className="appearance-none text-[10px] px-2 py-1 pr-5 rounded-lg border outline-none transition-colors cursor-pointer"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.6)',
                      }}
                    >
                      {ROL_CANAL_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
                      ))}
                    </select>
                    <FiChevronDown size={9} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Call History Panel ────────────────────────────────────────────────────── */
function CallHistoryPanel({ canalId, onClose }) {
  const { history, loading } = useCallHistory(canalId)

  const fmtDuration = (s) => {
    if (!s) return '< 1 min'
    const m = Math.floor(s / 60)
    const sec = s % 60
    if (m === 0) return `${sec}s`
    return sec > 0 ? `${m}m ${sec}s` : `${m}m`
  }

  const fmtDate = (iso) => {
    const d = new Date(iso)
    const today = new Date()
    const yesterday = new Date(Date.now() - 86400000)
    if (d.toDateString() === today.toDateString())
      return `Hoy ${d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`
    if (d.toDateString() === yesterday.toDateString())
      return `Ayer ${d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <motion.div
      className="w-60 shrink-0 flex flex-col border-l border-white/[0.06] overflow-hidden"
      style={{ background: 'rgba(10,5,8,0.98)' }}
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 240, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.25 }}
    >
      <div className="flex items-center justify-between px-3 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <FiClock size={12} className="text-white/40" />
          <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">
            Historial de llamadas
          </span>
        </div>
        <button onClick={onClose} className="text-white/25 hover:text-white/60 p-0.5 transition-colors">
          <FiX size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        {loading ? (
          <div className="flex justify-center py-8"><Spinner size="sm" /></div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2 px-4 text-center">
            <FiPhone size={24} className="text-white/10" />
            <p className="text-xs text-white/20">Sin llamadas registradas</p>
          </div>
        ) : (
          <div className="space-y-px px-2">
            {history.map(call => {
              const parts = Array.isArray(call.participantes) ? call.participantes : []
              const isVideo = call.tipo === 'video'
              return (
                <div
                  key={call.id}
                  className="px-2.5 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors"
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: isVideo ? 'rgba(139,92,246,0.15)' : 'rgba(34,197,94,0.12)' }}
                    >
                      {isVideo
                        ? <FiVideo size={12} style={{ color: '#8B5CF6' }} />
                        : <FiPhone size={12} style={{ color: '#22c55e' }} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-white/75">
                        {isVideo ? 'Videollamada' : 'Llamada de voz'}
                      </p>
                      <p className="text-[10px] text-white/35 mt-0.5">{fmtDate(call.iniciada_en)}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded-md font-semibold"
                          style={{ background: 'rgba(0,209,255,0.1)', color: '#00D1FF' }}
                        >
                          {fmtDuration(call.duracion_s)}
                        </span>
                        <span className="text-[9px] text-white/25">
                          {parts.length + 1} participante{parts.length !== 0 ? 's' : ''}
                        </span>
                      </div>
                      {call.iniciador && (
                        <p className="text-[9px] text-white/25 mt-1 truncate">
                          Iniciado por {call.iniciador.nombre}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ── Main ChatArea ─────────────────────────────────────────────────────────── */
export default function ChatArea({ channel, puedeEscribir }) {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const { messages, loading, sending, members, sendMessage, deleteMessage, updateMessage, updateMemberRolCanal, updateChannelPrivacy, deleteChannel, updateChannel } = useChat(channel?.id)
  const { callHook, setCallChannel, startCallInChannel } = useCallContext()

  // Register current channel with the global call context
  useEffect(() => { setCallChannel(channel?.id ?? null) }, [channel?.id, setCallChannel])
  const bottomRef = useRef(null)
  const prevMsgCount = useRef(0)
  const messageRefs = useRef({})

  const scrollToMessage = (id) => {
    const el = messageRefs.current[id]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.style.background = 'rgba(252,101,31,0.1)'
    setTimeout(() => { if (el) el.style.background = '' }, 1500)
  }
  const [showMembers, setShowMembers] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [isPrivado, setIsPrivado] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)

  const meta = TIPO_META[channel?.tipo] || TIPO_META.global
  const isDM = channel?.tipo === 'directo'
  const dmPartner = channel?.dm_partner

  // Determine if current user can manage this channel
  const myMembership = members.find(m => m.id === user?.id)
  const canManage = isAdmin
    || channel?.creado_por === user?.id
    || myMembership?.rol_canal === 'admin'

  const handleTogglePrivacy = async (newValue) => {
    setIsPrivado(newValue)
    await updateChannelPrivacy(newValue)
    // Also update linked nodo if it exists
    if (channel?.nodo_id) {
      await supabase.from('nodos').update({ privado: newValue }).eq('id', channel.nodo_id)
    }
  }

  const goToProfile = (userId) => {
    if (userId === user?.id) navigate('/profile')
    else navigate(`/members/${userId}`)
  }

  // Auto-scroll on new messages
  useEffect(() => {
    if (messages.length !== prevMsgCount.current) {
      bottomRef.current?.scrollIntoView({ behavior: messages.length - prevMsgCount.current === 1 ? 'smooth' : 'instant' })
      prevMsgCount.current = messages.length
    }
  }, [messages])

  // Close settings when channel changes, clear reply
  useEffect(() => { setShowSettings(false); setShowMembers(false); setShowHistory(false); setReplyingTo(null) }, [channel?.id])

  // Sync isPrivado from channel data — always called (hooks must be unconditional)
  useEffect(() => {
    if (!channel?.id) return
    supabase.from('canales').select('privado').eq('id', channel.id).single()
      .then(({ data }) => { if (data) setIsPrivado(data.privado ?? false) })
  }, [channel?.id])

  if (!channel) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white/20">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.03)' }}>
          <FiMessageSquare size={28} />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-white/30">Selecciona un canal</p>
          <p className="text-xs text-white/15 mt-1">para comenzar a chatear</p>
        </div>
      </div>
    )
  }

  const canWrite = puedeEscribir || isAdmin
  const Icon = meta.icon

  // Wrap sendMessage to include replyToId and clear reply state
  const handleSend = async (contenido, tipo = 'texto', fileUrl = null) => {
    const ok = await sendMessage(contenido, null, tipo, fileUrl, replyingTo?.id)
    if (ok !== false) setReplyingTo(null)
    return ok
  }

  return (
    <div className="flex flex-1 min-w-0 overflow-hidden">
      {/* Chat column */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Channel header — Discord style */}
        <div
          className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.06] shrink-0"
          style={{ background: 'rgba(6,3,4,0.6)', backdropFilter: 'blur(8px)' }}
        >
          {isDM && dmPartner ? (
            <button
              onClick={() => goToProfile(dmPartner.id)}
              className="flex items-center gap-2.5 flex-1 min-w-0 text-left group"
            >
              <div className="relative shrink-0">
                <Avatar name={dmPartner.nombre} src={dmPartner.foto_url} area={dmPartner.area_investigacion} size="sm" />
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#22c55e] border-2 border-[#060304]" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-semibold text-white/90 truncate">{dmPartner.nombre}</h3>
                  <FiExternalLink size={10} className="text-white/0 group-hover:text-white/40 transition-colors shrink-0" />
                </div>
                <p className="text-[10px] text-white/25 truncate">
                  {dmPartner.area_investigacion || 'Mensaje directo'}
                </p>
              </div>
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-lg leading-none" style={{ color: meta.color }}>
                  {channel.tipo === 'global' ? '#' : channel.tipo === 'nodo' ? '⚡' : '👥'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-white/90 truncate">
                    {channel.nombre || 'Canal'}
                  </h3>
                  {isPrivado && (
                    <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider shrink-0"
                      style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}>
                      <FiLock size={7} /> Privado
                    </span>
                  )}
                </div>
                {channel.descripcion && (
                  <p className="text-[10px] text-white/25 truncate">{channel.descripcion}</p>
                )}
              </div>
            </>
          )}

          {/* Right-side actions */}
          <div className="flex items-center gap-1 shrink-0 ml-auto">
            {!canWrite && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px]"
                style={{ background: 'rgba(139,92,246,0.12)', color: '#8B5CF6' }}>
                <FiLock size={9} /> Solo lectura
              </div>
            )}

            {/* Call buttons + presence */}
            {callHook.callState === 'in-call' ? (
              <button
                onClick={callHook.endCall}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}
                title="Finalizar llamada"
              >
                <FiPhoneOff size={13} />
                <span className="hidden sm:inline">En llamada · {callHook.participants.length + 1}</span>
              </button>
            ) : (
              <>
                {/* Presence pill: others are in a call */}
                {callHook.callPresence.length > 0 && (
                  <button
                    onClick={() => startCallInChannel(channel.id, 'audio')}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all hover:bg-green-500/10"
                    style={{ background: 'rgba(34,197,94,0.08)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}
                    title={`Unirse a la llamada (${callHook.callPresence.map(p => p.name).join(', ')})`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    <span>{callHook.callPresence.length} en llamada</span>
                    <FiPhone size={10} />
                  </button>
                )}
                <button
                  onClick={() => startCallInChannel(channel.id, 'audio')}
                  className="p-1.5 rounded-lg transition-all hover:bg-white/[0.06]"
                  style={{ color: 'rgba(255,255,255,0.25)' }}
                  title="Llamada de voz"
                >
                  <FiPhone size={15} />
                </button>
                <button
                  onClick={() => startCallInChannel(channel.id, 'video')}
                  className="p-1.5 rounded-lg transition-all hover:bg-white/[0.06]"
                  style={{ color: 'rgba(255,255,255,0.25)' }}
                  title="Videollamada"
                >
                  <FiVideo size={15} />
                </button>
                <button
                  onClick={() => { setShowHistory(p => !p); setShowMembers(false); setShowSettings(false) }}
                  className="p-1.5 rounded-lg transition-all"
                  style={showHistory
                    ? { background: 'rgba(0,209,255,0.12)', color: '#00D1FF' }
                    : { color: 'rgba(255,255,255,0.25)' }}
                  title="Historial de llamadas"
                >
                  <FiClock size={15} />
                </button>
              </>
            )}

            {canManage && !isDM && channel.tipo !== 'global' && (
              <button
                onClick={() => { setShowSettings(p => !p); setShowMembers(false); setShowHistory(false) }}
                className="p-1.5 rounded-lg transition-all"
                style={showSettings
                  ? { background: 'rgba(252,101,31,0.15)', color: '#FC651F' }
                  : { color: 'rgba(255,255,255,0.2)' }}
                title="Configuración"
              >
                <FiSettings size={15} />
              </button>
            )}

            <button
              onClick={() => { setShowMembers(p => !p); setShowSettings(false); setShowHistory(false) }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
              style={showMembers
                ? { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.75)' }
                : { color: 'rgba(255,255,255,0.25)' }}
              title="Miembros"
            >
              <FiUsers size={14} />
              <span>{members.length}</span>
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto py-2 scroll-smooth">
          {loading ? (
            <div className="flex justify-center py-10">
              <Spinner size="sm" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: `${meta.color}10`, border: `1px solid ${meta.color}20` }}>
                <Icon size={24} style={{ color: meta.color, opacity: 0.5 }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white/40">
                  {channel.tipo === 'global' ? `Inicio de #${channel.nombre}` : 'Aún no hay mensajes'}
                </p>
                <p className="text-xs text-white/20 mt-1">
                  {canWrite ? 'Sé el primero en escribir algo.' : 'Este canal está en modo lectura.'}
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => {
              const prev = messages[i - 1]
              // Group if same author within 7 min
              const prevSame = prev && prev.autor_id === msg.autor_id &&
                (new Date(msg.created_at) - new Date(prev.created_at)) < 7 * 60 * 1000
              // Date separator
              const msgDate = new Date(msg.created_at).toDateString()
              const prevDate = prev ? new Date(prev.created_at).toDateString() : null
              const showDateSep = !prev || msgDate !== prevDate

              const authorMember = members.find(m => m.id === msg.autor_id)
              const replyMessage = msg.reply_to ? messages.find(m => m.id === msg.reply_to) : null

              const today = new Date().toDateString()
              const yesterday = new Date(Date.now() - 86400000).toDateString()
              const dateLabel = msgDate === today ? 'Hoy'
                : msgDate === yesterday ? 'Ayer'
                : new Date(msg.created_at).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })

              return (
                <div key={msg.id}>
                  {showDateSep && (
                    <div className="flex items-center gap-3 px-4 my-4">
                      <div className="flex-1 h-px bg-white/[0.06]" />
                      <span className="text-[10px] text-white/25 font-semibold uppercase tracking-wider shrink-0 px-2">
                        {dateLabel}
                      </span>
                      <div className="flex-1 h-px bg-white/[0.06]" />
                    </div>
                  )}
                  <MessageBubble
                    ref={el => { messageRefs.current[msg.id] = el }}
                    message={msg}
                    isOwn={msg.autor_id === user?.id}
                    canDelete={msg.autor_id === user?.id || isAdmin || myMembership?.rol_canal === 'admin' || myMembership?.rol_canal === 'moderador'}
                    onDelete={deleteMessage}
                    onEdit={msg.autor_id === user?.id ? updateMessage : null}
                    onReply={canWrite ? (m) => setReplyingTo(m) : null}
                    onScrollToReply={scrollToMessage}
                    prevSame={prevSame && !showDateSep}
                    memberRolCanal={authorMember?.rol_canal}
                    replyMessage={replyMessage}
                  />
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          sending={sending}
          disabled={!canWrite}
          placeholder={canWrite
            ? `Mensaje en ${channel.tipo === 'global' ? '#' : ''}${channel.nombre || 'este canal'}...`
            : 'No tienes permiso para escribir en este canal'}
          slowmodeSeconds={channel?.slowmode_seconds || 0}
          replyTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
        />
      </div>

      {/* Sidebars */}
      <AnimatePresence>
        {showMembers && (
          <MembersPanel
            members={members}
            onClose={() => setShowMembers(false)}
            currentUserId={user?.id}
            onGoToProfile={goToProfile}
          />
        )}
        {showSettings && (
          <SettingsPanel
            channel={channel}
            members={members}
            currentUserId={user?.id}
            onClose={() => setShowSettings(false)}
            onUpdateRol={updateMemberRolCanal}
            onTogglePrivacy={handleTogglePrivacy}
            isPrivado={isPrivado}
            canDelete={isAdmin || channel?.creado_por === user?.id}
            onDeleteChannel={async () => {
              await deleteChannel()
              setShowSettings(false)
              toast.success('Canal eliminado')
            }}
            onUpdateChannel={updateChannel}
          />
        )}
        {showHistory && (
          <CallHistoryPanel canalId={channel.id} onClose={() => setShowHistory(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}
