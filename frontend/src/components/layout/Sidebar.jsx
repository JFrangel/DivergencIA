import { useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiZap, FiGrid, FiFolder, FiStar, FiBook, FiBookOpen, FiLayers,
  FiUsers, FiUser, FiGlobe, FiTerminal, FiShield,
  FiChevronLeft, FiChevronRight, FiBell, FiLogOut, FiSun,
  FiMap, FiSettings, FiCalendar, FiPlay, FiLayout, FiMessageSquare,
} from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useZen } from '../../context/ZenContext'
import Avatar from '../ui/Avatar'
import ThemeSwitcher from '../ui/ThemeSwitcher'
import SoundToggle from '../ui/SoundToggle'

const NAV_SECTIONS = [
  {
    label: 'Principal',
    items: [
      { to: '/dashboard', icon: FiGrid,     label: 'Dashboard' },
      { to: '/projects',  icon: FiFolder,   label: 'Proyectos' },
      { to: '/ideas',     icon: FiStar,     label: 'Ideas' },
      { to: '/library',   icon: FiBook,     label: 'Biblioteca' },
      { to: '/learning', icon: FiBookOpen, label: 'Aprendizaje' },
    ],
  },
  {
    label: 'Comunidad',
    items: [
      { to: '/members',  icon: FiUsers,          label: 'Miembros' },
      { to: '/nodos',    icon: FiZap,            label: 'Nodos' },
      { to: '/chat',     icon: FiMessageSquare,  label: 'Chat' },
      { to: '/universo', icon: FiGlobe,          label: 'Universo' },
      { to: '/roadmap',  icon: FiMap,            label: 'Roadmap' },
      { to: '/calendar', icon: FiCalendar,       label: 'Calendario' },
    ],
  },
  {
    label: 'IA',
    items: [
      { to: '/athenia', icon: FiTerminal, label: 'A.T.H.E.N.I.A' },
    ],
  },
  {
    label: 'Personal',
    items: [
      { to: '/workspace',      icon: FiFolder, label: 'Mi Espacio' },
      { to: '/notificaciones', icon: FiBell,   label: 'Notificaciones' },
    ],
  },
  {
    label: 'Herramientas',
    items: [
      { to: '/diagrams', icon: FiLayers, label: 'Diagramas' },
      { to: '/mural',    icon: FiLayout, label: 'Mural' },
      { to: '/arcade',   icon: FiPlay,   label: 'Arcade' },
    ],
  },
]

export default function Sidebar({ notifCount = 0, collapsed = false, onToggle, chatUnreadCount = 0 }) {
  const [localCollapsed, setLocalCollapsed] = useState(false)
  const isCollapsed = onToggle ? collapsed : localCollapsed
  const toggle = onToggle ? onToggle : () => setLocalCollapsed(p => !p)
  const { profile, isAdmin, signOut } = useAuth()
  const { enterZen } = useZen()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const w = isCollapsed ? 64 : 240

  return (
    <motion.aside
      className="fixed left-0 top-0 h-full z-40 flex flex-col"
      animate={{ width: w }}
      transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
      style={{
        background: 'rgba(8,4,4,0.95)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-white/[0.06]">
        <Link to="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--c-primary), var(--c-secondary))' }}
          >
            <FiZap size={15} className="text-white" />
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                className="font-bold text-white font-title tracking-tight whitespace-nowrap text-sm"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
              >
                Divergenc<span style={{ color: 'var(--c-primary)' }}>IA</span>
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV_SECTIONS.map(section => (
          <div key={section.label} className="mb-4">
            {!isCollapsed && (
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold px-2 mb-1.5">
                {section.label}
              </p>
            )}
            {section.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-2 py-2 rounded-lg mb-0.5 transition-all duration-150 group ${
                    isActive
                      ? ''
                      : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
                  }`
                }
                style={({ isActive }) => isActive ? { background: 'color-mix(in srgb, var(--c-primary) 15%, transparent)', color: 'var(--c-primary)' } : {}}
              >
                {({ isActive }) => (
                  <>
                    <div className="relative shrink-0">
                      <item.icon
                        size={17}
                        style={isActive ? { filter: 'drop-shadow(0 0 6px currentColor)' } : {}}
                      />
                      {item.to === '/notificaciones' && notifCount > 0 && isCollapsed && (
                        <span
                          className="absolute -top-1 -right-1 min-w-3.5 h-3.5 px-0.5 rounded-full text-[8px] font-bold flex items-center justify-center text-white"
                          style={{ background: 'var(--c-primary)' }}
                        >
                          {notifCount > 9 ? '9+' : notifCount}
                        </span>
                      )}
                      {item.to === '/chat' && chatUnreadCount > 0 && isCollapsed && (
                        <span
                          className="absolute -top-1 -right-1 min-w-3.5 h-3.5 px-0.5 rounded-full text-[8px] font-bold flex items-center justify-center text-white"
                          style={{ background: '#00D1FF' }}
                        >
                          {chatUnreadCount > 9 ? '9+' : chatUnreadCount}
                        </span>
                      )}
                    </div>
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.span
                          className="text-sm font-medium whitespace-nowrap flex-1 flex items-center justify-between"
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -6 }}
                          transition={{ duration: 0.15 }}
                        >
                          {item.label}
                          {item.to === '/notificaciones' && notifCount > 0 && (
                            <span
                              className="ml-auto min-w-4 h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                              style={{ background: 'var(--c-primary)' }}
                            >
                              {notifCount > 99 ? '99+' : notifCount}
                            </span>
                          )}
                          {item.to === '/chat' && chatUnreadCount > 0 && (
                            <span
                              className="ml-auto min-w-4 h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white"
                              style={{ background: '#00D1FF' }}
                            >
                              {chatUnreadCount > 99 ? '99+' : chatUnreadCount}
                            </span>
                          )}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}

        {/* Admin */}
        {isAdmin && (
          <div className="mb-4">
            {!isCollapsed && (
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold px-2 mb-1.5">Admin</p>
            )}
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-2 py-2 rounded-lg mb-0.5 transition-all duration-150 ${
                  isActive ? '' : 'text-white/50 hover:text-white hover:bg-white/[0.05]'
                }`
              }
              style={({ isActive }) => isActive ? { background: 'color-mix(in srgb, var(--c-primary) 15%, transparent)', color: 'var(--c-primary)' } : {}}
            >
              {({ isActive }) => (
                <>
                  <FiShield size={17} className="shrink-0" />
                  {!isCollapsed && <span className="text-sm font-medium">Panel Admin</span>}
                </>
              )}
            </NavLink>
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div className="border-t border-white/[0.06] p-2 space-y-1">
        {/* Theme Switcher */}
        <ThemeSwitcher compact={isCollapsed} />

        {/* Sound Toggle */}
        <SoundToggle compact={isCollapsed} />

        {/* Zen Mode */}
        <button
          onClick={() => { enterZen(); navigate('/zen') }}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-white/40 transition-all duration-150 hover:bg-[color-mix(in_srgb,var(--c-accent)_5%,transparent)]"
          style={{ '--hover-color': 'var(--c-accent)' }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--c-accent)'; e.currentTarget.style.background = 'color-mix(in srgb, var(--c-accent) 5%, transparent)' }}
          onMouseLeave={e => { e.currentTarget.style.color = ''; e.currentTarget.style.background = '' }}
        >
          <FiSun size={17} className="shrink-0" />
          {!isCollapsed && <span className="text-sm">Modo Zen</span>}
        </button>

        {/* Settings */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-all duration-150 ${
              isActive ? 'bg-white/[0.08] text-white' : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
            }`
          }
        >
          <FiSettings size={17} className="shrink-0" />
          {!isCollapsed && <span className="text-sm">Configuración</span>}
        </NavLink>

        {/* Mi Perfil */}
        <NavLink
          to="/profile"
          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.05] transition-all duration-150"
        >
          <Avatar name={profile?.nombre || ''} src={profile?.foto_url} area={profile?.area_investigacion} size="xs" />
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile?.nombre || 'Mi perfil'}</p>
              <p className="text-[10px] text-white/30 capitalize">{profile?.rol || 'miembro'}</p>
            </div>
          )}
        </NavLink>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg text-white/30 hover:text-[#EF4444] hover:bg-[#EF4444]/5 transition-all duration-150"
        >
          <FiLogOut size={16} className="shrink-0" />
          {!isCollapsed && <span className="text-sm">Cerrar sesión</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={toggle}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors"
        style={{ background: '#0c0608', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {isCollapsed ? <FiChevronRight size={12} /> : <FiChevronLeft size={12} />}
      </button>
    </motion.aside>
  )
}
