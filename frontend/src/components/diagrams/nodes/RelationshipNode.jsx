import { useState } from 'react'
import { Handle, Position } from 'reactflow'

export default function RelationshipNode({ data, isConnectable }) {
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
    <div className="relative flex items-center justify-center" style={{ width: 100, height: 70 }}>
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="!bg-[var(--c-success)] !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="!bg-[var(--c-success)] !w-2 !h-2" />
      <Handle type="target" position={Position.Left} id="left" isConnectable={isConnectable} className="!bg-[var(--c-success)] !w-2 !h-2" />
      <Handle type="source" position={Position.Right} id="right" isConnectable={isConnectable} className="!bg-[var(--c-success)] !w-2 !h-2" />

      {/* Diamond shape via SVG */}
      <svg width="100" height="70" viewBox="0 0 100 70" className="absolute inset-0">
        <polygon
          points="50,2 98,35 50,68 2,35"
          fill="rgba(34,197,94,0.08)"
          stroke="rgba(34,197,94,0.4)"
          strokeWidth="1.5"
        />
      </svg>

      {/* Label */}
      <div
        className="relative z-10 text-center px-2"
        onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
      >
        {editing ? (
          <input
            autoFocus
            defaultValue={data.label || 'has'}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-center text-white text-xs font-medium focus:outline-none max-w-[70px]"
          />
        ) : (
          <p className="text-white text-xs font-medium">{data.label || 'has'}</p>
        )}
      </div>
    </div>
  )
}
