import { useState } from 'react'
import { Handle, Position } from 'reactflow'

export default function IONode({ data, isConnectable }) {
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
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 50 }}>
      {/* Parallelogram SVG */}
      <svg width="140" height="50" viewBox="0 0 140 50" className="absolute inset-0">
        <polygon
          points="20,2 138,2 120,48 2,48"
          fill="rgba(252,101,31,0.06)"
          stroke="rgba(252,101,31,0.35)"
          strokeWidth="1.5"
        />
      </svg>

      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="!bg-[var(--c-primary)] !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="!bg-[var(--c-primary)] !w-2 !h-2" />
      <Handle type="target" position={Position.Left} id="left" isConnectable={isConnectable} className="!bg-[var(--c-primary)] !w-2 !h-2" />
      <Handle type="source" position={Position.Right} id="right" isConnectable={isConnectable} className="!bg-[var(--c-primary)] !w-2 !h-2" />

      {/* Label */}
      <div
        className="relative z-10 text-center px-4"
        onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
      >
        {editing ? (
          <input
            autoFocus
            defaultValue={data.label || 'Entrada/Salida'}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-center text-white text-xs font-medium focus:outline-none"
          />
        ) : (
          <p className="text-white text-xs font-medium">{data.label || 'Entrada/Salida'}</p>
        )}
      </div>
    </div>
  )
}
