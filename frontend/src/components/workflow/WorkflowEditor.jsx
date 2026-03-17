import { useCallback, useRef, useState } from 'react'
import ReactFlow, {
  Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  addEdge,
  Handle, Position,
} from 'reactflow'
import 'reactflow/dist/style.css'
import TaskNode from './nodes/TaskNode'
import MilestoneNode from './nodes/MilestoneNode'
import DecisionNode from './nodes/DecisionNode'
import WorkflowToolbar from './WorkflowToolbar'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'

const nodeTypes = { task: TaskNode, milestone: MilestoneNode, decision: DecisionNode }

const DEFAULT_TASK = {
  label: 'Nueva tarea',
  estado: 'pendiente',
  prioridad: 'media',
}

let nodeId = 0
function getId() { return `wf_${Date.now()}_${++nodeId}` }

export default function WorkflowEditor({ projectId, initialData }) {
  const parsed = initialData || { nodes: [], edges: [] }
  const [nodes, setNodes, onNodesChange] = useNodesState(parsed.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(parsed.edges)
  const [saving, setSaving] = useState(false)
  const reactFlowWrapper = useRef(null)
  const reactFlowInstance = useRef(null)

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({
      ...params,
      animated: true,
      style: { stroke: 'color-mix(in srgb, var(--c-secondary) 40%, transparent)', strokeWidth: 1.5 },
    }, eds)),
    [setEdges]
  )

  const addNode = useCallback((type) => {
    const viewport = reactFlowInstance.current?.getViewport()
    const x = (viewport ? (-viewport.x + 400) / viewport.zoom : 250) + Math.random() * 80
    const y = (viewport ? (-viewport.y + 200) / viewport.zoom : 150) + Math.random() * 80

    const dataMap = {
      task: { ...DEFAULT_TASK },
      milestone: { label: 'Nuevo hito', completed: false },
      decision: { label: '¿Condición?' },
    }

    const newNode = {
      id: getId(),
      type,
      position: { x, y },
      data: dataMap[type] || dataMap.task,
    }

    setNodes((nds) => [...nds, newNode])
  }, [setNodes])

  const handleSave = async () => {
    if (!projectId) return
    setSaving(true)
    const flow = reactFlowInstance.current?.toObject()
    const workflow_data = flow ? { nodes: flow.nodes, edges: flow.edges } : { nodes, edges }
    const { error } = await supabase
      .from('proyectos')
      .update({ workflow_data })
      .eq('id', projectId)
    setSaving(false)
    if (error) {
      toast.error('Error al guardar workflow')
    } else {
      toast.success('Workflow guardado')
    }
  }

  const handleClear = () => {
    setNodes([])
    setEdges([])
  }

  return (
    <div className="flex flex-col gap-3">
      <WorkflowToolbar
        onAddNode={addNode}
        onSave={handleSave}
        onClear={handleClear}
        saving={saving}
      />

      <div
        ref={reactFlowWrapper}
        className="w-full rounded-xl overflow-hidden border border-white/[0.06]"
        style={{ height: 500, background: 'rgba(6,3,4,0.6)' }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={(instance) => { reactFlowInstance.current = instance }}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.2}
          maxZoom={3}
          deleteKeyCode={['Backspace', 'Delete']}
          style={{ background: 'transparent' }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#ffffff06" gap={25} size={1} variant="dots" />
          <Controls
            className="!bg-white/[0.04] !border !border-white/[0.08] !rounded-xl overflow-hidden"
            showInteractive={false}
          />
          <MiniMap
            nodeColor={n => {
              if (n.type === 'milestone') return 'var(--c-secondary)'
              if (n.type === 'decision') return 'var(--c-accent)'
              return 'var(--c-primary)'
            }}
            style={{
              background: 'rgba(6,3,4,0.9)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 12,
            }}
            maskColor="rgba(6,3,4,0.7)"
          />
        </ReactFlow>
      </div>
    </div>
  )
}
