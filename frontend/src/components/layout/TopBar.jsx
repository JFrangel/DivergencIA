import { useState, useRef, useEffect } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiBell, FiSearch, FiCheck, FiX, FiClock, FiMessageSquare, FiThumbsUp, FiActivity, FiCheckSquare, FiAward, FiUsers } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useNotifs } from '../../context/NotifContext'
import Avatar from '../ui/Avatar'
import GlobalSearch from '../ui/GlobalSearch'
import { timeAgo } from '../../lib/utils'

const NOTIF_ICONS = {
  comentarios: FiMessageSquare,
  comments: FiMessageSquare,
  votos: FiThumbsUp,
  votes: FiThumbsUp,
  avances: FiActivity,
  advances: FiActivity,
  tareas: FiCheckSquare,
  tasks: FiCheckSquare,
  logros: FiAward,
  achievements: FiAward,
  solicitudes: FiUsers,
  joinRequests: FiUsers,
}

const ROUTE_LABELS = {
  '/dashboard':      'Dashboard',
  '/projects':       'Proyectos',
  '/ideas':          'Ideas',
  '/library':        'Biblioteca',
  '/members':        'Miembros',
  '/universo':       'Universo',
  '/athenia':        'A.T.H.E.N.I.A',
  '/roadmap':        'Roadmap',
  '/profile':        'Mi Perfil',
  '/admin':          'Panel Admin',
  '/settings':       'Configuración',
  '/calendar':       'Calendario',
  '/learning':       'Aprendizaje',
  '/diagrams':       'Diagramas',
  '/arcade':         'Arcade',
  '/mural':          'Mural',
  '/workspace':      'Mi Espacio',
  '/zen':            'Modo Zen',
  '/notificaciones': 'Notificaciones',
  '/chat':           'Chat',
}

export default function TopBar() {
  const { pathname } = useLocation()
  const { profile, user } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifs()
  const [showNotifs, setShowNotifs] = useState(false)
  const notifsRef = useRef(null)

  useEffect(() => {
    if (!showNotifs) return
    const handleClick = (e) => {
      if (notifsRef.current && !notifsRef.current.contains(e.target)) setShowNotifs(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showNotifs])

  const base = '/' + pathname.split('/')[1]
  const label = ROUTE_LABELS[base] || 'DivergencIA'
  const isDetail = pathname.split('/').length > 2

  return (
    <motion.header
      className="h-14 flex items-center justify-between px-5 shrink-0 relative z-30"
      style={{
        background: 'rgba(6,3,4,0.7)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
      }}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-white/30">DivergencIA</span>
        <span className="text-white/20">/</span>
        {isDetail ? (
          <>
            <Link
              to={base}
              className="text-white/50 hover:text-white transition-colors"
            >
              {ROUTE_LABELS[base] || base}
            </Link>
            <span className="text-white/20">/</span>
            <span className="text-white/80 font-medium">Detalle</span>
          </>
        ) : (
          <span className="text-white/80 font-medium">{label}</span>
        )}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Global Search */}
        <GlobalSearch />

        {/* Notifications */}
        <div className="relative" ref={notifsRef}>
          <button
            className="relative w-8 h-8 flex items-center justify-center rounded-lg text-white/30 transition-all"
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--c-accent)'; e.currentTarget.style.background = 'color-mix(in srgb, var(--c-accent) 5%, transparent)' }}
            onMouseLeave={e => { e.currentTarget.style.color = ''; e.currentTarget.style.background = '' }}
            onClick={() => setShowNotifs(v => !v)}
            aria-label="Notificaciones"
          >
            <FiBell size={16} />
            {unreadCount > 0 && (
              <motion.span
                className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                style={{ background: 'var(--c-primary)' }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500 }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </button>

          <AnimatePresence>
            {showNotifs && (
              <motion.div
                className="absolute right-0 top-10 w-80 rounded-xl overflow-hidden shadow-2xl z-50"
                style={{ background: 'rgba(12,6,8,0.97)', border: '1px solid rgba(255,255,255,0.10)', backdropFilter: 'blur(24px)' }}
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white/60">Notificaciones</span>
                    {unreadCount > 0 && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: 'var(--c-primary)' }}>
                        {unreadCount}
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[10px] transition-colors flex items-center gap-1" style={{ color: 'var(--c-accent)' }}>
                      <FiCheck size={10} /> Marcar leídas
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.filter(n => !n.leida).length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-8">
                      <FiBell size={20} className="text-white/10" />
                      <p className="text-center text-white/20 text-xs">Todo al día</p>
                    </div>
                  ) : (
                    <AnimatePresence initial={false}>
                      {notifications.filter(n => !n.leida).slice(0, 8).map(n => {
                        const Icon = NOTIF_ICONS[n.tipo] || FiBell
                        return (
                          <motion.div
                            key={n.id}
                            layout
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div
                              className="px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.04] cursor-pointer transition-colors"
                              style={{ background: 'color-mix(in srgb, var(--c-primary) 4%, transparent)' }}
                              onClick={() => markAsRead(n.id)}
                            >
                              <div className="flex items-start gap-2">
                                <Icon size={12} className="shrink-0 mt-0.5" style={{ color: 'var(--c-primary)' }} />
                                <p className="text-xs text-white/70 leading-relaxed flex-1">{n.mensaje}</p>
                                <div className="w-1.5 h-1.5 rounded-full shrink-0 mt-1" style={{ background: 'var(--c-primary)' }} />
                              </div>
                              <p className="text-[10px] text-white/20 mt-1 flex items-center gap-1 pl-5">
                                <FiClock size={9} />
                                {timeAgo(n.fecha)}
                              </p>
                            </div>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  )}
                </div>
                <Link
                  to="/notificaciones"
                  onClick={() => setShowNotifs(false)}
                  className="block text-center text-[11px] py-2.5 border-t border-white/[0.06] transition-colors"
                  style={{ color: 'var(--c-accent)' }}
                >
                  Ver todas las notificaciones
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Avatar */}
        <Link to="/profile" className="hover:opacity-80 transition-opacity">
          <Avatar name={profile?.nombre || ''} src={profile?.foto_url} area={profile?.area_investigacion} size="xs" />
        </Link>
      </div>
    </motion.header>
  )
}
