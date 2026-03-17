import { useState, useCallback, useRef } from 'react'
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { toast } from 'sonner'
import ClassNode from './nodes/ClassNode'
import InterfaceNode from './nodes/InterfaceNode'
import NoteNode from './nodes/NoteNode'
import DiagramToolbar from './DiagramToolbar'

const nodeTypes = {
  classNode: ClassNode,
  interfaceNode: InterfaceNode,
  noteNode: NoteNode,
}

const EDGE_STYLES = {
  default: {
    style: { stroke: 'rgba(255,255,255,0.3)', strokeWidth: 1.5 },
  },
  straight: {
    type: 'straight',
    style: { stroke: 'rgba(252,101,31,0.6)', strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(252,101,31,0.6)' },
  },
  step: {
    type: 'step',
    style: { stroke: 'rgba(139,92,246,0.6)', strokeWidth: 2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(139,92,246,0.6)' },
  },
  smoothstep: {
    type: 'smoothstep',
    style: { stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1.5, strokeDasharray: '5 5' },
    markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(255,255,255,0.3)' },
  },
}

const initialNodes = []
const initialEdges = []

let nodeId = 0
const getId = () => `node_${++nodeId}`

export default function DiagramEditor() {
  const reactFlowWrapper = useRef(null)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [edgeType, setEdgeType] = useState('default')
  const [reactFlowInstance, setReactFlowInstance] = useState(null)

  const onConnect = useCallback(
    (params) => {
      const edgeStyle = EDGE_STYLES[edgeType] || EDGE_STYLES.default
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            ...edgeStyle,
            id: `edge_${Date.now()}`,
          },
          eds
        )
      )
    },
    [edgeType, setEdges]
  )

  const handleNodeDataChange = useCallback(
    (nodeId) => (field, value) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, [field]: value } } : n
        )
      )
    },
    [setNodes]
  )

  const addNode = useCallback(
    (type) => {
      const center = reactFlowInstance
        ? reactFlowInstance.project({
            x: (reactFlowWrapper.current?.clientWidth || 600) / 2,
            y: (reactFlowWrapper.current?.clientHeight || 400) / 2,
          })
        : { x: 250 + Math.random() * 200, y: 150 + Math.random() * 200 }

      const id = getId()

      const defaultData = {
        classNode: { name: 'NuevaClase', attributes: '- atributo: String', methods: '+ metodo(): void' },
        interfaceNode: { name: 'NuevaInterface', methods: '+ metodo(): void' },
        noteNode: { text: 'Nota...' },
      }

      const newNode = {
        id,
        type,
        position: { x: center.x - 90, y: center.y - 50 },
        data: {
          ...defaultData[type],
          onChange: (field, value) => {
            setNodes((nds) =>
              nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, [field]: value } } : n))
            )
          },
        },
      }

      setNodes((nds) => [...nds, newNode])
    },
    [reactFlowInstance, setNodes]
  )

  const exportJSON = useCallback(() => {
    if (!reactFlowInstance) return
    const flow = reactFlowInstance.toObject()
    // Clean out onChange functions from data
    const cleanNodes = flow.nodes.map((n) => {
      const { onChange, ...rest } = n.data || {}
      return { ...n, data: rest }
    })
    const json = JSON.stringify({ ...flow, nodes: cleanNodes }, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'diagrama.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Diagrama exportado')
  }, [reactFlowInstance])

  const importJSON = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const text = await file.text()
        const flow = JSON.parse(text)
        // Re-attach onChange handlers
        const restoredNodes = (flow.nodes || []).map((n) => ({
          ...n,
          data: {
            ...n.data,
            onChange: (field, value) => {
              setNodes((nds) =>
                nds.map((nd) => (nd.id === n.id ? { ...nd, data: { ...nd.data, [field]: value } } : nd))
              )
            },
          },
        }))
        setNodes(restoredNodes)
        setEdges(flow.edges || [])
        toast.success('Diagrama importado')
      } catch {
        toast.error('Error al importar diagrama')
      }
    }
    input.click()
  }, [setNodes, setEdges])

  return (
    <div className="flex flex-col h-full gap-4">
      <DiagramToolbar
        onAddNode={addNode}
        onExportJSON={exportJSON}
        onImportJSON={importJSON}
        edgeType={edgeType}
        onEdgeTypeChange={setEdgeType}
      />

      <div
        ref={reactFlowWrapper}
        className="flex-1 rounded-xl overflow-hidden"
        style={{
          background: 'rgba(8,4,4,0.6)',
          border: '1px solid rgba(255,255,255,0.06)',
          minHeight: 500,
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode="Delete"
          style={{ background: 'transparent' }}
        >
          <Controls
            style={{
              background: 'rgba(12,6,8,0.9)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
            }}
          />
          <MiniMap
            nodeColor={(n) => {
              if (n.type === 'classNode') return '#FC651F'
              if (n.type === 'interfaceNode') return '#8B5CF6'
              if (n.type === 'noteNode') return '#F59E0B'
              return '#fff'
            }}
            style={{
              background: 'rgba(12,6,8,0.9)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8,
            }}
            maskColor="rgba(0,0,0,0.5)"
          />
          <Background color="rgba(255,255,255,0.03)" gap={20} />
        </ReactFlow>
      </div>
    </div>
  )
}
