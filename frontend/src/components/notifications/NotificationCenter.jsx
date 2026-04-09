import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiBell, FiCheckCircle, FiTrash2, FiClock,
  FiMessageSquare, FiThumbsUp, FiActivity, FiCheckSquare, FiAward,
  FiUsers, FiStar, FiCalendar, FiFolder, FiRadio, FiHeart,
  FiBookOpen, FiInbox, FiEye, FiEyeOff, FiZap,
} from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useNotifications, NOTIFICATION_TYPES, getNotificationRoute } from '../../hooks/useNotifications'
import { timeAgo } from '../../lib/utils'
import BroadcastPanel from './BroadcastPanel'

const TYPE_ICONS = {
  voto_recordatorio:    FiThumbsUp,
  evento_proximo:       FiCalendar,
  tarea_asignada:       FiCheckSquare,
  idea_nueva:           FiStar,
  proyecto_actualizado: FiFolder,
  logro_desbloqueado:   FiAward,
  admin_broadcast:      FiRadio,
  bienvenida:           FiHeart,
  avance_nuevo:         FiActivity,
  sugerencia:           FiBookOpen,
  mensaje_nuevo:        FiMessageSquare,
  mensaje_directo:      FiMessageSquare,
  recordatorio:         FiCalendar,
  alerta:               FiRadio,
  reconocimiento:       FiAward,
  comentarios:          FiMessageSquare,
  votos:                FiThumbsUp,
  avances:              FiActivity,
  tareas:               FiCheckSquare,
  logros:               FiAward,
  solicitudes:          FiUsers,
  nodo_solicitud:       FiUsers,
  nodo_aprobado:        FiCheckCircle,
  nodo_rechazado:       FiTrash2,
  changelog:            FiZap,
}

function getTypeColor(tipo) {
  return NOTIFICATION_TYPES[tipo]?.color || '#FC651F'
}

function getTypeLabel(tipo) {
  return NOTIFICATION_TYPES[tipo]?.label || tipo
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────
const FILTER_TABS = [
  { key: 'all',    label: 'Todas',     icon: FiInbox },
  { key: 'unread', label: 'No leidas', icon: FiEye },
]

const TYPE_FILTERS = [
  { key: 'tarea_asignada',       label: 'Tareas' },
  { key: 'idea_nueva',           label: 'Ideas' },
  { key: 'proyecto_actualizado', label: 'Proyectos' },
  { key: 'avance_nuevo',         label: 'Avances' },
  { key: 'evento_proximo',       label: 'Eventos' },
  { key: 'logro_desbloqueado',   label: 'Logros' },
  { key: 'nodo_solicitud',       label: 'Solicitudes de nodo' },
  { key: 'solicitudes',          label: 'Solicitudes' },
  { key: 'admin_broadcast',      label: 'Mensajes' },
  { key: 'sugerencia',           label: 'Sugerencias' },
  { key: 'voto_recordatorio',    label: 'Votos' },
  { key: 'bienvenida',           label: 'Bienvenida' },
  { key: 'mensaje_nuevo',        label: 'Mensajes' },
  { key: 'mensaje_directo',      label: 'DMs' },
]


export default function NotificationCenter() {
  const { isAdmin } = useAuth()
  const {
    filteredNotifications,
    groupedByDate,
    unreadCount,
    loading,
    filter,
    setFilter,
    markAsRead,
    markAsUnread,
    markAllRead,
    deleteNotification,
    deleteAllRead,
  } = useNotifications()
  const navigate = useNavigate()
  const [showBroadcast, setShowBroadcast] = useState(false)

  const handleNotifClick = (n) => {
    if (!n.leida) markAsRead(n.id)
    if (n.tipo === 'changelog') {
      window.dispatchEvent(new CustomEvent('changelog:open', { detail: { id: n.referencia_id } }))
      return
    }
    navigate(getNotificationRoute(n))
  }

  const dateEntries = Object.entries(groupedByDate)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--c-primary), var(--c-secondary))' }}
            >
              <FiBell size={18} className="text-white" />
            </div>
            Notificaciones
            {unreadCount > 0 && (
              <span
                className="text-sm font-bold px-2 py-0.5 rounded-full text-white"
                style={{ background: 'var(--c-primary)' }}
              >
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-sm text-white/40 mt-1">
            {filteredNotifications.length} notificacion{filteredNotifications.length !== 1 ? 'es' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-white/50 hover:text-white hover:bg-white/[0.06]"
            >
              <FiCheckCircle size={13} /> Marcar todas leidas
            </button>
          )}
          <button
            onClick={deleteAllRead}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-white/30 hover:text-[var(--c-error)] hover:bg-[color-mix(in_srgb,var(--c-error)_5%,transparent)]"
          >
            <FiTrash2 size={13} /> Limpiar leidas
          </button>
          {isAdmin && (
            <button
              onClick={() => setShowBroadcast(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-white/50 hover:text-[var(--c-accent)] hover:bg-[color-mix(in_srgb,var(--c-accent)_5%,transparent)]"
            >
              <FiRadio size={13} /> Broadcast
            </button>
          )}
        </div>
      </motion.div>

      {/* Admin Broadcast Panel */}
      <AnimatePresence>
        {isAdmin && showBroadcast && (
          <BroadcastPanel onClose={() => setShowBroadcast(false)} />
        )}
      </AnimatePresence>

      {/* Filter tabs */}
      <motion.div
        className="flex flex-wrap gap-2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        {FILTER_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={
              filter === tab.key
                ? { background: 'color-mix(in srgb, var(--c-primary) 15%, transparent)', color: 'var(--c-primary)' }
                : { color: 'rgba(255,255,255,0.4)' }
            }
            onMouseEnter={e => {
              if (filter !== tab.key) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }
            }}
            onMouseLeave={e => {
              if (filter !== tab.key) { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }
            }}
          >
            <tab.icon size={12} />
            {tab.label}
          </button>
        ))}

        <span className="w-px h-5 bg-white/[0.08] self-center mx-1" />

        {TYPE_FILTERS.map(tf => (
          <button
            key={tf.key}
            onClick={() => setFilter(f => f === tf.key ? 'all' : tf.key)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
            style={
              filter === tf.key
                ? { background: `color-mix(in srgb, ${getTypeColor(tf.key)} 15%, transparent)`, color: getTypeColor(tf.key) }
                : { color: 'rgba(255,255,255,0.3)' }
            }
            onMouseEnter={e => {
              if (filter !== tf.key) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)' }
            }}
            onMouseLeave={e => {
              if (filter !== tf.key) { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'rgba(255,255,255,0.3)' }
            }}
          >
            {tf.label}
          </button>
        ))}
      </motion.div>

      {/* Notification list grouped by date */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-white/10 border-t-[var(--c-primary)] rounded-full animate-spin" />
        </div>
      ) : dateEntries.length === 0 ? (
        <motion.div
          className="flex flex-col items-center py-20 gap-4"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'var(--c-surface-1)' }}
          >
            <FiBell size={28} className="text-white/10" />
          </div>
          <div className="text-center">
            <p className="text-white/30 text-sm font-medium">No hay notificaciones</p>
            <p className="text-white/15 text-xs mt-1">
              {filter === 'unread' ? 'Todas las notificaciones han sido leidas' : 'Las notificaciones nuevas aparaceran aqui'}
            </p>
          </div>
        </motion.div>
      ) : (
        <div className="space-y-6">
          {dateEntries.map(([date, notifs], gi) => (
            <motion.div
              key={date}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.05 }}
            >
              <p className="text-xs font-semibold text-white/25 uppercase tracking-wider mb-3 px-1">
                {date}
              </p>

              <div
                className="rounded-xl overflow-hidden"
                style={{
                  background: 'var(--c-surface-1)',
                  border: '1px solid var(--c-border)',
                }}
              >
                {notifs.map((n, i) => {
                  const Icon = TYPE_ICONS[n.tipo] || FiBell
                  const color = getTypeColor(n.tipo)
                  return (
                    <motion.div
                      key={n.id}
                      className="group flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors hover:bg-white/[0.03]"
                      style={{
                        borderBottom: i < notifs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                        ...((!n.leida) ? { background: 'color-mix(in srgb, var(--c-primary) 3%, transparent)' } : {}),
                      }}
                      onClick={() => handleNotifClick(n)}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.02 }}
                    >
                      {/* Type icon */}
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
                      >
                        <Icon size={14} style={{ color }} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <span
                              className="text-[10px] font-semibold uppercase tracking-wider"
                              style={{ color }}
                            >
                              {getTypeLabel(n.tipo)}
                            </span>
                            <p className={`text-sm leading-relaxed mt-0.5 ${n.leida ? 'text-white/50' : 'text-white/80'}`}>
                              {n.mensaje}
                            </p>
                          </div>

                          {!n.leida && (
                            <div
                              className="w-2 h-2 rounded-full shrink-0 mt-2"
                              style={{ background: 'var(--c-primary)' }}
                            />
                          )}
                        </div>

                        <p className="text-[10px] text-white/20 mt-1.5 flex items-center gap-1">
                          <FiClock size={9} />
                          {timeAgo(n.fecha)}
                        </p>
                      </div>

                      {/* Actions (show on hover) */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            n.leida ? markAsUnread(n.id) : markAsRead(n.id)
                          }}
                          className="w-6 h-6 rounded flex items-center justify-center text-white/20 hover:text-[var(--c-accent)] hover:bg-white/[0.06] transition-all"
                          title={n.leida ? 'Marcar como no leida' : 'Marcar como leida'}
                        >
                          {n.leida ? <FiEyeOff size={12} /> : <FiEye size={12} />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteNotification(n.id)
                          }}
                          className="w-6 h-6 rounded flex items-center justify-center text-white/20 hover:text-[var(--c-error)] hover:bg-[color-mix(in_srgb,var(--c-error)_5%,transparent)] transition-all"
                          title="Eliminar"
                        >
                          <FiTrash2 size={12} />
                        </button>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
