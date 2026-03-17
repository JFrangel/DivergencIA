import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiZoomIn,
  FiZoomOut,
  FiMaximize,
  FiMinimize,
  FiGrid,
  FiRefreshCw,
} from 'react-icons/fi'

const layouts = [
  { value: 'force', label: 'Fuerza', icon: FiRefreshCw },
  { value: 'radial', label: 'Radial', icon: FiGrid },
  { value: 'tree', label: 'Árbol', icon: FiGrid },
]

function ControlButton({ icon: Icon, title, onClick }) {
  return (
    <motion.button
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      title={title}
      className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
    >
      <Icon size={18} />
    </motion.button>
  )
}

export default function GraphControls({
  onZoomIn,
  onZoomOut,
  onFitView,
  onToggleFullscreen,
  layout = 'force',
  onLayoutChange,
}) {
  const [showLayoutMenu, setShowLayoutMenu] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  function handleFullscreen() {
    setIsFullscreen((prev) => !prev)
    onToggleFullscreen?.()
  }

  function handleLayoutSelect(value) {
    onLayoutChange?.(value)
    setShowLayoutMenu(false)
  }

  const currentLayout = layouts.find((l) => l.value === layout) || layouts[0]

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-1 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full px-3 py-2"
      >
        <ControlButton icon={FiZoomIn} title="Acercar" onClick={onZoomIn} />
        <ControlButton icon={FiZoomOut} title="Alejar" onClick={onZoomOut} />
        <ControlButton icon={FiMaximize} title="Ajustar vista" onClick={onFitView} />

        <div className="w-px h-5 bg-white/10 mx-1" />

        <ControlButton
          icon={isFullscreen ? FiMinimize : FiMaximize}
          title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          onClick={handleFullscreen}
        />

        <div className="w-px h-5 bg-white/10 mx-1" />

        {/* Layout selector */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowLayoutMenu((prev) => !prev)}
            title={`Diseño: ${currentLayout.label}`}
            className="p-2 text-white/70 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer flex items-center gap-1"
          >
            <currentLayout.icon size={18} />
            <span className="text-xs hidden sm:inline">{currentLayout.label}</span>
          </motion.button>

          <AnimatePresence>
            {showLayoutMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden min-w-[120px]"
              >
                {layouts.map((l) => (
                  <button
                    key={l.value}
                    onClick={() => handleLayoutSelect(l.value)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors cursor-pointer ${
                      layout === l.value
                        ? 'text-white bg-white/10'
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <l.icon size={14} />
                    {l.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}
