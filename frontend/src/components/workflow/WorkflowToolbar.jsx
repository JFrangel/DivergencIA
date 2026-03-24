import { FiPlus, FiFlag, FiGitBranch, FiSave, FiTrash2, FiRotateCcw, FiZap, FiEdit3 } from 'react-icons/fi'
import Button from '../ui/Button'

const TOOLS = [
  { id: 'task', label: 'Tarea', icon: FiPlus, color: 'var(--c-primary)' },
  { id: 'milestone', label: 'Hito', icon: FiFlag, color: 'var(--c-secondary)' },
  { id: 'decision', label: 'Decision', icon: FiGitBranch, color: 'var(--c-accent)' },
]

export default function WorkflowToolbar({ onAddNode, onSave, onClear, onUndo, canUndo, saving, mode, onModeChange, tasksCount = 0 }) {
  const isAuto = mode === 'auto'

  return (
    <div className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl border border-white/[0.06]">
      {/* Mode toggle */}
      {onModeChange && (
        <div className="flex items-center rounded-lg border border-white/[0.08] overflow-hidden mr-2">
          <button
            onClick={() => onModeChange('manual')}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium transition-all ${
              !isAuto ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/50'
            }`}
          >
            <FiEdit3 size={10} /> Manual
          </button>
          <button
            onClick={() => onModeChange('auto')}
            className={`flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium transition-all ${
              isAuto ? 'bg-[var(--c-primary)]/15 text-[var(--c-primary)]' : 'text-white/30 hover:text-white/50'
            }`}
          >
            <FiZap size={10} /> Auto {tasksCount > 0 && `(${tasksCount})`}
          </button>
        </div>
      )}

      {/* Node tools - only in manual mode */}
      {!isAuto && (
        <>
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
        </>
      )}

      <div className="flex-1" />

      {!isAuto && onUndo && (
        <Button
          variant="ghost"
          size="xs"
          onClick={onUndo}
          disabled={!canUndo}
          className="gap-1 text-white/30 hover:text-white disabled:opacity-30"
          title="Deshacer (Ctrl+Z)"
        >
          <FiRotateCcw size={11} /> Deshacer
        </Button>
      )}
      {!isAuto && (
        <Button variant="ghost" size="xs" onClick={onClear} className="gap-1 text-white/30 hover:text-[#EF4444]">
          <FiTrash2 size={11} /> Limpiar
        </Button>
      )}
      {!isAuto && (
        <Button variant="solid" size="xs" onClick={onSave} loading={saving} className="gap-1">
          <FiSave size={11} /> Guardar
        </Button>
      )}
    </div>
  )
}
