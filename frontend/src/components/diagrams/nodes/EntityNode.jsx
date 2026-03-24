import { useState } from 'react'
import { Handle, Position } from 'reactflow'

export default function EntityNode({ data, isConnectable }) {
  const [editing, setEditing] = useState(null)

  const handleDoubleClick = (field) => (e) => {
    e.stopPropagation()
    setEditing(field)
  }

  const handleBlur = (field) => (e) => {
    setEditing(null)
    if (data.onChange) data.onChange(field, e.target.value)
  }

  const handleKeyDown = (field) => (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      setEditing(null)
      if (data.onChange) data.onChange(field, e.target.value)
    }
  }

  return (
    <div
      className="min-w-[180px] rounded-lg overflow-hidden"
      style={{
        background: 'rgba(12,6,8,0.85)',
        border: '1px solid rgba(34,197,94,0.35)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      }}
    >
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="!bg-[var(--c-success)] !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="!bg-[var(--c-success)] !w-2 !h-2" />
      <Handle type="target" position={Position.Left} id="left" isConnectable={isConnectable} className="!bg-[var(--c-success)] !w-2 !h-2" />
      <Handle type="source" position={Position.Right} id="right" isConnectable={isConnectable} className="!bg-[var(--c-success)] !w-2 !h-2" />

      {/* Entity name header */}
      <div
        className="px-3 py-2 text-center border-b border-white/10"
        style={{ background: 'rgba(34,197,94,0.1)' }}
        onDoubleClick={handleDoubleClick('name')}
      >
        {editing === 'name' ? (
          <input
            autoFocus
            defaultValue={data.name || 'Entity'}
            onBlur={handleBlur('name')}
            onKeyDown={handleKeyDown('name')}
            className="w-full bg-transparent text-center text-white font-bold text-sm focus:outline-none"
          />
        ) : (
          <p className="text-white font-bold text-sm">{data.name || 'Entity'}</p>
        )}
      </div>

      {/* Attributes body */}
      <div
        className="px-3 py-2 min-h-[40px]"
        onDoubleClick={handleDoubleClick('attributes')}
      >
        {editing === 'attributes' ? (
          <textarea
            autoFocus
            defaultValue={data.attributes || ''}
            onBlur={handleBlur('attributes')}
            rows={4}
            className="w-full bg-transparent text-white/70 text-xs font-mono focus:outline-none resize-none"
            placeholder="id PK int&#10;name varchar&#10;email varchar"
          />
        ) : (
          <pre className="text-white/70 text-xs font-mono whitespace-pre-wrap">
            {data.attributes || 'id PK int\nname varchar'}
          </pre>
        )}
      </div>
    </div>
  )
}
