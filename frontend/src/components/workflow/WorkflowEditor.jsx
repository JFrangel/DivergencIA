import { useCallback, useRef, useState, useEffect, useMemo } from 'react'
import ReactFlow, {
  Background, Controls, MiniMap,
  useNodesState, useEdgesState,
  addEdge,
} from 'reactflow'
import 'reactflow/dist/style.css'
import TaskNode from './nodes/TaskNode'
import MilestoneNode from './nodes/MilestoneNode'
import DecisionNode from './nodes/DecisionNode'
import WorkflowToolbar from './WorkflowToolbar'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import { FiX } from 'react-icons/fi'
import { motion, AnimatePresence } from 'framer-motion'

const nodeTypes = { task: TaskNode, milestone: MilestoneNode, decision: DecisionNode }

const DEFAULT_TASK = {
  label: 'Nueva tarea',
  estado: 'pendiente',
  prioridad: 'media',
}

const MAX_HISTORY = 30

let nodeId = 0
function getId() { return `wf_${Date.now()}_${++nodeId}` }

/* ── Auto-layout constants ── */
const AUTO_COLUMNS = [
  { estado: 'pendiente',   x: 50,  color: '#6b7280', label: 'Pendiente' },
  { estado: 'en_progreso', x: 350, color: 'var(--c-primary)', label: 'En progreso' },
  { estado: 'completada',  x: 650, color: '#22c55e', label: 'Completada' },
  { estado: 'bloqueada',   x: 950, color: '#EF4444', label: 'Bloqueada' },
]

const ESTADO_COLOR_MAP = {
  pendiente:   '#6b7280',
  en_progreso: 'var(--c-primary)',
  revision:    '#F59E0B',
  completada:  '#22c55e',
  bloqueada:   '#EF4444',
}

/** Generate workflow nodes & edges from Kanban tasks */
function generateAutoWorkflow(tasks) {
  if (!tasks || tasks.length === 0) return { nodes: [], edges: [] }

  // Group tasks by estado
  const groups = {}
  for (const col of AUTO_COLUMNS) {
    groups[col.estado] = []
  }
  // Also handle 'revision' by mapping it into en_progreso column position
  groups['revision'] = []

  tasks.forEach((task) => {
    const estado = task.estado || 'pendiente'
    if (groups[estado]) {
      groups[estado].push(task)
    } else {
      groups['pendiente'].push(task)
    }
  })

  const nodes = []
  const edges = []
  const nodeIdMap = {} // task.id -> node id

  // Build column config including revision between en_progreso and completada
  const columnConfig = [
    { estado: 'pendiente',   x: 50 },
    { estado: 'en_progreso', x: 300 },
    { estado: 'revision',    x: 550 },
    { estado: 'completada',  x: 800 },
    { estado: 'bloqueada',   x: 1050 },
  ]

  // Create nodes for each column
  columnConfig.forEach((col) => {
    const tasksInCol = groups[col.estado] || []
    tasksInCol.forEach((task, idx) => {
      const nId = `auto_${task.id}`
      nodeIdMap[task.id] = nId

      const assigneeName = task.asignado?.nombre || task.asignado_nombre || ''
      const assigneePhoto = task.asignado?.foto_url || ''

      nodes.push({
        id: nId,
        type: 'task',
        position: { x: col.x, y: idx * 130 + 50 },
        draggable: false,
        selectable: false,
        data: {
          label: task.titulo || 'Sin titulo',
          estado: task.estado || 'pendiente',
          prioridad: task.prioridad || 'media',
          descripcion: task.descripcion || '',
          asignado: assigneeName,
          avatarUrl: assigneePhoto,
          autoMode: true,
          taskId: task.id,
        },
      })
    })
  })

  // Create edges: connect tasks sequentially within each column
  columnConfig.forEach((col) => {
    const tasksInCol = groups[col.estado] || []
    for (let i = 0; i < tasksInCol.length - 1; i++) {
      const sourceId = nodeIdMap[tasksInCol[i].id]
      const targetId = nodeIdMap[tasksInCol[i + 1].id]
      edges.push({
        id: `e_${sourceId}_${targetId}`,
        source: sourceId,
        target: targetId,
        animated: false,
        style: { stroke: 'rgba(255,255,255,0.08)', strokeWidth: 1 },
        type: 'smoothstep',
      })
    }
  })

  // Create edges between adjacent columns (first task of each col to first task of next)
  for (let c = 0; c < columnConfig.length - 1; c++) {
    const currentCol = groups[columnConfig[c].estado] || []
    const nextCol = groups[columnConfig[c + 1].estado] || []
    if (currentCol.length > 0 && nextCol.length > 0) {
      // Connect last of current column to first of next column
      const sourceId = nodeIdMap[currentCol[currentCol.length - 1].id]
      const targetId = nodeIdMap[nextCol[0].id]
      edges.push({
        id: `e_cross_${sourceId}_${targetId}`,
        source: sourceId,
        target: targetId,
        animated: true,
        style: {
          stroke: 'color-mix(in srgb, var(--c-secondary) 40%, transparent)',
          strokeWidth: 1.5,
          strokeDasharray: '6 3',
        },
        type: 'smoothstep',
      })
    }
  }

  return { nodes, edges }
}

export default function WorkflowEditor({ projectId, initialData, tasks = [] }) {
  const parsed = initialData || { nodes: [], edges: [] }
  const [nodes, setNodes, onNodesChange] = useNodesState(parsed.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(parsed.edges)
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState('manual') // 'auto' | 'manual'
  const reactFlowWrapper = useRef(null)
  const reactFlowInstance = useRef(null)

  // Edit modal state
  const [editingNode, setEditingNode] = useState(null)
  const [editForm, setEditForm] = useState({})

  // Undo history
  const [history, setHistory] = useState([])
  const [canUndo, setCanUndo] = useState(false)
  const skipHistoryRef = useRef(false)

  /* ── Auto-generated workflow from tasks ── */
  const autoWorkflow = useMemo(() => generateAutoWorkflow(tasks), [tasks])

  // When switching to auto mode or tasks change, apply auto layout
  useEffect(() => {
    if (mode === 'auto') {
      setNodes(autoWorkflow.nodes)
      setEdges(autoWorkflow.edges)
      // Fit view after nodes update
      setTimeout(() => {
        reactFlowInstance.current?.fitView({ padding: 0.3, duration: 400 })
      }, 100)
    }
  }, [mode, autoWorkflow, setNodes, setEdges])

  // When switching back to manual, restore saved workflow
  const manualSnapshotRef = useRef({ nodes: parsed.nodes, edges: parsed.edges })

  const handleModeChange = useCallback((newMode) => {
    if (newMode === mode) return
    if (mode === 'manual') {
      // Save current manual state before switching to auto
      manualSnapshotRef.current = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
      }
    }
    if (newMode === 'manual') {
      // Restore manual state
      setNodes(manualSnapshotRef.current.nodes)
      setEdges(manualSnapshotRef.current.edges)
    }
    setMode(newMode)
  }, [mode, nodes, edges, setNodes, setEdges])

  // Push current state to undo history
  const pushHistory = useCallback(() => {
    setHistory((prev) => {
      const snapshot = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
      }
      const next = [...prev, snapshot]
      if (next.length > MAX_HISTORY) next.shift()
      return next
    })
    setCanUndo(true)
  }, [nodes, edges])

  // Undo
  const handleUndo = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) return prev
      const next = [...prev]
      const snapshot = next.pop()
      skipHistoryRef.current = true
      setNodes(snapshot.nodes)
      setEdges(snapshot.edges)
      if (next.length === 0) setCanUndo(false)
      return next
    })
  }, [setNodes, setEdges])

  // Keyboard shortcut for undo
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        handleUndo()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleUndo])

  const onConnect = useCallback(
    (params) => {
      if (mode === 'auto') return // No manual connections in auto mode
      pushHistory()
      setEdges((eds) => addEdge({
        ...params,
        animated: true,
        style: { stroke: 'color-mix(in srgb, var(--c-secondary) 40%, transparent)', strokeWidth: 1.5 },
      }, eds))
    },
    [setEdges, pushHistory, mode]
  )

  const addNode = useCallback((type) => {
    if (mode === 'auto') return // No manual nodes in auto mode
    pushHistory()
    const viewport = reactFlowInstance.current?.getViewport()
    const x = (viewport ? (-viewport.x + 400) / viewport.zoom : 250) + Math.random() * 80
    const y = (viewport ? (-viewport.y + 200) / viewport.zoom : 150) + Math.random() * 80

    const dataMap = {
      task: { ...DEFAULT_TASK },
      milestone: { label: 'Nuevo hito', completed: false },
      decision: { label: '¿Condicion?' },
    }

    const newNode = {
      id: getId(),
      type,
      position: { x, y },
      draggable: true,
      data: dataMap[type] || dataMap.task,
    }

    setNodes((nds) => [...nds, newNode])
  }, [setNodes, pushHistory, mode])

  // Double-click node to open edit modal
  const onNodeDoubleClick = useCallback((event, node) => {
    if (mode === 'auto') return // No editing in auto mode
    event.stopPropagation()
    setEditingNode(node)
    setEditForm({ ...node.data })
  }, [mode])

  // Apply edits from the modal
  const applyEdit = useCallback(() => {
    if (!editingNode) return
    pushHistory()
    setNodes((nds) =>
      nds.map((n) =>
        n.id === editingNode.id
          ? { ...n, data: { ...n.data, ...editForm } }
          : n
      )
    )
    setEditingNode(null)
    setEditForm({})
  }, [editingNode, editForm, setNodes, pushHistory])

  // Delete selected nodes via keyboard
  const onNodesDelete = useCallback((deleted) => {
    if (mode === 'auto') return
    if (deleted.length > 0) pushHistory()
  }, [pushHistory, mode])

  const onEdgesDelete = useCallback((deleted) => {
    if (mode === 'auto') return
    if (deleted.length > 0) pushHistory()
  }, [pushHistory, mode])

  const handleSave = async () => {
    if (!projectId) return
    if (mode === 'auto') {
      toast.info('El modo auto se genera desde las tareas')
      return
    }
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
    if (mode === 'auto') return
    pushHistory()
    setNodes([])
    setEdges([])
  }

  // Make edges selectable for deletion
  const edgesWithSelectable = edges.map((e) => ({
    ...e,
    selectable: mode === 'manual',
  }))

  const isAuto = mode === 'auto'

  return (
    <div className="flex flex-col gap-3">
      <WorkflowToolbar
        onAddNode={addNode}
        onSave={handleSave}
        onClear={handleClear}
        onUndo={handleUndo}
        canUndo={canUndo}
        saving={saving}
        mode={mode}
        onModeChange={handleModeChange}
        tasksCount={tasks.length}
      />

      {/* Auto mode info banner */}
      <AnimatePresence>
        {isAuto && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-[var(--c-primary)]/15 bg-[var(--c-primary)]/[0.04]">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--c-primary)] animate-pulse" />
              <p className="text-xs text-white/50">
                <span className="text-[var(--c-primary)] font-medium">Modo auto</span> — El workflow se genera automaticamente desde las {tasks.length} tarea{tasks.length !== 1 ? 's' : ''} del Kanban. Edita las tareas en la pestana Kanban para actualizar el diagrama.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Auto mode column headers */}
      {isAuto && tasks.length > 0 && (
        <div className="flex gap-2 px-1">
          {[
            { label: 'Pendiente', color: '#6b7280', count: tasks.filter(t => t.estado === 'pendiente').length },
            { label: 'En progreso', color: 'var(--c-primary)', count: tasks.filter(t => t.estado === 'en_progreso').length },
            { label: 'Revision', color: '#F59E0B', count: tasks.filter(t => t.estado === 'revision').length },
            { label: 'Completada', color: '#22c55e', count: tasks.filter(t => t.estado === 'completada').length },
            { label: 'Bloqueada', color: '#EF4444', count: tasks.filter(t => t.estado === 'bloqueada').length },
          ].filter(c => c.count > 0).map((col) => (
            <div
              key={col.label}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium"
              style={{
                background: `color-mix(in srgb, ${col.color} 8%, transparent)`,
                border: `1px solid color-mix(in srgb, ${col.color} 15%, transparent)`,
                color: col.color,
              }}
            >
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: col.color }} />
              {col.label}
              <span className="ml-0.5 opacity-60">{col.count}</span>
            </div>
          ))}
        </div>
      )}

      <div
        ref={reactFlowWrapper}
        className="w-full rounded-xl overflow-hidden border border-white/[0.06]"
        style={{ height: 500, background: 'rgba(6,3,4,0.6)' }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edgesWithSelectable}
          onNodesChange={isAuto ? undefined : onNodesChange}
          onEdgesChange={isAuto ? undefined : onEdgesChange}
          onConnect={onConnect}
          onInit={(instance) => { reactFlowInstance.current = instance }}
          onNodeDoubleClick={onNodeDoubleClick}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          nodeTypes={nodeTypes}
          nodesDraggable={!isAuto}
          nodesConnectable={!isAuto}
          elementsSelectable={!isAuto}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.2}
          maxZoom={3}
          deleteKeyCode={isAuto ? [] : ['Backspace', 'Delete']}
          selectionKeyCode={isAuto ? null : 'Shift'}
          multiSelectionKeyCode={isAuto ? null : 'Shift'}
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
              if (n.data?.autoMode) {
                return ESTADO_COLOR_MAP[n.data.estado] || '#6b7280'
              }
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

      {/* Empty state for auto mode with no tasks */}
      {isAuto && tasks.length === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-white/20">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="text-sm text-white/30 mb-1">No hay tareas en el Kanban</p>
          <p className="text-xs text-white/20">Crea tareas en la pestana Kanban para generar el workflow automaticamente</p>
        </div>
      )}

      {/* Edit Node Modal (manual mode only) */}
      {editingNode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setEditingNode(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl p-5 shadow-2xl"
            style={{
              background: 'rgba(12,6,8,0.97)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white/80">
                Editar {editingNode.type === 'task' ? 'Tarea' : editingNode.type === 'milestone' ? 'Hito' : 'Decision'}
              </h3>
              <button
                onClick={() => setEditingNode(null)}
                className="p-1 rounded-md text-white/30 hover:text-white hover:bg-white/10 transition-colors"
              >
                <FiX size={14} />
              </button>
            </div>

            {/* Label field (all types) */}
            <div className="mb-3">
              <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1 font-semibold">
                Nombre
              </label>
              <input
                type="text"
                value={editForm.label || ''}
                onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))}
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg text-white text-xs px-3 py-2 focus:outline-none focus:border-[var(--c-primary)]/60 placeholder-white/30"
              />
            </div>

            {/* Task-specific fields */}
            {editingNode.type === 'task' && (
              <>
                <div className="mb-3">
                  <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1 font-semibold">
                    Estado
                  </label>
                  <select
                    value={editForm.estado || 'pendiente'}
                    onChange={(e) => setEditForm((f) => ({ ...f, estado: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg text-white text-xs px-3 py-2 focus:outline-none focus:border-[var(--c-primary)]/60 cursor-pointer [&>option]:bg-[#0c0608]"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_progreso">En progreso</option>
                    <option value="revision">Revision</option>
                    <option value="completada">Completada</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1 font-semibold">
                    Prioridad
                  </label>
                  <select
                    value={editForm.prioridad || 'media'}
                    onChange={(e) => setEditForm((f) => ({ ...f, prioridad: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg text-white text-xs px-3 py-2 focus:outline-none focus:border-[var(--c-primary)]/60 cursor-pointer [&>option]:bg-[#0c0608]"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Critica</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1 font-semibold">
                    Descripcion
                  </label>
                  <textarea
                    value={editForm.descripcion || ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, descripcion: e.target.value }))}
                    rows={3}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg text-white text-xs px-3 py-2 focus:outline-none focus:border-[var(--c-primary)]/60 placeholder-white/30 resize-none"
                    placeholder="Descripcion de la tarea..."
                  />
                </div>
                <div className="mb-3">
                  <label className="block text-[10px] text-white/40 uppercase tracking-wider mb-1 font-semibold">
                    Asignado a
                  </label>
                  <input
                    type="text"
                    value={editForm.asignado || ''}
                    onChange={(e) => setEditForm((f) => ({ ...f, asignado: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/10 rounded-lg text-white text-xs px-3 py-2 focus:outline-none focus:border-[var(--c-primary)]/60 placeholder-white/30"
                    placeholder="Nombre del responsable..."
                  />
                </div>
              </>
            )}

            {/* Milestone-specific fields */}
            {editingNode.type === 'milestone' && (
              <div className="mb-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.completed || false}
                    onChange={(e) => setEditForm((f) => ({ ...f, completed: e.target.checked }))}
                    className="w-3.5 h-3.5 rounded accent-[var(--c-secondary)]"
                  />
                  <span className="text-xs text-white/60">Completado</span>
                </label>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/[0.06]">
              <button
                onClick={() => {
                  pushHistory()
                  setNodes((nds) => nds.filter((n) => n.id !== editingNode.id))
                  // Also remove connected edges
                  setEdges((eds) => eds.filter((e) => e.source !== editingNode.id && e.target !== editingNode.id))
                  setEditingNode(null)
                  toast.success('Nodo eliminado')
                }}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#EF4444] bg-[#EF4444]/10 border border-[#EF4444]/20 hover:bg-[#EF4444]/20 transition-all"
              >
                Eliminar
              </button>
              <div className="flex-1" />
              <button
                onClick={() => setEditingNode(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={applyEdit}
                className="px-4 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-105"
                style={{
                  background: 'var(--c-primary)',
                  color: '#fff',
                  border: '1px solid color-mix(in srgb, var(--c-primary) 50%, transparent)',
                }}
              >
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
