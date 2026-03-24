import { useState } from 'react'
import { Handle, Position } from 'reactflow'

export default function LeafNode({ data, isConnectable }) {
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
    <div
      className="min-w-[80px] px-3 py-1.5 rounded-lg text-center"
      style={{
        background: 'rgba(139,92,246,0.05)',
        border: '1px solid rgba(139,92,246,0.2)',
        backdropFilter: 'blur(8px)',
      }}
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
    >
      <Handle type="target" position={Position.Left} id="left" isConnectable={isConnectable} className="!bg-[var(--c-secondary)] !w-1.5 !h-1.5" />
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="!bg-[var(--c-secondary)] !w-1.5 !h-1.5" />
      <Handle type="source" position={Position.Right} id="right" isConnectable={isConnectable} className="!bg-[var(--c-secondary)] !w-1.5 !h-1.5" />
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="!bg-[var(--c-secondary)] !w-1.5 !h-1.5" />

      {editing ? (
        <input
          autoFocus
          defaultValue={data.label || 'Hoja'}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent text-center text-white text-xs focus:outline-none"
        />
      ) : (
        <p className="text-white text-xs">{data.label || 'Hoja'}</p>
      )}
    </div>
  )
}
