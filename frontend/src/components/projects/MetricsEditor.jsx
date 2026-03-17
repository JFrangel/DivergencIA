import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiBarChart2, FiPlus, FiX, FiTrendingUp, FiTarget, FiPercent } from 'react-icons/fi'
import Card from '../ui/Card'
import Button from '../ui/Button'

const METRIC_TYPES = [
  { value: 'accuracy', label: 'Accuracy', icon: FiTarget, color: '#22c55e', suffix: '%' },
  { value: 'loss', label: 'Loss', icon: FiTrendingUp, color: '#EF4444', suffix: '' },
  { value: 'f1_score', label: 'F1 Score', icon: FiBarChart2, color: '#8B5CF6', suffix: '' },
  { value: 'precision', label: 'Precision', icon: FiPercent, color: '#FC651F', suffix: '%' },
  { value: 'recall', label: 'Recall', icon: FiPercent, color: '#00D1FF', suffix: '%' },
  { value: 'custom', label: 'Personalizada', icon: FiBarChart2, color: '#F59E0B', suffix: '' },
]

export default function MetricsEditor({ metrics = [], onChange }) {
  const [showAdd, setShowAdd] = useState(false)
  const [newMetric, setNewMetric] = useState({ tipo: 'accuracy', nombre: '', valor: '', meta: '' })

  const handleAdd = () => {
    if (!newMetric.valor) return
    const type = METRIC_TYPES.find(t => t.value === newMetric.tipo) || METRIC_TYPES[5]
    const metric = {
      id: Date.now(),
      tipo: newMetric.tipo,
      nombre: newMetric.tipo === 'custom' ? newMetric.nombre : type.label,
      valor: parseFloat(newMetric.valor),
      meta: newMetric.meta ? parseFloat(newMetric.meta) : null,
      color: type.color,
    }
    onChange([...metrics, metric])
    setNewMetric({ tipo: 'accuracy', nombre: '', valor: '', meta: '' })
    setShowAdd(false)
  }

  const handleRemove = (id) => {
    onChange(metrics.filter(m => m.id !== id))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
          <FiBarChart2 size={12} className="text-[#8B5CF6]" />
          Métricas del proyecto
        </h4>
        <button
          className="text-[10px] text-[#FC651F] hover:text-[#FC651F]/80 flex items-center gap-1 transition-colors"
          onClick={() => setShowAdd(!showAdd)}
        >
          <FiPlus size={10} /> Agregar métrica
        </button>
      </div>

      {/* Add metric form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <Card variant="flat" className="!p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white outline-none"
                  value={newMetric.tipo}
                  onChange={e => setNewMetric(f => ({ ...f, tipo: e.target.value }))}
                >
                  {METRIC_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                {newMetric.tipo === 'custom' && (
                  <input
                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-white/20 outline-none"
                    placeholder="Nombre"
                    value={newMetric.nombre}
                    onChange={e => setNewMetric(f => ({ ...f, nombre: e.target.value }))}
                  />
                )}
                <input
                  type="number"
                  step="any"
                  className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-white/20 outline-none"
                  placeholder="Valor actual"
                  value={newMetric.valor}
                  onChange={e => setNewMetric(f => ({ ...f, valor: e.target.value }))}
                />
                <input
                  type="number"
                  step="any"
                  className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white placeholder-white/20 outline-none"
                  placeholder="Meta (opcional)"
                  value={newMetric.meta}
                  onChange={e => setNewMetric(f => ({ ...f, meta: e.target.value }))}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="xs" onClick={() => setShowAdd(false)}>Cancelar</Button>
                <Button variant="solid" size="xs" onClick={handleAdd}>Agregar</Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metrics grid */}
      {metrics.length === 0 ? (
        <p className="text-center text-xs text-white/15 py-4">Sin métricas registradas</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {metrics.map((m, i) => {
            const type = METRIC_TYPES.find(t => t.value === m.tipo) || METRIC_TYPES[5]
            const Icon = type.icon
            const color = m.color || type.color
            const progress = m.meta ? Math.min((m.valor / m.meta) * 100, 100) : null

            return (
              <motion.div
                key={m.id}
                className="p-3 rounded-xl group relative"
                style={{ background: `${color}08`, border: `1px solid ${color}15` }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.06 }}
              >
                {/* Remove button */}
                <button
                  className="absolute top-1.5 right-1.5 p-1 rounded text-white/10 hover:text-[#EF4444] transition-colors opacity-0 group-hover:opacity-100"
                  onClick={() => handleRemove(m.id)}
                >
                  <FiX size={10} />
                </button>

                <div className="flex items-center gap-1.5 mb-2">
                  <Icon size={11} style={{ color }} />
                  <span className="text-[10px] font-medium" style={{ color: `${color}90` }}>
                    {m.nombre}
                  </span>
                </div>
                <p className="text-lg font-bold font-title" style={{ color }}>
                  {m.valor}{type.suffix}
                </p>

                {/* Progress toward goal */}
                {progress !== null && (
                  <div className="mt-2">
                    <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                      />
                    </div>
                    <p className="text-[9px] text-white/20 mt-1">Meta: {m.meta}{type.suffix}</p>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
