import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiZap, FiArrowRight, FiX } from 'react-icons/fi'
import { useState } from 'react'

export default function GuestBanner() {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <motion.div
      className="relative flex items-center gap-3 px-4 py-3 rounded-xl mb-4 overflow-hidden"
      style={{
        background: 'linear-gradient(90deg, rgba(252,101,31,0.12) 0%, rgba(139,92,246,0.08) 100%)',
        border: '1px solid rgba(252,101,31,0.25)',
      }}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
    >
      {/* Animated accent */}
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br from-[#FC651F] to-[#8B5CF6]">
        <FiZap size={15} className="text-white" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/70">
          <span className="font-semibold text-white">Estás en modo visitante.</span>
          {' '}Únete al semillero para crear proyectos, votar ideas, subir archivos y usar A.T.H.E.N.I.A.
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link to="/login" className="text-xs text-white/40 hover:text-white transition-colors hidden sm:block">
          Iniciar sesión
        </Link>
        <Link to="/register">
          <motion.div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FC651F] text-white"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
          >
            Unirme <FiArrowRight size={11} />
          </motion.div>
        </Link>
        <button
          className="p-1 text-white/20 hover:text-white/60 transition-colors"
          onClick={() => setDismissed(true)}
        >
          <FiX size={14} />
        </button>
      </div>
    </motion.div>
  )
}
