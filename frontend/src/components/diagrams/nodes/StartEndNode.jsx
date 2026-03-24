import { useState } from 'react'
import { Handle, Position } from 'reactflow'

export default function StartEndNode({ data, isConnectable }) {
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
      className="min-w-[100px] px-6 py-2.5 rounded-full text-center"
      style={{
        background: 'rgba(12,6,8,0.85)',
        border: '1.5px solid rgba(252,101,31,0.4)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
    >
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="!bg-[var(--c-primary)] !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="!bg-[var(--c-primary)] !w-2 !h-2" />
      <Handle type="target" position={Position.Left} id="left" isConnectable={isConnectable} className="!bg-[var(--c-primary)] !w-2 !h-2" />
      <Handle type="source" position={Position.Right} id="right" isConnectable={isConnectable} className="!bg-[var(--c-primary)] !w-2 !h-2" />

      {editing ? (
        <input
          autoFocus
          defaultValue={data.label || 'Inicio'}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent text-center text-white text-sm font-medium focus:outline-none"
        />
      ) : (
        <p className="text-white text-sm font-medium">{data.label || 'Inicio'}</p>
      )}
    </div>
  )
}
