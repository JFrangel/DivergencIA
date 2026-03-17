import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { FiCheckCircle, FiClock, FiAlertCircle, FiLoader } from 'react-icons/fi'

const STATE = {
  pendiente:   { color: '#6b7280', icon: FiClock, label: 'Pendiente' },
  en_progreso: { color: 'var(--c-primary)', icon: FiLoader, label: 'En progreso' },
  revision:    { color: '#F59E0B', icon: FiAlertCircle, label: 'Revisión' },
  completada:  { color: '#22c55e', icon: FiCheckCircle, label: 'Completada' },
}

const PRIORITY_DOT = {
  baja: '#6b7280', media: '#F59E0B', alta: 'var(--c-primary)', critica: '#EF4444',
}

function TaskNode({ data }) {
  const st = STATE[data.estado] || STATE.pendiente
  const Icon = st.icon

  return (
    <div
      className="px-4 py-3 rounded-xl text-xs min-w-[160px] max-w-[200px] group"
      style={{
        background: `color-mix(in srgb, ${st.color} 3%, transparent)`,
        border: `1px solid color-mix(in srgb, ${st.color} 20%, transparent)`,
        boxShadow: `0 0 12px color-mix(in srgb, ${st.color} 6%, transparent)`,
      }}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-white/20 !border-white/10" />
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-white/20 !border-white/10" />

      {/* Header */}
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={11} style={{ color: st.color }} />
        <span className="text-[9px] uppercase tracking-wider" style={{ color: `color-mix(in srgb, ${st.color} 56%, transparent)` }}>{st.label}</span>
        {data.prioridad && (
          <span
            className="w-1.5 h-1.5 rounded-full ml-auto"
            style={{ background: PRIORITY_DOT[data.prioridad] || '#6b7280' }}
            title={`Prioridad: ${data.prioridad}`}
          />
        )}
      </div>

      {/* Title */}
      <p className="text-white/80 font-medium truncate leading-snug">{data.label}</p>

      {/* Assignee */}
      {data.asignado && (
        <p className="text-[10px] text-white/25 mt-1.5 truncate">{data.asignado}</p>
      )}
    </div>
  )
}

export default memo(TaskNode)
