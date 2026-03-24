import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiHash, FiMessageSquare, FiUsers, FiZap,
  FiPlus, FiChevronDown, FiChevronRight,
} from 'react-icons/fi'
import Avatar from '../ui/Avatar'
import { useAuth } from '../../context/AuthContext'

const SECTION_ICONS = {
  global:       { icon: FiHash,          color: '#00D1FF', label: 'Canales' },
  grupo:        { icon: FiUsers,         color: '#8B5CF6', label: 'Grupos' },
  directo:      { icon: FiMessageSquare, color: '#22c55e', label: 'Mensajes directos' },
  nodo:         { icon: FiZap,           color: '#FC651F', label: 'Nodos' },
  investigacion:{ icon: FiZap,           color: '#FC651F', label: 'Investigación' },
  grupos_nodo:  { icon: FiUsers,         color: '#8B5CF6', label: 'Grupos de usuario' },
}

function SectionHeader({ label, count, expanded, onToggle, onAdd, addLabel }) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 group">
      <button onClick={onToggle} className="flex items-center gap-1 flex-1 text-left">
        {expanded
          ? <FiChevronDown size={10} className="text-white/25" />
          : <FiChevronRight size={10} className="text-white/25" />}
        <span className="text-[10px] text-white/30 uppercase tracking-widest font-semibold">
          {label}
        </span>
        {count > 0 && (
          <span className="text-[9px] text-white/20 ml-0.5">({count})</span>
        )}
      </button>
      {onAdd && (
        <button
          onClick={onAdd}
          title={addLabel}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-white/30 hover:text-white/60"
        >
          <FiPlus size={11} />
        </button>
      )}
    </div>
  )
}

function ChannelItem({ channel, isActive, onClick, unread, user }) {
  const tipo = channel.tipo
  const Meta = SECTION_ICONS[tipo] || SECTION_ICONS.global
  const isDM = tipo === 'directo'
  const partner = channel.dm_partner
  const displayName = isDM
    ? (partner?.nombre || 'Chat directo')
    : (channel.nombre || 'Sin nombre')

  return (
    <button
      onClick={() => onClick(channel)}
      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all text-left"
      style={isActive
        ? { background: 'color-mix(in srgb, var(--c-primary) 12%, transparent)', color: 'var(--c-primary)' }
        : { color: 'rgba(255,255,255,0.45)' }
      }
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = '' }}
    >
      {isDM && partner ? (
        <Avatar
          name={partner.nombre}
          src={partner.foto_url}
          area={partner.area_investigacion}
          size="xs"
          className="shrink-0"
        />
      ) : (
        <span className="shrink-0" style={{ color: isActive ? 'var(--c-primary)' : Meta.color, opacity: isActive ? 1 : 0.6 }}>
          {tipo === 'global'
            ? <FiHash size={14} />
            : tipo === 'nodo' && channel.nodo_tipo === 'grupo'
              ? <FiUsers size={13} />
              : tipo === 'nodo'
                ? <FiZap size={13} />
                : <FiUsers size={13} />}
        </span>
      )}
      <span className="text-xs flex-1 truncate font-medium">{displayName}</span>
      {unread > 0 && !isActive && (
        <span
          className="min-w-4 h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white shrink-0"
          style={{ background: 'var(--c-primary)' }}
        >
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  )
}

export default function ChannelList({
  channels, activeChannel, onSelect, counts = {},
  onNewDM, onNewGroup, onNewNode,
}) {
  const { user, isAdmin } = useAuth()
  const [expanded, setExpanded] = useState({ global: true, directo: true, grupo: true, investigacion: true, grupos_nodo: true })

  const toggle = (tipo) => setExpanded(p => ({ ...p, [tipo]: !p[tipo] }))

  const byType = {
    global:        channels.filter(c => c.tipo === 'global'),
    directo:       channels.filter(c => c.tipo === 'directo'),
    grupo:         channels.filter(c => c.tipo === 'grupo'),
    investigacion: channels.filter(c => c.tipo === 'nodo' && c.nodo_tipo !== 'grupo'),
    grupos_nodo:   channels.filter(c => c.tipo === 'nodo' && c.nodo_tipo === 'grupo'),
  }

  const sections = [
    { key: 'global',        label: 'Canales',              onAdd: null },
    { key: 'directo',       label: 'Mensajes directos',    onAdd: onNewDM,    addLabel: 'Nuevo DM' },
    { key: 'grupo',         label: 'Grupos',               onAdd: onNewGroup, addLabel: 'Nuevo grupo' },
    { key: 'investigacion', label: 'Nodos',                onAdd: isAdmin ? onNewNode : null, addLabel: 'Nuevo canal de nodo' },
    { key: 'grupos_nodo',   label: 'Grupos de usuario',    onAdd: null },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.06]">
        <h2 className="text-sm font-semibold text-white/70">Chat</h2>
      </div>

      {/* Sections */}
      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-1">
        {sections.map(({ key, label, onAdd, addLabel }) => {
          const items = byType[key]
          if (key !== 'global' && items.length === 0 && !onAdd) return null
          return (
            <div key={key}>
              <SectionHeader
                label={label}
                count={items.length}
                expanded={expanded[key]}
                onToggle={() => toggle(key)}
                onAdd={onAdd}
                addLabel={addLabel}
              />
              <AnimatePresence>
                {expanded[key] && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    {items.length === 0 ? (
                      <p className="text-[10px] text-white/15 px-5 py-1.5 italic">
                        {key === 'directo' ? 'Ningún DM aún'
                          : key === 'grupo' ? 'Ningún grupo'
                          : key === 'grupos_nodo' ? 'Sin grupos asignados'
                          : 'Sin canales de nodo'}
                      </p>
                    ) : items.map(ch => (
                      <ChannelItem
                        key={ch.id}
                        channel={ch}
                        isActive={activeChannel?.id === ch.id}
                        onClick={onSelect}
                        unread={counts[ch.id] || 0}
                        user={user}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </nav>
    </div>
  )
}
