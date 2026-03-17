import { useState } from 'react'
import { Handle, Position, NodeResizer } from 'reactflow'

export default function NoteNode({ data, selected, isConnectable }) {
  const [editing, setEditing] = useState(false)

  const handleBlur = (e) => {
    setEditing(false)
    if (data.onChange) data.onChange('text', e.target.value)
  }

  return (
    <>
      <NodeResizer
        color="rgba(245,158,11,0.5)"
        isVisible={selected}
        minWidth={120}
        minHeight={60}
      />
      <div
        className="w-full h-full rounded-lg p-3"
        style={{
          background: 'rgba(245,158,11,0.08)',
          border: '1px solid rgba(245,158,11,0.25)',
          minWidth: 120,
          minHeight: 60,
        }}
        onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
      >
        <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="!bg-[#F59E0B] !w-2 !h-2" />
        <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="!bg-[#F59E0B] !w-2 !h-2" />

        {editing ? (
          <textarea
            autoFocus
            defaultValue={data.text || ''}
            onBlur={handleBlur}
            className="w-full h-full bg-transparent text-white/70 text-xs focus:outline-none resize-none"
            placeholder="Escribe una nota..."
          />
        ) : (
          <p className="text-white/70 text-xs whitespace-pre-wrap">
            {data.text || 'Doble clic para editar...'}
          </p>
        )}
      </div>
    </>
  )
}
