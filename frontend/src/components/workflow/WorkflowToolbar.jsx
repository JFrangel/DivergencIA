import { FiPlus, FiFlag, FiGitBranch, FiSave, FiTrash2 } from 'react-icons/fi'
import Button from '../ui/Button'

const TOOLS = [
  { id: 'task', label: 'Tarea', icon: FiPlus, color: 'var(--c-primary)' },
  { id: 'milestone', label: 'Hito', icon: FiFlag, color: 'var(--c-secondary)' },
  { id: 'decision', label: 'Decisión', icon: FiGitBranch, color: 'var(--c-accent)' },
]

export default function WorkflowToolbar({ onAddNode, onSave, onClear, saving }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl border border-white/[0.06]">
      <span className="text-[10px] uppercase tracking-wider text-white/25 mr-2 font-semibold">Nodos</span>

      {TOOLS.map(t => (
        <button
          key={t.id}
          onClick={() => onAddNode(t.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all hover:scale-105"
          style={{
            background: `color-mix(in srgb, ${t.color} 8%, transparent)`,
            color: t.color,
            border: `1px solid color-mix(in srgb, ${t.color} 15%, transparent)`,
          }}
        >
          <t.icon size={11} /> {t.label}
        </button>
      ))}

      <div className="flex-1" />

      <Button variant="ghost" size="xs" onClick={onClear} className="gap-1 text-white/30 hover:text-[#EF4444]">
        <FiTrash2 size={11} /> Limpiar
      </Button>
      <Button variant="solid" size="xs" onClick={onSave} loading={saving} className="gap-1">
        <FiSave size={11} /> Guardar
      </Button>
    </div>
  )
}
