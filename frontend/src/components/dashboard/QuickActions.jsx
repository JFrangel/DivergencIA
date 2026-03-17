import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiPlus, FiStar, FiUpload, FiTerminal, FiGlobe, FiSun } from 'react-icons/fi'
import { useZen } from '../../context/ZenContext'
import Card from '../ui/Card'

const ACTIONS = [
  { label: 'Nuevo proyecto', icon: FiPlus, color: '#FC651F', href: '/projects?new=1' },
  { label: 'Proponer idea', icon: FiStar, color: '#8B5CF6', href: '/ideas?new=1' },
  { label: 'Subir archivo', icon: FiUpload, color: '#00D1FF', href: '/library?upload=1' },
  { label: 'Abrir ATHENIA', icon: FiTerminal, color: '#22c55e', href: '/athenia' },
  { label: 'Ver Universo', icon: FiGlobe, color: '#F59E0B', href: '/universo' },
]

export default function QuickActions() {
  const { enterZen } = useZen()

  return (
    <Card>
      <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
        Acciones rápidas
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {ACTIONS.map((a, i) => (
          <motion.div
            key={a.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link to={a.href}>
              <button className="w-full flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/[0.05] transition-all group">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${a.color}15`, color: a.color }}
                >
                  <a.icon size={16} />
                </div>
                <span className="text-[10px] text-white/40 group-hover:text-white/70 transition-colors text-center leading-tight">{a.label}</span>
              </button>
            </Link>
          </motion.div>
        ))}
        {/* Zen mode */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: ACTIONS.length * 0.05 }}
        >
          <button
            onClick={enterZen}
            className="w-full flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/[0.05] transition-all group"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#00D1FF]/10 text-[#00D1FF]">
              <FiSun size={16} />
            </div>
            <span className="text-[10px] text-white/40 group-hover:text-white/70 transition-colors text-center leading-tight">Modo Zen</span>
          </button>
        </motion.div>
      </div>
    </Card>
  )
}
