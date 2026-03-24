import { useState } from 'react'
import { Handle, Position } from 'reactflow'

export default function ActorNode({ data, isConnectable }) {
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
    <div className="flex flex-col items-center gap-1 min-w-[80px]">
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="!bg-[var(--c-accent)] !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="!bg-[var(--c-accent)] !w-2 !h-2" />
      <Handle type="target" position={Position.Left} id="left" isConnectable={isConnectable} className="!bg-[var(--c-accent)] !w-2 !h-2" />
      <Handle type="source" position={Position.Right} id="right" isConnectable={isConnectable} className="!bg-[var(--c-accent)] !w-2 !h-2" />

      {/* Stick figure SVG */}
      <svg width="40" height="52" viewBox="0 0 40 52" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Head */}
        <circle cx="20" cy="8" r="7" stroke="var(--c-accent)" strokeWidth="1.5" fill="rgba(0,209,255,0.08)" />
        {/* Body */}
        <line x1="20" y1="15" x2="20" y2="34" stroke="var(--c-accent)" strokeWidth="1.5" />
        {/* Arms */}
        <line x1="6" y1="22" x2="34" y2="22" stroke="var(--c-accent)" strokeWidth="1.5" />
        {/* Left leg */}
        <line x1="20" y1="34" x2="8" y2="50" stroke="var(--c-accent)" strokeWidth="1.5" />
        {/* Right leg */}
        <line x1="20" y1="34" x2="32" y2="50" stroke="var(--c-accent)" strokeWidth="1.5" />
      </svg>

      {/* Label */}
      <div onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}>
        {editing ? (
          <input
            autoFocus
            defaultValue={data.label || 'Actor'}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-center text-white text-xs font-medium focus:outline-none"
          />
        ) : (
          <p className="text-white text-xs font-medium text-center">{data.label || 'Actor'}</p>
        )}
      </div>
    </div>
  )
}
