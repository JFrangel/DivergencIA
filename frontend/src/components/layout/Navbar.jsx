import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FiZap, FiMenu, FiX, FiArrowRight, FiCpu, FiFolder, FiUsers, FiGlobe } from 'react-icons/fi'
import Button from '../ui/Button'

const NAV_LINKS = [
  { href: '/#features', label: 'Plataforma', icon: FiCpu },
  { href: '/#team', label: 'Fundadores', icon: FiUsers },
  { href: '/members', label: 'Investigadores', icon: FiGlobe },
]

export default function Navbar() {
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <>
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div
          className={`flex items-center justify-between px-5 py-3.5 mx-4 mt-3 rounded-2xl max-w-6xl xl:mx-auto transition-all duration-300 ${
            scrolled
              ? 'bg-[rgba(6,3,4,0.9)] border border-white/[0.08] shadow-2xl shadow-black/60'
              : 'bg-[rgba(6,3,4,0.4)] border border-white/[0.04]'
          }`}
          style={{ backdropFilter: 'blur(24px)' }}
        >
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <motion.div
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#FC651F] to-[#8B5CF6]"
              whileHover={{ scale: 1.1, rotate: 10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            >
              <FiZap size={17} className="text-white" />
            </motion.div>
            <div>
              <span className="font-bold text-white font-title tracking-tight text-[15px]">
                Divergenc<span className="text-[#FC651F]">IA</span>
              </span>
              <p className="text-[9px] text-white/25 leading-none hidden sm:block">Semillero de IA</p>
            </div>
          </Link>

          {/* Nav Links desktop */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm text-white/45 hover:text-white hover:bg-white/[0.06] transition-all"
              >
                <link.icon size={13} className="opacity-60" />
                {link.label}
              </a>
            ))}
          </div>

          {/* Auth + mobile toggle */}
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden sm:block text-sm text-white/40 hover:text-white transition-colors px-3 py-2">
              Iniciar sesión
            </Link>
            <Link to="/register" className="hidden sm:block">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Button variant="solid" size="sm" className="gap-1.5">
                  Unirse <FiArrowRight size={13} />
                </Button>
              </motion.div>
            </Link>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/[0.06] transition-all"
              onClick={() => setMobileOpen(v => !v)}
            >
              {mobileOpen ? <FiX size={18} /> : <FiMenu size={18} />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-40 flex flex-col pt-24 px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-[#060304]/95 backdrop-blur-xl" onClick={() => setMobileOpen(false)} />
            <motion.div
              className="relative glass rounded-2xl p-5 space-y-2"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ delay: 0.05 }}
            >
              {NAV_LINKS.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-white/60 hover:text-white hover:bg-white/[0.06] transition-all"
                  initial={{ x: -16, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.1 + i * 0.05 }}
                  onClick={() => setMobileOpen(false)}
                >
                  <link.icon size={16} />
                  {link.label}
                </motion.a>
              ))}
              <div className="pt-3 border-t border-white/[0.06] flex gap-2">
                <Link to="/login" className="flex-1" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" size="sm" fullWidth>Iniciar sesión</Button>
                </Link>
                <Link to="/register" className="flex-1" onClick={() => setMobileOpen(false)}>
                  <Button variant="solid" size="sm" fullWidth>Unirse</Button>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
