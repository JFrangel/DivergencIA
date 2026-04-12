import { useState, useCallback, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  MarkerType,
  Panel,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useLibrary } from '../../hooks/useLibrary'
import {
  FiTrash2, FiSave, FiPlus, FiDownload, FiUpload, FiChevronDown,
  FiCheck, FiEdit2, FiImage, FiFileMinus, FiBookmark,
} from 'react-icons/fi'

// Class diagram nodes
import ClassNode from './nodes/ClassNode'
import InterfaceNode from './nodes/InterfaceNode'
import NoteNode from './nodes/NoteNode'

// Sequence diagram nodes
import ActorNode from './nodes/ActorNode'
import LifelineNode from './nodes/LifelineNode'

// ER diagram nodes
import EntityNode from './nodes/EntityNode'
import RelationshipNode from './nodes/RelationshipNode'

// Flowchart nodes
import ProcessNode from './nodes/ProcessNode'
import DecisionNode from './nodes/DecisionNode'
import StartEndNode from './nodes/StartEndNode'
import IONode from './nodes/IONode'

// Mind Map nodes
import CentralNode from './nodes/CentralNode'
import BranchNode from './nodes/BranchNode'
import LeafNode from './nodes/LeafNode'

const nodeTypes = {
  classNode: ClassNode,
  interfaceNode: InterfaceNode,
  noteNode: NoteNode,
  actorNode: ActorNode,
  lifelineNode: LifelineNode,
  entityNode: EntityNode,
  relationshipNode: RelationshipNode,
  processNode: ProcessNode,
  decisionNode: DecisionNode,
  startEndNode: StartEndNode,
  ioNode: IONode,
  centralNode: CentralNode,
  branchNode: BranchNode,
  leafNode: LeafNode,
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
  message: {
    type: 'straight',
    style: { stroke: 'rgba(0,209,255,0.5)', strokeWidth: 1.5 },
    markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(0,209,255,0.6)' },
    label: 'mensaje()',
    labelStyle: { fill: 'rgba(0,209,255,0.8)', fontSize: 10, fontFamily: 'monospace' },
    labelBgStyle: { fill: 'rgba(12,6,8,0.9)', strokeWidth: 0 },
    labelBgPadding: [4, 2],
  },
}

const NODE_DEFAULTS = {
  classNode:        { name: 'NuevaClase', attributes: '- atributo: String', methods: '+ metodo(): void' },
  interfaceNode:    { name: 'NuevaInterface', methods: '+ metodo(): void' },
  noteNode:         { text: 'Nota...' },
  actorNode:        { label: 'Actor' },
  lifelineNode:     { label: 'Object' },
  entityNode:       { name: 'Entidad', attributes: 'id PK int\nname varchar' },
  relationshipNode: { label: 'tiene' },
  processNode:      { label: 'Proceso' },
  decisionNode:     { label: 'Condicion?' },
  startEndNode:     { label: 'Inicio' },
  ioNode:           { label: 'Entrada/Salida' },
  centralNode:      { label: 'Tema Central' },
  branchNode:       { label: 'Rama' },
  leafNode:         { label: 'Hoja' },
}

const DIAGRAM_TYPES = [
  { value: 'all',      label: 'Todos' },
  { value: 'class',    label: 'Clases' },
  { value: 'flowchart',label: 'Flujo' },
  { value: 'er',       label: 'ER' },
  { value: 'sequence', label: 'Secuencia' },
  { value: 'mindmap',  label: 'Mind Map' },
]

const EDGE_TYPES = [
  { value: 'default',    label: 'Asociación' },
  { value: 'straight',   label: 'Herencia' },
  { value: 'step',       label: 'Composición' },
  { value: 'smoothstep', label: 'Dependencia' },
  { value: 'message',    label: 'Mensaje' },
]

const NODE_GROUPS = [
  {
    group: 'class',
    label: 'Clase',
    color: '#FC651F',
    nodes: [
      { type: 'classNode',     label: 'Clase',    emoji: '📦' },
      { type: 'interfaceNode', label: 'Interface', emoji: '🔷' },
      { type: 'noteNode',      label: 'Nota',      emoji: '📝' },
    ],
  },
  {
    group: 'flowchart',
    label: 'Flujo',
    color: '#FC651F',
    nodes: [
      { type: 'processNode',  label: 'Proceso',    emoji: '⬜' },
      { type: 'decisionNode', label: 'Decisión',   emoji: '◇' },
      { type: 'startEndNode', label: 'Inicio/Fin', emoji: '⬭' },
      { type: 'ioNode',       label: 'E/S',        emoji: '⬡' },
    ],
  },
  {
    group: 'er',
    label: 'ER',
    color: '#22c55e',
    nodes: [
      { type: 'entityNode',       label: 'Entidad',  emoji: '🗃' },
      { type: 'relationshipNode', label: 'Relación', emoji: '🔗' },
    ],
  },
  {
    group: 'sequence',
    label: 'Secuencia',
    color: '#00D1FF',
    nodes: [
      { type: 'actorNode',    label: 'Actor',    emoji: '👤' },
      { type: 'lifelineNode', label: 'Lifeline', emoji: '╷' },
    ],
  },
  {
    group: 'mindmap',
    label: 'Mapa',
    color: '#8B5CF6',
    nodes: [
      { type: 'centralNode', label: 'Central', emoji: '🎯' },
      { type: 'branchNode',  label: 'Rama',    emoji: '🌿' },
      { type: 'leafNode',    label: 'Hoja',    emoji: '🍃' },
    ],
  },
]

let nodeId = 0
const getId = () => `node_${++nodeId}`

const TIPO_ICON = {
  class: '📦', flowchart: '🔀', er: '🗃', sequence: '↔', mindmap: '🧠', uml: '📐',
}

export default function DiagramEditor({ projectId } = {}) {
  const reactFlowWrapper = useRef(null)
  const { user } = useAuth()
  const { upload } = useLibrary()
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [edgeType, setEdgeType] = useState('default')
  const [diagramType, setDiagramType] = useState('all')
  const [reactFlowInstance, setReactFlowInstance] = useState(null)

  const [savedDiagrams, setSavedDiagrams] = useState([])
  const [currentDiagramId, setCurrentDiagramId] = useState(null)
  const [diagramTitle, setDiagramTitle] = useState('')
  const [showDiagramList, setShowDiagramList] = useState(false)
  const [dropdownRect, setDropdownRect] = useState(null)
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [savingToLib, setSavingToLib] = useState(false)

  const listBtnRef = useRef(null)
  const dropdownRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDiagramList) return
    const handler = (e) => {
      if (
        listBtnRef.current && !listBtnRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setShowDiagramList(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showDiagramList])

  const toggleDiagramList = () => {
    if (!showDiagramList && listBtnRef.current) {
      const r = listBtnRef.current.getBoundingClientRect()
      setDropdownRect({ top: r.bottom + 6, right: window.innerWidth - r.right })
    }
    setShowDiagramList(v => !v)
  }

  useEffect(() => {
    loadDiagramList()
  }, [user, projectId])

  const loadDiagramList = async () => {
    let query = supabase
      .from('diagramas')
      .select('id, titulo, tipo, created_at, updated_at')
      .order('updated_at', { ascending: false })

    // Show own diagrams if authenticated, otherwise show public ones
    if (user) {
      query = query.eq('autor_id', user.id)
    } else {
      query = query.eq('publico', true)
    }
    if (projectId) query = query.eq('proyecto_id', projectId)
    const { data } = await query
    setSavedDiagrams(data || [])
  }

  const makeOnChange = useCallback((id) => {
    return (field, value) => {
      setNodes((nds) =>
        nds.map((n) => n.id === id ? { ...n, data: { ...n.data, [field]: value } } : n)
      )
    }
  }, [setNodes])

  const getCleanData = useCallback(() => {
    const cleanNodes = nodes.map((n) => {
      const { onChange, ...rest } = n.data || {}
      return { ...n, data: rest }
    })
    return { nodes: cleanNodes, edges }
  }, [nodes, edges])

  const restoreNodes = useCallback((rawNodes) => {
    return (rawNodes || []).map((n) => ({
      ...n,
      draggable: true,
      data: { ...n.data, onChange: makeOnChange(n.id) },
    }))
  }, [makeOnChange])

  const saveDiagram = useCallback(async () => {
    if (!user) { toast.error('Debes iniciar sesion'); return }
    const title = diagramTitle.trim() || 'Diagrama sin titulo'
    const datos = getCleanData()
    setSaving(true)
    try {
      if (currentDiagramId) {
        const { error } = await supabase.from('diagramas').update({
          titulo: title, datos, tipo: diagramType === 'all' ? 'uml' : diagramType,
          updated_at: new Date().toISOString(),
        }).eq('id', currentDiagramId)
        if (error) throw error
        toast.success('Diagrama actualizado')
      } else {
        const payload = {
          titulo: title, descripcion: '', tipo: diagramType === 'all' ? 'uml' : diagramType,
          datos, autor_id: user.id, publico: false,
        }
        if (projectId) payload.proyecto_id = projectId
        const { data, error } = await supabase.from('diagramas').insert(payload).select('id').single()
        if (error) throw error
        setCurrentDiagramId(data.id)
        toast.success('Diagrama guardado')
      }
      await loadDiagramList()
    } catch (err) {
      console.error(err)
      toast.error(`Error: ${err.message || 'No se pudo guardar'}`)
    } finally {
      setSaving(false)
    }
  }, [user, currentDiagramId, diagramTitle, diagramType, getCleanData, projectId])

  const deleteDiagram = useCallback(async (diagramId, e) => {
    e.stopPropagation()
    if (!confirm('¿Eliminar este diagrama?')) return
    const { error } = await supabase.from('diagramas').delete().eq('id', diagramId)
    if (error) { toast.error('Error al eliminar'); return }
    toast.success('Diagrama eliminado')
    if (diagramId === currentDiagramId) {
      setCurrentDiagramId(null); setDiagramTitle(''); setNodes([]); setEdges([])
    }
    await loadDiagramList()
  }, [currentDiagramId, setNodes, setEdges])

  const loadDiagram = useCallback(async (diagramId) => {
    const { data, error } = await supabase.from('diagramas').select('*').eq('id', diagramId).single()
    if (error || !data) { toast.error('Error al cargar diagrama'); return }
    const datos = data.datos || {}
    setNodes(restoreNodes(datos.nodes || []))
    setEdges(datos.edges || [])
    setCurrentDiagramId(data.id)
    setDiagramTitle(data.titulo || '')
    if (data.tipo && data.tipo !== 'uml') setDiagramType(data.tipo)
    setShowDiagramList(false)
    toast.success(`"${data.titulo}" cargado`)
  }, [setNodes, setEdges, restoreNodes])

  const newDiagram = () => {
    setCurrentDiagramId(null)
    setDiagramTitle('')
    setNodes([])
    setEdges([])
    toast('Nuevo diagrama')
  }

  const onConnect = useCallback(
    (params) => {
      const edgeStyle = EDGE_STYLES[edgeType] || EDGE_STYLES.default
      setEdges((eds) => addEdge({ ...params, ...edgeStyle, id: `edge_${Date.now()}` }, eds))
    },
    [edgeType, setEdges]
  )

  const addNode = useCallback((type) => {
    let position = { x: 100 + Math.random() * 300, y: 100 + Math.random() * 200 }

    if (reactFlowInstance) {
      try {
        const { x: vpX, y: vpY, zoom } = reactFlowInstance.getViewport()
        const w = reactFlowWrapper.current?.clientWidth || 600
        const h = reactFlowWrapper.current?.clientHeight || 400
        position = {
          x: (-vpX + w / 2) / zoom - 90,
          y: (-vpY + h / 2) / zoom - 50,
        }
      } catch {
        // fallback to random position
      }
    }

    const id = getId()
    setNodes((nds) => [...nds, {
      id, type,
      position,
      draggable: true,
      data: { ...(NODE_DEFAULTS[type] || { label: 'Nodo' }), onChange: makeOnChange(id) },
    }])
  }, [reactFlowInstance, setNodes, makeOnChange])

  const exportJSON = useCallback(() => {
    const flow = reactFlowInstance?.toObject() || { nodes, edges }
    const cleanNodes = (flow.nodes || nodes).map((n) => {
      const { onChange, ...rest } = n.data || {}
      return { ...n, data: rest }
    })
    const exportData = {
      titulo: diagramTitle || 'diagrama',
      tipo: diagramType,
      nodes: cleanNodes,
      edges: flow.edges || edges,
      viewport: flow.viewport,
    }
    const json = JSON.stringify(exportData, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(diagramTitle || 'diagrama').replace(/\s+/g, '-').toLowerCase()}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Diagrama exportado como JSON')
  }, [reactFlowInstance, nodes, edges, diagramTitle, diagramType])

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
        const rawNodes = flow.nodes || []
        const rawEdges = flow.edges || []
        if (rawNodes.length === 0 && rawEdges.length === 0) {
          toast.error('El archivo no contiene un diagrama válido')
          return
        }
        setNodes(restoreNodes(rawNodes))
        setEdges(rawEdges)
        if (flow.titulo) setDiagramTitle(flow.titulo)
        if (flow.tipo && flow.tipo !== 'uml') setDiagramType(flow.tipo)
        if (flow.viewport && reactFlowInstance) {
          reactFlowInstance.setViewport(flow.viewport)
        }
        toast.success(`Diagrama importado (${rawNodes.length} nodos, ${rawEdges.length} conexiones)`)
      } catch {
        toast.error('Archivo JSON inválido')
      }
    }
    input.click()
  }, [setNodes, setEdges, restoreNodes, reactFlowInstance])

  const exportPNG = useCallback(async () => {
    if (!reactFlowWrapper.current) return
    setExporting(true)
    try {
      // Use html2canvas approach via the reactflow viewport
      const el = reactFlowWrapper.current.querySelector('.react-flow__renderer')
      if (!el) { toast.error('No se puede exportar: diagrama vacío'); return }

      // Fallback: export current viewport as PNG using canvas
      const { default: html2canvas } = await import('html2canvas').catch(() => ({ default: null }))
      if (!html2canvas) {
        // Fallback to JSON if html2canvas not available
        exportJSON()
        return
      }
      const canvas = await html2canvas(el, { backgroundColor: '#0c0608', scale: 2 })
      const a = document.createElement('a')
      a.download = `${(diagramTitle || 'diagrama').replace(/\s+/g, '-').toLowerCase()}.png`
      a.href = canvas.toDataURL('image/png')
      a.click()
      toast.success('Imagen exportada')
    } catch (err) {
      console.error(err)
      exportJSON()
    } finally {
      setExporting(false)
    }
  }, [diagramTitle, exportJSON])

  const saveToLibrary = useCallback(async () => {
    if (!reactFlowWrapper.current) return
    setSavingToLib(true)
    try {
      const el = reactFlowWrapper.current.querySelector('.react-flow__renderer')
      if (!el) { toast.error('Diagrama vacío — no se puede guardar'); return }
      const { default: html2canvas } = await import('html2canvas').catch(() => ({ default: null }))
      if (!html2canvas) { toast.error('html2canvas no disponible'); return }
      const canvas = await html2canvas(el, { backgroundColor: '#0c0608', scale: 2 })
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
      const fileName = `${(diagramTitle || 'diagrama').replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`
      const file = new File([blob], fileName, { type: 'image/png' })
      const { error } = await upload(file, { visibilidad: 'miembros', tipo: 'imagen' })
      if (error) throw error
      toast.success('✓ Diagrama guardado en Biblioteca')
    } catch (err) {
      console.error(err)
      toast.error(`Error al guardar: ${err.message || 'intenta de nuevo'}`)
    } finally {
      setSavingToLib(false)
    }
  }, [reactFlowWrapper, diagramTitle, upload])

  const minimapNodeColor = (n) => ({
    classNode: '#FC651F', interfaceNode: '#8B5CF6', noteNode: '#F59E0B',
    actorNode: '#00D1FF', lifelineNode: '#00D1FF',
    entityNode: '#22c55e', relationshipNode: '#22c55e',
    processNode: '#FC651F', decisionNode: '#FC651F', startEndNode: '#FC651F', ioNode: '#FC651F',
    centralNode: '#8B5CF6', branchNode: '#8B5CF6', leafNode: '#8B5CF6',
  })[n.type] || '#ffffff'

  const filteredGroups = diagramType === 'all' ? NODE_GROUPS : NODE_GROUPS.filter(g => g.group === diagramType)

  return (
    <div className="flex flex-col h-full" style={{ gap: 0 }}>

      {/* ── Top panel (save bar + toolbar) ───────────────────────────────── */}
      <div
        className="flex flex-col shrink-0 mb-3"
        style={{
          background: 'rgba(12,6,8,0.95)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* Save bar */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/[0.06] flex-wrap">

          {/* Title input */}
          <div className="relative flex-1 min-w-[160px]">
            <input
              type="text"
              value={diagramTitle}
              onChange={(e) => setDiagramTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && saveDiagram()}
              placeholder="Título del diagrama..."
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg text-white text-xs px-3 py-1.5 focus:outline-none focus:border-[#FC651F]/60 placeholder-white/25 transition-colors"
            />
            {currentDiagramId && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400/70" title="Guardado" />
            )}
          </div>

          {/* Diagram type */}
          <select
            value={diagramType}
            onChange={(e) => setDiagramType(e.target.value)}
            className="bg-white/[0.04] border border-white/10 rounded-lg text-white text-xs px-2 py-1.5 focus:outline-none focus:border-[#FC651F]/60 cursor-pointer [&>option]:bg-[#0c0608]"
          >
            {DIAGRAM_TYPES.map(dt => (
              <option key={dt.value} value={dt.value}>{dt.label}</option>
            ))}
          </select>

          {/* Edge type */}
          <select
            value={edgeType}
            onChange={(e) => setEdgeType(e.target.value)}
            className="bg-white/[0.04] border border-white/10 rounded-lg text-white text-xs px-2 py-1.5 focus:outline-none focus:border-[#FC651F]/60 cursor-pointer [&>option]:bg-[#0c0608] hidden sm:block"
          >
            {EDGE_TYPES.map(et => (
              <option key={et.value} value={et.value}>{et.label}</option>
            ))}
          </select>

          <div className="w-px h-5 bg-white/10 hidden sm:block" />

          {/* Save button */}
          <button
            onClick={saveDiagram}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105 disabled:opacity-50"
            style={{ background: 'rgba(252,101,31,0.12)', border: '1px solid rgba(252,101,31,0.4)', color: '#FC651F' }}
          >
            {saving ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <FiSave size={12} />}
            {saving ? 'Guardando...' : currentDiagramId ? 'Actualizar' : 'Guardar'}
          </button>

          {/* New diagram */}
          <button
            onClick={newDiagram}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-white/40 hover:text-white bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-all"
            title="Nuevo diagrama"
          >
            <FiPlus size={12} /> Nuevo
          </button>

          {/* Export JSON */}
          <button
            onClick={exportJSON}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-white/40 hover:text-white bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-all"
            title="Exportar JSON"
          >
            <FiDownload size={12} /> Exportar
          </button>

          {/* Export PNG */}
          <button
            onClick={exportPNG}
            disabled={exporting}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-white/40 hover:text-white bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-all disabled:opacity-50"
            title="Exportar imagen PNG"
          >
            {exporting
              ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <FiImage size={12} />
            }
            {exporting ? 'Exportando...' : 'PNG'}
          </button>

          {/* Import */}
          <button
            onClick={importJSON}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-white/40 hover:text-white bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-all"
            title="Importar JSON"
          >
            <FiUpload size={12} /> Importar
          </button>

          {/* Save to Library */}
          <button
            onClick={saveToLibrary}
            disabled={savingToLib}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50"
            style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)', color: '#8B5CF6' }}
            title="Guardar imagen del diagrama en Biblioteca"
          >
            {savingToLib
              ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : <FiBookmark size={12} />
            }
            {savingToLib ? 'Guardando...' : 'Biblioteca'}
          </button>

          {/* Mis Diagramas — button only; dropdown rendered via Portal */}
          <button
            ref={listBtnRef}
            onClick={toggleDiagramList}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-white/50 hover:text-white bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-all"
          >
            Mis diagramas
            {savedDiagrams.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-[#FC651F]/20 text-[#FC651F] font-semibold">
                {savedDiagrams.length}
              </span>
            )}
            <FiChevronDown size={11} className={`transition-transform duration-200 ${showDiagramList ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Node toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
          {filteredGroups.map((group, gi) => (
            <div key={group.group} className="flex items-center gap-1.5">
              {gi > 0 && <div className="w-px h-4 bg-white/10 mx-1" />}
              <span
                className="text-[9px] uppercase tracking-widest font-bold mr-0.5 hidden sm:block"
                style={{ color: group.color + '80' }}
              >
                {group.label}
              </span>
              {group.nodes.map((nt) => (
                <button
                  key={nt.type}
                  onClick={() => addNode(nt.type)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all hover:scale-105 active:scale-95"
                  style={{
                    background: `${group.color}10`,
                    border: `1px solid ${group.color}35`,
                    color: group.color,
                  }}
                  title={`Agregar ${nt.label}`}
                >
                  <span className="text-sm leading-none">{nt.emoji}</span>
                  <span className="hidden sm:inline">{nt.label}</span>
                </button>
              ))}
            </div>
          ))}

          {/* Edge type selector for mobile */}
          <div className="ml-auto sm:hidden">
            <select
              value={edgeType}
              onChange={(e) => setEdgeType(e.target.value)}
              className="bg-white/[0.04] border border-white/10 rounded-lg text-white text-xs px-2 py-1 focus:outline-none cursor-pointer [&>option]:bg-[#0c0608]"
            >
              {EDGE_TYPES.map(et => (
                <option key={et.value} value={et.value}>{et.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Canvas ────────────────────────────────────────────────────────── */}
      <div
        ref={reactFlowWrapper}
        className="flex-1 rounded-xl overflow-hidden"
        style={{
          background: 'rgba(8,4,4,0.6)',
          border: '1px solid rgba(255,255,255,0.06)',
          minHeight: 400,
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges.map(e => ({ ...e, selectable: true }))}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          nodesDraggable
          fitView
          deleteKeyCode={['Delete', 'Backspace']}
          selectionKeyCode="Shift"
          multiSelectionKeyCode="Shift"
          style={{ background: 'transparent' }}
        >
          <Controls
            style={{
              background: 'rgba(12,6,8,0.92)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
            }}
          />
          <MiniMap
            nodeColor={minimapNodeColor}
            style={{
              background: 'rgba(12,6,8,0.92)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10,
            }}
            maskColor="rgba(0,0,0,0.5)"
          />
          <Background color="rgba(255,255,255,0.025)" gap={20} />

          {/* Empty state hint */}
          {nodes.length === 0 && (
            <Panel position="top-center" style={{ marginTop: 60 }}>
              <div className="text-center text-white/20 select-none pointer-events-none">
                <p className="text-2xl mb-2">📐</p>
                <p className="text-xs">Agrega nodos desde la barra superior</p>
                <p className="text-[10px] mt-1">o importa un diagrama existente</p>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>

      {/* ── Mis Diagramas dropdown via Portal (bypasses stacking contexts) ── */}
      {showDiagramList && dropdownRect && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownRect.top,
            right: dropdownRect.right,
            width: 300,
            zIndex: 99999,
            background: 'rgba(10,5,7,0.98)',
            border: '1px solid rgba(255,255,255,0.12)',
            backdropFilter: 'blur(20px)',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 24px 60px rgba(0,0,0,0.7)',
          }}
        >
          <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between">
            <span className="text-[11px] text-white/60 uppercase tracking-widest font-bold">
              Mis Diagramas
            </span>
            <button
              onClick={() => { newDiagram(); setShowDiagramList(false) }}
              className="flex items-center gap-1 text-[11px] text-[#FC651F]/70 hover:text-[#FC651F] transition-colors"
            >
              <FiPlus size={12} /> Nuevo
            </button>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {savedDiagrams.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-white/20">
                <FiFileMinus size={24} />
                <p className="text-xs">Sin diagramas guardados</p>
              </div>
            ) : (
              savedDiagrams.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center gap-2 px-3 py-2.5 border-b border-white/[0.04] hover:bg-white/[0.05] transition-colors group"
                  style={d.id === currentDiagramId
                    ? { background: 'rgba(252,101,31,0.07)', borderLeft: '2px solid rgba(252,101,31,0.5)' }
                    : {}}
                >
                  <span className="text-base shrink-0 select-none">{TIPO_ICON[d.tipo] || '📐'}</span>
                  <button onClick={() => loadDiagram(d.id)} className="flex-1 text-left min-w-0">
                    <p className="text-xs text-white/80 font-medium truncate flex items-center gap-1.5">
                      {d.titulo || 'Sin título'}
                      {d.id === currentDiagramId && <FiCheck size={10} className="text-emerald-400 shrink-0" />}
                    </p>
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {d.tipo} · {new Date(d.updated_at || d.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}
                    </p>
                  </button>
                  <button
                    onClick={(e) => deleteDiagram(d.id, e)}
                    className="shrink-0 p-1.5 rounded-md text-white/20 hover:text-[#EF4444] hover:bg-[#EF4444]/10 opacity-0 group-hover:opacity-100 transition-all"
                    title="Eliminar"
                  >
                    <FiTrash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
