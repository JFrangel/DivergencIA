import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiPlus, FiType, FiImage, FiEdit3, FiZoomIn, FiZoomOut, FiMaximize,
  FiTrash2, FiSave, FiCheck, FiChevronDown, FiX, FiCornerDownLeft,
  FiMousePointer, FiShare2, FiLock, FiGlobe, FiUsers, FiSearch, FiSquare,
  FiRotateCw, FiMinus, FiSlash, FiCopy, FiRefreshCw,
} from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

/* ── Constants ────────────────────────────────────────────────────────── */
const STICKY_COLORS = ['#FBBF24', '#FB923C', '#F87171', '#A78BFA', '#34D399', '#60A5FA', '#F0ABFC', '#6EE7B7']
const PEN_COLORS = ['#ffffff', '#FBBF24', '#F87171', '#A78BFA', '#34D399', '#60A5FA', '#FC651F', '#000000']
const SHAPE_FILLS = ['transparent', '#FC651F26', '#8B5CF626', '#00D1FF26', '#22c55e26', '#F59E0B26', '#EF444426']
const SHAPE_STROKES = ['#FC651F', '#8B5CF6', '#00D1FF', '#22c55e', '#F59E0B', '#EF4444', '#ffffff']
const SHAPE_TYPES = [
  { id: 'rect',        label: 'Rectángulo',   icon: '⬜' },
  { id: 'circle',      label: 'Círculo',      icon: '⭕' },
  { id: 'diamond',     label: 'Diamante',     icon: '◇'  },
  { id: 'triangle',    label: 'Triángulo',    icon: '△'  },
  { id: 'arrow',       label: 'Flecha →',     icon: '→'  },
  { id: 'arrow_up',    label: 'Flecha ↑',     icon: '↑'  },
  { id: 'star',        label: 'Estrella',     icon: '☆'  },
  { id: 'hexagon',     label: 'Hexágono',     icon: '⬡'  },
  { id: 'line',        label: 'Línea',        icon: '╱'  },
  { id: 'callout',     label: 'Burbuja',      icon: '💬' },
  { id: 'parallelogram', label: 'Paralelogramo', icon: '▱' },
  { id: 'cross',       label: 'Cruz',         icon: '✚'  },
]
const PEN_SIZES = [2, 4, 8, 14, 20]
const CANVAS_BACKGROUNDS = [
  { id: 'dark',  label: 'Oscuro',    bg: '#0c0608' },
  { id: 'navy',  label: 'Azul',      bg: '#060d1a' },
  { id: 'forest',label: 'Verde',     bg: '#060f0a' },
  { id: 'light', label: 'Claro',     bg: '#f4f0ec' },
  { id: 'black', label: 'Negro',     bg: '#000000' },
]
const MIN_ZOOM = 0.1
const MAX_ZOOM = 5
const GRID_SIZE = 40
const MAX_HISTORY = 80
const GENERAL_MURAL_ID = '00000000-0000-0000-0000-000000000001'
const AUTOSAVE_DELAY = 1200

const uid = () => crypto.randomUUID()
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

/* ── Smooth SVG path (Catmull-Rom → cubic Bézier) ─────────────────── */
function smoothPath(pts) {
  if (pts.length < 2) return ''
  if (pts.length === 2) return `M${pts[0].x},${pts[0].y} L${pts[1].x},${pts[1].y}`
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 1; i < pts.length - 1; i++) {
    const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1]
    const cp1x = p0.x + (p1.x - p0.x) * 0.5
    const cp1y = p0.y + (p1.y - p0.y) * 0.5
    const cp2x = p1.x - (p2.x - p0.x) * 0.16
    const cp2y = p1.y - (p2.y - p0.y) * 0.16
    d += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y}`
  }
  const last = pts[pts.length - 1]
  d += ` L${last.x},${last.y}`
  return d
}

/* ── Stable debounce with ref ──────────────────────────────────────── */
function useStableDebouncedCallback(fn, delay) {
  const fnRef = useRef(fn)
  useEffect(() => { fnRef.current = fn }, [fn])
  const timer = useRef(null)
  const cancel = useCallback(() => clearTimeout(timer.current), [])
  const debounced = useCallback((...args) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => fnRef.current(...args), delay)
  }, [delay])
  return { debounced, cancel }
}

/* ── Visibility ────────────────────────────────────────────────────── */
const VISIBILITY_LABELS = { publico: 'Publico', privado: 'Privado', compartido: 'Compartido' }
const VISIBILITY_ICONS  = { publico: FiGlobe, privado: FiLock, compartido: FiUsers }

/* ═══════════════════════════════════════════════════════════════════════
   SHARE MODAL
   ═══════════════════════════════════════════════════════════════════════ */
function ShareModal({ open, onClose, sharedWith = [], onUpdate }) {
  const [search, setSearch]     = useState('')
  const [results, setResults]   = useState([])
  const [searching, setSearching] = useState(false)
  const [members, setMembers]   = useState([])

  useEffect(() => {
    if (!open || sharedWith.length === 0) { setMembers([]); return }
    supabase.from('usuarios').select('id,nombre,foto_url,area_investigacion').in('id', sharedWith)
      .then(({ data }) => { if (data) setMembers(data) })
  }, [open, sharedWith])

  useEffect(() => {
    if (search.length < 2) { setResults([]); return }
    setSearching(true)
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('usuarios').select('id,nombre,foto_url,area_investigacion')
        .ilike('nombre', `%${search}%`).limit(8)
      setResults((data || []).filter(u => !sharedWith.includes(u.id)))
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [search, sharedWith])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md rounded-2xl p-6 space-y-4 glass-frosted border border-[var(--c-border)]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white font-title">Compartir mural</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white"><FiX size={18} /></button>
        </div>
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={14} />
          <input
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[var(--c-surface-2)] text-sm text-white placeholder-white/30 outline-none border border-[var(--c-border)] focus:border-[var(--c-primary)] transition-colors"
            placeholder="Buscar miembros..." value={search} onChange={e => setSearch(e.target.value)} autoFocus
          />
        </div>
        {results.length > 0 && (
          <div className="max-h-36 overflow-y-auto space-y-1">
            {results.map(u => (
              <button key={u.id} onClick={() => { onUpdate([...sharedWith, u.id]); setSearch('') }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-[var(--c-surface-2)] transition-colors">
                {u.foto_url
                  ? <img src={u.foto_url} className="w-7 h-7 rounded-full object-cover" alt="" />
                  : <div className="w-7 h-7 rounded-full bg-[var(--c-primary)]/20 flex items-center justify-center text-xs text-[var(--c-primary)]">{u.nombre?.[0]}</div>}
                <span className="flex-1 text-left truncate">{u.nombre}</span>
                <FiPlus size={14} className="text-[var(--c-primary)]" />
              </button>
            ))}
          </div>
        )}
        {searching && <p className="text-xs text-white/30 text-center">Buscando...</p>}
        <div>
          <p className="text-xs text-white/40 mb-2">Con acceso ({members.length})</p>
          {members.length === 0 && <p className="text-xs text-white/20">Ninguno todavia</p>}
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {members.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[var(--c-surface-2)]">
                {u.foto_url
                  ? <img src={u.foto_url} className="w-7 h-7 rounded-full object-cover" alt="" />
                  : <div className="w-7 h-7 rounded-full bg-[var(--c-primary)]/20 flex items-center justify-center text-xs text-[var(--c-primary)]">{u.nombre?.[0]}</div>}
                <span className="flex-1 text-sm text-white/70 truncate">{u.nombre}</span>
                <button onClick={() => onUpdate(sharedWith.filter(x => x !== u.id))} className="text-white/30 hover:text-[var(--c-error)] transition-colors"><FiX size={14} /></button>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   NEW MURAL MODAL
   ═══════════════════════════════════════════════════════════════════════ */
function NewMuralModal({ open, onClose, onCreate }) {
  const [titulo, setTitulo] = useState('')
  const [tipo, setTipo] = useState('privado')
  if (!open) return null
  const handleCreate = () => {
    if (!titulo.trim()) return
    onCreate({ titulo: titulo.trim(), tipo })
    setTitulo(''); setTipo('privado'); onClose()
  }
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-sm rounded-2xl p-6 space-y-4 glass-frosted border border-[var(--c-border)]"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-white font-title">Nuevo mural</h3>
        <input
          className="w-full px-3 py-2.5 rounded-xl bg-[var(--c-surface-2)] text-sm text-white placeholder-white/30 outline-none border border-[var(--c-border)] focus:border-[var(--c-primary)] transition-colors"
          placeholder="Titulo del mural..." value={titulo}
          onChange={e => setTitulo(e.target.value)} autoFocus
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />
        <div className="flex gap-2">
          {['privado', 'publico', 'compartido'].map(t => {
            const Icon = VISIBILITY_ICONS[t]
            return (
              <button key={t} onClick={() => setTipo(t)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
                  tipo === t ? 'border-[var(--c-primary)] bg-[var(--c-primary)]/10 text-[var(--c-primary)]' : 'border-[var(--c-border)] text-white/40 hover:text-white/70 hover:bg-[var(--c-surface-2)]'
                }`}>
                <Icon size={13} />{VISIBILITY_LABELS[t]}
              </button>
            )
          })}
        </div>
        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white hover:bg-[var(--c-surface-2)] transition-colors">Cancelar</button>
          <button onClick={handleCreate} disabled={!titulo.trim()}
            className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-[var(--c-primary)] text-white hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            Crear
          </button>
        </div>
      </motion.div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN MURAL PAGE
   ═══════════════════════════════════════════════════════════════════════ */
export default function Mural() {
  const { user } = useAuth()

  /* ── State ─────────────────────────────────────────────────────────── */
  const [murales, setMurales]           = useState([])
  const [activeMuralId, setActiveMuralId] = useState(GENERAL_MURAL_ID)
  const [activeMural, setActiveMural]   = useState(null)
  const [showSelector, setShowSelector] = useState(false)
  const [showNewModal, setShowNewModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [elements, setElements]         = useState([])
  const [selectedId, setSelectedId]     = useState(null)
  const [pan, setPan]                   = useState({ x: 0, y: 0 })
  const [zoom, setZoom]                 = useState(1)
  const [activeTool, setActiveTool]     = useState('select')
  const [penColor, setPenColor]         = useState('#ffffff')
  const [penSize, setPenSize]           = useState(4)
  const [showPenOptions, setShowPenOptions] = useState(false)
  const [showShapeMenu, setShowShapeMenu]   = useState(false)
  const [saveStatus, setSaveStatus]     = useState('saved') // 'saved'|'saving'|'error'|'offline'
  const [canvasBg, setCanvasBg]         = useState('#0c0608')
  const [gridStyle, setGridStyle]       = useState('dots') // 'dots' | 'grid' | 'none'
  const [showBgMenu, setShowBgMenu]     = useState(false)

  const drawMode   = activeTool === 'draw' || activeTool === 'erase'
  const eraserMode = activeTool === 'erase'

  /* ── Refs ──────────────────────────────────────────────────────────── */
  const canvasRef       = useRef(null)
  const isPanning       = useRef(false)
  const panStart        = useRef({ x: 0, y: 0 })
  const panOrigin       = useRef({ x: 0, y: 0 })
  const isDrawing       = useRef(false)
  const currentPath     = useRef([])
  const previewPathRef  = useRef(null)
  const history         = useRef([])
  const historyIndex    = useRef(-1)
  const skipHistory     = useRef(false)
  /* ── Undo ──────────────────────────────────────────────────────────── */
  const pushHistory = useCallback((elems) => {
    if (skipHistory.current) { skipHistory.current = false; return }
    history.current = history.current.slice(0, historyIndex.current + 1)
    history.current.push(JSON.stringify(elems))
    if (history.current.length > MAX_HISTORY) history.current.shift()
    historyIndex.current = history.current.length - 1
  }, [])

  const undo = useCallback(() => {
    if (historyIndex.current <= 0) return
    historyIndex.current -= 1
    skipHistory.current = true
    try { setElements(JSON.parse(history.current[historyIndex.current])) } catch { /**/ }
  }, [])

  const redo = useCallback(() => {
    if (historyIndex.current >= history.current.length - 1) return
    historyIndex.current += 1
    skipHistory.current = true
    try { setElements(JSON.parse(history.current[historyIndex.current])) } catch { /**/ }
  }, [])

  useEffect(() => { pushHistory(elements) }, [elements]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Load murals list ──────────────────────────────────────────────── */
  const fetchMurales = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('murales').select('id,titulo,tipo,creador_id,shared_with,updated_at')
      .order('updated_at', { ascending: false })
    if (!data) return
    const visible = data.filter(m =>
      m.tipo === 'general' || m.tipo === 'publico' ||
      m.creador_id === user.id || m.shared_with?.includes(user.id)
    )
    setMurales(visible)
  }, [user])

  useEffect(() => { fetchMurales() }, [fetchMurales])

  /* ── Load mural ────────────────────────────────────────────────────── */
  const loadMural = useCallback(async (muralId) => {
    setActiveMuralId(muralId)
    setSelectedId(null)
    setPan({ x: 0, y: 0 })
    setZoom(1)
    history.current = []
    historyIndex.current = -1
    setShowSelector(false)
    setSaveStatus('saved')

    const { data, error } = await supabase.from('murales').select('*').eq('id', muralId).single()
    if (data) {
      setActiveMural(data)
      const raw = data.elements
      const elems = (typeof raw === 'string' ? JSON.parse(raw) : raw) || []
      setElements(elems)
    } else if (error && muralId === GENERAL_MURAL_ID) {
      // Auto-create general mural if missing
      const { data: created } = await supabase.from('murales').insert({
        id: GENERAL_MURAL_ID, titulo: 'Mural General', tipo: 'general',
        creador_id: null, shared_with: [], elements: [],
      }).select().single()
      setActiveMural(created || { id: GENERAL_MURAL_ID, titulo: 'Mural General', tipo: 'general', shared_with: [] })
      setElements([])
    } else if (error) {
      console.warn('[Mural] Load error:', error.message)
      setSaveStatus('error')
    }
  }, [user])

  useEffect(() => { if (user) loadMural(GENERAL_MURAL_ID) }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Auto-save ─────────────────────────────────────────────────────── */
  const saveToDb = useCallback(async (elems, muralId) => {
    if (!user || !muralId) return
    setSaveStatus('saving')
    const { error } = await supabase
      .from('murales')
      .update({ elements: elems, updated_at: new Date().toISOString() })
      .eq('id', muralId)

    if (error) {
      console.warn('[Mural] Supabase save error:', error.message)
      setSaveStatus('error')
    } else {
      setSaveStatus('saved')
    }
  }, [user])

  const { debounced: debouncedSave, cancel: cancelSave } = useStableDebouncedCallback(saveToDb, AUTOSAVE_DELAY)

  useEffect(() => {
    if (!user || !activeMuralId) return
    debouncedSave(elements, activeMuralId)
  }, [elements]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Create mural ──────────────────────────────────────────────────── */
  const createMural = async ({ titulo, tipo }) => {
    if (!user) return
    const { data, error } = await supabase
      .from('murales').insert({ titulo, tipo, creador_id: user.id, shared_with: [], elements: [] })
      .select().single()
    if (data && !error) { await fetchMurales(); loadMural(data.id) }
  }

  const updateMuralSharing = async (newSharedWith) => {
    if (!activeMural) return
    await supabase.from('murales')
      .update({ shared_with: newSharedWith, updated_at: new Date().toISOString() })
      .eq('id', activeMuralId)
    setActiveMural(prev => ({ ...prev, shared_with: newSharedWith }))
  }

  /* ── Permissions ───────────────────────────────────────────────────── */
  const canEditMural = useMemo(() => {
    if (!activeMural || !user) return false
    if (activeMural.tipo === 'general' || activeMural.tipo === 'publico') return true
    if (activeMural.creador_id === user.id) return true
    if (activeMural.shared_with?.includes(user.id)) return true
    return false
  }, [activeMural, user])

  /* ── Element CRUD ──────────────────────────────────────────────────── */
  const updateElement = useCallback((id, patch) => {
    setElements(prev => prev.map(el => el.id === id ? { ...el, ...patch } : el))
  }, [])
  const deleteElement = useCallback((id) => {
    setElements(prev => prev.filter(el => el.id !== id))
    setSelectedId(null)
  }, [])
  const deleteSelected = useCallback(() => { if (selectedId) deleteElement(selectedId) }, [selectedId, deleteElement])

  const duplicateSelected = useCallback(() => {
    if (!selectedId) return
    const el = elements.find(e => e.id === selectedId)
    if (!el) return
    const clone = { ...el, id: uid(), x: el.x + 24, y: el.y + 24 }
    setElements(prev => [...prev, clone])
    setSelectedId(clone.id)
  }, [selectedId, elements])

  const addLabel = (cx, cy) => {
    if (!canEditMural) return
    const el = { id: uid(), type: 'label',
      x: cx ?? (-pan.x / zoom + 300), y: cy ?? (-pan.y / zoom + 200),
      width: 200, height: 40,
      text: 'Texto', fontSize: 18, color: '#ffffff', bold: false, italic: false,
      rotation: 0, author_id: user?.id }
    setElements(prev => [...prev, el])
    setSelectedId(el.id)
  }

  const addSticky = (cx, cy) => {
    if (!canEditMural) return
    const el = { id: uid(), type: 'sticky', x: cx, y: cy, width: 200, height: 180,
      text: '', color: STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)],
      rotation: 0, author_id: user?.id }
    setElements(prev => [...prev, el])
    setSelectedId(el.id)
  }

  const addTextCard = () => {
    if (!canEditMural) return
    const el = { id: uid(), type: 'text',
      x: -pan.x / zoom + 300, y: -pan.y / zoom + 200, width: 320, height: 200,
      title: 'Titulo', body: 'Escribe aqui...', rotation: 0, author_id: user?.id }
    setElements(prev => [...prev, el])
    setSelectedId(el.id)
  }

  const addShape = (shapeType = 'rect') => {
    if (!canEditMural) return
    const el = { id: uid(), type: 'shape', shape: shapeType,
      x: -pan.x / zoom + 250, y: -pan.y / zoom + 200, width: 180, height: 120,
      fill: 'transparent', stroke: '#FC651F', strokeWidth: 2, label: '',
      rotation: 0, author_id: user?.id }
    setElements(prev => [...prev, el])
    setSelectedId(el.id)
  }

  const addImageCard = () => {
    if (!canEditMural) return
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*'
    input.onchange = (e) => {
      const file = e.target.files[0]; if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const el = { id: uid(), type: 'image',
          x: -pan.x / zoom + 300, y: -pan.y / zoom + 200, width: 320, height: 240,
          src: ev.target.result, rotation: 0, author_id: user?.id }
        setElements(prev => [...prev, el])
        setSelectedId(el.id)
      }
      reader.readAsDataURL(file)
    }
    input.click()
  }

  /* ── Keyboard shortcuts ────────────────────────────────────────────── */
  useEffect(() => {
    const handleKey = (e) => {
      const active = document.activeElement
      const isEditing = active?.isContentEditable || active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA'
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); return }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); return }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); if (user && activeMuralId) saveToDb(elements, activeMuralId); return }
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); duplicateSelected(); return }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !isEditing) {
        e.preventDefault(); deleteSelected()
      }
      if (e.key === 'Escape') { setActiveTool('select'); setSelectedId(null) }
      // Tool shortcuts
      if (!isEditing) {
        if (e.key === 'v') setActiveTool('select')
        if (e.key === 'p' || e.key === 'b') setActiveTool('draw')
        if (e.key === 'e') setActiveTool('erase')
        if (e.key === 't') { setActiveTool('select'); addLabel() }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [undo, redo, selectedId, deleteSelected, duplicateSelected, drawMode, user, activeMuralId, elements, saveToDb])

  /* ── Canvas interaction ────────────────────────────────────────────── */
  const screenToCanvas = useCallback((sx, sy) => {
    const rect = canvasRef.current?.getBoundingClientRect() || { left: 0, top: 0 }
    return { x: (sx - rect.left - pan.x) / zoom, y: (sy - rect.top - pan.y) / zoom }
  }, [pan, zoom])

  const handleCanvasPointerDown = (e) => {
    if (drawMode && canEditMural) {
      e.currentTarget.setPointerCapture(e.pointerId)
      isDrawing.current = true
      currentPath.current = [screenToCanvas(e.clientX, e.clientY)]
      return
    }
    if (e.target === canvasRef.current || e.target.dataset?.grid) {
      setSelectedId(null)
      isPanning.current = true
      panStart.current = { x: e.clientX, y: e.clientY }
      panOrigin.current = { ...pan }
    }
  }

  const handleCanvasPointerMove = (e) => {
    if (drawMode && isDrawing.current) {
      const pt = screenToCanvas(e.clientX, e.clientY)
      currentPath.current.push(pt)
      if (previewPathRef.current) {
        previewPathRef.current.setAttribute('d', smoothPath(currentPath.current))
      }
      return
    }
    if (isPanning.current) {
      setPan({ x: panOrigin.current.x + e.clientX - panStart.current.x, y: panOrigin.current.y + e.clientY - panStart.current.y })
    }
  }

  const handleCanvasPointerUp = (e) => {
    if (drawMode && isDrawing.current) {
      isDrawing.current = false
      if (previewPathRef.current) previewPathRef.current.setAttribute('d', '')
      const pts = currentPath.current
      if (pts.length > 1) {
        const d = smoothPath(pts)
        if (eraserMode) {
          const minX = Math.min(...pts.map(p => p.x)), maxX = Math.max(...pts.map(p => p.x))
          const minY = Math.min(...pts.map(p => p.y)), maxY = Math.max(...pts.map(p => p.y))
          setElements(prev => prev.filter(el => {
            if (el.type !== 'drawing') return true
            const nums = el.path.match(/[-\d.]+/g)?.map(Number) || []
            for (let i = 0; i < nums.length - 1; i += 2) {
              if (nums[i] >= minX && nums[i] <= maxX && nums[i+1] >= minY && nums[i+1] <= maxY) return false
            }
            return true
          }))
        } else {
          setElements(prev => [...prev, { id: uid(), type: 'drawing', path: d, color: penColor, size: penSize, x: 0, y: 0, width: 0, height: 0, author_id: user?.id }])
        }
      }
      currentPath.current = []
      return
    }
    isPanning.current = false
  }

  /* Non-passive wheel zoom */
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const delta = -e.deltaY * 0.001
      setZoom(prev => {
        const next = clamp(prev + delta * prev, MIN_ZOOM, MAX_ZOOM)
        const rect = el.getBoundingClientRect()
        const cx = e.clientX - rect.left, cy = e.clientY - rect.top
        const factor = next / prev
        setPan(p => ({ x: cx - (cx - p.x) * factor, y: cy - (cy - p.y) * factor }))
        return next
      })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const handleDoubleClick = (e) => {
    if (drawMode || !canEditMural) return
    if (e.target === canvasRef.current || e.target.dataset?.grid) {
      const pt = screenToCanvas(e.clientX, e.clientY)
      addSticky(pt.x - 100, pt.y - 90)
    }
  }

  const fitView = () => { setPan({ x: 0, y: 0 }); setZoom(1) }
  const canvasCursor = drawMode ? 'crosshair' : isPanning.current ? 'grabbing' : 'grab'

  const gridBg = useMemo(() => {
    const s = GRID_SIZE * zoom, ox = pan.x % s, oy = pan.y % s
    if (gridStyle === 'none') return {}
    if (gridStyle === 'grid') return {
      backgroundSize: `${s}px ${s}px`, backgroundPosition: `${ox}px ${oy}px`,
      backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
    }
    // dots (default)
    return {
      backgroundSize: `${s}px ${s}px`, backgroundPosition: `${ox}px ${oy}px`,
      backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)',
    }
  }, [zoom, pan, gridStyle])

  /* Derived */
  const displayName  = activeMural?.tipo === 'general' ? 'Mural General' : (activeMural?.titulo || 'Mural')
  const isOwner      = activeMural?.creador_id === user?.id
  const showShareBtn = activeMural && activeMural.tipo === 'compartido' && isOwner
  const myMurals     = murales.filter(m => m.tipo !== 'general' && m.creador_id === user?.id)
  const sharedMurals = murales.filter(m => m.tipo !== 'general' && m.creador_id !== user?.id && (m.tipo === 'publico' || m.shared_with?.includes(user?.id)))

  /* ── Render ────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] select-none overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--c-border)] shrink-0 glass-frosted z-20">
        {/* Mural selector */}
        <div className="relative">
          <button onClick={() => setShowSelector(p => !p)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold text-white hover:bg-[var(--c-surface-2)] transition-colors font-title">
            {activeMural?.tipo === 'general'    && <FiGlobe size={14} className="text-[var(--c-primary)]" />}
            {activeMural?.tipo === 'publico'    && <FiGlobe size={14} className="text-emerald-400" />}
            {activeMural?.tipo === 'privado'    && <FiLock size={14} className="text-amber-400" />}
            {activeMural?.tipo === 'compartido' && <FiUsers size={14} className="text-blue-400" />}
            <span className="max-w-48 truncate">{displayName}</span>
            <FiChevronDown size={12} className="text-white/40" />
          </button>
          <AnimatePresence>
            {showSelector && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="absolute top-full left-0 mt-1 w-72 rounded-xl p-2 z-50 max-h-80 overflow-y-auto glass-frosted border border-[var(--c-border)]">
                <button onClick={() => loadMural(GENERAL_MURAL_ID)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${activeMuralId === GENERAL_MURAL_ID ? 'bg-[var(--c-primary)]/10 text-[var(--c-primary)]' : 'text-white/70 hover:text-white hover:bg-[var(--c-surface-2)]'}`}>
                  <FiGlobe size={14} className="text-[var(--c-primary)] shrink-0" />
                  <span className="flex-1 text-left">Mural General</span>
                </button>
                {myMurals.length > 0 && <>
                  <div className="border-t border-[var(--c-border)] my-1.5" />
                  <p className="text-[10px] text-white/30 px-3 py-1 uppercase tracking-wider">Mis murales</p>
                </>}
                {myMurals.map(m => {
                  const Icon = VISIBILITY_ICONS[m.tipo] || FiLock
                  return (
                    <button key={m.id} onClick={() => loadMural(m.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${activeMuralId === m.id ? 'bg-[var(--c-primary)]/10 text-[var(--c-primary)]' : 'text-white/70 hover:text-white hover:bg-[var(--c-surface-2)]'}`}>
                      <Icon size={13} className="shrink-0 text-white/30" />
                      <span className="flex-1 text-left truncate">{m.titulo}</span>
                      <span className="text-[10px] text-white/20">{new Date(m.updated_at).toLocaleDateString()}</span>
                    </button>
                  )
                })}
                {sharedMurals.length > 0 && <>
                  <div className="border-t border-[var(--c-border)] my-1.5" />
                  <p className="text-[10px] text-white/30 px-3 py-1 uppercase tracking-wider">Compartidos conmigo</p>
                </>}
                {sharedMurals.map(m => {
                  const Icon = VISIBILITY_ICONS[m.tipo] || FiGlobe
                  return (
                    <button key={m.id} onClick={() => loadMural(m.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${activeMuralId === m.id ? 'bg-[var(--c-primary)]/10 text-[var(--c-primary)]' : 'text-white/70 hover:text-white hover:bg-[var(--c-surface-2)]'}`}>
                      <Icon size={13} className="shrink-0 text-white/30" />
                      <span className="flex-1 text-left truncate">{m.titulo}</span>
                    </button>
                  )
                })}
                {myMurals.length === 0 && sharedMurals.length === 0 && (
                  <p className="text-xs text-white/20 px-3 py-2">Solo el mural general</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button onClick={() => setShowNewModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-[var(--c-primary)] hover:bg-[var(--c-primary)]/10 transition-colors">
          <FiPlus size={14} /> Nuevo
        </button>

        {showShareBtn && (
          <button onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-blue-400 hover:bg-blue-400/10 transition-colors">
            <FiShare2 size={14} /> Compartir
          </button>
        )}

        <div className="flex-1" />

        {/* Save indicator */}
        <div className="flex items-center gap-1.5 text-xs mr-2">
          {saveStatus === 'saving' && <span className="text-white/30 flex items-center gap-1"><FiSave size={11} className="animate-pulse" /> Guardando</span>}
          {saveStatus === 'saved'  && <span className="text-emerald-400/60 flex items-center gap-1"><FiCheck size={11} /> Guardado</span>}
          {saveStatus === 'error'  && <span className="text-red-400/70 flex items-center gap-1"><FiX size={11} /> Error al guardar</span>}
          {saveStatus === 'offline' && <span className="text-amber-400/70 flex items-center gap-1" title="Guardando solo en este dispositivo"><FiAlertCircle size={11} /> Local</span>}
        </div>

        {/* Zoom */}
        <button onClick={() => setZoom(z => clamp(z - 0.15, MIN_ZOOM, MAX_ZOOM))} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-[var(--c-surface-2)] transition-colors"><FiZoomOut size={14} /></button>
        <span className="text-xs text-white/40 w-10 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => clamp(z + 0.15, MIN_ZOOM, MAX_ZOOM))} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-[var(--c-surface-2)] transition-colors"><FiZoomIn size={14} /></button>
        <button onClick={fitView} className="w-7 h-7 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-[var(--c-surface-2)] transition-colors"><FiMaximize size={14} /></button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left toolbar ─────────────────────────────────────────── */}
        <div className="w-12 shrink-0 flex flex-col items-center gap-1 py-3 border-r border-[var(--c-border)] glass-frosted z-10">
          <ToolbarIconBtn icon={FiMousePointer} tooltip="Seleccionar (V)" active={activeTool === 'select'} onClick={() => setActiveTool('select')} />
          <div className="w-6 h-px bg-[var(--c-border)] my-1" />

          <ToolbarIconBtn icon={FiPlus} tooltip="Nota adhesiva (doble clic)" onClick={() => { setActiveTool('select'); addSticky(-pan.x / zoom + 200, -pan.y / zoom + 200) }} disabled={!canEditMural} />
          <ToolbarIconBtn icon={FiType} tooltip="Texto libre (T)" onClick={() => { setActiveTool('select'); addLabel() }} disabled={!canEditMural} />
          <ToolbarIconBtn icon={FiImage} tooltip="Subir imagen" onClick={() => { setActiveTool('select'); addImageCard() }} disabled={!canEditMural} />
          <ToolbarIconBtn icon={FiMinus} tooltip="Tarjeta de notas" onClick={() => { setActiveTool('select'); addTextCard() }} disabled={!canEditMural} />

          {/* Shapes */}
          <div className="relative">
            <ToolbarIconBtn icon={FiSquare} tooltip="Formas" active={showShapeMenu} onClick={() => setShowShapeMenu(p => !p)} disabled={!canEditMural} />
            <AnimatePresence>
              {showShapeMenu && (
                <motion.div initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -4 }}
                  className="absolute left-full top-0 ml-2 p-2 rounded-xl z-50 space-y-0.5 glass-frosted border border-[var(--c-border)]">
                  {SHAPE_TYPES.map(s => (
                    <button key={s.id} onClick={() => { addShape(s.id); setShowShapeMenu(false) }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-[var(--c-surface-2)] transition-colors whitespace-nowrap">
                      <span className="text-base leading-none w-5 text-center">{s.icon}</span>{s.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="w-6 h-px bg-[var(--c-border)] my-1" />

          {/* Pen */}
          <div className="relative">
            <ToolbarIconBtn icon={FiEdit3} tooltip="Dibujar (P)" active={activeTool === 'draw'} onClick={() => { setActiveTool(prev => prev === 'draw' ? 'select' : 'draw'); setShowPenOptions(false) }} disabled={!canEditMural} />
            {drawMode && !eraserMode && (
              <button onClick={() => setShowPenOptions(p => !p)}
                className="absolute -right-1 -bottom-1 w-3 h-3 rounded-full border border-white/30 z-10"
                style={{ background: penColor }} />
            )}
            <AnimatePresence>
              {drawMode && showPenOptions && (
                <motion.div initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -4 }}
                  className="absolute left-full top-0 ml-2 p-3 rounded-xl z-50 space-y-3 glass-frosted border border-[var(--c-border)]">
                  <div className="flex gap-1.5 flex-wrap max-w-[140px]">
                    {PEN_COLORS.map(c => (
                      <button key={c} onClick={() => { setPenColor(c); setActiveTool('draw') }}
                        className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${penColor === c && !eraserMode ? 'border-white scale-110' : 'border-transparent'}`}
                        style={{ background: c }} />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    {PEN_SIZES.map(s => (
                      <button key={s} onClick={() => setPenSize(s)}
                        className={`rounded-full transition-all ${penSize === s ? 'ring-2 ring-white/40' : ''}`}
                        style={{ width: s + 8, height: s + 8, background: penColor }} />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Eraser */}
          <ToolbarIconBtn icon={FiSlash} tooltip="Borrador (E)" active={activeTool === 'erase'} onClick={() => setActiveTool(prev => prev === 'erase' ? 'select' : 'erase')} disabled={!canEditMural} />

          <div className="w-6 h-px bg-[var(--c-border)] my-1" />

          <ToolbarIconBtn icon={FiTrash2} tooltip="Eliminar (Del)" disabled={!selectedId} onClick={deleteSelected} />
          <ToolbarIconBtn icon={FiCopy} tooltip="Duplicar (Ctrl+D)" disabled={!selectedId} onClick={duplicateSelected} />
          <ToolbarIconBtn icon={FiCornerDownLeft} tooltip="Deshacer (Ctrl+Z)" onClick={undo} />
          <ToolbarIconBtn icon={FiRefreshCw} tooltip="Rehacer (Ctrl+Y)" onClick={redo} />

          <div className="w-6 h-px bg-[var(--c-border)] my-1" />

          {/* Canvas background picker */}
          <div className="relative">
            <button onClick={() => setShowBgMenu(p => !p)} title="Fondo del lienzo"
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all text-white/40 hover:text-white hover:bg-[var(--c-surface-2)]">
              <span className="w-4 h-4 rounded-full border-2 border-white/30" style={{ background: canvasBg }} />
            </button>
            <AnimatePresence>
              {showBgMenu && (
                <motion.div initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -4 }}
                  className="absolute left-full top-0 ml-2 p-2 rounded-xl z-50 space-y-1 glass-frosted border border-[var(--c-border)]">
                  <p className="text-[10px] text-white/25 uppercase tracking-wider px-1 pb-1">Fondo</p>
                  {CANVAS_BACKGROUNDS.map(bg => (
                    <button key={bg.id} onClick={() => { setCanvasBg(bg.bg); setShowBgMenu(false) }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap ${canvasBg === bg.bg ? 'text-[var(--c-primary)] bg-[var(--c-primary)]/10' : 'text-white/60 hover:text-white hover:bg-[var(--c-surface-2)]'}`}>
                      <span className="w-4 h-4 rounded-full border border-white/20 shrink-0" style={{ background: bg.bg }} />
                      {bg.label}
                    </button>
                  ))}
                  <div className="border-t border-white/[0.06] my-1" />
                  <p className="text-[10px] text-white/25 uppercase tracking-wider px-1 pb-1">Cuadrícula</p>
                  {[
                    { id: 'dots', label: 'Puntos', icon: '·' },
                    { id: 'grid', label: 'Cuadros', icon: '⊞' },
                    { id: 'none', label: 'Sin cuadrícula', icon: '○' },
                  ].map(g => (
                    <button key={g.id} onClick={() => { setGridStyle(g.id); setShowBgMenu(false) }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap ${gridStyle === g.id ? 'text-[var(--c-primary)] bg-[var(--c-primary)]/10' : 'text-white/60 hover:text-white hover:bg-[var(--c-surface-2)]'}`}>
                      <span className="w-4 text-center text-base leading-none">{g.icon}</span>
                      {g.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <ToolbarIconBtn icon={FiSave} tooltip="Guardar (Ctrl+S)" onClick={() => { if (user && activeMuralId) saveToDb(elements, activeMuralId) }} />

          <div className="flex-1" />
          {!canEditMural && <div className="text-[10px] text-white/20 text-center px-1" title="Solo lectura"><FiLock size={12} className="mx-auto mb-0.5" /></div>}
        </div>

        {/* ── Canvas ────────────────────────────────────────────────── */}
        <div
          ref={canvasRef}
          className="flex-1 relative"
          style={{ ...gridBg, cursor: canvasCursor, background: canvasBg, overflow: 'clip' }}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerLeave={handleCanvasPointerUp}
          onDoubleClick={handleDoubleClick}
          data-grid="true"
        >
          {/* Transform layer */}
          <div className="absolute top-0 left-0 w-px h-px"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>

            {/* Persistent drawings SVG */}
            <svg className="absolute pointer-events-none" style={{ top: -20000, left: -20000, width: 40000, height: 40000, overflow: 'visible' }}>
              {elements.filter(el => el.type === 'drawing').map(el => (
                <path key={el.id} d={el.path} fill="none" stroke={el.color}
                  strokeWidth={el.size} strokeLinecap="round" strokeLinejoin="round" />
              ))}
            </svg>

            {/* Live preview SVG */}
            <svg className="absolute pointer-events-none" style={{ top: -20000, left: -20000, width: 40000, height: 40000, overflow: 'visible' }}>
              <path ref={previewPathRef} d="" fill="none"
                stroke={eraserMode ? 'var(--c-error)' : penColor}
                strokeWidth={penSize} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
            </svg>

            {/* Elements */}
            <AnimatePresence>
              {elements.filter(el => el.type !== 'drawing').map(el => (
                <CanvasElement key={el.id} el={el}
                  isSelected={selectedId === el.id}
                  onSelect={() => { if (!drawMode) setSelectedId(el.id) }}
                  onUpdate={canEditMural ? updateElement : () => {}}
                  onDelete={canEditMural ? deleteElement : () => {}}
                  zoom={zoom} readOnly={!canEditMural} drawMode={drawMode} />
              ))}
            </AnimatePresence>
          </div>

          {/* Zoom hint */}
          {zoom < 0.3 && (
            <div className="absolute bottom-4 right-4 text-xs text-white/15 pointer-events-none">
              {Math.round(zoom * 100)}% — scroll para acercar
            </div>
          )}

          {/* Shortcuts hint (only when canvas is empty) */}
          {elements.length === 0 && canEditMural && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-white/8 text-sm">Doble clic para agregar nota · Arrastra para mover · Scroll para zoom</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showNewModal && <NewMuralModal open onClose={() => setShowNewModal(false)} onCreate={createMural} />}
      </AnimatePresence>
      <AnimatePresence>
        {showShareModal && (
          <ShareModal open onClose={() => setShowShareModal(false)}
            sharedWith={activeMural?.shared_with || []} onUpdate={updateMuralSharing} />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   TOOLBAR ICON BUTTON
   ═══════════════════════════════════════════════════════════════════════ */
function ToolbarIconBtn({ icon: Icon, tooltip, onClick, active, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} title={tooltip}
      className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm transition-all
        ${active ? 'bg-[var(--c-primary)] text-white shadow-lg shadow-[var(--c-primary)]/20' : ''}
        ${disabled ? 'text-white/15 cursor-not-allowed' : active ? '' : 'text-white/40 hover:text-white hover:bg-[var(--c-surface-2)]'}
      `}>
      <Icon size={16} />
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   SHAPE CARD
   ═══════════════════════════════════════════════════════════════════════ */
function ShapeCard({ el, onUpdate, isSelected, readOnly }) {
  const w = el.width, h = el.height

  const shapeSvg = () => {
    const fill = el.fill || 'transparent'
    const stroke = el.stroke || '#FC651F'
    const sw = el.strokeWidth || 2
    switch (el.shape) {
      case 'circle':   return <ellipse cx={w/2} cy={h/2} rx={w/2-sw} ry={h/2-sw} fill={fill} stroke={stroke} strokeWidth={sw} />
      case 'diamond':  return <polygon points={`${w/2},${sw} ${w-sw},${h/2} ${w/2},${h-sw} ${sw},${h/2}`} fill={fill} stroke={stroke} strokeWidth={sw} />
      case 'triangle': return <polygon points={`${w/2},${sw} ${w-sw},${h-sw} ${sw},${h-sw}`} fill={fill} stroke={stroke} strokeWidth={sw} />
      case 'star': {
        const cx=w/2, cy=h/2, r1=Math.min(w,h)/2-sw, r2=r1*0.45
        const pts = Array.from({length:10},(_,i)=>{
          const a = (i*Math.PI/5)-Math.PI/2, r=i%2===0?r1:r2
          return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`
        }).join(' ')
        return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} />
      }
      case 'hexagon': {
        const cx=w/2, cy=h/2, r=Math.min(w,h)/2-sw
        const pts = Array.from({length:6},(_,i)=>{
          const a=(i*Math.PI/3)-Math.PI/6
          return `${cx+r*Math.cos(a)},${cy+r*Math.sin(a)}`
        }).join(' ')
        return <polygon points={pts} fill={fill} stroke={stroke} strokeWidth={sw} />
      }
      case 'arrow': {
        const hl=Math.min(36,w*0.28), my=h/2
        return <g fill={stroke} stroke={stroke} strokeWidth={sw}>
          <line x1={sw} y1={my} x2={w-hl} y2={my} strokeLinecap="round"/>
          <polygon points={`${w-hl},${my-hl*0.55} ${w-sw},${my} ${w-hl},${my+hl*0.55}`} stroke="none"/>
        </g>
      }
      case 'arrow_up': {
        const hl=Math.min(36,h*0.28), mx=w/2
        return <g fill={stroke} stroke={stroke} strokeWidth={sw}>
          <line x1={mx} y1={h-sw} x2={mx} y2={hl} strokeLinecap="round"/>
          <polygon points={`${mx-hl*0.55},${hl} ${mx},${sw} ${mx+hl*0.55},${hl}`} stroke="none"/>
        </g>
      }
      case 'line':
        return <line x1={sw} y1={h/2} x2={w-sw} y2={h/2} stroke={stroke} strokeWidth={sw+1} strokeLinecap="round"/>
      case 'callout': {
        const tailX = w*0.2, tailY = h-sw, bodyH = h*0.75
        return <path d={`M${sw},${sw} Q${sw},${sw} ${w-sw},${sw} Q${w-sw},${sw} ${w-sw},${bodyH} L${tailX+w*0.12},${bodyH} L${tailX},${tailY} L${tailX+w*0.06},${bodyH} Q${sw},${bodyH} ${sw},${bodyH} Z`} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
      }
      case 'parallelogram': {
        const off = w * 0.18
        return <polygon points={`${off+sw},${sw} ${w-sw},${sw} ${w-off-sw},${h-sw} ${sw},${h-sw}`} fill={fill} stroke={stroke} strokeWidth={sw}/>
      }
      case 'cross': {
        const t = Math.min(w,h)*0.28 // thickness
        const cx1=w/2-t/2, cx2=w/2+t/2, cy1=h/2-t/2, cy2=h/2+t/2
        return <polygon points={`${cx1},${sw} ${cx2},${sw} ${cx2},${cy1} ${w-sw},${cy1} ${w-sw},${cy2} ${cx2},${cy2} ${cx2},${h-sw} ${cx1},${h-sw} ${cx1},${cy2} ${sw},${cy2} ${sw},${cy1} ${cx1},${cy1}`} fill={fill} stroke={stroke} strokeWidth={sw}/>
      }
      default:
        return <rect x={sw} y={sw} width={w-sw*2} height={h-sw*2} rx={8} fill={fill} stroke={stroke} strokeWidth={sw} />
    }
  }

  return (
    <div className="w-full h-full relative">
      <svg width={w} height={h} className="absolute inset-0" overflow="visible">
        {shapeSvg()}
        {el.label && (
          <text x={w/2} y={h/2} textAnchor="middle" dominantBaseline="middle" fill="rgba(255,255,255,0.85)" fontSize={13} fontFamily="sans-serif">{el.label}</text>
        )}
      </svg>
      {isSelected && !readOnly && (
        <div data-no-drag="true"
          className="absolute top-full left-0 mt-2 flex items-center gap-1 px-2 py-1.5 rounded-xl z-50 flex-wrap max-w-[320px]"
          style={{ background: 'rgba(12,6,8,0.96)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {SHAPE_STROKES.map(c => (
            <button key={c} onClick={() => onUpdate(el.id, { stroke: c })}
              className="w-4 h-4 rounded-full border-2 transition-transform hover:scale-110"
              style={{ background: c, borderColor: el.stroke === c ? 'white' : 'transparent' }} />
          ))}
          <div className="w-px h-4 bg-white/10" />
          {SHAPE_FILLS.map((f, i) => (
            <button key={i} onClick={() => onUpdate(el.id, { fill: f })}
              className="w-4 h-4 rounded border transition-all hover:scale-110"
              style={{ background: f || 'transparent', border: `1.5px solid ${SHAPE_STROKES[i]||'rgba(255,255,255,0.3)'}`, outline: el.fill === f ? '1px solid white' : 'none' }} />
          ))}
          <div className="w-px h-4 bg-white/10" />
          <input data-no-drag="true"
            className="w-20 bg-transparent text-white text-xs outline-none border-b border-white/20 placeholder-white/25 px-1"
            placeholder="Etiqueta..." value={el.label || ''}
            onChange={e => onUpdate(el.id, { label: e.target.value })} />
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   CANVAS ELEMENT — wrapper with drag / resize / rotate
   ═══════════════════════════════════════════════════════════════════════ */
function CanvasElement({ el, isSelected, onSelect, onUpdate, onDelete, zoom, readOnly, drawMode }) {
  const ref = useRef(null)
  const dragging  = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const elStart   = useRef({ x: 0, y: 0 })
  const resizing  = useRef(false)
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 })
  const rotating  = useRef(false)

  const handlePointerDown = (e) => {
    if (drawMode) return
    if (readOnly) { onSelect(); return }
    if (e.target.dataset?.resize) {
      e.stopPropagation()
      resizing.current = true
      resizeStart.current = { x: e.clientX, y: e.clientY, w: el.width, h: el.height }
      document.addEventListener('pointermove', handleResizeMove)
      document.addEventListener('pointerup', handleResizeUp)
      return
    }
    if (e.target.closest('[data-no-drag]')) return
    e.stopPropagation()
    onSelect()
    dragging.current = true
    dragStart.current = { x: e.clientX, y: e.clientY }
    elStart.current   = { x: el.x, y: el.y }
    document.addEventListener('pointermove', handleDragMove)
    document.addEventListener('pointerup', handleDragUp)
  }

  const handleDragMove = (e) => {
    if (!dragging.current) return
    onUpdate(el.id, {
      x: elStart.current.x + (e.clientX - dragStart.current.x) / zoom,
      y: elStart.current.y + (e.clientY - dragStart.current.y) / zoom,
    })
  }
  const handleDragUp = () => {
    dragging.current = false
    document.removeEventListener('pointermove', handleDragMove)
    document.removeEventListener('pointerup', handleDragUp)
  }
  const handleResizeMove = (e) => {
    if (!resizing.current) return
    onUpdate(el.id, {
      width:  Math.max(80,  resizeStart.current.w + (e.clientX - resizeStart.current.x) / zoom),
      height: Math.max(50, resizeStart.current.h + (e.clientY - resizeStart.current.y) / zoom),
    })
  }
  const handleResizeUp = () => {
    resizing.current = false
    document.removeEventListener('pointermove', handleResizeMove)
    document.removeEventListener('pointerup', handleResizeUp)
  }

  const handleRotateDown = (e) => {
    e.stopPropagation()
    rotating.current = true
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2
    const startAngle = Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI)
    const startRot   = el.rotation || 0
    const onMove = (ev) => {
      if (!rotating.current) return
      const angle = Math.atan2(ev.clientY - cy, ev.clientX - cx) * (180 / Math.PI)
      onUpdate(el.id, { rotation: Math.round(startRot + angle - startAngle) })
    }
    const onUp = () => {
      rotating.current = false
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }

  const rotation = el.rotation || 0

  return (
    <motion.div ref={ref}
      initial={{ scale: 0.85, opacity: 0, rotate: rotation }}
      animate={{ scale: 1, opacity: 1, rotate: rotation }}
      exit={{ scale: 0.85, opacity: 0 }}
      transition={{ duration: 0.15, ease: 'easeOut', rotate: { duration: 0 } }}
      className="absolute group"
      style={{
        left: el.x, top: el.y, width: el.width, height: el.height,
        zIndex: isSelected ? 50 : 1,
        transformOrigin: 'center center',
        pointerEvents: drawMode ? 'none' : undefined,
      }}
      onPointerDown={handlePointerDown}
    >
      {el.type === 'sticky' && <StickyNote   el={el} onUpdate={onUpdate} isSelected={isSelected} readOnly={readOnly} />}
      {el.type === 'text'   && <TextCard     el={el} onUpdate={onUpdate} isSelected={isSelected} readOnly={readOnly} />}
      {el.type === 'label'  && <LabelCard    el={el} onUpdate={onUpdate} isSelected={isSelected} readOnly={readOnly} />}
      {el.type === 'image'  && <ImageCard    el={el} onUpdate={onUpdate} isSelected={isSelected} readOnly={readOnly} />}
      {el.type === 'shape'  && <ShapeCard    el={el} onUpdate={onUpdate} isSelected={isSelected} readOnly={readOnly} />}

      {/* Selection ring */}
      {isSelected && <div className="absolute inset-0 rounded-xl border-2 border-[var(--c-primary)] pointer-events-none" />}

      {/* Rotate + delete buttons — inside top-right corner of element */}
      {!readOnly && isSelected && (
        <div className="absolute -top-3 right-0 flex items-center gap-1 z-20" data-no-drag="true">
          {/* Rotate */}
          <button onPointerDown={handleRotateDown}
            className="w-6 h-6 rounded-full bg-[var(--c-primary)] text-white flex items-center justify-center cursor-crosshair shadow-lg border border-white/20"
            title="Rotar (arrastra)">
            <FiRotateCw size={11} />
          </button>
          {rotation !== 0 && (
            <span className="text-[9px] text-white/40 bg-black/50 rounded px-1 py-0.5 pointer-events-none">
              {rotation}°
            </span>
          )}
        </div>
      )}

      {/* Delete button on hover */}
      {!readOnly && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(el.id) }}
          className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-[var(--c-error)] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20"
          data-no-drag="true">
          <FiTrash2 size={9} />
        </button>
      )}

      {/* Resize handle */}
      {!readOnly && (
        <div data-resize="true"
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize opacity-0 group-hover:opacity-80 transition-opacity rounded-br-xl z-10"
          style={{ background: 'linear-gradient(135deg, transparent 50%, var(--c-primary) 50%)' }} />
      )}
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   STICKY NOTE
   ═══════════════════════════════════════════════════════════════════════ */
function StickyNote({ el, onUpdate, isSelected, readOnly }) {
  return (
    <div className="w-full h-full relative">
      {/* Color picker floats below the sticky */}
      {isSelected && !readOnly && (
        <div className="absolute top-full left-0 mt-2 flex gap-1.5 px-2 py-1.5 rounded-xl z-50" data-no-drag="true"
          style={{ background: 'rgba(12,6,8,0.96)', border: '1px solid rgba(255,255,255,0.1)' }}>
          {STICKY_COLORS.map(c => (
            <button key={c} onClick={() => onUpdate(el.id, { color: c })}
              className={`w-4 h-4 rounded-full border-2 transition-transform hover:scale-110 ${el.color === c ? 'border-black/40 scale-110' : 'border-transparent'}`}
              style={{ background: c }} />
          ))}
        </div>
      )}
      <div className="w-full h-full rounded-2xl p-3 flex flex-col shadow-xl"
        style={{ background: el.color, boxShadow: `0 6px 30px ${el.color}40` }}>
        <div data-no-drag="true" contentEditable={!readOnly} suppressContentEditableWarning
          className="flex-1 text-sm text-black/80 font-medium outline-none overflow-auto leading-relaxed resize-none"
          onBlur={e => !readOnly && onUpdate(el.id, { text: e.currentTarget.innerText })}
          dangerouslySetInnerHTML={{ __html: el.text || '' }} />
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   TEXT CARD
   ═══════════════════════════════════════════════════════════════════════ */
function TextCard({ el, onUpdate, isSelected, readOnly }) {
  return (
    <div className="w-full h-full rounded-2xl p-4 flex flex-col border border-[var(--c-border)] glass-frosted">
      <input data-no-drag="true"
        className="bg-transparent text-white font-bold text-base outline-none border-b border-[var(--c-border)] pb-1 mb-2 font-title"
        value={el.title}
        onChange={e => !readOnly && onUpdate(el.id, { title: e.target.value })}
        readOnly={readOnly} />
      <textarea data-no-drag="true"
        className="flex-1 bg-transparent text-white/60 text-sm outline-none resize-none leading-relaxed"
        value={el.body}
        onChange={e => !readOnly && onUpdate(el.id, { body: e.target.value })}
        readOnly={readOnly} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   IMAGE CARD
   ═══════════════════════════════════════════════════════════════════════ */
function ImageCard({ el, onUpdate, isSelected, readOnly }) {
  return (
    <div className="w-full h-full rounded-2xl overflow-hidden border border-[var(--c-border)] glass-frosted">
      <img src={el.src} alt="" className="w-full h-full object-contain" draggable={false} />
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   LABEL CARD — bare editable text directly on canvas
   ═══════════════════════════════════════════════════════════════════════ */
const LABEL_COLORS = ['#ffffff', '#FBBF24', '#F87171', '#A78BFA', '#34D399', '#60A5FA', '#FC651F', '#000000']
const LABEL_SIZES  = [12, 16, 20, 28, 36, 48, 64]

function LabelCard({ el, onUpdate, isSelected, readOnly }) {
  return (
    <div className="w-full h-full relative flex items-center">
      {/* Floating toolbar below when selected */}
      {isSelected && !readOnly && (
        <div className="absolute top-full left-0 mt-2 flex items-center gap-1.5 px-2 py-1.5 rounded-xl z-50 flex-wrap max-w-[360px]"
          style={{ background: 'rgba(12,6,8,0.97)', border: '1px solid rgba(255,255,255,0.1)' }}
          data-no-drag="true">
          {/* Color swatches */}
          {LABEL_COLORS.map(c => (
            <button key={c} onClick={() => onUpdate(el.id, { color: c })}
              className={`w-4 h-4 rounded-full border-2 transition-transform hover:scale-110 shrink-0`}
              style={{ background: c, borderColor: el.color === c ? 'white' : 'transparent' }} />
          ))}
          <div className="w-px h-4 bg-white/15" />
          {/* Font sizes */}
          {LABEL_SIZES.map(s => (
            <button key={s} onClick={() => onUpdate(el.id, { fontSize: s })}
              className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${el.fontSize === s ? 'bg-[var(--c-primary)] text-white' : 'text-white/40 hover:text-white hover:bg-white/10'}`}>
              {s}
            </button>
          ))}
          <div className="w-px h-4 bg-white/15" />
          {/* Bold / Italic */}
          <button onClick={() => onUpdate(el.id, { bold: !el.bold })}
            className={`px-1.5 py-0.5 rounded text-xs font-bold transition-colors ${el.bold ? 'bg-[var(--c-primary)] text-white' : 'text-white/40 hover:text-white hover:bg-white/10'}`}>B</button>
          <button onClick={() => onUpdate(el.id, { italic: !el.italic })}
            className={`px-1.5 py-0.5 rounded text-xs italic transition-colors ${el.italic ? 'bg-[var(--c-primary)] text-white' : 'text-white/40 hover:text-white hover:bg-white/10'}`}>I</button>
        </div>
      )}
      <div data-no-drag="true"
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onBlur={e => !readOnly && onUpdate(el.id, { text: e.currentTarget.innerText })}
        className="w-full outline-none leading-tight break-words"
        style={{
          color: el.color || '#ffffff',
          fontSize: el.fontSize || 18,
          fontWeight: el.bold ? 700 : 400,
          fontStyle: el.italic ? 'italic' : 'normal',
          textShadow: '0 1px 4px rgba(0,0,0,0.6)',
          minHeight: (el.fontSize || 18) + 8,
          cursor: readOnly ? 'default' : 'text',
        }}
        dangerouslySetInnerHTML={{ __html: el.text || '' }}
      />
    </div>
  )
}
