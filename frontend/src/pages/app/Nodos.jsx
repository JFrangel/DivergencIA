import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiZap, FiMessageSquare, FiUsers, FiSearch, FiX, FiChevronRight, FiLock, FiExternalLink, FiSend, FiClock,
} from 'react-icons/fi'
import { useNodos } from '../../hooks/useNodos'
import { useChannels } from '../../hooks/useChat'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/ui/Avatar'
import Spinner from '../../components/ui/Spinner'
import { toast } from 'sonner'

/* ── Group channel metadata ────────────────────────────────────────────── */
const GROUP_META = {
  fundadores:     { label: 'Fundadores',            color: '#F59E0B', icon: '👑' },
  investigadores: { label: 'Investigadores Activos', color: '#FC651F', icon: '🔬' },
  egresados:      { label: 'Egresados',              color: '#8B5CF6', icon: '🎓' },
  colaboradores:  { label: 'Colaboradores',          color: '#00D1FF', icon: '🤝' },
  nuevos:         { label: 'Nuevos Miembros',        color: '#22c55e', icon: '🌱' },
  visitantes:     { label: 'Visitantes',             color: '#6b7280', icon: '👁️' },
}

/* ── Nodo detail modal ─────────────────────────────────────────────────── */
function NodoDetailModal({ nodo, isMember, onClose, onEnterChat, joining }) {
  const navigate = useNavigate()
  const color = nodo.color || '#8B5CF6'
  const members = nodo.miembros || []

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-lg rounded-3xl overflow-hidden flex flex-col"
        style={{ background: '#0c0508', border: `1px solid ${color}30`, maxHeight: '85vh' }}
        initial={{ scale: 0.93, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 12 }}
        transition={{ duration: 0.2, type: 'spring', bounce: 0.15 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Color bar */}
        <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${color}, ${color}60)` }} />

        {/* Header */}
        <div className="flex items-start gap-4 p-5 pb-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 text-2xl"
            style={{ background: `${color}15`, border: `1px solid ${color}25` }}
          >
            {nodo.icono || '💬'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white/95">{nodo.displayName || nodo.nombre}</h2>
              {isMember && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                  style={{ background: `${color}20`, color }}>Miembro</span>
              )}
              {nodo.privado && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 bg-white/[0.06] text-white/30">
                  <FiLock size={8} /> Privado
                </span>
              )}
            </div>
            {nodo.descripcion && (
              <p className="text-xs text-white/40 mt-1 leading-relaxed">{nodo.descripcion}</p>
            )}
            <p className="text-[10px] text-white/25 mt-1.5">
              {members.length} miembro{members.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-white/25 hover:text-white/60 hover:bg-white/[0.05] transition-all shrink-0">
            <FiX size={14} />
          </button>
        </div>

        {/* Members grid */}
        <div className="flex-1 overflow-y-auto px-5 pb-2">
          {members.length === 0 ? (
            <p className="text-xs text-white/20 text-center py-8 italic">Sin miembros registrados</p>
          ) : (
            <>
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-2.5">Miembros</p>
              <div className="grid grid-cols-2 gap-2">
                {members.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { navigate(`/members/${m.id}`); onClose() }}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all group"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = `${color}30` }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)' }}
                  >
                    <Avatar name={m.nombre} src={m.foto_url} area={m.area_investigacion} size="sm" className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 flex-wrap">
                        <p className="text-xs font-medium text-white/80 truncate group-hover:text-white/95 transition-colors">
                          {m.nombre}
                        </p>
                        {m.es_fundador && (
                          <span className="text-[8px] px-1 py-0.5 rounded font-bold" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>👑</span>
                        )}
                        {m.rol_nodo === 'lider' && (
                          <span className="text-[8px] px-1 py-0.5 rounded font-bold" style={{ background: `${color}20`, color }}>Líder</span>
                        )}
                      </div>
                      {m.area_investigacion && (
                        <p className="text-[10px] text-white/25 truncate">{m.area_investigacion}</p>
                      )}
                    </div>
                    <FiExternalLink size={10} className="text-white/0 group-hover:text-white/30 shrink-0 transition-colors" />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
          >
            Cerrar
          </button>
          <button
            onClick={() => { onEnterChat(nodo); onClose() }}
            disabled={joining === nodo.id}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: `linear-gradient(135deg, ${color}, ${color}99)`, color: 'white' }}
          >
            {joining === nodo.id ? <Spinner size="xs" /> : <><FiMessageSquare size={12} /> Ir al Chat</>}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Card shared for both nodo types ───────────────────────────────────── */
function NodoCard({ nodo, isMember, onEnterChat, joining, isGroup = false, onViewDetail, solicitudEstado, onRequestJoin }) {
  const color = nodo.color || '#8B5CF6'
  const isPrivate = nodo.privado && !isMember
  const chatBlocked = isPrivate || (isGroup && !isMember)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative flex flex-col rounded-2xl border overflow-hidden transition-all hover:border-white/15"
      style={{
        borderColor: isMember ? `${color}40` : 'rgba(255,255,255,0.06)',
        background: isMember ? `${color}06` : 'rgba(255,255,255,0.02)',
      }}
    >
      <div className="h-0.5 w-full" style={{ background: color }} />

      {/* Clickable header area → opens detail modal */}
      <button
        onClick={() => onViewDetail?.(nodo)}
        className="flex flex-col gap-3 p-4 pb-2 text-left w-full hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
            style={{ background: `${color}15`, border: `1px solid ${color}25` }}
          >
            {nodo.icono || '💬'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-white/90 truncate">{nodo.displayName || nodo.nombre}</h3>
              {isMember && (
                <span
                  className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                  style={{ background: `${color}20`, color }}
                >
                  Miembro
                </span>
              )}
              {nodo.privado && (
                <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider bg-white/[0.06] text-white/30 flex items-center gap-1">
                  <FiLock size={8} /> Privado
                </span>
              )}
            </div>
            {nodo.descripcion && (
              <p className="text-[11px] text-white/35 mt-0.5 line-clamp-2">{nodo.descripcion}</p>
            )}
          </div>
        </div>

        {nodo.miembros?.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-1.5">
              {nodo.miembros.slice(0, 5).map(m => (
                <Avatar key={m.id} name={m.nombre} src={m.foto_url} area={m.area_investigacion} size="xs"
                  className="ring-1 ring-[#060304]" />
              ))}
            </div>
            <span className="text-[10px] text-white/30">
              {nodo.miembros.length} miembro{nodo.miembros.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </button>

      {/* Chat button — separate from the clickable area */}
      <div className="px-4 pb-4 pt-2">
        {chatBlocked ? (
          !isGroup && onRequestJoin ? (
            solicitudEstado === 'pendiente' ? (
              <div
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-medium cursor-not-allowed"
                style={{ background: 'rgba(252,101,31,0.06)', color: 'rgba(252,101,31,0.5)', border: '1px solid rgba(252,101,31,0.15)' }}
              >
                <FiClock size={11} /> Solicitud pendiente
              </div>
            ) : solicitudEstado === 'rechazada' ? (
              <div
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-medium cursor-not-allowed"
                style={{ background: 'rgba(239,68,68,0.06)', color: 'rgba(239,68,68,0.4)', border: '1px solid rgba(239,68,68,0.15)' }}
              >
                <FiLock size={11} /> Solicitud rechazada
              </div>
            ) : (
              <button
                onClick={e => { e.stopPropagation(); onRequestJoin() }}
                className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-medium transition-all hover:opacity-90"
                style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
              >
                <FiSend size={11} /> Solicitar acceso
              </button>
            )
          ) : (
            <div
              className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-medium cursor-not-allowed"
              style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <FiLock size={11} />
              {isGroup ? 'Solo para miembros del grupo' : 'Chat privado — solo miembros'}
            </div>
          )
        ) : (
          <button
            onClick={e => { e.stopPropagation(); onEnterChat(nodo) }}
            disabled={joining === nodo.id}
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl text-xs font-medium transition-all"
            style={isMember
              ? { background: `${color}20`, color, border: `1px solid ${color}30` }
              : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.06)' }
            }
          >
            {joining === nodo.id ? (
              <Spinner size="xs" />
            ) : (
              <>
                <FiMessageSquare size={12} />
                {isMember ? 'Ir al Chat' : 'Ver Canal (solo lectura)'}
                <FiChevronRight size={11} />
              </>
            )}
          </button>
        )}
      </div>
    </motion.div>
  )
}

/* ── Section header ────────────────────────────────────────────────────── */
function SectionHeader({ icon, title, count }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-base leading-none">{icon}</span>
      <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">{title}</h2>
      <span className="text-[10px] text-white/20 ml-1">({count})</span>
    </div>
  )
}

export default function Nodos() {
  const { user } = useAuth()
  const { nodos, loading: nodosLoading, requestJoinNodo, getMyPendingSolicitudes } = useNodos()
  const { getOrCreateNodeChannel } = useChannels()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('mis')
  const [joining, setJoining] = useState(null)
  const [groupChannels, setGroupChannels] = useState([])
  const [myGroupChannelIds, setMyGroupChannelIds] = useState(new Set())
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [detailNodo, setDetailNodo] = useState(null)
  const [mySolicitudes, setMySolicitudes] = useState({}) // { [nodoId]: 'pendiente'|'aprobada'|'rechazada' }
  const [requestingNodo, setRequestingNodo] = useState(null)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestMsg, setRequestMsg] = useState('')

  // Load group channels from canales table
  useEffect(() => {
    async function load() {
      const [{ data: canales }, { data: miMembresías }] = await Promise.all([
        supabase.from('canales').select('id, nombre, descripcion, nodo_tipo').eq('nodo_tipo', 'grupo').order('nombre'),
        user
          ? supabase.from('canal_miembros').select('canal_id').eq('usuario_id', user.id)
          : { data: [] },
      ])
      // Enrich with metadata
      const enriched = (canales || []).map(c => {
        const meta = GROUP_META[c.nombre] || {}
        return {
          ...c,
          displayName: meta.label || c.nombre,
          icono: meta.icon || '👥',
          color: meta.color || '#6b7280',
          miembros: [],
        }
      })
      setGroupChannels(enriched)
      // Only count memberships in actual group channels (not chats/DMs)
      const groupIds = new Set((canales || []).map(c => c.id))
      setMyGroupChannelIds(new Set((miMembresías || []).map(m => m.canal_id).filter(id => groupIds.has(id))))
      setLoadingGroups(false)
    }
    load()
  }, [user])

  // Load my pending solicitudes
  useEffect(() => {
    if (!user) return
    getMyPendingSolicitudes().then(data => {
      const map = {}
      data.forEach(s => { map[s.nodo_id] = s.estado })
      setMySolicitudes(map)
    })
  }, [user, nodos, getMyPendingSolicitudes])

  const handleRequestJoin = async () => {
    if (!requestingNodo) return
    const ok = await requestJoinNodo(requestingNodo.id, requestMsg)
    if (ok) {
      setMySolicitudes(prev => ({ ...prev, [requestingNodo.id]: 'pendiente' }))
      setShowRequestModal(false)
      setRequestMsg('')
      setRequestingNodo(null)
    }
  }

  // Research nodo membership
  const myNodoIds = useMemo(() => {
    if (!user) return new Set()
    return new Set(nodos.filter(n => n.miembros?.some(m => m.id === user.id)).map(n => n.id))
  }, [nodos, user])

  const loading = nodosLoading || loadingGroups

  // Filter research nodos
  const filteredNodos = useMemo(() => {
    const source = tab === 'mis' ? nodos.filter(n => myNodoIds.has(n.id)) : nodos
    if (!search) return source
    const q = search.toLowerCase()
    return source.filter(n => n.nombre.toLowerCase().includes(q) || (n.descripcion || '').toLowerCase().includes(q))
  }, [nodos, tab, myNodoIds, search])

  // Filter group channels
  const filteredGroups = useMemo(() => {
    const source = tab === 'mis' ? groupChannels.filter(c => myGroupChannelIds.has(c.id)) : groupChannels
    if (!search) return source
    const q = search.toLowerCase()
    return source.filter(c => (c.displayName || c.nombre).toLowerCase().includes(q) || (c.descripcion || '').toLowerCase().includes(q))
  }, [groupChannels, tab, myGroupChannelIds, search])

  const totalMisMembership = myNodoIds.size + myGroupChannelIds.size

  const handleEnterNodoChat = async (nodo) => {
    if (!user) { toast.error('Debes iniciar sesión'); return }
    const isMember = myNodoIds.has(nodo.id)
    setJoining(nodo.id)
    const memberIds = nodo.miembros?.map(m => m.id) || []
    const canal = await getOrCreateNodeChannel(nodo.id, 'investigacion', nodo.nombre, memberIds, isMember)
    setJoining(null)
    if (canal) navigate(`/chat?canal=${canal.id}`)
  }

  const handleEnterGroupChat = async (canal) => {
    if (!user) { toast.error('Debes iniciar sesión'); return }
    setJoining(canal.id)
    navigate(`/chat?canal=${canal.id}`)
    setJoining(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spinner size="md" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(252,101,31,0.12)', border: '1px solid rgba(252,101,31,0.2)' }}>
          <FiZap size={18} style={{ color: '#FC651F' }} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Nodos & Canales</h1>
          <p className="text-xs text-white/35 mt-0.5">
            {nodos.length} nodos de investigación · {groupChannels.length} canales de grupo · {totalMisMembership} mis membresías
          </p>
        </div>
      </div>

      {/* Tabs + Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-xl overflow-hidden border border-white/[0.07] p-0.5 gap-0.5">
          {[
            { key: 'mis', label: `Mis Nodos (${totalMisMembership})` },
            { key: 'todos', label: `Todos (${nodos.length + groupChannels.length})` },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={tab === key
                ? { background: 'rgba(252,101,31,0.2)', color: '#FC651F' }
                : { color: 'rgba(255,255,255,0.35)' }
              }
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] ml-auto">
          <FiSearch size={12} className="text-white/25 shrink-0" />
          <input
            placeholder="Buscar nodo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="text-xs bg-transparent text-white placeholder-white/20 outline-none w-40"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-white/25 hover:text-white/50">
              <FiX size={11} />
            </button>
          )}
        </div>
      </div>

      {/* ── Research Nodos section ──────────────────────────────────────── */}
      {filteredNodos.length > 0 && (
        <div>
          <SectionHeader icon="🔬" title="Nodos de Investigación" count={filteredNodos.length} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNodos.map(nodo => (
              <NodoCard
                key={nodo.id}
                nodo={nodo}
                isMember={myNodoIds.has(nodo.id)}
                onEnterChat={handleEnterNodoChat}
                joining={joining}
                isGroup={false}
                onViewDetail={setDetailNodo}
                solicitudEstado={mySolicitudes[nodo.id]}
                onRequestJoin={() => { setRequestingNodo(nodo); setShowRequestModal(true) }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Group channels section ──────────────────────────────────────── */}
      {filteredGroups.length > 0 && (
        <div>
          <SectionHeader icon="👥" title="Canales de Grupos" count={filteredGroups.length} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups.map(canal => (
              <NodoCard
                key={canal.id}
                nodo={canal}
                isMember={myGroupChannelIds.has(canal.id)}
                onEnterChat={handleEnterGroupChat}
                joining={joining}
                isGroup={true}
                onViewDetail={setDetailNodo}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {filteredNodos.length === 0 && filteredGroups.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.03)' }}>
            {tab === 'mis' ? <FiUsers size={24} className="text-white/20" /> : <FiZap size={24} className="text-white/20" />}
          </div>
          <div className="text-center">
            <p className="text-sm text-white/30 font-medium">
              {tab === 'mis' ? 'Aún no perteneces a ningún nodo' : 'Sin nodos disponibles'}
            </p>
            {tab === 'mis' && (
              <button
                onClick={() => setTab('todos')}
                className="text-xs text-[#FC651F]/70 hover:text-[#FC651F] mt-2 transition-colors"
              >
                Explorar todos los nodos →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Info banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-white/[0.05]"
        style={{ background: 'rgba(255,255,255,0.02)' }}>
        <FiLock size={13} className="text-white/20 mt-0.5 shrink-0" />
        <p className="text-[11px] text-white/25 leading-relaxed">
          Los nodos de investigación son grupos especializados por área.
          Los canales de grupos agrupan a los miembros por su rol dentro del semillero.
          Para cambiar tu grupo, contacta a un administrador.
        </p>
      </div>

      {/* Nodo detail modal */}
      <AnimatePresence>
        {detailNodo && (
          <NodoDetailModal
            nodo={detailNodo}
            isMember={myNodoIds.has(detailNodo.id) || myGroupChannelIds.has(detailNodo.id)}
            onClose={() => setDetailNodo(null)}
            onEnterChat={detailNodo.nodo_tipo === 'grupo' ? handleEnterGroupChat : handleEnterNodoChat}
            joining={joining}
          />
        )}
      </AnimatePresence>

      {/* Join request modal */}
      <AnimatePresence>
        {showRequestModal && requestingNodo && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowRequestModal(false)}
          >
            <motion.div
              className="w-full max-w-md rounded-2xl p-6 space-y-4"
              style={{ background: '#0f0c0d', border: '1px solid rgba(255,255,255,0.1)' }}
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
            >
              <div>
                <h3 className="text-white font-semibold">Solicitar acceso</h3>
                <p className="text-white/40 text-sm mt-0.5">Nodo: <span style={{ color: requestingNodo.color || '#8B5CF6' }}>{requestingNodo.nombre}</span></p>
              </div>
              <textarea
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl p-3 text-sm text-white placeholder:text-white/25 resize-none focus:outline-none focus:border-white/20"
                rows={3}
                placeholder="Motivo de la solicitud (opcional)..."
                value={requestMsg}
                onChange={e => setRequestMsg(e.target.value)}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white hover:bg-white/[0.05] transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRequestJoin}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-white flex items-center gap-2 transition-all"
                  style={{ background: requestingNodo.color || '#8B5CF6' }}
                >
                  <FiSend size={13} /> Enviar solicitud
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
