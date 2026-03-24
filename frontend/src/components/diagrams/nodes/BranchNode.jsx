import { useState } from 'react'
import { Handle, Position } from 'reactflow'

export default function BranchNode({ data, isConnectable }) {
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
      className="min-w-[120px] px-5 py-3 rounded-xl text-center"
      style={{
        background: 'rgba(139,92,246,0.08)',
        border: '1.5px solid rgba(139,92,246,0.3)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
    >
      <Handle type="target" position={Position.Left} id="left" isConnectable={isConnectable} className="!bg-[var(--c-secondary)] !w-2 !h-2" />
      <Handle type="source" position={Position.Right} id="right" isConnectable={isConnectable} className="!bg-[var(--c-secondary)] !w-2 !h-2" />
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="!bg-[var(--c-secondary)] !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="!bg-[var(--c-secondary)] !w-2 !h-2" />

      {editing ? (
        <input
          autoFocus
          defaultValue={data.label || 'Rama'}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent text-center text-white text-sm font-medium focus:outline-none"
        />
      ) : (
        <p className="text-white text-sm font-medium">{data.label || 'Rama'}</p>
      )}
    </div>
  )
}
