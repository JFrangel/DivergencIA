import { useState } from 'react'
import { Handle, Position } from 'reactflow'

export default function LifelineNode({ data, isConnectable }) {
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
    <div className="flex flex-col items-center min-w-[80px]">
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="!bg-[var(--c-accent)] !w-2 !h-2" />
      <Handle type="target" position={Position.Left} id="left" isConnectable={isConnectable} className="!bg-[var(--c-accent)] !w-2 !h-2" />
      <Handle type="source" position={Position.Right} id="right" isConnectable={isConnectable} className="!bg-[var(--c-accent)] !w-2 !h-2" />

      {/* Header box */}
      <div
        className="px-4 py-2 rounded-md text-center mb-1"
        style={{
          background: 'rgba(0,209,255,0.08)',
          border: '1px solid rgba(0,209,255,0.3)',
        }}
        onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
      >
        {editing ? (
          <input
            autoFocus
            defaultValue={data.label || 'Object'}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-center text-white text-xs font-medium focus:outline-none"
          />
        ) : (
          <p className="text-white text-xs font-medium">{data.label || 'Object'}</p>
        )}
      </div>

      {/* Dashed vertical line */}
      <div
        className="w-px"
        style={{
          height: 120,
          borderLeft: '2px dashed rgba(0,209,255,0.3)',
        }}
      />

      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="!bg-[var(--c-accent)] !w-2 !h-2" />
    </div>
  )
}
