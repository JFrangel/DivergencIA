import { lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { FiCpu, FiDatabase, FiZap } from 'react-icons/fi'
import ATHENIA_Shell from '../../components/nexus/ATHENIA_Shell'

const ParticleCore = lazy(() => import('../../components/visuals/ParticleCore'))

const META = [
  { icon: FiCpu,      label: 'Modelo',   value: 'Gemini 1.5 Flash', color: '#8B5CF6' },
  { icon: FiDatabase, label: 'Memoria',  value: 'Persistente',      color: '#00D1FF' },
  { icon: FiZap,      label: 'Contexto', value: 'Semillero IA',     color: '#FC651F' },
]

export default function Athenia() {
  return (
    <div className="relative flex flex-col h-[calc(100vh-8rem)] -mt-6 -mx-6 px-6 pt-6">
      {/* Subtle particle background */}
      <Suspense fallback={null}>
        <div className="absolute inset-0 opacity-[0.15] pointer-events-none overflow-hidden">
          <ParticleCore />
        </div>
      </Suspense>

      <motion.div
        className="relative z-10 flex flex-col h-full gap-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold font-mono bg-[#00D1FF]/10 border border-[#00D1FF]/25 text-[#00D1FF]"
              animate={{ boxShadow: ['0 0 10px rgba(0,209,255,0.2)', '0 0 20px rgba(0,209,255,0.4)', '0 0 10px rgba(0,209,255,0.2)'] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
            >
              AI
            </motion.div>
            <div>
              <h1 className="text-lg font-bold font-title text-white tracking-widest">A.T.H.E.N.I.A</h1>
              <p className="text-[10px] text-white/25 font-mono">Autonomous Terminal for Heuristic Exploration & Neural Intelligence Analysis</p>
            </div>
          </div>

          {/* Meta chips */}
          <div className="sm:ml-auto flex flex-wrap gap-2">
            {META.map(m => (
              <div
                key={m.label}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium font-mono"
                style={{ background: `${m.color}10`, border: `1px solid ${m.color}20`, color: `${m.color}` }}
              >
                <m.icon size={11} />
                <span className="text-white/30">{m.label}:</span>
                {m.value}
              </div>
            ))}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium font-mono bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e]">
              <span className="pulse-dot" />
              Online
            </div>
          </div>
        </div>

        {/* Terminal shell */}
        <div className="flex-1 min-h-0">
          <ATHENIA_Shell />
        </div>
      </motion.div>
    </div>
  )
}
