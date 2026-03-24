import { useState, useRef, forwardRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiTrash2, FiCornerUpLeft, FiDownload, FiPlay, FiPause, FiMoreHorizontal,
  FiFile, FiFileText, FiCode, FiArchive, FiFilm, FiMusic,
  FiX, FiZoomIn, FiZoomOut, FiExternalLink, FiMaximize2,
} from 'react-icons/fi'
import Avatar from '../ui/Avatar'
import { timeAgo } from '../../lib/utils'

// ─── File type helpers ────────────────────────────────────────────────────────
function getFileType(url = '', nombre = '') {
  const src = (url + nombre).toLowerCase()
  if (/\.(mp4|webm|mov|mkv|avi)/.test(src)) return 'video'
  if (/\.(mp3|wav|ogg|m4a|aac|webm)/.test(src)) return 'audio'
  if (/\.pdf/.test(src)) return 'pdf'
  if (/\.(doc|docx)/.test(src)) return 'word'
  if (/\.(xls|xlsx|csv)/.test(src)) return 'excel'
  if (/\.(ppt|pptx)/.test(src)) return 'ppt'
  if (/\.(zip|rar|7z|tar|gz)/.test(src)) return 'zip'
  if (/\.(js|ts|py|java|cpp|c|cs|go|rb|php|html|css|json|xml|yml|yaml|sh)/.test(src)) return 'code'
  if (/\.(txt|md)/.test(src)) return 'text'
  return 'generic'
}

const FILE_ICONS = {
  pdf:     { Icon: FiFileText, color: '#EF4444', label: 'PDF' },
  word:    { Icon: FiFileText, color: '#3B82F6', label: 'Word' },
  excel:   { Icon: FiFileText, color: '#22c55e', label: 'Excel' },
  ppt:     { Icon: FiFileText, color: '#F59E0B', label: 'PowerPoint' },
  zip:     { Icon: FiArchive,  color: '#8B5CF6', label: 'Archivo' },
  code:    { Icon: FiCode,     color: '#00D1FF', label: 'Código' },
  text:    { Icon: FiFileText, color: '#94a3b8', label: 'Texto' },
  video:   { Icon: FiFilm,     color: '#FC651F', label: 'Video' },
  audio:   { Icon: FiMusic,    color: '#8B5CF6', label: 'Audio' },
  generic: { Icon: FiFile,     color: '#6b7280', label: 'Archivo' },
}

const AREA_COLOR = {
  'Machine Learning': '#FC651F',
  'NLP':              '#8B5CF6',
  'Computer Vision':  '#00D1FF',
  'Datos & Analytics':'#22c55e',
  'General':          '#F59E0B',
}

const GRUPO_META = {
  fundadores:    { label: 'Fundador',    color: '#F59E0B', icon: '👑' },
  investigadores:{ label: 'Investigador',color: '#FC651F', icon: '🔬' },
  egresados:     { label: 'Egresado',    color: '#8B5CF6', icon: '🎓' },
  colaboradores: { label: 'Colaborador', color: '#00D1FF', icon: '🤝' },
  nuevos:        { label: 'Nuevo',       color: '#22c55e', icon: '🌱' },
  visitantes:    { label: 'Visitante',   color: '#6b7280', icon: '👁️' },
}

const ROL_CANAL_META = {
  admin:     { label: 'Admin',  color: '#FC651F', icon: '⚡' },
  moderador: { label: 'Mod',   color: '#8B5CF6', icon: '🛡️' },
  decano:    { label: 'Decano',color: '#F59E0B', icon: '🎓' },
}

// ─── Chat Preview Modal ────────────────────────────────────────────────────────
function ChatPreviewModal({ url, nombre, fileType, onClose }) {
  const [zoom, setZoom] = useState(1)
  const [codeContent, setCodeContent] = useState(null)
  const [codeLoading, setCodeLoading] = useState(false)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (fileType === 'code' || fileType === 'text') {
      setCodeLoading(true)
      fetch(url).then(r => r.text()).then(t => { setCodeContent(t); setCodeLoading(false) }).catch(() => setCodeLoading(false))
    }
  }, [url, fileType])

  const filename = nombre || url?.split('/').pop() || 'Archivo'
  const meta = FILE_ICONS[fileType] || FILE_ICONS.generic
  const { Icon, color, label } = meta

  const renderContent = () => {
    if (fileType === 'image') {
      return (
        <div className="flex items-center justify-center w-full h-full overflow-auto" style={{ minHeight: 200 }}>
          <img
            src={url}
            alt={filename}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center', transition: 'transform 0.2s', maxWidth: '90vw', maxHeight: '75vh', objectFit: 'contain', borderRadius: 8 }}
            draggable={false}
          />
        </div>
      )
    }
    if (fileType === 'video') {
      return (
        <div className="flex items-center justify-center w-full">
          <video src={url} controls autoPlay className="rounded-xl max-w-full" style={{ maxHeight: '70vh' }} />
        </div>
      )
    }
    if (fileType === 'audio') {
      return (
        <div className="flex flex-col items-center gap-6 py-8">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
            <Icon size={32} style={{ color }} />
          </div>
          <p className="text-white/60 text-sm">{filename}</p>
          <audio src={url} controls autoPlay className="w-full max-w-xs" style={{ accentColor: 'var(--c-primary)' }} />
        </div>
      )
    }
    if (fileType === 'pdf') {
      return (
        <iframe src={url} title={filename} className="w-full rounded-lg" style={{ height: '72vh', border: 'none', background: '#fff' }} />
      )
    }
    if (fileType === 'code' || fileType === 'text') {
      return (
        <div className="w-full overflow-auto rounded-xl text-left" style={{ maxHeight: '68vh', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.07)' }}>
          {codeLoading ? (
            <div className="flex items-center justify-center h-40 text-white/30 text-sm">Cargando...</div>
          ) : (
            <pre className="p-4 text-[12px] font-mono text-white/75 whitespace-pre overflow-x-auto leading-relaxed">
              <code>{codeContent || '(vacío)'}</code>
            </pre>
          )}
        </div>
      )
    }
    // Generic / word / excel / zip / etc
    return (
      <div className="flex flex-col items-center gap-5 py-10">
        <div className="w-24 h-24 rounded-2xl flex items-center justify-center" style={{ background: `${color}18`, border: `2px solid ${color}28` }}>
          <Icon size={40} style={{ color }} />
        </div>
        <div className="text-center">
          <p className="text-white/80 font-semibold text-base">{filename}</p>
          <p className="text-[12px] mt-1" style={{ color: `${color}aa` }}>{label}</p>
        </div>
        <a
          href={url} download target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'var(--c-primary)' }}
        >
          <FiDownload size={15} /> Descargar
        </a>
      </div>
    )
  }

  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 flex flex-col"
        style={{ background: 'rgba(0,0,0,0.92)', zIndex: 9999 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Toolbar — always on top, never hidden */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ background: 'rgba(20,10,15,0.98)', borderBottom: '1px solid rgba(255,255,255,0.09)', zIndex: 1 }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
              <Icon size={13} style={{ color }} />
            </div>
            <span className="text-sm text-white/70 truncate max-w-[360px]">{filename}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-medium" style={{ background: `${color}15`, color: `${color}cc` }}>{label}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {fileType === 'image' && (
              <>
                <button onClick={() => setZoom(z => Math.max(0.3, z - 0.25))} className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors" title="Alejar"><FiZoomOut size={14} /></button>
                <span className="text-[11px] text-white/30 w-10 text-center">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors" title="Acercar"><FiZoomIn size={14} /></button>
                <button onClick={() => setZoom(1)} className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors text-[10px]">100%</button>
              </>
            )}
            <a href={url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors" title="Abrir en nueva pestaña">
              <FiExternalLink size={14} />
            </a>
            <a href={url} download className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors" title="Descargar">
              <FiDownload size={14} />
            </a>
            {/* X — always visible, large enough to tap */}
            <button
              onClick={onClose}
              className="ml-2 w-8 h-8 rounded-xl flex items-center justify-center transition-all hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.6)' }}
              title="Cerrar (ESC)"
            >
              <FiX size={17} />
            </button>
          </div>
        </div>

        {/* Backdrop click closes, content click does not */}
        <div
          className="flex-1 flex items-center justify-center p-6 overflow-auto cursor-zoom-out"
          onClick={onClose}
        >
          <div onClick={e => e.stopPropagation()} className="cursor-default">
            {renderContent()}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}

// ─── Right-click context menu for chips ───────────────────────────────────────
function ChipContextMenu({ x, y, label, path, navigate, onClose }) {
  useEffect(() => {
    const close = () => onClose()
    window.addEventListener('click', close)
    window.addEventListener('keydown', e => { if (e.key === 'Escape') onClose() })
    return () => { window.removeEventListener('click', close) }
  }, [onClose])

  return (
    <motion.div
      className="fixed z-[300] rounded-xl overflow-hidden shadow-2xl"
      style={{ left: x, top: y, background: '#180d12', border: '1px solid rgba(255,255,255,0.1)', minWidth: 180 }}
      initial={{ opacity: 0, scale: 0.92, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92 }}
      transition={{ duration: 0.12 }}
      onClick={e => e.stopPropagation()}
    >
      <div className="px-3 py-2 border-b border-white/[0.06]">
        <p className="text-[11px] text-white/30 truncate max-w-[160px]">{label}</p>
      </div>
      <button
        onClick={() => { navigate(path); onClose() }}
        className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors text-left"
      >
        <FiExternalLink size={13} style={{ color: 'var(--c-primary)' }} />
        Ir a esta sección
      </button>
      <button
        onClick={() => { navigator.clipboard?.writeText(window.location.origin + path); onClose() }}
        className="w-full flex items-center gap-2 px-3 py-2 text-[13px] text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors text-left"
      >
        <FiMaximize2 size={13} style={{ color: 'var(--c-primary)' }} />
        Copiar enlace
      </button>
    </motion.div>
  )
}

// ─── Parse platform link chips: [emoji label](/path) ─────────────────────────
function parseContent(text, navigate, setCtxMenu) {
  const parts = []
  const regex = /\[([^\]]+)\]\((\/[^)]+)\)/g
  let last = 0, match
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(<span key={last}>{text.slice(last, match.index)}</span>)
    const label = match[1]
    const path = match[2]
    const idx = match.index
    parts.push(
      <button
        key={idx}
        onClick={() => navigate(path)}
        onContextMenu={e => { e.preventDefault(); setCtxMenu?.({ x: e.clientX, y: e.clientY, label, path }) }}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium mx-0.5 transition-all hover:opacity-80 active:scale-95"
        style={{ background: 'color-mix(in srgb, var(--c-primary) 15%, transparent)', color: 'var(--c-primary)', border: '1px solid color-mix(in srgb, var(--c-primary) 25%, transparent)' }}
      >
        {label}
      </button>
    )
    last = idx + match[0].length
  }
  if (last < text.length) parts.push(<span key={`tail_${last}`}>{text.slice(last)}</span>)
  return parts.length > 0 ? parts : text
}

// ─── Audio player ─────────────────────────────────────────────────────────────
function AudioPlayer({ src }) {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const audioRef = useRef(null)

  if (!audioRef.current) audioRef.current = new Audio(src)

  const toggle = () => {
    const a = audioRef.current
    if (playing) { a.pause(); setPlaying(false) }
    else {
      a.play()
      setPlaying(true)
      a.ontimeupdate = () => setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0)
      a.onended = () => { setPlaying(false); setProgress(0) }
    }
  }

  return (
    <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl min-w-[180px] max-w-[260px]"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <button
        onClick={toggle}
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all hover:scale-110"
        style={{ background: 'linear-gradient(135deg, var(--c-primary), var(--c-secondary))' }}
      >
        {playing ? <FiPause size={11} className="text-white" /> : <FiPlay size={11} className="text-white ml-0.5" />}
      </button>
      <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-100" style={{ width: `${progress}%`, background: 'var(--c-primary)' }} />
      </div>
      <span className="text-[10px] text-white/30 shrink-0">🎤</span>
    </div>
  )
}

// ─── Author badges ─────────────────────────────────────────────────────────────
function AuthorBadges({ autor, rolCanal }) {
  const badges = []
  if (autor?.rol === 'admin') badges.push({ key: 'admin', label: 'Admin', color: '#FC651F', icon: '⚡' })
  if (autor?.es_fundador) {
    badges.push({ key: 'fundador', label: 'Fundador', color: '#F59E0B', icon: '👑' })
  } else {
    const grupo = autor?.grupo_nodo
    if (grupo && GRUPO_META[grupo] && grupo !== 'investigadores') {
      const m = GRUPO_META[grupo]
      badges.push({ key: grupo, label: m.label, color: m.color, icon: m.icon })
    }
  }
  if (rolCanal && ROL_CANAL_META[rolCanal]) {
    const m = ROL_CANAL_META[rolCanal]
    badges.push({ key: `rol_${rolCanal}`, label: m.label, color: m.color, icon: m.icon })
  }
  if (badges.length === 0) return null
  return (
    <>
      {badges.map(b => (
        <span
          key={b.key}
          className="text-[9px] font-bold px-1 py-0.5 rounded uppercase tracking-wider leading-none"
          style={{ background: `${b.color}20`, color: b.color }}
          title={b.label}
        >
          {b.icon} {b.label}
        </span>
      ))}
    </>
  )
}

// ─── Reply preview — Discord thread style ─────────────────────────────────────
function ReplyPreview({ replyMessage, onScrollTo }) {
  if (!replyMessage) return null
  const autor = replyMessage.autor
  const snippet = replyMessage.tipo === 'sticker' ? '🖼 Sticker'
    : replyMessage.tipo === 'audio' ? '🎤 Nota de voz'
    : replyMessage.tipo === 'imagen' ? '🖼 Imagen'
    : replyMessage.tipo === 'archivo' ? '📎 Archivo'
    : replyMessage.contenido

  return (
    <div className="flex items-stretch mb-1" style={{ marginLeft: '-2px' }}>
      {/* Discord-style curved connector */}
      <div
        className="shrink-0"
        style={{
          width: 28,
          marginRight: 4,
          borderLeft: '2px solid rgba(255,255,255,0.12)',
          borderTop: '2px solid rgba(255,255,255,0.12)',
          borderRadius: '8px 0 0 0',
          marginTop: 8,
          height: 14,
          alignSelf: 'flex-end',
        }}
      />
      <button
        onClick={() => onScrollTo?.(replyMessage.id)}
        className="flex items-center gap-1.5 min-w-0 hover:opacity-75 transition-opacity"
      >
        {autor?.foto_url ? (
          <img src={autor.foto_url} alt={autor.nombre} className="w-4 h-4 rounded-full object-cover shrink-0 opacity-70" />
        ) : (
          <div className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-[8px] font-bold opacity-70"
            style={{ background: 'rgba(139,92,246,0.4)', color: '#fff' }}>
            {autor?.nombre?.[0]?.toUpperCase() || '?'}
          </div>
        )}
        <span className="text-[11px] font-semibold shrink-0" style={{ color: 'rgba(255,255,255,0.55)' }}>
          {autor?.nombre || 'Usuario'}
        </span>
        <span className="text-[11px] text-white/25 truncate max-w-[200px]">{snippet}</span>
      </button>
    </div>
  )
}

// ─── Message content ──────────────────────────────────────────────────────────
function MessageContent({ message, navigate }) {
  const { contenido, tipo, file_url } = message
  const [preview, setPreview] = useState(null)   // { url, nombre, fileType }
  const [ctxMenu, setCtxMenu] = useState(null)   // { x, y, label, path }

  if (tipo === 'sticker') {
    if (file_url) return (
      <img
        src={file_url}
        alt={contenido}
        className="w-32 h-32 object-contain select-none"
        draggable={false}
      />
    )
    return <span className="text-4xl leading-none select-none block">{contenido}</span>
  }
  if (tipo === 'audio') {
    return <AudioPlayer src={file_url || contenido} />
  }
  if (tipo === 'imagen' && file_url) {
    return (
      <>
        <div
          className="rounded-xl overflow-hidden max-w-xs cursor-zoom-in group mt-0.5 relative"
          onClick={() => setPreview({ url: file_url, nombre: contenido, fileType: 'image' })}
        >
          <img
            src={file_url}
            alt={contenido}
            className="w-full h-auto object-cover transition-opacity group-hover:opacity-85"
            style={{ maxHeight: 280 }}
            draggable={false}
          />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-black/50 rounded-full p-2">
              <FiMaximize2 size={16} className="text-white" />
            </div>
          </div>
          {contenido && contenido !== file_url && (
            <p className="text-[10px] text-white/25 px-1 pt-1 truncate">{contenido}</p>
          )}
        </div>
        <AnimatePresence>
          {preview && (
            <ChatPreviewModal {...preview} onClose={() => setPreview(null)} />
          )}
        </AnimatePresence>
      </>
    )
  }
  if (tipo === 'archivo') {
    const url = file_url || contenido
    const fileType = getFileType(url, contenido)
    const meta = FILE_ICONS[fileType] || FILE_ICONS.generic
    const { Icon, color, label } = meta
    const filename = contenido || url?.split('/').pop() || 'Archivo'

    // Inline video (compact) + click to expand
    if (fileType === 'video') {
      return (
        <>
          <div
            className="rounded-xl overflow-hidden mt-0.5 max-w-sm cursor-pointer group relative"
            style={{ border: '1px solid rgba(255,255,255,0.07)' }}
            onClick={() => setPreview({ url, nombre: filename, fileType: 'video' })}
          >
            <video src={url} className="w-full max-h-52 bg-black pointer-events-none" style={{ display: 'block' }} />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-black/60 rounded-full p-3"><FiPlay size={20} className="text-white ml-0.5" /></div>
            </div>
            {filename && filename !== url && (
              <p className="text-[10px] text-white/30 px-2 py-1 truncate bg-black/30">{filename}</p>
            )}
          </div>
          <AnimatePresence>
            {preview && <ChatPreviewModal {...preview} onClose={() => setPreview(null)} />}
          </AnimatePresence>
        </>
      )
    }

    if (fileType === 'audio') {
      return (
        <div className="mt-0.5">
          <AudioPlayer src={url} />
          {filename && filename !== url && (
            <p className="text-[10px] text-white/30 mt-1 truncate max-w-[240px]">{filename}</p>
          )}
        </div>
      )
    }

    // Clickable file card → opens preview modal
    return (
      <>
        <button
          onClick={() => setPreview({ url, nombre: filename, fileType })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl mt-0.5 group transition-all hover:scale-[1.01] text-left w-full"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', maxWidth: 280 }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
            style={{ background: `${color}18`, border: `1px solid ${color}28` }}
          >
            <Icon size={16} style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-medium text-white/80 truncate leading-tight">{filename}</p>
            <p className="text-[10px] mt-0.5 font-medium" style={{ color: `${color}bb` }}>{label} · click para previsualizar</p>
          </div>
          <FiMaximize2 size={12} className="text-white/20 group-hover:text-white/50 transition-colors shrink-0" />
        </button>
        <AnimatePresence>
          {preview && <ChatPreviewModal {...preview} onClose={() => setPreview(null)} />}
        </AnimatePresence>
      </>
    )
  }

  return (
    <>
      <div className="text-sm text-white/80 leading-relaxed break-words whitespace-pre-wrap">
        {parseContent(contenido, navigate, setCtxMenu)}
        {message.editado && <span className="text-[10px] text-white/20 ml-1.5">(editado)</span>}
      </div>
      <AnimatePresence>
        {ctxMenu && (
          <ChipContextMenu {...ctxMenu} navigate={navigate} onClose={() => setCtxMenu(null)} />
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Delete confirm modal ──────────────────────────────────────────────────
function DeleteConfirmModal({ onConfirm, onCancel }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
    >
      <motion.div
        className="rounded-2xl px-6 py-5 flex flex-col gap-4 w-72"
        style={{ background: '#130a0f', border: '1px solid rgba(255,255,255,0.1)' }}
        initial={{ scale: 0.9, opacity: 0, y: 8 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 8 }}
        transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(239,68,68,0.15)' }}>
            <FiTrash2 size={14} className="text-[#EF4444]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white/90">¿Eliminar mensaje?</p>
            <p className="text-[11px] text-white/35 mt-0.5">Esta acción no se puede deshacer.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:opacity-90"
            style={{ background: '#EF4444' }}
          >
            Eliminar
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── MessageBubble — own messages right, others left ─────────────────────────
const MessageBubble = forwardRef(function MessageBubble({
  message, isOwn, canDelete, onDelete, onReply, onScrollToReply,
  prevSame, memberRolCanal, replyMessage,
}, ref) {
  const [hover, setHover] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const navigate = useNavigate()
  const { autor, created_at } = message
  const areaColor = AREA_COLOR[autor?.area_investigacion] || '#6b7280'

  return (
    <motion.div
      ref={ref}
      className={`flex gap-3 px-4 group relative ${prevSame ? 'mt-0.5' : 'mt-4'}`}
      style={{ transition: 'background 0.4s', ...(hover ? { background: 'rgba(255,255,255,0.02)' } : {}) }}
      initial={{ opacity: 0, y: 3 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.1 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Avatar col */}
      <div className="w-8 shrink-0 mt-0.5">
        {!prevSame ? (
          <button
            onClick={() => navigate(autor?.id ? `/members/${autor.id}` : '#')}
            className="block hover:opacity-80 transition-opacity"
          >
            <Avatar name={autor?.nombre || '?'} src={autor?.foto_url} area={autor?.area_investigacion} size="sm" />
          </button>
        ) : (
          <span
            className="text-[9px] text-white/15 flex items-start justify-center h-full pt-1"
            style={{ opacity: hover ? 1 : 0, transition: 'opacity 0.15s' }}
          >
            {new Date(created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>
        )}
      </div>

      {/* Message body */}
      <div className="flex-1 min-w-0">

        {/* Header — only on first of group */}
        {!prevSame && (
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <button
              onClick={() => navigate(autor?.id ? `/members/${autor.id}` : '#')}
              className="text-[13px] font-semibold leading-none hover:underline transition-opacity"
              style={{ color: isOwn ? 'var(--c-primary)' : areaColor }}
            >
              {autor?.nombre || 'Desconocido'}
            </button>
            {isOwn && <span className="text-[10px] text-white/25 font-normal leading-none">(tú)</span>}
            <AuthorBadges autor={autor} rolCanal={memberRolCanal} />
            <span className="text-[10px] text-white/20 leading-none">{timeAgo(created_at)}</span>
          </div>
        )}

        {/* Reply preview */}
        <ReplyPreview replyMessage={replyMessage} onScrollTo={onScrollToReply} />

        {/* Content — no bubble, Discord style */}
        <MessageContent message={message} navigate={navigate} />
      </div>

      {/* Action bar on hover */}
      <AnimatePresence>
        {hover && (
          <motion.div
            className={`absolute -top-3 flex items-center gap-0.5 rounded-lg overflow-hidden z-10 ${isOwn ? 'left-4' : 'right-4'}`}
            style={{ background: '#180d12', border: '1px solid rgba(255,255,255,0.09)' }}
            initial={{ opacity: 0, scale: 0.9, y: 2 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 2 }}
            transition={{ duration: 0.1 }}
          >
            {onReply && (
              <button
                onClick={() => onReply(message)}
                className="p-1.5 text-white/30 hover:text-[#8B5CF6] hover:bg-white/[0.05] transition-colors"
                title="Responder"
              >
                <FiCornerUpLeft size={13} />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 text-white/30 hover:text-[#EF4444] hover:bg-white/[0.05] transition-colors"
                title="Eliminar"
              >
                <FiTrash2 size={13} />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete confirm modal */}
      <AnimatePresence>
        {confirmDelete && (
          <DeleteConfirmModal
            onConfirm={() => { onDelete(message.id); setConfirmDelete(false) }}
            onCancel={() => setConfirmDelete(false)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
})

export default MessageBubble
