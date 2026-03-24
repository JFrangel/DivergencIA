import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiBell, FiCheck, FiClock, FiMessageSquare, FiThumbsUp,
  FiActivity, FiCheckSquare, FiAward, FiUsers, FiStar,
  FiCalendar, FiFolder, FiRadio, FiHeart, FiBookOpen, FiZap, FiAlertCircle,
} from 'react-icons/fi'
import { useNotifs } from '../../context/NotifContext'
import { NOTIFICATION_TYPES, getNotificationRoute } from '../../hooks/useNotifications'
import { timeAgo } from '../../lib/utils'
import useSounds from '../../hooks/useSounds'

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
  recordatorio:         FiClock,
  alerta:               FiAlertCircle,
  reconocimiento:       FiAward,
  // Legacy
  comentarios:          FiMessageSquare,
  votos:                FiThumbsUp,
  avances:              FiActivity,
  tareas:               FiCheckSquare,
  logros:               FiAward,
  solicitudes:          FiUsers,
}

function getTypeColor(tipo) {
  return NOTIFICATION_TYPES[tipo]?.color || '#FC651F'
}

// Achievement-related notification types that trigger the special sound
const ACHIEVEMENT_TYPES = new Set([
  'logro_desbloqueado', 'logros',
])

export default function NotificationBell() {
  const { notifications, unreadCount, lastIncoming, markAsRead, markAllRead } = useNotifs()
  const [open, setOpen] = useState(false)
  const [pulse, setPulse] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()
  const prevCount = useRef(unreadCount)
  const { playSound } = useSounds()
  const lastSoundIdRef = useRef(null)

  // Play sound when a new notification arrives via real-time
  useEffect(() => {
    if (!lastIncoming) return
    // Avoid playing the same notification sound twice
    if (lastSoundIdRef.current === lastIncoming.id) return
    lastSoundIdRef.current = lastIncoming.id

    if (ACHIEVEMENT_TYPES.has(lastIncoming.tipo)) {
      playSound('achievement')
    } else {
      playSound('notification')
    }
  }, [lastIncoming, playSound])

  // Pulse animation when new notification arrives
  useEffect(() => {
    if (unreadCount > prevCount.current) {
      setPulse(true)
      const timer = setTimeout(() => setPulse(false), 1000)
      return () => clearTimeout(timer)
    }
    prevCount.current = unreadCount
  }, [unreadCount])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const latest = notifications.slice(0, 5)

  const handleNotifClick = (n) => {
    if (!n.leida) markAsRead(n.id)
    setOpen(false)
    navigate(getNotificationRoute(n))
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        className="relative w-8 h-8 flex items-center justify-center rounded-lg text-white/30 transition-all hover:text-[var(--c-accent)] hover:bg-[color-mix(in_srgb,var(--c-accent)_5%,transparent)]"
        onClick={() => setOpen(v => !v)}
        aria-label="Notificaciones"
      >
        <motion.div
          animate={pulse ? { rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.5 }}
        >
          <FiBell size={16} />
        </motion.div>

        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
              style={{ background: 'var(--c-primary)' }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 500 }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute right-0 top-11 w-[340px] rounded-xl overflow-hidden shadow-2xl z-50"
            style={{
              background: 'rgba(12, 6, 8, 0.97)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(24px)',
            }}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white/80">Notificaciones</span>
                {unreadCount > 0 && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ background: 'var(--c-primary)' }}
                  >
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] transition-colors flex items-center gap-1 text-white/40 hover:text-[var(--c-accent)]"
                >
                  <FiCheck size={10} /> Marcar leidas
                </button>
              )}
            </div>

            {/* Notification list */}
            <div className="max-h-[320px] overflow-y-auto">
              {latest.length === 0 ? (
                <div className="flex flex-col items-center py-10 gap-2">
                  <FiBell size={24} className="text-white/10" />
                  <p className="text-white/20 text-xs">Sin notificaciones</p>
                </div>
              ) : (
                latest.map((n, i) => {
                  const Icon = TYPE_ICONS[n.tipo] || FiBell
                  const color = getTypeColor(n.tipo)
                  return (
                    <motion.div
                      key={n.id}
                      className="px-4 py-3 border-b border-white/[0.04] cursor-pointer transition-colors hover:bg-white/[0.03]"
                      style={!n.leida ? { background: 'color-mix(in srgb, var(--c-primary) 4%, transparent)' } : {}}
                      onClick={() => handleNotifClick(n)}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}
                        >
                          <Icon size={13} style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/70 leading-relaxed line-clamp-2">
                            {n.mensaje}
                          </p>
                          <p className="text-[10px] text-white/25 mt-1 flex items-center gap-1">
                            <FiClock size={9} />
                            {timeAgo(n.fecha)}
                          </p>
                        </div>
                        {!n.leida && (
                          <div
                            className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                            style={{ background: 'var(--c-primary)' }}
                          />
                        )}
                      </div>
                    </motion.div>
                  )
                })
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-white/[0.06]">
                <Link
                  to="/notificaciones"
                  className="block text-center py-3 text-xs font-medium transition-colors text-white/40 hover:text-[var(--c-accent)] hover:bg-white/[0.02]"
                  onClick={() => setOpen(false)}
                >
                  Ver todas las notificaciones
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
