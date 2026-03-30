import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiPlus, FiType, FiImage, FiEdit3, FiZoomIn, FiZoomOut, FiMaximize,
  FiTrash2, FiSave, FiCheck, FiChevronDown, FiX, FiCornerDownLeft,
  FiMousePointer, FiShare2, FiLock, FiGlobe, FiUsers, FiSearch, FiSquare,
  FiRotateCw, FiMinus, FiSlash, FiCopy, FiRefreshCw, FiAlertCircle,
  FiHelpCircle, FiZap, FiCheckSquare, FiLink, FiDownload, FiTarget,
} from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { generateMuralSuggestions } from '../../lib/gemini'

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
const CURSOR_COLORS = ['#F87171', '#FBBF24', '#34D399', '#60A5FA', '#A78BFA', '#F0ABFC']
function getCursorColor(userId) {
  if (!userId) return CURSOR_COLORS[0]
  let h = 0; for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) & 0xffff
  return CURSOR_COLORS[h % CURSOR_COLORS.length]
}
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

/* ── Download canvas as PDF (minimal PDF with embedded JPEG) ─────── */
function downloadCanvasAsPDF(canvas, filename) {
  const jpegDataURL = canvas.toDataURL('image/jpeg', 0.92)
  const base64 = jpegDataURL.split(',')[1]
  const jpegBin = atob(base64)
  const jpegBytes = new Uint8Array(jpegBin.length)
  for (let i = 0; i < jpegBin.length; i++) jpegBytes[i] = jpegBin.charCodeAt(i)

  const enc = (s) => new TextEncoder().encode(s)
  const W = canvas.width, H = canvas.height
  const pw = (W * 72 / 96).toFixed(2), ph = (H * 72 / 96).toFixed(2)

  const parts = []; const offsets = []; let pos = 0
  const add = (data) => {
    const bytes = typeof data === 'string' ? enc(data) : data
    parts.push(bytes); pos += bytes.length
  }

  add('%PDF-1.4\n')
  offsets[0] = pos; add('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n\n')
  offsets[1] = pos; add('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n\n')
  offsets[2] = pos; add(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}]\n/Contents 4 0 R /Resources << /XObject << /Im1 5 0 R >> >> >>\nendobj\n\n`)
  const stream = `q ${pw} 0 0 ${ph} 0 0 cm /Im1 Do Q\n`
  offsets[3] = pos; add(`4 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}endstream\nendobj\n\n`)
  const imgHdr = `5 0 obj\n<< /Type /XObject /Subtype /Image /Width ${W} /Height ${H}\n/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
  offsets[4] = pos; add(imgHdr); add(jpegBytes); add('\nendstream\nendobj\n\n')

  const xrefPos = pos
  add('xref\n0 6\n0000000000 65535 f \n')
  offsets.forEach(o => add(String(o).padStart(10, '0') + ' 00000 n \n'))
  add(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`)

  let total = 0; for (const p of parts) total += p.length
  const out = new Uint8Array(total); let off = 0
  for (const p of parts) { out.set(p, off); off += p.length }

  const blob = new Blob([out], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

/* ── Split SVG path into segments, skipping points near eraser ───── */
function splitPathByErase(pathStr, eraserPts, radius, dxOff, dyOff) {
  // Extract all coordinate pairs from the path (only endpoints, not control points)
  const pts = []
  const re = /([MLCQ])\s*([-\d.,\s]+)/g; let m
  while ((m = re.exec(pathStr)) !== null) {
    const cmd = m[1]
    const nums = m[2].trim().split(/[\s,]+/).map(Number)
    if (cmd === 'M' || cmd === 'L') {
      pts.push({ x: nums[0], y: nums[1] })
    } else if (cmd === 'Q') {
      pts.push({ x: nums[2], y: nums[3] })
    } else if (cmd === 'C') {
      pts.push({ x: nums[4], y: nums[5] })
    }
  }
  if (pts.length < 2) return []

  const r2 = radius * radius
  const erased = pts.map(p => {
    const px = p.x + dxOff, py = p.y + dyOff
    for (const ep of eraserPts) {
      const dx = ep.x - px, dy = ep.y - py
      if (dx * dx + dy * dy <= r2) return true
    }
    return false
  })

  const segments = []; let cur = []
  for (let i = 0; i < pts.length; i++) {
    if (!erased[i]) { cur.push(pts[i]) }
    else { if (cur.length >= 2) segments.push([...cur]); cur = [] }
  }
  if (cur.length >= 2) segments.push(cur)
  return segments
}

/* ── Canvas 2D helpers (used for PNG export) ───────────────────────── */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = (text || '').split(' ')
  let line = ''
  let cy = y
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, cy); line = word; cy += lineH
      if (cy > y + lineH * 6) { ctx.fillText('…', x, cy); return }
    } else { line = test }
  }
  if (line) ctx.fillText(line, x, cy)
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
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [presenceCursors, setPresenceCursors] = useState({})
  const [showAIPanel, setShowAIPanel]   = useState(false)
  const [aiPrompt, setAiPrompt]         = useState('')
  const [aiLoading, setAiLoading]       = useState(false)
  const [aiToast, setAiToast]           = useState(null) // { msg, count }
  const [clipboard, setClipboard]       = useState(null)
  const [showPresencePanel, setShowPresencePanel] = useState(false)
  const [presenceList, setPresenceList]  = useState({}) // uid → { name, foto_url, lastX, lastY, lastSeen }
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [selectedDrawingId, setSelectedDrawingId] = useState(null)
  const [drawingDrag, setDrawingDrag] = useState(null) // { id, startDx, startDy, startPx, startPy }

  const drawMode    = activeTool === 'draw' || activeTool === 'erase'
  const eraserMode  = activeTool === 'erase'
  const [precisionErase, setPrecisionErase] = useState(false)
  const [assistedDraw, setAssistedDraw] = useState(false)
  const assistedDrawRef = useRef(false)

  /* ── Refs ──────────────────────────────────────────────────────────── */
  const canvasRef           = useRef(null)
  const isPanning           = useRef(false)
  const presenceChannel     = useRef(null)
  const lastCursorBroadcast = useRef(0)
  const panStart        = useRef({ x: 0, y: 0 })
  const panOrigin       = useRef({ x: 0, y: 0 })
  const isDrawing       = useRef(false)
  const currentPath     = useRef([])
  const previewPathRef  = useRef(null)
  const history         = useRef([])
  const historyIndex    = useRef(-1)
  const skipHistory     = useRef(false)
  // Refs for draw native listener (avoid stale closures)
  const penColorRef       = useRef(penColor)
  const penSizeRef        = useRef(penSize)
  const eraserModeRef     = useRef(eraserMode)
  const drawModeRef       = useRef(false)
  const canEditRef        = useRef(false)
  const userRef           = useRef(user)
  const screenToCanvasRef = useRef(null)
  const zoomRef           = useRef(zoom)
  const precisionEraseRef = useRef(false)
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

  // Keep draw refs in sync (only variables declared above this point)
  useEffect(() => { penColorRef.current = penColor }, [penColor])
  useEffect(() => { penSizeRef.current = penSize }, [penSize])
  useEffect(() => { eraserModeRef.current = eraserMode }, [eraserMode])
  useEffect(() => { drawModeRef.current = drawMode }, [drawMode])
  useEffect(() => { userRef.current = user }, [user])
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { precisionEraseRef.current = precisionErase }, [precisionErase])
  useEffect(() => { assistedDrawRef.current = assistedDraw }, [assistedDraw])

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
      const raw = data.data   // DB column is named 'data'
      const elems = (typeof raw === 'string' ? JSON.parse(raw) : raw) || []
      setElements(elems)
    } else if (error && muralId === GENERAL_MURAL_ID) {
      // Auto-create general mural if missing
      const { data: created } = await supabase.from('murales').insert({
        id: GENERAL_MURAL_ID, titulo: 'Mural General', tipo: 'general',
        creador_id: null, shared_with: [], data: [],
      }).select().single()
      setActiveMural(created || { id: GENERAL_MURAL_ID, titulo: 'Mural General', tipo: 'general', shared_with: [] })
      setElements([])
    } else if (error) {
      console.warn('[Mural] Load error:', error.message)
      setSaveStatus('error')
    }
  }, [user])

  useEffect(() => { if (user) loadMural(GENERAL_MURAL_ID) }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Realtime presence (cursors) ───────────────────────────────────── */
  useEffect(() => {
    if (!user || !activeMuralId) return
    const ch = supabase.channel(`mural-presence:${activeMuralId}`)
    presenceChannel.current = ch
    ch
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        if (payload.userId === user.id) return
        const entry = { x: payload.x, y: payload.y, name: payload.name, foto_url: payload.foto_url, lastSeen: Date.now() }
        setPresenceCursors(prev => ({ ...prev, [payload.userId]: entry }))
        setPresenceList(prev => ({ ...prev, [payload.userId]: entry }))
      })
      .on('broadcast', { event: 'leave' }, ({ payload }) => {
        setPresenceCursors(prev => { const n = { ...prev }; delete n[payload.userId]; return n })
      })
      .subscribe()
    return () => {
      ch.send({ type: 'broadcast', event: 'leave', payload: { userId: user.id } })
      supabase.removeChannel(ch)
      presenceChannel.current = null
      setPresenceCursors({})
    }
  }, [user, activeMuralId])

  /* ── Smart placement: find a clear area below existing content ──────── */
  const findSmartBase = useCallback(() => {
    const rect = canvasRef.current?.getBoundingClientRect() || { width: 1000, height: 600 }
    const vpX = -pan.x / zoom
    const vpY = -pan.y / zoom
    const vpW = rect.width / zoom
    const nonDrawings = elements.filter(e => e.type !== 'drawing' && e.width > 0)
    if (nonDrawings.length === 0) return { x: vpX + 60, y: vpY + 60 }
    const maxY = Math.max(...nonDrawings.map(e => e.y + e.height))
    const minX = Math.min(...nonDrawings.map(e => e.x))
    const targetY = maxY + 80
    const targetX = Math.max(vpX + 20, Math.min(minX, vpX + vpW * 0.1))
    return { x: targetX, y: targetY }
  }, [elements, pan, zoom])

  /* ── AI suggestions ─────────────────────────────────────────────────── */
  const handleAIGenerate = async () => {
    if (!aiPrompt.trim() || aiLoading || !canEditMural) return
    setAiLoading(true)
    try {
      const result = await generateMuralSuggestions(aiPrompt)
      const elementos = result.elementos || result || []
      const { x: baseX, y: baseY } = findSmartBase()
      const newEls = []
      let stickyCount = 0
      let textoCount = 0
      let etiquetaCount = 0
      let formaCount = 0
      let checklistCount = 0
      let linkCount = 0
      const sectionColors = ['#FC651F', '#8B5CF6', '#00D1FF', '#22c55e', '#F59E0B']

      for (const el of elementos) {
        if (el.tipo === 'titulo') {
          newEls.push({
            id: uid(), type: 'text',
            x: baseX, y: baseY,
            width: 520, height: 130,
            title: el.titulo || 'Título',
            body: el.subtitulo || '',
            rotation: 0, author_id: user?.id,
          })
        } else if (el.tipo === 'sticky') {
          const col = stickyCount % 4
          const row = Math.floor(stickyCount / 4)
          newEls.push({
            id: uid(), type: 'sticky',
            x: baseX + col * 215,
            y: baseY + 170 + row * 205,
            width: 200, height: 180,
            text: `${el.titulo || ''}\n\n${el.texto || ''}`,
            color: STICKY_COLORS[stickyCount % STICKY_COLORS.length],
            rotation: (Math.random() - 0.5) * 4,
            author_id: user?.id,
          })
          stickyCount++
        } else if (el.tipo === 'texto') {
          newEls.push({
            id: uid(), type: 'text',
            x: baseX + 550 + textoCount * 340,
            y: baseY + textoCount * 220,
            width: 320, height: 210,
            title: el.titulo || '',
            body: el.cuerpo || '',
            rotation: 0, author_id: user?.id,
          })
          textoCount++
        } else if (el.tipo === 'etiqueta') {
          newEls.push({
            id: uid(), type: 'label',
            x: baseX + etiquetaCount * 280,
            y: baseY - 50,
            width: 240, height: 36,
            text: el.texto || '',
            fontSize: 16, color: sectionColors[etiquetaCount % sectionColors.length],
            bold: true, italic: false, rotation: 0, author_id: user?.id,
          })
          etiquetaCount++
        } else if (el.tipo === 'forma') {
          newEls.push({
            id: uid(), type: 'shape', shape: el.forma || 'rect',
            x: baseX + 560 + (formaCount % 2) * 200,
            y: baseY + 160 + Math.floor(formaCount / 2) * 150,
            width: 160, height: 110,
            fill: SHAPE_FILLS[formaCount % SHAPE_FILLS.length],
            stroke: SHAPE_STROKES[formaCount % SHAPE_STROKES.length],
            strokeWidth: 2,
            label: el.etiqueta || '',
            rotation: 0, author_id: user?.id,
          })
          formaCount++
        } else if (el.tipo === 'checklist') {
          const itemCount = el.items?.length || 3
          newEls.push({
            id: uid(), type: 'checklist',
            x: baseX + checklistCount * 310,
            y: baseY + 160,
            width: 290, height: Math.max(140, (itemCount + 1) * 34 + 24),
            title: el.titulo || 'Lista',
            items: (el.items || []).map(text => ({ id: uid(), text, checked: false })),
            rotation: 0, author_id: user?.id,
          })
          checklistCount++
        } else if (el.tipo === 'link') {
          newEls.push({
            id: uid(), type: 'link',
            x: baseX + 580 + linkCount * 310,
            y: baseY + 180,
            width: 295, height: 115,
            title: el.titulo || 'Enlace',
            url: el.url || '',
            description: el.descripcion || '',
            rotation: 0, author_id: user?.id,
          })
          linkCount++
        }
      }

      setElements(prev => [...prev, ...newEls])
      setAiPrompt('')
      setShowAIPanel(false)
      const resumen = result.resumen || `${newEls.length} elementos generados`
      setAiToast({ msg: resumen, count: newEls.length })
      setTimeout(() => setAiToast(null), 5000)

    } catch (err) {
      console.error('[Mural AI]', err)
      setAiToast({ msg: err.message || 'Error al generar con IA.', count: 0, error: true })
      setTimeout(() => setAiToast(null), 6000)
    }
    setAiLoading(false)
  }

  /* ── Auto-save ─────────────────────────────────────────────────────── */
  const saveToDb = useCallback(async (elems, muralId) => {
    if (!user || !muralId) return
    setSaveStatus('saving')
    const { error } = await supabase
      .from('murales')
      .update({ data: elems, updated_at: new Date().toISOString() })
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
      .from('murales').insert({ titulo, tipo, creador_id: user.id, shared_with: [], data: [] })
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
  // Must be after canEditMural declaration (TDZ)
  useEffect(() => { canEditRef.current = canEditMural }, [canEditMural])

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

  const addChecklist = () => {
    if (!canEditMural) return
    const el = { id: uid(), type: 'checklist',
      x: -pan.x / zoom + 280, y: -pan.y / zoom + 200, width: 290, height: 190,
      title: 'Lista de tareas', items: [{ id: uid(), text: 'Elemento 1', checked: false }],
      rotation: 0, author_id: user?.id }
    setElements(prev => [...prev, el])
    setSelectedId(el.id)
  }

  const addLink = () => {
    if (!canEditMural) return
    const el = { id: uid(), type: 'link',
      x: -pan.x / zoom + 280, y: -pan.y / zoom + 200, width: 295, height: 115,
      title: 'Enlace', url: '', description: '',
      rotation: 0, author_id: user?.id }
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
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && selectedId && !isEditing) {
        e.preventDefault()
        const el = elements.find(x => x.id === selectedId)
        if (el) setClipboard(el)
        return
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !isEditing) {
        e.preventDefault()
        if (clipboard && canEditMural) {
          const clone = { ...clipboard, id: uid(), x: clipboard.x + 24, y: clipboard.y + 24 }
          setElements(prev => [...prev, clone])
          setSelectedId(clone.id)
        }
        return
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditing) {
        if (selectedId) { e.preventDefault(); deleteSelected() }
        else if (selectedDrawingId) { e.preventDefault(); setElements(prev => prev.filter(el => el.id !== selectedDrawingId)); setSelectedDrawingId(null) }
      }
      if (e.key === 'Escape') { setActiveTool('select'); setSelectedId(null); setSelectedDrawingId(null); setShowShortcuts(false); setShowAIPanel(false) }
      // Tool shortcuts
      if (!isEditing) {
        if (e.key === 'v') setActiveTool('select')
        if (e.key === 'p' || e.key === 'b') setActiveTool('draw')
        if (e.key === 'e') setActiveTool('erase')
        if (e.key === 't') { setActiveTool('select'); addLabel() }
        if (e.key === '?') { e.preventDefault(); setShowShortcuts(p => !p) }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [undo, redo, selectedId, deleteSelected, duplicateSelected, drawMode, user, activeMuralId, elements, saveToDb, clipboard, canEditMural])

  /* ── Paste images from clipboard ───────────────────────────────────── */
  useEffect(() => {
    const handlePaste = (e) => {
      if (!canEditMural) return
      const items = Array.from(e.clipboardData?.items || [])
      const imgItem = items.find(it => it.type.startsWith('image/'))
      if (!imgItem) return
      e.preventDefault()
      const file = imgItem.getAsFile()
      if (!file) return
      const reader = new FileReader()
      reader.onload = (ev) => {
        const cx = -pan.x / zoom + 300
        const cy = -pan.y / zoom + 200
        const el = { id: uid(), type: 'image', x: cx, y: cy, width: 320, height: 240, src: ev.target.result, rotation: 0, author_id: user?.id }
        setElements(prev => [...prev, el])
        setSelectedId(el.id)
      }
      reader.readAsDataURL(file)
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [canEditMural, pan, zoom, user])

  /* ── Canvas interaction ────────────────────────────────────────────── */
  const screenToCanvas = useCallback((sx, sy) => {
    const rect = canvasRef.current?.getBoundingClientRect() || { left: 0, top: 0 }
    return { x: (sx - rect.left - pan.x) / zoom, y: (sy - rect.top - pan.y) / zoom }
  }, [pan, zoom])
  useEffect(() => { screenToCanvasRef.current = screenToCanvas }, [screenToCanvas])

  const handleCanvasPointerDown = (e) => {
    if (isDrawing.current) return // drawing is handled by native listener
    if (e.target === canvasRef.current || e.target.dataset?.grid) {
      setSelectedId(null)
      setSelectedDrawingId(null)
      isPanning.current = true
      panStart.current = { x: e.clientX, y: e.clientY }
      panOrigin.current = { ...pan }
    }
  }

  const handleCanvasPointerMove = (e) => {
    // Broadcast cursor position (throttled to ~30fps)
    const now = Date.now()
    if (now - lastCursorBroadcast.current > 33 && presenceChannel.current && user) {
      lastCursorBroadcast.current = now
      const pt = screenToCanvas(e.clientX, e.clientY)
      presenceChannel.current.send({
        type: 'broadcast', event: 'cursor',
        payload: { x: pt.x, y: pt.y, userId: user.id, name: user.nombre || '?', foto_url: user.foto_url || null },
      })
    }
    if (isPanning.current) {
      setPan({ x: panOrigin.current.x + e.clientX - panStart.current.x, y: panOrigin.current.y + e.clientY - panStart.current.y })
    }
  }

  const handleCanvasPointerUp = () => {
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

  /* ── Native draw listeners (bypass React synthetic events) ─────────── */
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const onDown = (e) => {
      if (!drawModeRef.current || !canEditRef.current) return
      e.preventDefault()
      canvas.setPointerCapture(e.pointerId)
      isDrawing.current = true
      const s = screenToCanvasRef.current
      currentPath.current = s ? [s(e.clientX, e.clientY)] : [{ x: e.clientX, y: e.clientY }]
    }

    const onMove = (e) => {
      if (!isDrawing.current) return
      const s = screenToCanvasRef.current
      const pt = s ? s(e.clientX, e.clientY) : { x: e.clientX, y: e.clientY }
      currentPath.current.push(pt)
      if (previewPathRef.current) {
        previewPathRef.current.setAttribute('d', smoothPath(currentPath.current))
      }
    }

    const onUp = () => {
      if (!isDrawing.current) return
      isDrawing.current = false
      if (previewPathRef.current) previewPathRef.current.setAttribute('d', '')
      const pts = currentPath.current
      currentPath.current = []
      if (pts.length < 2) return
      const d = smoothPath(pts)
      if (eraserModeRef.current) {
        if (precisionEraseRef.current) {
          // Precision erase: split strokes at the erased area instead of removing entirely
          const radius = Math.max(penSizeRef.current * 3, 12)
          const r2 = radius * radius
          setElements(prev => {
            const result = []
            for (const el of prev) {
              if (el.type !== 'drawing') { result.push(el); continue }
              const nums = el.path.match(/[-\d.]+/g)?.map(Number) || []
              const dx = el.dx || 0, dy = el.dy || 0
              // Check if eraser touches this stroke at all
              let touched = false
              outer: for (let ci = 0; ci < pts.length; ci += 2) {
                const cx = pts[ci].x, cy = pts[ci].y
                for (let i = 0; i < nums.length - 1; i += 2) {
                  const ex = nums[i] + dx - cx, ey = nums[i+1] + dy - cy
                  if (ex*ex + ey*ey <= r2) { touched = true; break outer }
                }
              }
              if (!touched) { result.push(el); continue }
              // Split path — add surviving segments back as new drawings
              const segments = splitPathByErase(el.path, pts, radius, dx, dy)
              for (const seg of segments) {
                if (seg.length >= 2) result.push({ ...el, id: uid(), path: smoothPath(seg) })
              }
            }
            return result
          })
        } else {
          // Fast erase: remove drawings whose bounding box overlaps the erase stroke bbox
          const minX = Math.min(...pts.map(p => p.x)), maxX = Math.max(...pts.map(p => p.x))
          const minY = Math.min(...pts.map(p => p.y)), maxY = Math.max(...pts.map(p => p.y))
          setElements(prev => prev.filter(el => {
            if (el.type !== 'drawing') return true
            const nums = el.path.match(/[-\d.]+/g)?.map(Number) || []
            const dx = el.dx || 0, dy = el.dy || 0
            for (let i = 0; i < nums.length - 1; i += 2) {
              if (nums[i]+dx >= minX && nums[i]+dx <= maxX && nums[i+1]+dy >= minY && nums[i+1]+dy <= maxY) return false
            }
            return true
          }))
        }
      } else {
        const color = penColorRef.current
        const size  = penSizeRef.current
        const userId = userRef.current?.id
        // Assisted drawing: snap to shape if recognizable
        if (assistedDrawRef.current && pts.length >= 5) {
          const minX = Math.min(...pts.map(p => p.x)), maxX = Math.max(...pts.map(p => p.x))
          const minY = Math.min(...pts.map(p => p.y)), maxY = Math.max(...pts.map(p => p.y))
          const w = maxX - minX, h = maxY - minY
          const diag = Math.sqrt(w*w + h*h)
          const first = pts[0], last = pts[pts.length - 1]
          const closeDist = Math.sqrt((last.x-first.x)**2 + (last.y-first.y)**2)

          if (diag >= 20) {
            // Closed shape detection (start ≈ end)
            if (closeDist < diag * 0.28 && w > 20 && h > 20) {
              const aspect = w / h
              const shapeType = aspect > 0.55 && aspect < 1.8 ? 'circle' : 'rect'
              const pad = 6
              setElements(prev => [...prev, {
                id: uid(), type: 'shape', shape: shapeType,
                x: minX - pad, y: minY - pad, width: w + pad*2, height: h + pad*2,
                fill: 'transparent', stroke: color, strokeWidth: Math.max(size, 2), label: '',
                rotation: 0, author_id: userId,
              }])
              return
            }
            // Straight line detection (low deviation)
            const lineLen = Math.sqrt((last.x-first.x)**2 + (last.y-first.y)**2)
            if (lineLen > 20 && pts.length >= 3) {
              const maxDev = pts.reduce((mx, p) => {
                const num = Math.abs((last.y-first.y)*p.x - (last.x-first.x)*p.y + last.x*first.y - last.y*first.x)
                return Math.max(mx, num / lineLen)
              }, 0)
              if (maxDev < diag * 0.07) {
                const linePath = `M ${first.x} ${first.y} L ${last.x} ${last.y}`
                setElements(prev => [...prev, { id: uid(), type: 'drawing', path: linePath, color, size, x: 0, y: 0, width: 0, height: 0, dx: 0, dy: 0, author_id: userId }])
                return
              }
            }
          }
        }
        setElements(prev => [...prev, { id: uid(), type: 'drawing', path: d, color, size, x: 0, y: 0, width: 0, height: 0, dx: 0, dy: 0, author_id: userId }])
      }
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup',   onUp)
    canvas.addEventListener('pointerleave', onUp)
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup',   onUp)
      canvas.removeEventListener('pointerleave', onUp)
    }
  }, []) // intentionally empty — uses refs for all mutable values

  const handleDoubleClick = (e) => {
    if (drawMode || !canEditMural) return
    if (e.target === canvasRef.current || e.target.dataset?.grid) {
      const pt = screenToCanvas(e.clientX, e.clientY)
      addSticky(pt.x - 100, pt.y - 90)
    }
  }

  const fitView = () => { setPan({ x: 0, y: 0 }); setZoom(1) }

  /* ── Export to PNG ──────────────────────────────────────────────────── */
  /* ── Shared canvas builder (used by PNG and PDF export) ──────────── */
  const buildMuralCanvas = useCallback(() => {
    const nonDrawings = elements.filter(e => e.type !== 'drawing' && e.width > 0)
    const drawings = elements.filter(e => e.type === 'drawing')
    if (nonDrawings.length === 0 && drawings.length === 0) return null

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    for (const e of nonDrawings) {
      minX = Math.min(minX, e.x); minY = Math.min(minY, e.y)
      maxX = Math.max(maxX, e.x + e.width); maxY = Math.max(maxY, e.y + e.height)
    }
    for (const d of drawings) {
      const nums = d.path.match(/-?[\d.]+/g)?.map(Number) || []
      const dx = d.dx || 0, dy = d.dy || 0
      for (let i = 0; i < nums.length - 1; i += 2) {
        minX = Math.min(minX, nums[i] + dx); minY = Math.min(minY, nums[i + 1] + dy)
        maxX = Math.max(maxX, nums[i] + dx); maxY = Math.max(maxY, nums[i + 1] + dy)
      }
    }
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 1000; maxY = 700 }
    const pad = 64
    minX -= pad; minY -= pad; maxX += pad; maxY += pad
    const cW = Math.max(maxX - minX, 1), cH = Math.max(maxY - minY, 1)
    const scale = 2

    const canvas = document.createElement('canvas')
    canvas.width = cW * scale; canvas.height = cH * scale
    const ctx = canvas.getContext('2d')
    ctx.scale(scale, scale)

    ctx.fillStyle = canvasBg
    ctx.fillRect(0, 0, cW, cH)

    if (gridStyle === 'dots') {
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      for (let x = 0; x < cW; x += GRID_SIZE)
        for (let y = 0; y < cH; y += GRID_SIZE) {
          ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill()
        }
    }

    for (const d of drawings) {
      ctx.save()
      ctx.translate((d.dx || 0) - minX, (d.dy || 0) - minY)
      ctx.strokeStyle = d.color || '#ffffff'
      ctx.lineWidth = d.size || 3
      ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      ctx.stroke(new Path2D(d.path))
      ctx.restore()
    }

    const TYPE_COLORS = { sticky: null, text: 'rgba(30,41,70,0.95)', label: null, shape: null, image: null, checklist: 'rgba(20,40,60,0.95)', link: 'rgba(20,40,60,0.95)' }
    for (const e of nonDrawings) {
      ctx.save()
      ctx.translate(e.x - minX + e.width / 2, e.y - minY + e.height / 2)
      if (e.rotation) ctx.rotate(e.rotation * Math.PI / 180)
      ctx.translate(-e.width / 2, -e.height / 2)

      if (e.type === 'sticky') {
        ctx.fillStyle = e.color || '#FBBF24'
        roundRect(ctx, 0, 0, e.width, e.height, 14); ctx.fill()
        ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.font = '500 13px sans-serif'
        wrapText(ctx, e.text || '', 12, 18, e.width - 24, 18)
      } else if (e.type === 'image') {
        ctx.strokeStyle = 'rgba(255,255,255,0.15)'; ctx.lineWidth = 1
        roundRect(ctx, 0, 0, e.width, e.height, 12); ctx.stroke()
        ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fill()
      } else if (e.type === 'label') {
        ctx.fillStyle = e.color || '#ffffff'
        ctx.font = `${e.bold ? 'bold' : '500'} ${e.fontSize || 18}px sans-serif`
        ctx.fillText(e.text || '', 0, e.fontSize || 18)
      } else if (e.type === 'text' || e.type === 'checklist' || e.type === 'link') {
        ctx.fillStyle = TYPE_COLORS[e.type] || 'rgba(20,30,50,0.9)'
        roundRect(ctx, 0, 0, e.width, e.height, 14); ctx.fill()
        ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.stroke()
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px sans-serif'
        ctx.fillText((e.title || e.text || '').slice(0, 40), 12, 22)
        if (e.body || e.description) {
          ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.font = '12px sans-serif'
          wrapText(ctx, (e.body || e.description).slice(0, 200), 12, 40, e.width - 24, 16)
        }
        if (e.type === 'checklist' && e.items) {
          ctx.font = '12px sans-serif'
          e.items.slice(0, 6).forEach((item, i) => {
            ctx.fillStyle = item.checked ? 'rgba(52,211,153,0.8)' : 'rgba(255,255,255,0.6)'
            ctx.fillText(`${item.checked ? '✓' : '○'} ${item.text}`, 12, 44 + i * 20)
          })
        }
      } else if (e.type === 'shape') {
        ctx.strokeStyle = e.stroke || '#FC651F'; ctx.fillStyle = e.fill || 'transparent'
        ctx.lineWidth = e.strokeWidth || 2
        roundRect(ctx, 2, 2, e.width - 4, e.height - 4, 8)
        if (e.fill && e.fill !== 'transparent') ctx.fill()
        ctx.stroke()
        if (e.label) {
          ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '13px sans-serif'
          ctx.textAlign = 'center'; ctx.fillText(e.label, e.width / 2, e.height / 2 + 5)
          ctx.textAlign = 'left'
        }
      }
      ctx.restore()
    }

    const muralName = activeMural?.tipo === 'general' ? 'Mural General' : (activeMural?.titulo || 'Mural')
    return { canvas, muralName }
  }, [elements, canvasBg, gridStyle, activeMural])

  const exportToPNG = useCallback(() => {
    const result = buildMuralCanvas()
    if (!result) return
    const a = document.createElement('a')
    a.download = `${result.muralName.replace(/\s+/g, '-').toLowerCase()}-mural.png`
    a.href = result.canvas.toDataURL('image/png')
    a.click()
  }, [buildMuralCanvas])

  /* ── Export to PDF (canvas → JPEG embedded in minimal PDF) ──────── */
  const exportToPDF = useCallback(() => {
    const result = buildMuralCanvas()
    if (!result) return
    downloadCanvasAsPDF(result.canvas, `${result.muralName.replace(/\s+/g, '-').toLowerCase()}-mural.pdf`)
  }, [buildMuralCanvas])

  const navigateToMember = useCallback((memberId) => {
    const cursor = presenceCursors[memberId] || presenceList[memberId]
    if (!cursor) return
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    setPan({ x: rect.width / 2 - cursor.x * zoom, y: rect.height / 2 - cursor.y * zoom })
  }, [presenceCursors, presenceList, zoom])
  const canvasCursor = drawMode ? 'crosshair' : isPanning.current ? 'grabbing' : 'grab'

  const gridBg = useMemo(() => {
    const s = GRID_SIZE * zoom
    const ox = ((pan.x % s) + s) % s   // always positive
    const oy = ((pan.y % s) + s) % s
    if (gridStyle === 'none') return { backgroundColor: canvasBg }
    const base = { backgroundColor: canvasBg, backgroundSize: `${s}px ${s}px`, backgroundPosition: `${ox}px ${oy}px` }
    if (gridStyle === 'grid') return {
      ...base,
      backgroundImage: 'linear-gradient(rgba(255,255,255,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.09) 1px, transparent 1px)',
    }
    // dots
    return {
      ...base,
      backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.25) 1.5px, transparent 1.5px)',
    }
  }, [zoom, pan, gridStyle, canvasBg])

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

        {/* Export */}
        <div className="relative ml-1">
          <button onClick={() => setShowExportMenu(p => !p)} title="Exportar mural"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white/50 hover:text-white hover:bg-[var(--c-surface-2)] transition-colors border border-[var(--c-border)]">
            <FiDownload size={13} /> Exportar
          </button>
          <AnimatePresence>
            {showExportMenu && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="absolute top-full right-0 mt-1 w-44 rounded-xl p-1.5 z-50 glass-frosted border border-[var(--c-border)]">
                <button onClick={() => { exportToPNG(); setShowExportMenu(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/70 hover:text-white hover:bg-[var(--c-surface-2)] transition-colors">
                  <FiDownload size={12} /> Descargar PNG
                </button>
                <button onClick={() => { exportToPDF(); setShowExportMenu(false) }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/70 hover:text-white hover:bg-[var(--c-surface-2)] transition-colors">
                  <FiDownload size={12} /> Guardar como PDF
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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
          <ToolbarIconBtn icon={FiCheckSquare} tooltip="Lista de tareas" onClick={() => { setActiveTool('select'); addChecklist() }} disabled={!canEditMural} />
          <ToolbarIconBtn icon={FiLink} tooltip="Tarjeta de enlace" onClick={() => { setActiveTool('select'); addLink() }} disabled={!canEditMural} />

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
          <div className="relative">
            <ToolbarIconBtn icon={FiSlash} tooltip="Borrador (E)" active={activeTool === 'erase'} onClick={() => setActiveTool(prev => prev === 'erase' ? 'select' : 'erase')} disabled={!canEditMural} />
            {eraserMode && (
              <button
                onClick={() => setPrecisionErase(p => !p)}
                title={precisionErase ? 'Borrado preciso (activo)' : 'Borrado rápido'}
                className="absolute -right-1 -bottom-1 w-3 h-3 rounded-full border z-10 transition-colors"
                style={{ background: precisionErase ? 'var(--c-primary)' : '#444', borderColor: 'rgba(255,255,255,0.3)' }}
              />
            )}
          </div>

          {/* Assisted draw toggle — only visible in draw mode */}
          {drawMode && !eraserMode && (
            <ToolbarIconBtn
              icon={FiTarget}
              tooltip={assistedDraw ? 'Dibujo asistido (activo)' : 'Dibujo asistido (inactivo)'}
              active={assistedDraw}
              onClick={() => setAssistedDraw(p => !p)}
              disabled={!canEditMural}
            />
          )}

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
                  className="absolute left-full bottom-0 ml-2 p-2 rounded-xl z-50 space-y-1 glass-frosted border border-[var(--c-border)]">
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

          <ToolbarIconBtn icon={FiZap} tooltip="Generar con IA" active={showAIPanel} onClick={() => setShowAIPanel(p => !p)} disabled={!canEditMural} />
          <ToolbarIconBtn icon={FiHelpCircle} tooltip="Atajos (?)" active={showShortcuts} onClick={() => setShowShortcuts(p => !p)} />

          {/* Presence button with badge */}
          <div className="relative">
            <button onClick={() => setShowPresencePanel(p => !p)} title="Miembros en el mural"
              className={`w-9 h-9 flex items-center justify-center rounded-xl text-sm transition-all ${
                showPresencePanel ? 'bg-[var(--c-primary)] text-white' : 'text-white/40 hover:text-white hover:bg-[var(--c-surface-2)]'
              }`}>
              <FiUsers size={15} />
            </button>
            {Object.keys(presenceCursors).length > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] rounded-full bg-emerald-500 text-[9px] text-white font-bold flex items-center justify-center px-0.5 pointer-events-none">
                {Object.keys(presenceCursors).length}
              </span>
            )}
          </div>

          <ToolbarIconBtn icon={FiSave} tooltip="Guardar (Ctrl+S)" onClick={() => { if (user && activeMuralId) saveToDb(elements, activeMuralId) }} />

          <div className="flex-1" />
          {!canEditMural && <div className="text-[10px] text-white/20 text-center px-1" title="Solo lectura"><FiLock size={12} className="mx-auto mb-0.5" /></div>}
        </div>

        {/* ── Canvas ────────────────────────────────────────────────── */}
        <div
          ref={canvasRef}
          className="flex-1 relative"
          style={{ ...gridBg, cursor: canvasCursor, overflow: 'hidden', touchAction: drawMode ? 'none' : 'auto' }}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerLeave={handleCanvasPointerUp}
          onDoubleClick={handleDoubleClick}
          onDragOver={e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy' }}
          onDrop={e => {
            e.preventDefault()
            if (!canEditMural) return
            const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
            const rect = canvasRef.current?.getBoundingClientRect()
            files.forEach((file, i) => {
              const reader = new FileReader()
              reader.onload = ev => {
                const cx = (e.clientX - (rect?.left || 0) - pan.x) / zoom + i * 20
                const cy = (e.clientY - (rect?.top || 0)  - pan.y) / zoom + i * 20
                const el = { id: uid(), type: 'image', x: cx - 160, y: cy - 120, width: 320, height: 240, src: ev.target.result, rotation: 0, author_id: user?.id }
                setElements(prev => [...prev, el])
                setSelectedId(el.id)
              }
              reader.readAsDataURL(file)
            })
          }}
          data-grid="true"
        >
          {/* Transform layer */}
          <div className="absolute top-0 left-0 w-px h-px"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0' }}>

            {/* Elements (below drawings) */}
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

            {/* Persistent drawings SVG — SVG is pointer-events-none; <g> elements opt-in with pointer-events:all */}
            <svg className="absolute pointer-events-none" style={{ top: 0, left: 0, width: 40000, height: 40000, overflow: 'visible', zIndex: 10 }}>
              {elements.filter(el => el.type === 'drawing').map(el => (
                <g key={el.id} transform={`translate(${el.dx || 0}, ${el.dy || 0})`}
                  style={{
                    pointerEvents: drawMode ? 'none' : 'all',
                    cursor: drawMode ? 'default' : drawingDrag?.id === el.id ? 'grabbing' : 'grab',
                  }}
                  onPointerDown={!drawMode && canEditMural ? (e) => {
                    e.stopPropagation()
                    setSelectedDrawingId(el.id)
                    setSelectedId(null)
                    const drag = { id: el.id, startDx: el.dx || 0, startDy: el.dy || 0, startPx: e.clientX, startPy: e.clientY }
                    setDrawingDrag(drag)
                    e.currentTarget.setPointerCapture(e.pointerId)
                  } : undefined}
                  onPointerMove={drawingDrag?.id === el.id ? (e) => {
                    const ddx = (e.clientX - drawingDrag.startPx) / zoom
                    const ddy = (e.clientY - drawingDrag.startPy) / zoom
                    updateElement(el.id, { dx: drawingDrag.startDx + ddx, dy: drawingDrag.startDy + ddy })
                  } : undefined}
                  onPointerUp={() => setDrawingDrag(null)}
                >
                  {/* Invisible thick hit area */}
                  <path d={el.path} fill="none" stroke="transparent" strokeWidth={Math.max(el.size, 14)} strokeLinecap="round" strokeLinejoin="round" />
                  {/* Selection highlight */}
                  {selectedDrawingId === el.id && (
                    <path d={el.path} fill="none" stroke="var(--c-primary)" strokeWidth={el.size + 4}
                      strokeLinecap="round" strokeLinejoin="round" opacity={0.4} />
                  )}
                  {/* Actual path */}
                  <path d={el.path} fill="none" stroke={el.color}
                    strokeWidth={el.size} strokeLinecap="round" strokeLinejoin="round" />
                </g>
              ))}
            </svg>

            {/* Live preview SVG */}
            <svg className="absolute pointer-events-none" style={{ top: 0, left: 0, width: 40000, height: 40000, overflow: 'visible', zIndex: 11 }}>
              <path ref={previewPathRef} d="" fill="none"
                stroke={eraserMode ? 'var(--c-error)' : penColor}
                strokeWidth={penSize} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
            </svg>

            {/* Presence cursors */}
            {Object.entries(presenceCursors).map(([uid, cur]) => (
              <div key={uid} className="absolute pointer-events-none z-[999]"
                style={{ left: cur.x, top: cur.y, transform: 'translate(4px, 4px)' }}>
                <svg width="16" height="16" viewBox="0 0 16 16" style={{ filter: `drop-shadow(0 1px 2px rgba(0,0,0,0.5))` }}>
                  <path d="M0,0 L0,12 L3.5,9 L6,14 L7.5,13.5 L5,8.5 L9,8.5 Z" fill={getCursorColor(uid)} />
                </svg>
                <span className="text-[9px] font-medium px-1 py-0.5 rounded whitespace-nowrap"
                  style={{ background: getCursorColor(uid), color: '#000', marginLeft: 10, marginTop: -4, display: 'block' }}>
                  {cur.name}
                </span>
              </div>
            ))}
          </div>

          {/* Minimap */}
          <Minimap elements={elements} pan={pan} zoom={zoom} canvasRef={canvasRef} canvasBg={canvasBg} />

          {/* AI generation toast */}
          <AnimatePresence>
            {aiToast && (
              <motion.div
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
                className={`absolute bottom-16 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-medium pointer-events-none ${
                  aiToast.error
                    ? 'bg-red-500/20 border-red-500/40 text-red-300'
                    : 'bg-[var(--c-primary)]/20 border-[var(--c-primary)]/40 text-white'
                }`}
              >
                <FiZap size={15} className={aiToast.error ? 'text-red-400' : 'text-[var(--c-primary)]'} />
                <span>{aiToast.error ? aiToast.msg : `IA generó ${aiToast.count} elementos — ${aiToast.msg}`}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Zoom hint */}
          {zoom < 0.3 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-white/15 pointer-events-none">
              {Math.round(zoom * 100)}% — scroll para acercar
            </div>
          )}

          {/* Empty canvas hint */}
          {elements.length === 0 && canEditMural && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-white/10 text-sm">Doble clic para nota · Arrastra para mover · Scroll para zoom · <kbd className="text-white/20">?</kbd> atajos</p>
            </div>
          )}

          {/* Shortcuts panel */}
          <AnimatePresence>
            {showShortcuts && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                <div className="pointer-events-auto rounded-2xl p-5 glass-frosted border border-[var(--c-border)] w-72 shadow-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-white font-title">Atajos de teclado</h3>
                    <button onClick={() => setShowShortcuts(false)} className="text-white/30 hover:text-white"><FiX size={14} /></button>
                  </div>
                  <div className="space-y-1 text-xs">
                    {[
                      ['V', 'Seleccionar'],
                      ['P / B', 'Lápiz'],
                      ['E', 'Borrador'],
                      ['T', 'Texto libre'],
                      ['Doble clic', 'Nueva nota adhesiva'],
                      ['Del / Backspace', 'Eliminar elemento'],
                      ['Ctrl+Z', 'Deshacer'],
                      ['Ctrl+Y', 'Rehacer'],
                      ['Ctrl+D', 'Duplicar'],
                      ['Ctrl+C', 'Copiar elemento'],
                      ['Ctrl+V', 'Pegar elemento / imagen'],
                      ['Ctrl+S', 'Guardar'],
                      ['Arrastrar imagen', 'Soltar en el lienzo'],
                      ['Scroll', 'Zoom in/out'],
                      ['Arrastrar fondo', 'Mover vista'],
                      ['Esc', 'Cancelar / Deseleccionar'],
                      ['?', 'Esta ayuda'],
                    ].map(([key, desc]) => (
                      <div key={key} className="flex items-center justify-between py-1 border-b border-white/[0.04]">
                        <span className="text-white/40">{desc}</span>
                        <kbd className="text-[10px] bg-white/8 text-white/50 px-1.5 py-0.5 rounded font-mono">{key}</kbd>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* AI panel */}
          <AnimatePresence>
            {showAIPanel && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 w-80">
                <div className="rounded-2xl p-4 glass-frosted border border-[var(--c-border)] shadow-2xl space-y-3">
                  <div className="flex items-center gap-2">
                    <FiZap size={13} className="text-[var(--c-primary)]" />
                    <span className="text-xs font-bold text-white font-title">Generar ideas con IA</span>
                    <button onClick={() => setShowAIPanel(false)} className="ml-auto text-white/30 hover:text-white"><FiX size={13} /></button>
                  </div>
                  <input
                    className="w-full bg-[var(--c-surface-2)] border border-[var(--c-border)] rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[var(--c-primary)] transition-colors"
                    placeholder="Ej: Aplicaciones de NLP en salud..."
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAIGenerate()}
                    autoFocus
                  />
                  <button onClick={handleAIGenerate} disabled={!aiPrompt.trim() || aiLoading}
                    className="w-full py-2 rounded-xl text-xs font-medium bg-[var(--c-primary)] text-white hover:brightness-110 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                    {aiLoading ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generando...</> : <><FiZap size={11} /> Generar notas</>}
                  </button>
                  <p className="text-[10px] text-white/25 text-center">Gemini 1.5 Flash · Se añaden al lienzo</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Presence panel — online members */}
          <AnimatePresence>
            {showPresencePanel && (
              <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
                className="absolute top-4 right-4 z-50 w-56">
                <div className="rounded-2xl p-3 glass-frosted border border-[var(--c-border)] shadow-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">En el mural ahora</span>
                    <button onClick={() => setShowPresencePanel(false)} className="text-white/30 hover:text-white"><FiX size={12} /></button>
                  </div>

                  {/* Current user */}
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[var(--c-primary)]/10">
                    {user?.foto_url
                      ? <img src={user.foto_url} className="w-6 h-6 rounded-full object-cover ring-1 ring-[var(--c-primary)]" alt="" />
                      : <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                          style={{ background: getCursorColor(user?.id), color: '#000' }}>{user?.nombre?.[0]}</div>}
                    <span className="text-xs text-white/80 flex-1 truncate">{user?.nombre || 'Tú'}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                  </div>

                  {/* Other members */}
                  {Object.entries(presenceList).length === 0 && (
                    <p className="text-[11px] text-white/20 text-center py-2">Solo tú estás aquí</p>
                  )}
                  {Object.entries(presenceList).map(([uid, cur]) => {
                    const isLive = !!presenceCursors[uid]
                    const secAgo = Math.round((Date.now() - (cur.lastSeen || Date.now())) / 1000)
                    return (
                      <button key={uid}
                        onClick={() => { navigateToMember(uid); setShowPresencePanel(false) }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--c-surface-2)] transition-colors text-left group">
                        {cur.foto_url
                          ? <img src={cur.foto_url} className="w-6 h-6 rounded-full object-cover" alt="" />
                          : <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                              style={{ background: getCursorColor(uid), color: '#000' }}>{cur.name?.[0]}</div>}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white/70 truncate group-hover:text-white transition-colors">{cur.name}</p>
                          <p className="text-[9px] text-white/30">{isLive ? 'En línea · clic para ir' : `Hace ${secAgo}s`}</p>
                        </div>
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLive ? 'bg-emerald-400' : 'bg-white/15'}`} />
                      </button>
                    )
                  })}

                  <p className="text-[9px] text-white/15 text-center pt-1">Clic en un miembro para ir a su posición</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
   MINIMAP
   ═══════════════════════════════════════════════════════════════════════ */
const MINI_W = 180, MINI_H = 110
const TYPE_MINI_COLORS = { sticky: '#FBBF24', text: '#60A5FA', shape: '#FC651F', image: '#34D399', label: '#ffffff', checklist: '#A78BFA', link: '#38BDF8' }

function Minimap({ elements, pan, zoom, canvasRef, canvasBg }) {
  const nonDrawings = elements.filter(el => el.type !== 'drawing' && el.width > 0)

  // Bounding box of content
  let minX = -200, minY = -200, maxX = 1200, maxY = 800
  if (nonDrawings.length > 0) {
    minX = Math.min(...nonDrawings.map(el => el.x)) - 60
    minY = Math.min(...nonDrawings.map(el => el.y)) - 60
    maxX = Math.max(...nonDrawings.map(el => el.x + el.width)) + 60
    maxY = Math.max(...nonDrawings.map(el => el.y + el.height)) + 60
  }
  const cW = Math.max(maxX - minX, 400)
  const cH = Math.max(maxY - minY, 300)
  const scale = Math.min(MINI_W / cW, MINI_H / cH)

  const toM = (x, y) => ({ mx: (x - minX) * scale, my: (y - minY) * scale })

  // Viewport rect in canvas coords
  const vw = (canvasRef.current?.clientWidth  || 800) / zoom
  const vh = (canvasRef.current?.clientHeight || 600) / zoom
  const vx = -pan.x / zoom
  const vy = -pan.y / zoom
  const vr = { left: (vx - minX) * scale, top: (vy - minY) * scale, width: vw * scale, height: vh * scale }

  return (
    <div className="absolute bottom-4 right-4 z-20 rounded-xl overflow-hidden border border-white/10 pointer-events-none"
      style={{ width: MINI_W, height: MINI_H, background: `${canvasBg}dd`, backdropFilter: 'blur(6px)' }}>
      <span className="absolute top-1 left-2 text-[8px] text-white/20 z-10 select-none font-mono">mapa</span>
      {/* Elements */}
      {nonDrawings.map(el => {
        const { mx, my } = toM(el.x, el.y)
        const mw = Math.max(3, el.width  * scale)
        const mh = Math.max(2, el.height * scale)
        if (mx + mw < 0 || my + mh < 0 || mx > MINI_W || my > MINI_H) return null
        return <div key={el.id} className="absolute rounded-[1px]"
          style={{ left: mx, top: my, width: mw, height: mh, background: TYPE_MINI_COLORS[el.type] || '#fff', opacity: 0.65 }} />
      })}
      {/* Viewport indicator */}
      <div className="absolute rounded border"
        style={{ left: vr.left, top: vr.top, width: vr.width, height: vr.height,
          background: 'rgba(252,101,31,0.06)', borderColor: 'rgba(252,101,31,0.5)' }} />
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
   CHECKLIST CARD
   ═══════════════════════════════════════════════════════════════════════ */
function ChecklistCard({ el, onUpdate, readOnly }) {
  const items = el.items || []
  const done = items.filter(i => i.checked).length
  const pct = items.length > 0 ? Math.round((done / items.length) * 100) : 0

  const toggleItem = (id) => {
    if (readOnly) return
    onUpdate(el.id, { items: items.map(i => i.id === id ? { ...i, checked: !i.checked } : i) })
  }
  const addItem = () => {
    if (readOnly) return
    const newItem = { id: crypto.randomUUID(), text: 'Nuevo elemento', checked: false }
    onUpdate(el.id, { items: [...items, newItem], height: el.height + 34 })
  }
  const updateItemText = (id, text) => {
    if (readOnly) return
    onUpdate(el.id, { items: items.map(i => i.id === id ? { ...i, text } : i) })
  }
  const removeItem = (id) => {
    if (readOnly) return
    onUpdate(el.id, { items: items.filter(i => i.id !== id) })
  }

  return (
    <div className="w-full h-full rounded-2xl p-3 flex flex-col border border-[var(--c-border)] glass-frosted overflow-hidden">
      <input data-no-drag="true"
        className="bg-transparent text-white font-bold text-sm outline-none border-b border-[var(--c-border)] pb-1 mb-2 font-title"
        value={el.title || 'Lista'}
        onChange={e => !readOnly && onUpdate(el.id, { title: e.target.value })}
        readOnly={readOnly} />
      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[10px] text-white/30 tabular-nums">{done}/{items.length}</span>
      </div>
      {/* Items */}
      <div className="flex-1 overflow-auto space-y-1">
        {items.map(item => (
          <div key={item.id} className="flex items-start gap-2 group/item">
            <button data-no-drag="true" onClick={() => toggleItem(item.id)}
              className={`w-4 h-4 mt-0.5 rounded shrink-0 border-2 flex items-center justify-center transition-colors ${
                item.checked ? 'bg-emerald-500 border-emerald-500' : 'border-white/30 hover:border-white/60'
              }`}>
              {item.checked && <svg viewBox="0 0 8 6" className="w-2.5 h-2 text-white"><path d="M1 3l2 2 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
            </button>
            <input data-no-drag="true"
              className={`flex-1 bg-transparent text-xs outline-none leading-relaxed ${item.checked ? 'line-through text-white/30' : 'text-white/70'}`}
              value={item.text} readOnly={readOnly}
              onChange={e => updateItemText(item.id, e.target.value)} />
            {!readOnly && (
              <button data-no-drag="true" onClick={() => removeItem(item.id)}
                className="opacity-0 group-hover/item:opacity-60 hover:!opacity-100 text-white/40 hover:text-red-400 transition-all">
                <svg viewBox="0 0 10 10" className="w-3 h-3"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              </button>
            )}
          </div>
        ))}
      </div>
      {!readOnly && (
        <button data-no-drag="true" onClick={addItem}
          className="mt-2 text-[10px] text-white/25 hover:text-[var(--c-primary)] transition-colors text-left">
          + Agregar elemento
        </button>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   LINK CARD
   ═══════════════════════════════════════════════════════════════════════ */
function LinkCard({ el, onUpdate, readOnly }) {
  const hostname = (() => { try { return new URL(el.url || '').hostname.replace('www.', '') } catch { return el.url || '' } })()
  return (
    <div className="w-full h-full rounded-2xl p-3 flex flex-col border border-[var(--c-border)] glass-frosted overflow-hidden">
      <div className="flex items-center gap-2 mb-2">
        <FiLink size={13} className="text-[var(--c-primary)] shrink-0" />
        <input data-no-drag="true"
          className="flex-1 bg-transparent text-white font-bold text-sm outline-none font-title min-w-0"
          value={el.title || 'Enlace'}
          onChange={e => !readOnly && onUpdate(el.id, { title: e.target.value })}
          readOnly={readOnly} />
      </div>
      <input data-no-drag="true"
        className="bg-transparent text-[var(--c-primary)] text-xs outline-none border border-[var(--c-border)] rounded-lg px-2 py-1.5 mb-2 font-mono truncate"
        value={el.url || ''}
        placeholder="https://..."
        onChange={e => !readOnly && onUpdate(el.id, { url: e.target.value })}
        readOnly={readOnly} />
      {el.description && (
        <p className="text-xs text-white/40 leading-relaxed flex-1 overflow-hidden">{el.description}</p>
      )}
      {!el.description && !readOnly && (
        <textarea data-no-drag="true"
          className="flex-1 bg-transparent text-xs text-white/40 outline-none resize-none leading-relaxed placeholder-white/20"
          placeholder="Descripción..." value={el.description || ''}
          onChange={e => onUpdate(el.id, { description: e.target.value })} />
      )}
      {el.url && (
        <a href={el.url} target="_blank" rel="noopener noreferrer" data-no-drag="true"
          className="mt-auto pt-2 text-[10px] text-white/20 hover:text-[var(--c-primary)] transition-colors truncate flex items-center gap-1">
          <FiLink size={9} />{hostname || 'Abrir enlace'}
        </a>
      )}
    </div>
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
      {el.type === 'shape'     && <ShapeCard     el={el} onUpdate={onUpdate} isSelected={isSelected} readOnly={readOnly} />}
      {el.type === 'checklist' && <ChecklistCard el={el} onUpdate={onUpdate} isSelected={isSelected} readOnly={readOnly} />}
      {el.type === 'link'      && <LinkCard      el={el} onUpdate={onUpdate} isSelected={isSelected} readOnly={readOnly} />}

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

      {/* Delete button — only shows when element is SELECTED, never on plain hover */}
      {!readOnly && isSelected && (
        <button onClick={(e) => { e.stopPropagation(); onDelete(el.id) }}
          className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-[var(--c-error)] text-white flex items-center justify-center z-20 shadow-md hover:scale-110 transition-transform"
          data-no-drag="true"
          title="Eliminar">
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
