import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSend, FiTrash2, FiUpload, FiZap, FiLoader } from 'react-icons/fi'
import TerminalLine, { TerminalCursor } from './TerminalLine'
import { parseInput, buildHelpLines, COMMANDS } from './CommandParser'
import { atheniaChat, analyzeChalkboard, connectTopics } from '../../lib/gemini'
import { useAthenia } from '../../hooks/useAthenia'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

/* ─── Boot sequence lines ──────────────────────────────────────────────────── */
const BOOT_LINES = [
  { type: 'system', text: '██████╗ ██████╗ ██╗██╗   ██╗███████╗██████╗  ██████╗██╗ █████╗ ' },
  { type: 'system', text: 'A.T.H.E.N.I.A v2.1.0 — Gemini 1.5 Flash — DivergencIA Research OS' },
  { type: 'info',   text: '─────────────────────────────────────────────────────────────────' },
  { type: 'success', text: 'Núcleo de IA inicializado correctamente.' },
  { type: 'success', text: 'Base de datos del semillero conectada.' },
  { type: 'success', text: 'Memoria persistente cargada.' },
  { type: 'info',   text: 'Escribe /help para ver los comandos disponibles.' },
  { type: 'info',   text: 'O simplemente escribe tu pregunta en lenguaje natural.' },
  { type: 'prompt', text: '¿En qué puedo ayudarte hoy, investigador?' },
]

/* ─── Component ─────────────────────────────────────────────────────────────── */
export default function ATHENIA_Shell() {
  const { user } = useAuth()
  const { history: savedHistory, saveMessage, clearHistory, buildContext } = useAthenia()

  // Lines shown in terminal
  const [lines, setLines] = useState([])
  const [input, setInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [cmdHistory, setCmdHistory] = useState([])
  const [historyIdx, setHistoryIdx] = useState(-1)
  const [booted, setBooted] = useState(false)
  const [imageFile, setImageFile] = useState(null)

  const scrollRef = useRef(null)
  const inputRef = useRef(null)
  const fileRef = useRef(null)

  // ── Scroll to bottom ──────────────────────────────────────────────────────
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [lines, isThinking])

  // ── Boot sequence ─────────────────────────────────────────────────────────
  useEffect(() => {
    const bootId = Date.now()
    let i = 0
    let cancelled = false
    const showNext = () => {
      if (cancelled) return
      if (i >= BOOT_LINES.length) { setBooted(true); return }
      setLines(prev => [...prev, { ...BOOT_LINES[i], id: `boot-${bootId}-${i}`, ts: Date.now() }])
      i++
      setTimeout(showNext, 120 + Math.random() * 80)
    }
    setTimeout(showNext, 300)
    return () => { cancelled = true }
  }, [])

  // ── Load saved history after boot ─────────────────────────────────────────
  useEffect(() => {
    if (!booted || !savedHistory.length) return
    const historicLines = savedHistory.slice(-10).map(m => ({
      id: m.id,
      type: m.rol === 'user' ? 'user' : 'ai',
      text: m.rol === 'user' ? `${m.mensaje}` : m.mensaje,
      ts: m.timestamp,
    }))
    if (historicLines.length) {
      setLines(prev => [
        ...prev,
        { id: 'hist-sep', type: 'info', text: `── Últimas ${historicLines.length} conversaciones recuperadas ──`, ts: Date.now() },
        ...historicLines,
      ])
    }
  }, [booted, savedHistory.length])

  // ── Add line helper ───────────────────────────────────────────────────────
  const addLine = useCallback((type, text) => {
    setLines(prev => [...prev, { id: `${Date.now()}-${Math.random()}`, type, text, ts: Date.now() }])
  }, [])

  const addLines = useCallback((newLines) => {
    setLines(prev => [
      ...prev,
      ...newLines.map(l => ({ id: `${Date.now()}-${Math.random()}`, ...l, ts: Date.now() })),
    ])
  }, [])

  // ── Execute command ───────────────────────────────────────────────────────
  const executeCommand = useCallback(async (command, args) => {
    switch (command) {
      case 'help':
        addLines(buildHelpLines())
        break

      case 'clear':
        setLines([])
        break

      case 'status': {
        addLine('system', 'Consultando estado del sistema...')
        const [{ count: m }, { count: p }, { count: i }, { count: a }] = await Promise.all([
          supabase.from('usuarios').select('*', { count: 'exact', head: true }),
          supabase.from('proyectos').select('*', { count: 'exact', head: true }),
          supabase.from('ideas').select('*', { count: 'exact', head: true }),
          supabase.from('avances').select('*', { count: 'exact', head: true }),
        ])
        addLines([
          { type: 'success', text: '──── DivergencIA System Status ────' },
          { type: 'info',    text: `  Investigadores   : ${m || 0}` },
          { type: 'info',    text: `  Proyectos        : ${p || 0}` },
          { type: 'info',    text: `  Ideas en banco   : ${i || 0}` },
          { type: 'info',    text: `  Avances totales  : ${a || 0}` },
          { type: 'success', text: '  Supabase         : ● Online' },
          { type: 'success', text: '  Gemini API       : ● Online' },
          { type: 'success', text: '  Realtime         : ● Online' },
        ])
        break
      }

      case 'members': {
        addLine('system', 'Cargando directorio de investigadores...')
        let query = supabase.from('usuarios').select('nombre, area_investigacion, activo').eq('activo', true)
        if (args) query = query.ilike('area_investigacion', `%${args}%`)
        const { data } = await query.limit(10)
        if (!data?.length) { addLine('warning', 'No se encontraron investigadores con ese filtro.'); break }
        addLine('info', `Mostrando ${data.length} investigadores${args ? ` en área: ${args}` : ''}:`)
        data.forEach(u => addLine('info', `  › ${u.nombre || 'N/A'}  [${u.area_investigacion || 'General'}]`))
        break
      }

      case 'projects': {
        addLine('system', 'Consultando proyectos activos...')
        let query = supabase.from('proyectos').select('titulo, estado, creador:usuarios!proyectos_creador_id_fkey(nombre)')
        if (args) query = query.eq('estado', args)
        const { data } = await query.order('created_at', { ascending: false }).limit(8)
        if (!data?.length) { addLine('warning', 'No se encontraron proyectos.'); break }
        addLine('info', `${data.length} proyecto(s):`)
        data.forEach(p => addLine('info', `  › [${p.estado}] ${p.titulo} — ${p.creador?.nombre || '?'}`))
        break
      }

      case 'ideas': {
        addLine('system', 'Cargando banco de ideas...')
        let query = supabase.from('ideas').select('titulo, votos_favor, estado, autor:usuarios!ideas_autor_id_fkey(nombre)')
        if (args === 'top') query = query.order('votos_favor', { ascending: false })
        else query = query.order('fecha_publicacion', { ascending: false })
        const { data } = await query.limit(8)
        if (!data?.length) { addLine('warning', 'No hay ideas aún.'); break }
        addLine('info', 'Ideas del banco:')
        data.forEach(idea => addLine('info', `  › [↑${idea.votos_favor}] ${idea.titulo} — ${idea.autor?.nombre || '?'}`))
        break
      }

      case 'connect': {
        const parts = args.split(/[·\-–]/).map(s => s.trim()).filter(Boolean)
        if (parts.length < 2) {
          addLine('error', 'Uso: /connect [Tema A] · [Tema B]')
          addLine('info', 'Ejemplo: /connect NLP · Computer Vision')
          break
        }
        addLine('system', `Analizando conexión semántica: "${parts[0]}" ↔ "${parts[1]}"...`)
        setIsThinking(true)
        try {
          const ctx = await buildContext()
          const result = await connectTopics(parts[0], parts[1], ctx)
          addLine('ai', result)
        } catch (e) {
          addLine('error', `Error en análisis: ${e.message}`)
        } finally {
          setIsThinking(false)
        }
        break
      }

      case 'roadmap': {
        addLine('system', 'Cargando roadmap del semillero...')
        const { data: rmData } = await supabase.from('roadmap_fases').select('*').order('orden')
        if (!rmData?.length) { addLine('warning', 'Roadmap no disponible.'); break }
        const stateMap = { completada: '✓', actual: '►', proxima: '○', bloqueada: '⊘' }
        const typeMap = { completada: 'success', actual: 'prompt', proxima: 'info', bloqueada: 'warning' }
        const lines = [{ type: 'info', text: '──── Roadmap DivergencIA ────' }]
        rmData.forEach(f => {
          const sym = stateMap[f.estado] || '○'
          const t = typeMap[f.estado] || 'info'
          const milestones = f.milestones || []
          const done = milestones.filter(m => m.completado).length
          lines.push({ type: t, text: `  ${sym} FASE ${f.orden}: ${f.titulo} [${f.estado}] — ${f.descripcion}` })
          if (milestones.length) {
            lines.push({ type: 'info', text: `    Hitos: ${done}/${milestones.length} completados` })
            milestones.forEach(m => {
              lines.push({ type: m.completado ? 'success' : 'info', text: `      ${m.completado ? '✓' : '○'} ${m.titulo}` })
            })
          }
        })
        addLines(lines)
        break
      }

      case 'analyze': {
        if (!imageFile) {
          addLine('info', 'Para analizar un pizarrón: adjunta una imagen usando el botón 📎 y luego ejecuta /analyze')
          break
        }
        addLine('system', 'Analizando imagen con Gemini Vision...')
        setIsThinking(true)
        try {
          const reader = new FileReader()
          reader.onload = async (e) => {
            const b64 = e.target.result.split(',')[1]
            const mimeType = imageFile.type
            const result = await analyzeChalkboard(b64, mimeType)
            addLine('ai', `Mapa conceptual detectado: "${result.titulo}"`)
            addLine('ai', result.resumen)
            if (result.conceptos?.length) {
              addLine('info', `Se identificaron ${result.conceptos.length} conceptos principales.`)
            }
            setImageFile(null)
            setIsThinking(false)
          }
          reader.readAsDataURL(imageFile)
        } catch (err) {
          addLine('error', `Error analizando imagen: ${err.message}`)
          setIsThinking(false)
        }
        break
      }

      case 'about': {
        addLines([
          { type: 'system', text: '═══════ A.T.H.E.N.I.A ═══════' },
          { type: 'info', text: '  Advanced Terminal for Heuristic' },
          { type: 'info', text: '  Exploration of Networked' },
          { type: 'info', text: '  Intelligence & Analysis' },
          { type: 'info', text: '' },
          { type: 'info', text: '  Versión: 2.1.0' },
          { type: 'info', text: '  Motor IA: Gemini 1.5 Flash' },
          { type: 'info', text: '  Plataforma: DivergencIA' },
          { type: 'info', text: '' },
          { type: 'prompt', text: '  "Donde la inteligencia converge"' },
          { type: 'info', text: '' },
          { type: 'info', text: '  DivergencIA es la plataforma digital' },
          { type: 'info', text: '  del Semillero de Investigación en IA.' },
          { type: 'info', text: '  Centraliza proyectos, ideas, personas' },
          { type: 'info', text: '  y conocimiento en un solo espacio.' },
          { type: 'info', text: '' },
          { type: 'success', text: '  Stack: React + Supabase + Three.js' },
          { type: 'success', text: '  IA: Google Gemini API + Multimodal' },
          { type: 'system', text: '═══════════════════════════════' },
        ])
        break
      }

      case 'tasks': {
        if (!user) { addLine('warning', 'Debes iniciar sesión para ver tus tareas.'); break }
        addLine('system', 'Consultando tareas...')
        let query = supabase.from('tareas').select('titulo, estado, prioridad, fecha_limite, proyecto:proyectos(titulo)')
        if (args === 'mias' || !args) {
          query = query.eq('asignado_a', user.id)
        }
        query = query.neq('estado', 'completada').order('created_at', { ascending: false }).limit(10)
        const { data: tasksData } = await query
        if (!tasksData?.length) { addLine('info', 'No hay tareas pendientes. ¡Buen trabajo!'); break }
        const prioMap = { critica: '🔴', alta: '🟠', media: '🟡', baja: '🟢' }
        addLine('info', `──── ${tasksData.length} Tareas Pendientes ────`)
        tasksData.forEach(t => {
          const prio = prioMap[t.prioridad] || '⚪'
          const deadline = t.fecha_limite ? ` (límite: ${t.fecha_limite})` : ''
          addLine('info', `  ${prio} [${t.estado}] ${t.titulo}${deadline}`)
          if (t.proyecto?.titulo) addLine('info', `    └─ Proyecto: ${t.proyecto.titulo}`)
        })
        break
      }

      case 'logros': {
        if (!user) { addLine('warning', 'Debes iniciar sesión.'); break }
        addLine('system', 'Consultando logros...')
        const { data: logrosData } = await supabase.from('logros').select('*').eq('usuario_id', user.id)
        if (!logrosData?.length) {
          addLine('info', 'Aún no has desbloqueado logros. ¡Sigue contribuyendo!')
          addLine('info', 'Logros disponibles: Investigador Elite (10 avances), Documentador (20 archivos),')
          addLine('info', 'Conector (3 proyectos), Idea MVP (10 votos), y más.')
          break
        }
        const logroIcons = { fundador: '👑', investigador_elite: '🔬', primer_avance: '🚀', documentador_maestro: '📚', conector: '🔗', ideador: '💡', primera_idea: '✨', idea_mvp: '🏆' }
        addLine('success', `──── ${logrosData.length} Logros Desbloqueados ────`)
        logrosData.forEach(l => {
          const icon = logroIcons[l.tipo] || '🏅'
          addLine('success', `  ${icon} ${l.tipo.replace(/_/g, ' ').toUpperCase()} — ${l.descripcion || ''}`)
          addLine('info', `     Obtenido: ${new Date(l.fecha_obtenido).toLocaleDateString()}`)
        })
        break
      }

      case 'stats': {
        addLine('system', 'Calculando estadísticas...')
        if (args === 'user' && user) {
          const [pRes, iRes, aRes, fRes] = await Promise.all([
            supabase.from('miembros_proyecto').select('*', { count: 'exact', head: true }).eq('usuario_id', user.id),
            supabase.from('ideas').select('*', { count: 'exact', head: true }).eq('autor_id', user.id),
            supabase.from('avances').select('*', { count: 'exact', head: true }).eq('autor_id', user.id),
            supabase.from('archivos').select('*', { count: 'exact', head: true }).eq('subido_por', user.id),
          ])
          addLines([
            { type: 'info', text: '──── Estadísticas Personales ────' },
            { type: 'info', text: `  Proyectos  : ${pRes.count || 0}` },
            { type: 'info', text: `  Ideas      : ${iRes.count || 0}` },
            { type: 'info', text: `  Avances    : ${aRes.count || 0}` },
            { type: 'info', text: `  Archivos   : ${fRes.count || 0}` },
          ])
        } else {
          // Global stats
          const [mRes, pRes, iRes, aRes, tRes, cRes] = await Promise.all([
            supabase.from('usuarios').select('*', { count: 'exact', head: true }).eq('activo', true),
            supabase.from('proyectos').select('*', { count: 'exact', head: true }),
            supabase.from('ideas').select('*', { count: 'exact', head: true }),
            supabase.from('avances').select('*', { count: 'exact', head: true }),
            supabase.from('tareas').select('*', { count: 'exact', head: true }),
            supabase.from('comentarios').select('*', { count: 'exact', head: true }),
          ])
          const tCompRes = await supabase.from('tareas').select('*', { count: 'exact', head: true }).eq('estado', 'completada')
          addLines([
            { type: 'info', text: '──── Estadísticas Globales DivergencIA ────' },
            { type: 'info', text: `  Investigadores : ${mRes.count || 0}` },
            { type: 'info', text: `  Proyectos      : ${pRes.count || 0}` },
            { type: 'info', text: `  Ideas          : ${iRes.count || 0}` },
            { type: 'info', text: `  Avances        : ${aRes.count || 0}` },
            { type: 'info', text: `  Tareas         : ${tRes.count || 0} (${tCompRes.count || 0} completadas)` },
            { type: 'info', text: `  Comentarios    : ${cRes.count || 0}` },
          ])
        }
        break
      }

      case 'suggest': {
        if (!args) { addLine('error', 'Uso: /suggest [tema]. Ej: /suggest Transformers para NLP'); break }
        addLine('system', `Buscando sugerencias para: "${args}"...`)
        setIsThinking(true)
        try {
          const ctx = await buildContext()
          const result = await atheniaChat([],
            `Dame 3-5 sugerencias concretas de papers recientes y datasets relevantes para investigar sobre "${args}" en el contexto de un semillero de investigación en IA universitario. Incluye enlaces de arxiv.org si es posible. Formato: lista numerada con título, autores clave, y por qué es relevante.`,
            ctx)
          addLine('ai', result)
        } catch (e) {
          addLine('error', `Error: ${e.message}`)
        } finally {
          setIsThinking(false)
        }
        break
      }

      case 'export': {
        const exportLines = lines.filter(l => l.type !== 'system' || l.text.includes('ATHENIA'))
          .map(l => `[${l.type}] ${l.text}`).join('\n')
        const blob = new Blob([exportLines], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `athenia-log-${Date.now()}.txt`; a.click()
        URL.revokeObjectURL(url)
        addLine('success', 'Historial exportado como archivo de texto.')
        break
      }

      default:
        addLine('error', `Comando desconocido: /${command}. Escribe /help para ver los disponibles.`)
    }
  }, [addLine, addLines, buildContext, imageFile, user, lines])

  // ── Handle submit ─────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed || isThinking) return

    const parsed = parseInput(trimmed)
    if (!parsed) return

    setInput('')
    setHistoryIdx(-1)
    setCmdHistory(h => [trimmed, ...h.slice(0, 49)])

    if (parsed.type === 'command') {
      addLine('user', trimmed)
      await executeCommand(parsed.command, parsed.args)
      return
    }

    // Natural language message → Gemini
    addLine('user', trimmed)
    await saveMessage(trimmed, 'user')

    setIsThinking(true)
    try {
      const ctx = await buildContext()
      const reply = await atheniaChat(
        savedHistory.slice(-10).map(m => ({ rol: m.rol, mensaje: m.mensaje })),
        trimmed,
        ctx,
      )
      addLine('ai', reply)
      await saveMessage(reply, 'assistant')
    } catch (err) {
      addLine('error', `Error de conexión con ATHENIA: ${err.message}`)
      if (err.message.includes('API_KEY')) {
        addLine('warning', 'Configura VITE_GEMINI_API_KEY en tu .env para usar la IA.')
      }
    } finally {
      setIsThinking(false)
    }
  }, [input, isThinking, addLine, executeCommand, saveMessage, buildContext, savedHistory])

  // ── Keyboard handling ─────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const newIdx = Math.min(historyIdx + 1, cmdHistory.length - 1)
      setHistoryIdx(newIdx)
      setInput(cmdHistory[newIdx] ?? '')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const newIdx = Math.max(historyIdx - 1, -1)
      setHistoryIdx(newIdx)
      setInput(newIdx === -1 ? '' : cmdHistory[newIdx])
    }
  }, [handleSubmit, historyIdx, cmdHistory])

  // ── Clear terminal ────────────────────────────────────────────────────────
  const handleClear = async () => {
    setLines([])
    await clearHistory()
    addLine('system', 'Terminal y memoria limpiadas.')
  }

  // ── File attach ───────────────────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      addLine('info', `Imagen adjunta: ${file.name} (${(file.size / 1024).toFixed(1)} KB). Escribe /analyze para procesarla.`)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Terminal window */}
      <div
        className="flex-1 flex flex-col rounded-2xl overflow-hidden min-h-0"
        style={{
          background: 'rgba(3,2,4,0.96)',
          border: '1px solid rgba(0,209,255,0.18)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Title bar */}
        <div
          className="flex items-center gap-2.5 px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid rgba(0,209,255,0.08)', background: 'rgba(0,209,255,0.02)' }}
        >
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#EF4444]/50" />
            <div className="w-3 h-3 rounded-full bg-[#F59E0B]/50" />
            <div className="w-3 h-3 rounded-full bg-[#22c55e]/50" />
          </div>
          <span className="font-mono text-xs text-white/20 ml-1">
            athenia@divergencia ~ $ <span className="text-[#00D1FF]/40">gemini-1.5-flash</span>
          </span>
          <div className="ml-auto flex items-center gap-3">
            {imageFile && (
              <span className="text-[10px] text-[#F59E0B]/70 font-mono flex items-center gap-1">
                <FiUpload size={9} /> {imageFile.name}
              </span>
            )}
            <AnimatePresence>
              {isThinking && (
                <motion.span
                  className="text-[10px] text-[#8B5CF6]/70 font-mono flex items-center gap-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <FiLoader size={10} />
                  </motion.span>
                  procesando...
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Lines */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 min-h-0 font-mono">
          {lines.map(line => (
            <TerminalLine key={line.id} type={line.type} text={line.text} />
          ))}
          {isThinking && <TerminalCursor text="" />}
        </div>

        {/* Input bar */}
        <div
          className="shrink-0 flex items-center gap-2 px-4 py-3"
          style={{ borderTop: '1px solid rgba(0,209,255,0.08)', background: 'rgba(0,209,255,0.02)' }}
        >
          <span className="font-mono text-[#00D1FF]/60 text-sm shrink-0">›</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isThinking ? 'ATHENIA está procesando...' : 'Escribe un mensaje o /comando...'}
            disabled={isThinking}
            className="flex-1 bg-transparent font-mono text-sm text-white/80 outline-none placeholder:text-white/15 disabled:opacity-40"
            autoFocus
          />

          {/* File upload */}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          <button
            className="p-1.5 rounded-lg text-white/20 hover:text-[#F59E0B] hover:bg-[#F59E0B]/10 transition-all"
            onClick={() => fileRef.current?.click()}
            title="Adjuntar imagen de pizarrón"
          >
            <FiUpload size={14} />
          </button>

          {/* Clear */}
          <button
            className="p-1.5 rounded-lg text-white/20 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all"
            onClick={handleClear}
            title="Limpiar terminal"
          >
            <FiTrash2 size={14} />
          </button>

          {/* Send */}
          <button
            className="p-1.5 rounded-lg text-white/20 hover:text-[#00D1FF] hover:bg-[#00D1FF]/10 transition-all disabled:opacity-30"
            onClick={handleSubmit}
            disabled={!input.trim() || isThinking}
          >
            <FiSend size={14} />
          </button>
        </div>
      </div>

      {/* Quick command hints */}
      <div className="mt-3 flex flex-wrap gap-2">
        {['/help', '/status', '/tasks mias', '/logros', '/stats global', '/suggest Transformers', '/members ML', '/ideas top', '/projects desarrollo', '/connect NLP · Vision'].map(cmd => (
          <button
            key={cmd}
            className="text-[10px] px-2.5 py-1 rounded-lg font-mono text-white/25 border border-white/[0.06] hover:text-[#00D1FF] hover:border-[#00D1FF]/20 hover:bg-[#00D1FF]/5 transition-all"
            onClick={() => { setInput(cmd); inputRef.current?.focus() }}
          >
            {cmd}
          </button>
        ))}
      </div>
    </div>
  )
}
