import { motion } from 'framer-motion'
import { FiUsers, FiFolder, FiStar, FiZap, FiFilter, FiMaximize } from 'react-icons/fi'
import { useGraph } from '../../hooks/useGraph'
import UniversalGraph from '../../components/graph/UniversalGraph'
import Spinner from '../../components/ui/Spinner'

const LEGEND = [
  { color: '#FC651F', label: 'Hub central' },
  { color: '#F59E0B', label: 'Fundadores' },
  { color: '#6b7280', label: 'Investigadores' },
  { color: '#8B5CF6', label: 'Proyectos' },
  { color: '#00D1FF', label: 'Ideas' },
]

export default function Universo() {
  const { nodes, edges, loading } = useGraph()

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] -mt-6 -mx-6 px-6 pt-6 gap-4">
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-2xl font-bold font-title text-white">Universo</h1>
          <p className="text-white/40 text-sm">Red de conexiones viva del semillero — haz clic en cualquier nodo</p>
        </div>
        {/* Legend + Fullscreen */}
        <div className="sm:ml-auto flex flex-wrap items-center gap-3">
          {LEGEND.map(l => (
            <div key={l.label} className="flex items-center gap-1.5 text-xs text-white/40">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
          <button
            title="Pantalla completa"
            className="p-1.5 text-white/30 hover:text-white/70 transition-colors rounded-lg hover:bg-white/5"
          >
            <FiMaximize size={14} />
          </button>
        </div>
      </motion.div>

      {/* Graph */}
      <motion.div
        className="flex-1 min-h-0 rounded-2xl overflow-hidden relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(139,92,246,0.04) 0%, rgba(6,3,4,0.8) 70%)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Spinner />
              <p className="text-white/30 text-sm mt-4 font-mono">Construyendo grafo de conexiones...</p>
            </div>
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-5xl opacity-10 mb-4">🌌</div>
              <p className="text-white/30 text-sm">Aún no hay datos para mostrar el universo.</p>
              <p className="text-white/15 text-xs mt-1">Crea proyectos, ideas y miembros primero.</p>
            </div>
          </div>
        ) : (
          <UniversalGraph initialNodes={nodes} initialEdges={edges} />
        )}
      </motion.div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 text-xs text-white/25 shrink-0 pb-1">
        <span className="flex items-center gap-1.5"><FiUsers size={11} /> {nodes.filter(n => n.type === 'member' || n.type === 'founder').length} investigadores</span>
        <span className="flex items-center gap-1.5"><FiFolder size={11} /> {nodes.filter(n => n.type === 'project').length} proyectos</span>
        <span className="flex items-center gap-1.5"><FiStar size={11} /> {nodes.filter(n => n.type === 'idea').length} ideas</span>
        <span className="ml-auto flex items-center gap-1.5 text-[#22c55e]/50"><span className="pulse-dot" /> Datos en vivo</span>
      </div>
    </div>
  )
}
