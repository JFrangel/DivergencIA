import { motion } from 'framer-motion'

const ITEMS = [
  { color: 'linear-gradient(135deg, #FC651F, #8B5CF6)', label: 'Hub DivergencIA', shape: 'circle' },
  { color: '#F59E0B', label: 'Fundador', shape: 'circle' },
  { color: '#8B5CF6', label: 'Investigador', shape: 'circle' },
  { color: '#FC651F', label: 'Proyecto', shape: 'rect' },
  { color: '#00D1FF', label: 'Idea', shape: 'diamond' },
]

export default function GraphLegend() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute bottom-4 left-4 z-40 rounded-xl px-3 py-2.5"
      style={{
        background: 'rgba(8,4,4,0.9)',
        border: '1px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(12px)',
      }}
    >
      <p className="text-[9px] text-white/30 uppercase tracking-wider font-semibold mb-2">Leyenda</p>
      <div className="space-y-1.5">
        {ITEMS.map(item => (
          <div key={item.label} className="flex items-center gap-2">
            {item.shape === 'circle' && (
              <div className="w-3 h-3 rounded-full shrink-0" style={{ background: item.color }} />
            )}
            {item.shape === 'rect' && (
              <div className="w-3 h-3 rounded-[3px] shrink-0" style={{ background: item.color }} />
            )}
            {item.shape === 'diamond' && (
              <div className="w-3 h-3 rounded-[2px] shrink-0 rotate-45" style={{ background: item.color }} />
            )}
            <span className="text-[10px] text-white/50">{item.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  )
}
