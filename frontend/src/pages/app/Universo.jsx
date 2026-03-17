import { useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiUsers, FiFolder, FiStar, FiZap, FiFilter,
  FiSearch, FiDownload, FiActivity, FiLink, FiSliders, FiX,
} from 'react-icons/fi'
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

const AREAS = ['all', 'ML', 'NLP', 'Vision', 'Datos', 'General']
const AREA_LABELS = { all: 'Todas', ML: 'ML', NLP: 'NLP', Vision: 'Vision', Datos: 'Datos', General: 'General' }
const ACTIVITY_LEVELS = ['all', 'high', 'medium', 'low']
const ACTIVITY_LABELS = { all: 'Todos', high: 'Alta', medium: 'Media', low: 'Baja' }

export default function Universo() {
  const {
    nodes, edges, loading, stats, filters, setFilters,
    searchQuery, searchNode, highlightedNodeId, exportGraph,
  } = useGraph()

  const [showFilters, setShowFilters] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [timeValue, setTimeValue] = useState(100) // 0-100 slider
  const searchRef = useRef(null)

  // Handle search input
  const handleSearch = useCallback((value) => {
    setSearchInput(value)
    searchNode(value)
  }, [searchNode])

  // Handle timeline slider
  const handleTimeSlider = useCallback((value) => {
    setTimeValue(value)
    if (value >= 100) {
      setFilters(f => ({ ...f, timeRange: null }))
      return
    }
    // Map 0-100 to a date range from 2 years ago to now
    const now = new Date()
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate())
    const range = now.getTime() - twoYearsAgo.getTime()
    const end = new Date(twoYearsAgo.getTime() + (range * value / 100))
    setFilters(f => ({ ...f, timeRange: { start: twoYearsAgo, end } }))
  }, [setFilters])

  // Toggle node type filter
  const toggleNodeType = useCallback((type) => {
    setFilters(f => ({
      ...f,
      nodeTypes: { ...f.nodeTypes, [type]: !f.nodeTypes[type] },
    }))
  }, [setFilters])

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] -mt-6 -mx-6 px-6 pt-6 gap-3">
      {/* Header */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-2xl font-bold font-title text-white">Universo</h1>
          <p className="text-white/40 text-sm">Red de conexiones viva del semillero</p>
        </div>
        <div className="sm:ml-auto flex flex-wrap items-center gap-3">
          {LEGEND.map(l => (
            <div key={l.label} className="flex items-center gap-1.5 text-xs text-white/40">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Stats Panel */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 shrink-0"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <StatCard icon={FiZap} label="Nodos totales" value={stats.totalNodes} color="#FC651F" />
        <StatCard icon={FiLink} label="Conexiones" value={stats.totalConnections} color="#8B5CF6" />
        <StatCard icon={FiUsers} label="Investigadores" value={stats.totalMembers} color="#F59E0B" />
        <StatCard icon={FiFolder} label="Proyectos" value={stats.totalProjects} color="#22c55e" />
        <StatCard
          icon={FiActivity}
          label="Mas conectado"
          value={stats.mostConnectedMember}
          color="#00D1FF"
          isText
        />
        <StatCard
          icon={FiStar}
          label="Proy. mas activo"
          value={stats.mostActiveProject}
          color="#FC651F"
          isText
        />
      </motion.div>

      {/* Toolbar: Search + Filters + Export */}
      <motion.div
        className="flex flex-wrap items-center gap-2 shrink-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Buscar nodo..."
            value={searchInput}
            onChange={e => handleSearch(e.target.value)}
            className="w-full pl-8 pr-8 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-white/20 outline-none focus:border-[#FC651F]/40 transition-colors"
          />
          {searchInput && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              <FiX size={12} />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(f => !f)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
            showFilters
              ? 'bg-[#FC651F]/10 border-[#FC651F]/40 text-[#FC651F]'
              : 'bg-white/[0.04] border-white/[0.08] text-white/50 hover:text-white/70'
          }`}
        >
          <FiFilter size={12} /> Filtros
        </button>

        {/* Export */}
        <button
          onClick={exportGraph}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/50 hover:text-white/70 transition-colors"
          title="Exportar grafo como JSON"
        >
          <FiDownload size={12} /> Exportar
        </button>
      </motion.div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden shrink-0"
          >
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-3">
              {/* Node type toggles */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mr-1">Tipo:</span>
                {[
                  { key: 'members', label: 'Miembros', icon: FiUsers },
                  { key: 'projects', label: 'Proyectos', icon: FiFolder },
                  { key: 'ideas', label: 'Ideas', icon: FiStar },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => toggleNodeType(key)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border transition-colors ${
                      filters.nodeTypes[key]
                        ? 'bg-[#FC651F]/10 border-[#FC651F]/30 text-[#FC651F]'
                        : 'bg-white/[0.02] border-white/[0.06] text-white/25'
                    }`}
                  >
                    <Icon size={11} /> {label}
                  </button>
                ))}
              </div>

              {/* Area filter */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mr-1">Area:</span>
                {AREAS.map(area => (
                  <button
                    key={area}
                    onClick={() => setFilters(f => ({ ...f, area }))}
                    className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                      filters.area === area
                        ? 'bg-[#8B5CF6]/10 border-[#8B5CF6]/30 text-[#8B5CF6]'
                        : 'bg-white/[0.02] border-white/[0.06] text-white/25'
                    }`}
                  >
                    {AREA_LABELS[area]}
                  </button>
                ))}
              </div>

              {/* Activity level filter */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mr-1">Actividad:</span>
                {ACTIVITY_LEVELS.map(level => (
                  <button
                    key={level}
                    onClick={() => setFilters(f => ({ ...f, activityLevel: level }))}
                    className={`px-2.5 py-1 rounded-md text-xs border transition-colors ${
                      filters.activityLevel === level
                        ? 'bg-[#22c55e]/10 border-[#22c55e]/30 text-[#22c55e]'
                        : 'bg-white/[0.02] border-white/[0.06] text-white/25'
                    }`}
                  >
                    {ACTIVITY_LABELS[level]}
                  </button>
                ))}
              </div>

              {/* Timeline slider */}
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold shrink-0">
                  <FiSliders size={10} className="inline mr-1" />
                  Tiempo:
                </span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={timeValue}
                  onChange={e => handleTimeSlider(Number(e.target.value))}
                  className="flex-1 h-1 accent-[#FC651F] cursor-pointer"
                />
                <span className="text-[10px] text-white/30 shrink-0 w-16 text-right">
                  {timeValue >= 100 ? 'Todo' : `${timeValue}%`}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <div className="text-5xl opacity-10 mb-4">&#127756;</div>
              <p className="text-white/30 text-sm">Aun no hay datos para mostrar el universo.</p>
              <p className="text-white/15 text-xs mt-1">Crea proyectos, ideas y miembros primero.</p>
            </div>
          </div>
        ) : (
          <UniversalGraph
            initialNodes={nodes}
            initialEdges={edges}
            highlightedNodeId={highlightedNodeId}
          />
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

/* ──────── Stat Card ──────── */
function StatCard({ icon: Icon, label, value, color, isText = false }) {
  return (
    <div
      className="px-3 py-2 rounded-xl border"
      style={{ background: `${color}06`, borderColor: `${color}15` }}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon size={10} style={{ color: `${color}80` }} />
        <span className="text-[10px] text-white/30 truncate">{label}</span>
      </div>
      <p
        className={`font-bold font-title truncate ${isText ? 'text-xs' : 'text-lg'}`}
        style={{ color }}
        title={String(value)}
      >
        {value}
      </p>
    </div>
  )
}
