import { useState, useCallback, useRef, useEffect } from 'react'
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
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
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

export default function DiagramEditor({ projectId } = {}) {
  const reactFlowWrapper = useRef(null)
  const { user } = useAuth()
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  const [edgeType, setEdgeType] = useState('default')
  const [reactFlowInstance, setReactFlowInstance] = useState(null)

  // Supabase save/load state
  const [savedDiagrams, setSavedDiagrams] = useState([])
  const [currentDiagramId, setCurrentDiagramId] = useState(null)
  const [diagramTitle, setDiagramTitle] = useState('')
  const [showDiagramList, setShowDiagramList] = useState(false)
  const [saving, setSaving] = useState(false)

  // Fetch user's diagrams on mount
  useEffect(() => {
    if (!user) return
    loadDiagramList()
  }, [user, projectId])

  const loadDiagramList = async () => {
    if (!user) return
    let query = supabase
      .from('diagramas')
      .select('id, titulo, tipo, created_at, updated_at')
      .eq('autor_id', user.id)
      .order('updated_at', { ascending: false })

    if (projectId) {
      query = query.eq('proyecto_id', projectId)
    }

    const { data } = await query
    setSavedDiagrams(data || [])
  }

  /** Strip onChange handlers before serializing */
  const getCleanData = useCallback(() => {
    const cleanNodes = nodes.map((n) => {
      const { onChange, ...rest } = n.data || {}
      return { ...n, data: rest }
    })
    return { nodes: cleanNodes, edges }
  }, [nodes, edges])

  /** Restore onChange handlers after loading */
  const restoreNodes = useCallback((rawNodes) => {
    return (rawNodes || []).map((n) => ({
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
  }, [setNodes])

  // Save diagram to Supabase
  const saveDiagram = useCallback(async () => {
    if (!user) { toast.error('Debes iniciar sesion'); return }

    const title = diagramTitle.trim() || 'Diagrama sin titulo'
    const datos = getCleanData()
    setSaving(true)

    try {
      if (currentDiagramId) {
        // Update existing
        const { error } = await supabase
          .from('diagramas')
          .update({
            titulo: title,
            datos,
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentDiagramId)

        if (error) throw error
        toast.success('Diagrama actualizado')
      } else {
        // Insert new
        const payload = {
          titulo: title,
          descripcion: '',
          tipo: 'uml',
          datos,
          autor_id: user.id,
          publico: false,
        }
        if (projectId) payload.proyecto_id = projectId

        const { data, error } = await supabase
          .from('diagramas')
          .insert(payload)
          .select('id')
          .single()

        if (error) throw error
        setCurrentDiagramId(data.id)
        toast.success('Diagrama guardado')
      }
      await loadDiagramList()
    } catch (err) {
      console.error(err)
      toast.error('Error al guardar diagrama')
    } finally {
      setSaving(false)
    }
  }, [user, currentDiagramId, diagramTitle, getCleanData, projectId])

  // Load a specific diagram
  const loadDiagram = useCallback(async (diagramId) => {
    const { data, error } = await supabase
      .from('diagramas')
      .select('*')
      .eq('id', diagramId)
      .single()

    if (error || !data) {
      toast.error('Error al cargar diagrama')
      return
    }

    const datos = data.datos || {}
    setNodes(restoreNodes(datos.nodes || []))
    setEdges(datos.edges || [])
    setCurrentDiagramId(data.id)
    setDiagramTitle(data.titulo || '')
    setShowDiagramList(false)
    toast.success(`Diagrama "${data.titulo}" cargado`)
  }, [setNodes, setEdges, restoreNodes])

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
        setNodes(restoreNodes(flow.nodes || []))
        setEdges(flow.edges || [])
        toast.success('Diagrama importado')
      } catch {
        toast.error('Error al importar diagrama')
      }
    }
    input.click()
  }, [setNodes, setEdges, restoreNodes])

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Save bar */}
      <div
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl flex-wrap"
        style={{
          background: 'rgba(12,6,8,0.9)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <input
          type="text"
          value={diagramTitle}
          onChange={(e) => setDiagramTitle(e.target.value)}
          placeholder="Titulo del diagrama..."
          className="bg-white/[0.04] border border-white/10 rounded-lg text-white text-xs px-3 py-1.5 focus:outline-none focus:border-[#FC651F]/60 flex-1 min-w-[180px] placeholder-white/30"
        />

        <button
          onClick={saveDiagram}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 hover:scale-105 disabled:opacity-50"
          style={{
            background: 'rgba(252,101,31,0.1)',
            border: '1px solid rgba(252,101,31,0.4)',
            color: '#FC651F',
          }}
        >
          {saving ? 'Guardando...' : currentDiagramId ? 'Actualizar' : 'Guardar'}
        </button>

        {/* Mis Diagramas dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDiagramList((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 hover:text-white bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-all"
          >
            Mis Diagramas
            {savedDiagrams.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/10">
                {savedDiagrams.length}
              </span>
            )}
          </button>

          {showDiagramList && (
            <div
              className="absolute right-0 top-full mt-1 w-72 rounded-xl overflow-hidden shadow-2xl z-50"
              style={{
                background: 'rgba(12,6,8,0.98)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(16px)',
              }}
            >
              <div className="px-3 py-2 border-b border-white/[0.06]">
                <span className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">
                  Mis Diagramas
                </span>
              </div>
              <div className="max-h-60 overflow-y-auto">
                {savedDiagrams.length === 0 ? (
                  <p className="text-center text-white/20 text-xs py-6">Sin diagramas guardados</p>
                ) : (
                  savedDiagrams.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => loadDiagram(d.id)}
                      className="w-full text-left px-3 py-2.5 border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors"
                      style={d.id === currentDiagramId ? { background: 'rgba(252,101,31,0.06)' } : {}}
                    >
                      <p className="text-xs text-white/80 font-medium truncate">{d.titulo || 'Sin titulo'}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">
                        {d.tipo} &middot; {new Date(d.updated_at || d.created_at).toLocaleDateString('es-MX')}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {currentDiagramId && (
          <button
            onClick={() => {
              setCurrentDiagramId(null)
              setDiagramTitle('')
              setNodes([])
              setEdges([])
              toast('Nuevo diagrama')
            }}
            className="text-xs text-white/40 hover:text-white transition-colors"
          >
            + Nuevo
          </button>
        )}
      </div>

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
