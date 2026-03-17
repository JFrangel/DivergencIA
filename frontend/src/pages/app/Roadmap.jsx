import { useState } from 'react'
import { motion } from 'framer-motion'
import { FiMap, FiTarget, FiCheckCircle, FiLoader, FiCircle, FiArrowRight, FiLock, FiEdit2, FiCheck } from 'react-icons/fi'
import { toast } from 'sonner'
import { useRoadmap } from '../../hooks/useRoadmap'
import { useAuth } from '../../context/AuthContext'
import RoadmapTimeline from '../../components/nexus/RoadmapTimeline'
import Card from '../../components/ui/Card'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'

const FU = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay },
})

const ESTADO_OPTIONS = [
  { value: 'completada', label: 'Completada', color: '#22c55e' },
  { value: 'actual', label: 'Fase actual', color: '#FC651F' },
  { value: 'proxima', label: 'Próxima', color: '#8B5CF6' },
  { value: 'bloqueada', label: 'Bloqueada', color: '#ef4444' },
]

export default function Roadmap() {
  const { roadmap, loading, updatePhase, toggleMilestone, updatePhaseEstado } = useRoadmap()
  const { isAdmin } = useAuth()
  const [editingPhase, setEditingPhase] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>

  const completed = roadmap.filter(r => r.estado === 'completado').length
  const inProgress = roadmap.filter(r => r.estado === 'en_progreso').length
  const pending = roadmap.filter(r => r.estado === 'pendiente').length
  const blocked = roadmap.filter(r => r.estado === 'bloqueado').length
  const totalHitos = roadmap.reduce((acc, r) => acc + (r.hitos?.length || 0), 0)
  const completedHitos = roadmap.reduce((acc, r) => acc + (r.hitos?.filter(h => h.completado).length || 0), 0)
  const pct = totalHitos ? Math.round((completedHitos / totalHitos) * 100) : 0

  function openEditModal(phase) {
    setEditForm({
      titulo: phase.titulo,
      descripcion: phase.descripcion,
      fecha_estimada: phase.fecha_estimada || '',
      color: phase.color || '#8B5CF6',
    })
    setEditingPhase(phase)
  }

  async function handleSaveEdit() {
    if (!editingPhase) return
    setSaving(true)
    try {
      await updatePhase(editingPhase.id, {
        titulo: editForm.titulo,
        descripcion: editForm.descripcion,
        fecha_estimada: editForm.fecha_estimada || null,
        color: editForm.color,
      })
      toast.success('Fase actualizada')
      setEditingPhase(null)
    } catch {
      toast.error('Error al guardar la fase')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleMilestone(phaseId, milestoneTitle) {
    try {
      await toggleMilestone(phaseId, milestoneTitle)
      toast.success('Hito actualizado')
    } catch {
      toast.error('Error al actualizar el hito')
    }
  }

  async function handleEstadoChange(phaseId, newEstado) {
    try {
      await updatePhaseEstado(phaseId, newEstado)
      toast.success('Estado actualizado')
    } catch {
      toast.error('Error al cambiar el estado')
    }
  }

  /** Renders a milestone pill — clickable toggle for admins, static for others. */
  function MilestonePill({ hito, phaseId, phaseColor }) {
    const baseStyle = hito.completado ? {
      background: '#22c55e12',
      color: '#22c55e90',
      border: '1px solid #22c55e25',
    } : {
      background: `${phaseColor}08`,
      color: `${phaseColor}70`,
      border: `1px solid ${phaseColor}15`,
    }

    if (isAdmin) {
      return (
        <button
          onClick={() => handleToggleMilestone(phaseId, hito.titulo)}
          className="text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1 transition-all hover:scale-105 cursor-pointer"
          style={baseStyle}
          title={hito.completado ? 'Marcar como pendiente' : 'Marcar como completado'}
        >
          {hito.completado ? <FiCheckCircle size={9} /> : <FiCircle size={9} />} {hito.titulo}
        </button>
      )
    }

    return (
      <span
        className="text-[11px] px-2.5 py-1 rounded-lg flex items-center gap-1"
        style={baseStyle}
      >
        {hito.completado ? <FiCheckCircle size={9} /> : <FiArrowRight size={9} />} {hito.titulo}
      </span>
    )
  }

  /** Admin-only estado dropdown */
  function EstadoDropdown({ phase }) {
    return (
      <select
        value={phase.estadoOriginal}
        onChange={(e) => handleEstadoChange(phase.id, e.target.value)}
        className="text-[10px] bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white/60 outline-none cursor-pointer hover:border-white/20 transition-colors"
        style={{ colorScheme: 'dark' }}
      >
        {ESTADO_OPTIONS.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <motion.div {...FU(0)}>
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center border"
            style={{ background: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.2)' }}
          >
            <FiMap size={18} className="text-[#8B5CF6]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-title text-white">Roadmap</h1>
            <p className="text-white/30 text-sm">La hoja de ruta de DivergencIA</p>
          </div>
        </div>
      </motion.div>

      {/* Progress overview */}
      <motion.div {...FU(0.06)}>
        <Card>
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            {/* Big percentage ring */}
            <div className="relative w-28 h-28 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
                <motion.circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke="url(#roadmapGrad)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  initial={{ strokeDashoffset: 2 * Math.PI * 42 }}
                  animate={{ strokeDashoffset: 2 * Math.PI * 42 * (1 - pct / 100) }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                />
                <defs>
                  <linearGradient id="roadmapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="var(--c-primary)" />
                    <stop offset="100%" stopColor="var(--c-secondary)" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold font-title gradient-text">{pct}%</span>
                <span className="text-[8px] text-white/20">hitos</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
              {[
                { label: 'Completadas', value: completed, icon: FiCheckCircle, color: '#22c55e' },
                { label: 'Fase actual', value: inProgress, icon: FiLoader, color: '#FC651F' },
                { label: 'Proximas', value: pending, icon: FiCircle, color: '#8B5CF6' },
                { label: 'Hitos hechos', value: `${completedHitos}/${totalHitos}`, icon: FiTarget, color: '#00D1FF' },
              ].map((s, i) => (
                <motion.div
                  key={s.label}
                  className="text-center p-3 rounded-xl bg-white/[0.02]"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.08 }}
                >
                  <s.icon size={16} className="mx-auto mb-1.5" style={{ color: s.color }} />
                  <p className="text-xl font-bold font-title" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">{s.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Current phase highlight */}
      {roadmap.filter(r => r.estado === 'en_progreso').map(phase => {
        const phaseColor = phase.color || '#FC651F'
        return (
          <motion.div key={phase.id} {...FU(0.12)}>
            <Card className="relative overflow-hidden" style={{ borderColor: `${phaseColor}20` }}>
              <div className="absolute top-0 left-0 w-full h-1" style={{ background: `linear-gradient(90deg, ${phaseColor}, var(--c-secondary))` }} />
              <div className="flex items-start gap-3">
                <motion.div
                  className="w-10 h-10 rounded-xl flex items-center justify-center border shrink-0"
                  style={{ background: `${phaseColor}10`, borderColor: `${phaseColor}25` }}
                  animate={{ boxShadow: [`0 0 0 ${phaseColor}00`, `0 0 16px ${phaseColor}30`, `0 0 0 ${phaseColor}00`] }}
                  transition={{ repeat: Infinity, duration: 2.5 }}
                >
                  <FiLoader size={16} style={{ color: phaseColor }} />
                </motion.div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                      style={{ background: `${phaseColor}12`, color: `${phaseColor}cc` }}
                    >
                      Fase actual — #{phase.orden}
                    </span>
                    {phase.fecha_estimada && (
                      <span className="text-[9px] text-white/20">
                        Meta: {new Date(phase.fecha_estimada).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                    {isAdmin && <EstadoDropdown phase={phase} />}
                    {isAdmin && (
                      <button
                        onClick={() => openEditModal(phase)}
                        className="ml-auto p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors"
                        title="Editar fase"
                      >
                        <FiEdit2 size={13} />
                      </button>
                    )}
                  </div>
                  <h3 className="text-lg font-bold font-title text-white">{phase.titulo}</h3>
                  <p className="text-sm text-white/40 mt-1">{phase.descripcion}</p>
                  {phase.hitos?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {phase.hitos.map(h => (
                        <MilestonePill key={h.titulo} hito={h} phaseId={phase.id} phaseColor={phaseColor} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        )
      })}

      {/* Full timeline */}
      <motion.div {...FU(0.18)}>
        <Card>
          <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-5 flex items-center gap-2">
            <FiMap size={13} /> Timeline completo
          </h2>
          <RoadmapTimeline />
        </Card>
      </motion.div>

      {/* Edit Phase Modal */}
      <Modal
        open={!!editingPhase}
        onClose={() => setEditingPhase(null)}
        title={`Editar — ${editingPhase?.titulo || ''}`}
        footer={
          <>
            <button
              onClick={() => setEditingPhase(null)}
              className="px-4 py-2 rounded-lg text-sm text-white/50 hover:text-white/80 hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-[var(--c-primary)] text-white hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? <FiLoader size={14} className="animate-spin" /> : <FiCheck size={14} />}
              Guardar
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Titulo</label>
            <input
              type="text"
              value={editForm.titulo || ''}
              onChange={(e) => setEditForm(f => ({ ...f, titulo: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[var(--c-primary)]/50 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1.5">Descripcion</label>
            <textarea
              value={editForm.descripcion || ''}
              onChange={(e) => setEditForm(f => ({ ...f, descripcion: e.target.value }))}
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[var(--c-primary)]/50 transition-colors resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Fecha estimada</label>
              <input
                type="date"
                value={editForm.fecha_estimada || ''}
                onChange={(e) => setEditForm(f => ({ ...f, fecha_estimada: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[var(--c-primary)]/50 transition-colors"
                style={{ colorScheme: 'dark' }}
              />
            </div>
            <div>
              <label className="block text-xs text-white/40 mb-1.5">Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={editForm.color || '#8B5CF6'}
                  onChange={(e) => setEditForm(f => ({ ...f, color: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-white/10 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={editForm.color || ''}
                  onChange={(e) => setEditForm(f => ({ ...f, color: e.target.value }))}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/60 outline-none focus:border-[var(--c-primary)]/50 transition-colors font-mono"
                  placeholder="#8B5CF6"
                />
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
