import { useState } from 'react'
import { Handle, Position } from 'reactflow'

export default function DecisionNode({ data, isConnectable }) {
  const [editing, setEditing] = useState(false)

  const handleBlur = (e) => {
    setEditing(false)
    if (data.onChange) data.onChange('label', e.target.value)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      setEditing(false)
      if (data.onChange) data.onChange('label', e.target.value)
    }
  }

  return (
    <div className="relative flex items-center justify-center" style={{ width: 120, height: 90 }}>
      {/* Diamond SVG */}
      <svg width="120" height="90" viewBox="0 0 120 90" className="absolute inset-0">
        <polygon
          points="60,2 118,45 60,88 2,45"
          fill="rgba(252,101,31,0.06)"
          stroke="rgba(252,101,31,0.4)"
          strokeWidth="1.5"
        />
      </svg>

      {/* Top: target */}
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="!bg-[var(--c-primary)] !w-2 !h-2" />
      {/* Bottom: Yes */}
      <Handle type="source" position={Position.Bottom} id="yes" isConnectable={isConnectable} className="!bg-[var(--c-success)] !w-2 !h-2" />
      {/* Right: No */}
      <Handle type="source" position={Position.Right} id="no" isConnectable={isConnectable} className="!bg-[var(--c-error)] !w-2 !h-2" />
      {/* Left: target */}
      <Handle type="target" position={Position.Left} id="left" isConnectable={isConnectable} className="!bg-[var(--c-primary)] !w-2 !h-2" />

      {/* Label */}
      <div
        className="relative z-10 text-center px-3"
        onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
      >
        {editing ? (
          <input
            autoFocus
            defaultValue={data.label || 'Condicion?'}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-center text-white text-xs font-medium focus:outline-none max-w-[80px]"
          />
        ) : (
          <p className="text-white text-xs font-medium">{data.label || 'Condicion?'}</p>
        )}
      </div>

      {/* Yes/No labels */}
      <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-[var(--c-success)] font-mono">Si</span>
      <span className="absolute top-1/2 -right-4 -translate-y-1/2 text-[9px] text-[var(--c-error)] font-mono">No</span>
    </div>
  )
}
