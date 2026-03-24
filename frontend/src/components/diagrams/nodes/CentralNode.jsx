import { useState } from 'react'
import { Handle, Position } from 'reactflow'

export default function CentralNode({ data, isConnectable }) {
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
      className="min-w-[160px] px-8 py-5 rounded-2xl text-center"
      style={{
        background: 'rgba(139,92,246,0.12)',
        border: '2px solid rgba(139,92,246,0.4)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 0 30px rgba(139,92,246,0.15), 0 4px 20px rgba(0,0,0,0.3)',
      }}
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
    >
      <Handle type="source" position={Position.Top} id="top" isConnectable={isConnectable} className="!bg-[var(--c-secondary)] !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Bottom} id="bottom" isConnectable={isConnectable} className="!bg-[var(--c-secondary)] !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Left} id="left" isConnectable={isConnectable} className="!bg-[var(--c-secondary)] !w-2.5 !h-2.5" />
      <Handle type="source" position={Position.Right} id="right" isConnectable={isConnectable} className="!bg-[var(--c-secondary)] !w-2.5 !h-2.5" />

      {editing ? (
        <input
          autoFocus
          defaultValue={data.label || 'Tema Central'}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent text-center text-white text-base font-bold focus:outline-none"
        />
      ) : (
        <p className="text-white text-base font-bold">{data.label || 'Tema Central'}</p>
      )}
    </div>
  )
}
