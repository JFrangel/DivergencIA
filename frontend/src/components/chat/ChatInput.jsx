import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiSend, FiPaperclip, FiMic, FiSmile, FiX, FiCornerUpLeft,
  FiSquare, FiSearch, FiExternalLink, FiImage,
} from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import { toast } from 'sonner'
import Avatar from '../ui/Avatar'

// ─── Platform slash commands ──────────────────────────────────────────────────
const SLASH_COMMANDS = [
  // ── Pickers (abren selector) ──────────────────────────────────────────────
  { label: '👥 Miembros',   icon: '👥', type: 'miembros',  table: 'usuarios',  select: 'id,nombre,foto_url,area_investigacion', nameKey: 'nombre', prefix: '👤', path: '/members',  withId: true,  action: 'pick', desc: 'Mencionar un miembro' },
  { label: '📁 Proyectos',  icon: '📁', type: 'proyectos', table: 'proyectos', select: 'id,titulo',                             nameKey: 'titulo', prefix: '📁', path: '/projects', withId: true,  action: 'pick', desc: 'Enlazar un proyecto' },
  { label: '💡 Ideas',      icon: '💡', type: 'ideas',     table: 'ideas',     select: 'id,titulo',                             nameKey: 'titulo', prefix: '💡', path: '/ideas',    withId: true,  action: 'pick', desc: 'Enlazar una idea' },
  { label: '📚 Biblioteca', icon: '📚', type: 'biblioteca',table: 'archivos',  select: 'id,nombre,url,tipo',                    nameKey: 'nombre', prefix: '📎', path: '/library',  withId: false, action: 'pick', desc: 'Enviar archivo de la biblioteca' },
  { label: '⚡ Nodos',      icon: '⚡', type: 'nodos',     table: 'nodos',     select: 'id,nombre',                             nameKey: 'nombre', prefix: '⚡', path: '/nodos',    withId: false, action: 'pick', desc: 'Enlazar un nodo' },
  // ── Navegación directa (insertan chip clickeable) ─────────────────────────
  { label: '🏠 Dashboard',  icon: '🏠', path: '/dashboard',action: 'navigate', desc: 'Panel principal' },
  { label: '🤖 ATHENIA',    icon: '🤖', path: '/athenia',  action: 'navigate', desc: 'Terminal IA' },
  { label: '🗺 Roadmap',    icon: '🗺', path: '/roadmap',  action: 'navigate', desc: 'Plan de la plataforma' },
  { label: '🌌 Universo',   icon: '🌌', path: '/universo', action: 'navigate', desc: 'Grafo del semillero' },
  { label: '🧑‍💻 Workspace', icon: '🧑‍💻', path: '/workspace',action: 'navigate', desc: 'Mi espacio personal' },
  { label: '🎨 Mural',      icon: '🎨', path: '/mural',    action: 'navigate', desc: 'Pizarra colaborativa' },
  { label: '🎮 Arcade',     icon: '🎮', path: '/arcade',   action: 'navigate', desc: 'Mini-juegos del semillero' },
  { label: '📅 Calendario', icon: '📅', path: '/calendar', action: 'navigate', desc: 'Calendario de eventos' },
  { label: '🏆 Mi Perfil',  icon: '🏆', path: '/profile',  action: 'navigate', desc: 'Tu perfil' },
  { label: '🧘 Zen Mode',   icon: '🧘', path: '/zen',      action: 'navigate', desc: 'Modo concentración' },
]

// ─── Tenor Sticker categories ─────────────────────────────────────────────────
const TENOR_KEY = 'LIVDSRZULELA'
const TENOR_CATEGORIES = [
  { id: 'trending',   label: '🔥 Trending',     query: null },
  { id: 'happy',      label: '😄 Feliz',         query: 'happy sticker' },
  { id: 'sad',        label: '😢 Triste',        query: 'sad sticker' },
  { id: 'love',       label: '❤️ Amor',           query: 'love heart sticker' },
  { id: 'funny',      label: '😂 Gracioso',      query: 'funny meme sticker' },
  { id: 'angry',      label: '😡 Enojado',       query: 'angry sticker' },
  { id: 'wow',        label: '🤩 Wow',           query: 'wow amazing sticker' },
  { id: 'science',    label: '🔬 Ciencia',       query: 'science tech sticker' },
  { id: 'celebrate',  label: '🎉 Celebración',   query: 'celebrate party sticker' },
  { id: 'thanks',     label: '🙏 Gracias',       query: 'thank you sticker' },
  { id: 'ok',         label: '👍 Ok',            query: 'ok cool sticker' },
  { id: 'sorry',      label: '😅 Perdón',        query: 'sorry sticker' },
  { id: 'cat',        label: '🐱 Gatos',         query: 'cat sticker' },
  { id: 'dog',        label: '🐶 Perros',        query: 'dog sticker' },
  { id: 'frog',       label: '🐸 Sapo',          query: 'frog sticker' },
  { id: 'bear',       label: '🐻 Oso',           query: 'bear sticker' },
  { id: 'anime',      label: '🌸 Anime',         query: 'anime sticker' },
  { id: 'student',    label: '📚 Estudio',       query: 'study student sticker' },
  { id: 'coffee',     label: '☕ Café',           query: 'coffee sticker' },
  { id: 'gaming',     label: '🎮 Gaming',        query: 'gaming sticker' },
]

// ─── Emoji picker ─────────────────────────────────────────────────────────────
const EMOJI_GROUPS = [
  { label: '😊 Caras', emojis: ['😀','😂','🥹','😍','🤩','😎','🥺','😭','😤','😱','🤔','🙄','🤯','😴','🤮','😇','🥳','😏','🫡','🤝'] },
  { label: '👋 Gestos', emojis: ['👍','👎','👏','🙌','💪','🤜','🤛','✊','👊','🫶','❤️','💔','💯','🔥','✨','⚡','💡','🎉','🏆','🎯'] },
  { label: '🔬 Ciencia', emojis: ['🚀','🔬','🧠','📊','🤖','🔭','💻','🧬','📈','🔑','🧪','⚗️','🌐','📡','🖥️','⌨️','🖱️','💾','📱','🔋'] },
  { label: '😺 Animales', emojis: ['🐶','🐱','🐭','🐻','🦊','🐸','🐧','🦁','🐯','🐺','🦋','🐝','🦄','🐲','🦅','🦋','🐠','🦈','🐬','🐙'] },
]

function EmojiPicker({ onSelect, onClose }) {
  const [tab, setTab] = useState(0)
  return (
    <motion.div
      className="absolute bottom-full mb-2 left-0 rounded-2xl overflow-hidden z-50 shadow-2xl"
      style={{ background: '#0f080c', border: '1px solid rgba(255,255,255,0.1)', width: 300 }}
      initial={{ opacity: 0, scale: 0.95, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 6 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center border-b border-white/[0.06] px-2 pt-2 gap-0.5 overflow-x-auto">
        {EMOJI_GROUPS.map((g, i) => (
          <button
            key={i}
            onClick={() => setTab(i)}
            className="px-2 py-1.5 text-[10px] rounded-t-lg transition-all font-medium whitespace-nowrap shrink-0"
            style={tab === i
              ? { color: 'var(--c-primary)', borderBottom: '2px solid var(--c-primary)', background: 'color-mix(in srgb, var(--c-primary) 8%, transparent)' }
              : { color: 'rgba(255,255,255,0.35)' }}
          >
            {g.label}
          </button>
        ))}
        <button onClick={onClose} className="ml-auto p-1 text-white/20 hover:text-white/50 transition-colors shrink-0">
          <FiX size={12} />
        </button>
      </div>
      <div className="grid grid-cols-10 gap-0.5 p-2">
        {EMOJI_GROUPS[tab].emojis.map((e, i) => (
          <button
            key={i}
            onClick={() => onSelect(e)}
            className="w-8 h-8 flex items-center justify-center text-lg rounded-lg hover:bg-white/[0.08] transition-colors"
            title={e}
          >
            {e}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

// ─── Sticker picker — powered by Tenor (infinite scroll) ─────────────────────
function StickerPicker({ onSelect, onClose }) {
  const [catIdx, setCatIdx] = useState(0)
  const [stickers, setStickers] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextPos, setNextPos] = useState(null)   // Tenor pagination cursor
  const [currentQuery, setCurrentQuery] = useState(null)
  const [searchInput, setSearchInput] = useState('')
  const loaderRef = useRef(null)

  const buildUrl = (query, pos) => {
    const base = query
      ? `https://api.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=${TENOR_KEY}&limit=20&media_filter=minimal&contentfilter=high`
      : `https://api.tenor.com/v1/trending?key=${TENOR_KEY}&limit=20&media_filter=minimal&contentfilter=high`
    return pos ? `${base}&pos=${pos}` : base
  }

  const loadInitial = useCallback(async (query) => {
    setLoading(true)
    setStickers([])
    setNextPos(null)
    setCurrentQuery(query)
    try {
      const res = await fetch(buildUrl(query, null))
      const json = await res.json()
      setStickers(json.results || [])
      setNextPos(json.next || null)
    } catch { setStickers([]) }
    setLoading(false)
  }, [])

  const loadMore = useCallback(async () => {
    if (!nextPos || loadingMore) return
    setLoadingMore(true)
    try {
      const res = await fetch(buildUrl(currentQuery, nextPos))
      const json = await res.json()
      setStickers(prev => [...prev, ...(json.results || [])])
      setNextPos(json.next || null)
    } catch {}
    setLoadingMore(false)
  }, [nextPos, currentQuery, loadingMore])

  // Initial load
  useEffect(() => { loadInitial(null) }, [loadInitial])

  // Infinite scroll observer
  useEffect(() => {
    if (!loaderRef.current) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore()
    }, { threshold: 0.1 })
    obs.observe(loaderRef.current)
    return () => obs.disconnect()
  }, [loadMore])

  const handleCatClick = (i) => {
    setCatIdx(i)
    setSearchInput('')
    loadInitial(TENOR_CATEGORIES[i].query)
  }

  const handleSearch = (q) => {
    if (!q.trim()) { loadInitial(TENOR_CATEGORIES[catIdx].query); return }
    loadInitial(q + ' sticker')
  }

  return (
    <motion.div
      className="absolute bottom-full mb-2 left-0 rounded-2xl overflow-hidden z-50 shadow-2xl flex flex-col"
      style={{ background: '#0f080c', border: '1px solid rgba(255,255,255,0.1)', width: 360, maxHeight: 420 }}
      initial={{ opacity: 0, scale: 0.95, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 6 }}
      transition={{ duration: 0.15 }}
    >
      {/* Header: search + close */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2 shrink-0">
        <div className="flex items-center gap-2 flex-1 px-2.5 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <FiSearch size={11} className="text-white/30 shrink-0" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSearch(searchInput) }}
            placeholder="Buscar stickers..."
            className="flex-1 bg-transparent text-xs text-white outline-none placeholder-white/25"
          />
          {searchInput && (
            <button onClick={() => { setSearchInput(''); loadInitial(TENOR_CATEGORIES[catIdx].query) }}
              className="text-white/25 hover:text-white/60">
              <FiX size={10} />
            </button>
          )}
        </div>
        <button onClick={onClose} className="p-1.5 text-white/20 hover:text-white/50 transition-colors shrink-0">
          <FiX size={13} />
        </button>
      </div>

      {/* Category tabs */}
      <div className="flex gap-0.5 px-2 pb-1 overflow-x-auto shrink-0">
        {TENOR_CATEGORIES.map((cat, i) => (
          <button
            key={cat.id}
            onClick={() => handleCatClick(i)}
            className="px-2 py-1 text-[10px] rounded-lg transition-all font-medium whitespace-nowrap shrink-0"
            style={catIdx === i
              ? { background: 'color-mix(in srgb, var(--c-primary) 15%, transparent)', color: 'var(--c-primary)' }
              : { color: 'rgba(255,255,255,0.35)' }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Sticker grid */}
      <div className="overflow-y-auto flex-1 p-2">
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        ) : stickers.length === 0 ? (
          <p className="text-center text-white/25 text-xs py-8">Sin resultados</p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-1.5">
              {stickers.map((s) => {
                const tinygif = s.media?.[0]?.tinygif?.url || s.media?.[0]?.gif?.url || ''
                const fullgif = s.media?.[0]?.gif?.url || tinygif
                return (
                  <button
                    key={s.id}
                    onClick={() => onSelect({ id: s.id, label: s.title || 'sticker', url: fullgif })}
                    className="aspect-square rounded-xl overflow-hidden hover:bg-white/[0.08] transition-all group flex items-center justify-center p-1"
                    title={s.title}
                  >
                    <img
                      src={tinygif}
                      alt={s.title}
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                      loading="lazy"
                    />
                  </button>
                )
              })}
            </div>
            {/* Infinite scroll sentinel */}
            <div ref={loaderRef} className="flex justify-center py-3">
              {loadingMore && (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white/50 rounded-full animate-spin" />
              )}
            </div>
          </>
        )}
      </div>

      {/* Tenor attribution */}
      <div className="px-3 py-1.5 border-t border-white/[0.04] flex items-center justify-end shrink-0">
        <span className="text-[9px] text-white/15">Powered by Tenor</span>
      </div>
    </motion.div>
  )
}

// ─── Slash command menu ───────────────────────────────────────────────────────
function SlashMenu({ onSelect, onClose }) {
  return (
    <motion.div
      className="absolute bottom-full mb-2 left-0 rounded-2xl overflow-hidden z-50 shadow-2xl"
      style={{ background: '#0f080c', border: '1px solid rgba(255,255,255,0.1)', width: 260 }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
        <span className="text-[10px] text-white/30 font-semibold uppercase tracking-wider">Acciones rápidas</span>
        <button onClick={onClose} className="p-0.5 text-white/20 hover:text-white/50 transition-colors">
          <FiX size={11} />
        </button>
      </div>
      <div className="py-1 max-h-64 overflow-y-auto">
        {SLASH_COMMANDS.map((cmd, i) => (
          <button
            key={i}
            onClick={() => onSelect(cmd)}
            className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/[0.05] transition-colors"
          >
            <span className="text-sm">{cmd.icon}</span>
            <div className="flex-1">
              <p className="text-xs text-white/70 font-medium">{cmd.label.slice(cmd.label.indexOf(' ') + 1)}</p>
              <p className="text-[10px] text-white/25">{cmd.desc}</p>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0"
              style={cmd.action === 'pick'
                ? { background: 'rgba(139,92,246,0.15)', color: '#8B5CF6' }
                : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.25)' }}>
              {cmd.action === 'pick' ? 'selector' : 'ir a'}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  )
}

// ─── Slash item picker ────────────────────────────────────────────────────────
function SlashItemPicker({ picker, items, loading, search, onSearch, onSelect, onClose }) {
  const filtered = items.filter(item => {
    const name = item.nombre || item.titulo || ''
    return name.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <motion.div
      className="absolute bottom-full mb-2 left-0 rounded-2xl overflow-hidden z-50 shadow-2xl"
      style={{ background: '#0f080c', border: '1px solid rgba(255,255,255,0.1)', width: 300 }}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-sm">{picker.icon || '🔍'}</span>
          <span className="text-[11px] text-white/50 font-semibold uppercase tracking-wider">{picker.label}</span>
        </div>
        <button onClick={onClose} className="p-0.5 text-white/20 hover:text-white/50 transition-colors">
          <FiX size={11} />
        </button>
      </div>

      <div className="px-3 pt-2 pb-1">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <FiSearch size={11} className="text-white/25 shrink-0" />
          <input
            autoFocus
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder={`Buscar ${picker.label?.toLowerCase()}...`}
            className="flex-1 bg-transparent text-xs text-white outline-none placeholder-white/20"
          />
        </div>
      </div>

      <div className="py-1 max-h-52 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-6">
            <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-[11px] text-white/25 text-center py-5 italic">Sin resultados</p>
        ) : filtered.map((item) => {
          const name = item.nombre || item.titulo || 'Sin nombre'
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item, name)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-white/[0.05] transition-colors group"
            >
              {picker.type === 'miembros' ? (
                <Avatar name={name} src={item.foto_url} area={item.area_investigacion} size="xs" />
              ) : (
                <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs"
                  style={{ background: 'rgba(255,255,255,0.06)' }}>
                  {picker.prefix}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/75 truncate group-hover:text-white/90">{name}</p>
                {picker.type === 'miembros' && item.area_investigacion && (
                  <p className="text-[10px] text-white/25 truncate">{item.area_investigacion}</p>
                )}
              </div>
              <FiExternalLink size={10} className="text-white/0 group-hover:text-white/30 shrink-0" />
            </button>
          )
        })}
      </div>
    </motion.div>
  )
}

const MAX_RECORD_SECS = 300 // 5 minutes max recording

// ─── Main ChatInput ───────────────────────────────────────────────────────────
export default function ChatInput({
  onSend, sending, disabled,
  placeholder = 'Escribe un mensaje...',
  slowmodeSeconds = 0,
  replyTo, onCancelReply,
}) {
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [showStickers, setShowStickers] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showSlash, setShowSlash] = useState(false)
  const [recording, setRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [slashPicker, setSlashPicker] = useState(null) // { type, label, icon, prefix, path, table, nameKey }
  const [pickerItems, setPickerItems] = useState([])
  const [pickerSearch, setPickerSearch] = useState('')
  const [pickerLoading, setPickerLoading] = useState(false)
  const textareaRef = useRef(null)
  const cooldownRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const fileInputRef = useRef(null)

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }, [value])

  // Cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return
    cooldownRef.current = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(cooldownRef.current)
  }, [cooldown])

  // Recording timer
  useEffect(() => {
    if (!recording) return
    const interval = setInterval(() => setRecordingTime(t => t + 1), 1000)
    return () => clearInterval(interval)
  }, [recording])

  // Detect `/` typed alone to open slash menu
  useEffect(() => {
    if (value === '/') setShowSlash(true)
    else if (value === '' || !value.startsWith('/')) setShowSlash(false)
  }, [value])

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!value.trim() || sending || disabled || cooldown > 0) return
    const ok = await onSend(value)
    if (ok !== false) {
      setValue('')
      if (slowmodeSeconds > 0) setCooldown(slowmodeSeconds)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      setShowSlash(false)
      setShowStickers(false)
      setShowEmoji(false)
      onCancelReply?.()
    }
  }

  const handleSlashSelect = async (cmd) => {
    setShowSlash(false)
    if (cmd.action === 'navigate') {
      // Insert a clickable chip into the message instead of navigating immediately
      const name = cmd.label.slice(cmd.label.indexOf(' ') + 1)
      setValue(prev => prev + `[${cmd.icon} ${name}](${cmd.path}) `)
      textareaRef.current?.focus()
      return
    }
    // Open item picker and load data
    setValue('')
    setSlashPicker(cmd)
    setPickerSearch('')
    setPickerLoading(true)
    const { data } = await supabase.from(cmd.table).select(cmd.select).limit(60)
    setPickerItems(data || [])
    setPickerLoading(false)
    textareaRef.current?.focus()
  }

  const handlePickerSelect = async (item, name) => {
    setSlashPicker(null)
    setPickerItems([])

    // Biblioteca: send file directly as a message (image or file)
    if (slashPicker?.type === 'biblioteca' && item.url) {
      const isImage = item.tipo?.startsWith('image') || /\.(png|jpe?g|gif|webp|svg)$/i.test(item.url)
      await onSend(item.nombre || name, isImage ? 'imagen' : 'archivo', item.url)
      return
    }

    // Default: insert a clickable chip into the textarea
    const destPath = slashPicker.withId ? `${slashPicker.path}/${item.id}` : slashPicker.path
    const chip = `[${slashPicker.prefix} ${name}](${destPath}) `
    setValue(prev => prev + chip)
    textareaRef.current?.focus()
  }

  const sendSticker = async (sticker) => {
    setShowStickers(false)
    await onSend(sticker.id || sticker.label, 'sticker', sticker.url)
  }

  const insertEmoji = (emoji) => {
    setValue(prev => prev + emoji)
    setShowEmoji(false)
    textareaRef.current?.focus()
  }

  // File upload
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) { toast.error('Máximo 20 MB por archivo'); return }
    setUploading(true)
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileName = `chat/${Date.now()}_${safeName}`
    const { error } = await supabase.storage.from('chat-files').upload(fileName, file, { upsert: false })
    if (error) { toast.error('Error subiendo archivo'); setUploading(false); e.target.value = ''; return }
    const { data: { publicUrl } } = supabase.storage.from('chat-files').getPublicUrl(fileName)
    const tipo = file.type.startsWith('image/') ? 'imagen' : 'archivo'
    await onSend(file.name, tipo, publicUrl)
    setUploading(false)
    e.target.value = ''
  }

  // Voice recording
  const autoStopRef = useRef(null)

  const toggleRecording = async () => {
    if (recording) {
      clearTimeout(autoStopRef.current)
      mediaRecorderRef.current?.stop()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioChunksRef.current = []

      // Pick best supported mimeType (opus = smaller + faster)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : ''

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)

      // timeslice=100 → chunks arrive every 100ms → onstop fires immediately
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }

      recorder.onstop = async () => {
        clearTimeout(autoStopRef.current)
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: mimeType || 'audio/webm' })
        setUploading(true)
        setRecording(false)
        setRecordingTime(0)
        const fileName = `chat/audio_${Date.now()}.webm`
        const { error } = await supabase.storage.from('chat-files').upload(fileName, blob)
        if (!error) {
          const { data: { publicUrl } } = supabase.storage.from('chat-files').getPublicUrl(fileName)
          await onSend('🎤 Nota de voz', 'audio', publicUrl)
        } else {
          toast.error('Error enviando nota de voz')
        }
        setUploading(false)
      }

      recorder.start(100) // collect chunks every 100ms — eliminates finalization delay
      mediaRecorderRef.current = recorder
      setRecording(true)
      setRecordingTime(0)

      // Auto-stop at max duration
      autoStopRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop()
          toast.info('Nota de voz — límite de 5 min alcanzado')
        }
      }, MAX_RECORD_SECS * 1000)
    } catch {
      toast.error('Sin acceso al micrófono')
    }
  }

  const stopRecording = () => {
    clearTimeout(autoStopRef.current)
    mediaRecorderRef.current?.stop()
  }

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  const isDisabled = disabled || sending || cooldown > 0 || uploading

  return (
    <div className="px-4 py-3 border-t border-white/[0.06] relative">
      {/* Reply bar */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            className="flex items-center gap-2 px-3 py-1.5 mb-2 rounded-xl"
            style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)' }}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <FiCornerUpLeft size={12} className="text-[#8B5CF6] shrink-0" />
            <span className="text-[11px] text-[#8B5CF6] font-medium shrink-0">
              Respondiendo a {replyTo.autor?.nombre}
            </span>
            <span className="text-[11px] text-white/30 flex-1 truncate min-w-0">
              {replyTo.tipo === 'sticker' ? replyTo.contenido
                : replyTo.tipo === 'audio' ? '🎤 Nota de voz'
                : replyTo.tipo === 'imagen' ? '🖼 Imagen'
                : replyTo.tipo === 'archivo' ? '📎 Archivo'
                : replyTo.contenido}
            </span>
            <button onClick={onCancelReply} className="text-white/25 hover:text-white/60 transition-colors p-0.5 shrink-0">
              <FiX size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recording mode */}
      <AnimatePresence>
        {recording && (
          <motion.div
            className="mb-2 rounded-xl overflow-hidden"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {/* Progress bar */}
            <div className="h-0.5 bg-white/5">
              <motion.div
                className="h-full bg-red-500"
                style={{ width: `${Math.min((recordingTime / MAX_RECORD_SECS) * 100, 100)}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="flex items-center gap-3 px-3 py-2">
              <motion.div
                className="w-2 h-2 rounded-full bg-red-500 shrink-0"
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="text-sm text-red-400 font-mono">{fmtTime(recordingTime)}</span>
              <span className="text-xs text-white/30 flex-1">
                Grabando · {fmtTime(MAX_RECORD_SECS - recordingTime)} restante
              </span>
              <button
                onClick={stopRecording}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:opacity-80"
                style={{ background: '#EF4444', color: 'white' }}
              >
                <FiSquare size={10} /> Enviar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        {/* Slash + sticker + file buttons */}
        <div className="relative flex items-center gap-1 shrink-0">
          {/* Emoji picker */}
          <AnimatePresence>
            {showEmoji && (
              <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />
            )}
          </AnimatePresence>
          {/* Sticker picker */}
          <AnimatePresence>
            {showStickers && (
              <StickerPicker onSelect={sendSticker} onClose={() => setShowStickers(false)} />
            )}
          </AnimatePresence>
          {/* Slash menu */}
          <AnimatePresence>
            {showSlash && (
              <SlashMenu onSelect={handleSlashSelect} onClose={() => { setShowSlash(false); setValue('') }} />
            )}
          </AnimatePresence>

          {/* Slash item picker */}
          <AnimatePresence>
            {slashPicker && (
              <SlashItemPicker
                picker={slashPicker}
                items={pickerItems}
                loading={pickerLoading}
                search={pickerSearch}
                onSearch={setPickerSearch}
                onSelect={handlePickerSelect}
                onClose={() => { setSlashPicker(null); setPickerItems([]) }}
              />
            )}
          </AnimatePresence>

          {/* / links button */}
          <button
            type="button"
            disabled={isDisabled}
            onClick={() => { setShowSlash(p => !p); setShowStickers(false) }}
            title="Compartir sección de la plataforma"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 font-bold text-sm"
            style={showSlash
              ? { background: 'color-mix(in srgb, var(--c-primary) 15%, transparent)', color: 'var(--c-primary)' }
              : { color: 'rgba(255,255,255,0.3)' }}
          >
            /
          </button>

          {/* Emoji button */}
          <button
            type="button"
            disabled={isDisabled}
            onClick={() => { setShowEmoji(p => !p); setShowStickers(false); setShowSlash(false) }}
            title="Emojis"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
            style={showEmoji
              ? { background: 'color-mix(in srgb, var(--c-primary) 15%, transparent)', color: 'var(--c-primary)' }
              : { color: 'rgba(255,255,255,0.3)' }}
          >
            <FiSmile size={15} />
          </button>

          {/* Sticker button */}
          <button
            type="button"
            disabled={isDisabled}
            onClick={() => { setShowStickers(p => !p); setShowEmoji(false); setShowSlash(false) }}
            title="Stickers"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
            style={showStickers
              ? { background: 'color-mix(in srgb, var(--c-primary) 15%, transparent)', color: 'var(--c-primary)' }
              : { color: 'rgba(255,255,255,0.3)' }}
          >
            <FiImage size={15} />
          </button>

          <button
            type="button"
            disabled={isDisabled}
            onClick={() => fileInputRef.current?.click()}
            title="Adjuntar archivo"
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            {uploading
              ? <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <FiPaperclip size={15} />
            }
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.mp4,.mp3"
            className="hidden"
            onChange={handleFileChange}
          />

          <button
            type="button"
            disabled={uploading || disabled}
            onClick={toggleRecording}
            title={recording ? 'Detener grabación' : 'Nota de voz'}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30"
            style={recording
              ? { background: 'rgba(239,68,68,0.15)', color: '#EF4444' }
              : { color: 'rgba(255,255,255,0.3)' }}
          >
            <FiMic size={15} />
          </button>
        </div>

        {/* Text area */}
        <div
          className="flex-1 flex items-end rounded-xl overflow-hidden transition-all"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              disabled ? 'No tienes permiso de escribir'
              : cooldown > 0 ? `Modo lento — espera ${cooldown}s...`
              : recording ? 'Grabando...'
              : placeholder
            }
            disabled={isDisabled || recording}
            rows={1}
            className="flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none disabled:opacity-40"
            style={{ minHeight: '40px', maxHeight: '160px' }}
          />
          {cooldown > 0 && (
            <div className="px-3 py-2 text-[11px] font-mono text-[#8B5CF6]/70 shrink-0">{cooldown}s</div>
          )}
        </div>

        {/* Send button */}
        <button
          type="submit"
          disabled={!value.trim() || sending || isDisabled}
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: value.trim() && !disabled
              ? 'linear-gradient(135deg, var(--c-primary), var(--c-secondary))'
              : 'rgba(255,255,255,0.06)',
          }}
        >
          <AnimatePresence mode="wait">
            {sending ? (
              <motion.div
                key="loading"
                className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
              />
            ) : (
              <motion.div key="send" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                <FiSend size={15} className="text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </form>
    </div>
  )
}
