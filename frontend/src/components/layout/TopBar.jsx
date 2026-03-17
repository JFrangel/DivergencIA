import { useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiBell, FiSearch, FiCheck, FiX, FiClock } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useNotifs } from '../../context/NotifContext'
import Avatar from '../ui/Avatar'
import GlobalSearch from '../ui/GlobalSearch'

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
}

export default function TopBar() {
  const { pathname } = useLocation()
  const { profile, user } = useAuth()
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifs()
  const [showNotifs, setShowNotifs] = useState(false)

  const base = '/' + pathname.split('/')[1]
  const label = ROUTE_LABELS[base] || 'DivergencIA'
  const isDetail = pathname.split('/').length > 2

  return (
    <motion.header
      className="h-14 flex items-center justify-between px-5 shrink-0"
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
        <div className="relative">
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
                className="absolute right-0 top-10 w-80 glass rounded-xl overflow-hidden shadow-2xl z-50"
                style={{ border: '1px solid rgba(255,255,255,0.08)' }}
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95 }}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                  <span className="text-xs font-semibold text-white/60">Notificaciones</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-[10px] transition-colors flex items-center gap-1" style={{ color: 'var(--c-accent)' }}>
                      <FiCheck size={10} /> Marcar leídas
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-center text-white/20 text-xs py-8">Sin notificaciones</p>
                  ) : (
                    notifications.slice(0, 10).map(n => (
                      <div
                        key={n.id}
                        className="px-4 py-3 border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer transition-colors"
                        style={!n.leida ? { background: 'color-mix(in srgb, var(--c-primary) 5%, transparent)' } : {}}
                        onClick={() => markAsRead(n.id)}
                      >
                        <p className="text-xs text-white/60 leading-relaxed">{n.mensaje}</p>
                        <p className="text-[10px] text-white/20 mt-1 flex items-center gap-1">
                          <FiClock size={9} />
                          {new Date(n.fecha).toLocaleDateString('es-MX')}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Avatar */}
        <Link to="/profile" className="hover:opacity-80 transition-opacity">
          <Avatar name={profile?.nombre || ''} area={profile?.area_investigacion} size="xs" />
        </Link>
      </div>
    </motion.header>
  )
}
