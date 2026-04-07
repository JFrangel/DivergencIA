import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiFileText, FiCode, FiUpload, FiSearch, FiPlus, FiTrash2,
  FiCopy, FiDownload, FiStar, FiEdit3, FiX, FiCheck,
  FiBold, FiItalic, FiList, FiImage, FiFile, FiTag,
  FiChevronRight, FiAlertCircle, FiUsers, FiClock, FiCheckCircle, FiXCircle,
} from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useNodos } from '../../hooks/useNodos'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'

// ─── Constants ──────────────────────────────────────────────────────────────

const TABS = [
  { id: 'notes', label: 'Notas', icon: FiFileText },
  { id: 'snippets', label: 'Snippets', icon: FiCode },
  { id: 'files', label: 'Archivos', icon: FiUpload },
  { id: 'solicitudes', label: 'Solicitudes', icon: FiUsers },
]

const LS_NOTES_KEY = 'workspace_notes'
const LS_SNIPPETS_KEY = 'workspace_snippets'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getFileIcon(type) {
  if (type?.startsWith('image/')) return FiImage
  return FiFile
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ─── Rich Text Editor ───────────────────────────────────────────────────────

function RichEditor({ content, onChange, placeholder }) {
  const editorRef = useRef(null)

  const exec = (cmd, val = null) => {
    document.execCommand(cmd, false, val)
    editorRef.current?.focus()
    if (onChange) onChange(editorRef.current?.innerHTML || '')
  }

  const handleInput = () => {
    if (onChange) onChange(editorRef.current?.innerHTML || '')
  }

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== content) {
      editorRef.current.innerHTML = content || ''
    }
  }, [content])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b border-white/[0.06] bg-white/[0.02] rounded-t-lg">
        <button onClick={() => exec('bold')} className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors" title="Negrita">
          <FiBold size={14} />
        </button>
        <button onClick={() => exec('italic')} className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors" title="Cursiva">
          <FiItalic size={14} />
        </button>
        <div className="w-px h-4 bg-white/10 mx-1" />
        <button onClick={() => exec('formatBlock', 'h2')} className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors text-xs font-bold" title="Encabezado">
          H2
        </button>
        <button onClick={() => exec('formatBlock', 'h3')} className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors text-xs font-bold" title="Subtítulo">
          H3
        </button>
        <div className="w-px h-4 bg-white/10 mx-1" />
        <button onClick={() => exec('insertUnorderedList')} className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors" title="Lista">
          <FiList size={14} />
        </button>
        <button onClick={() => exec('formatBlock', 'p')} className="p-1.5 rounded hover:bg-white/10 text-white/50 hover:text-white transition-colors text-xs" title="Párrafo">
          P
        </button>
      </div>

      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        data-placeholder={placeholder || 'Escribe tu nota...'}
        className="flex-1 min-h-[200px] p-4 outline-none text-sm text-white/80 overflow-y-auto
          [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-white/20
          [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_h2]:mb-2 [&_h2]:mt-3
          [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-white/90 [&_h3]:mb-1.5 [&_h3]:mt-2
          [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1
          [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1
          [&_b]:font-bold [&_strong]:font-bold
          [&_i]:italic [&_em]:italic"
        style={{ background: 'transparent' }}
      />
    </div>
  )
}

// ─── Notes Tab ──────────────────────────────────────────────────────────────

function NotesTab({ userId, filterQuery = '' }) {
  const [notes, setNotes] = useState([])
  const [activeNote, setActiveNote] = useState(null)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const saveTimeoutRef = useRef(null)

  // Load notes
  useEffect(() => {
    loadNotes()
  }, [userId])

  const loadNotes = async () => {
    setLoading(true)
    try {
      // Try Supabase first
      const { data, error } = await supabase
        .from('notas_personales')
        .select('*')
        .eq('user_id', userId)
        .order('pinned', { ascending: false })
        .order('updated_at', { ascending: false })

      if (!error && data) {
        setNotes(data)
        localStorage.setItem(LS_NOTES_KEY + '_' + userId, JSON.stringify(data))
      } else {
        // Fallback to localStorage
        const cached = localStorage.getItem(LS_NOTES_KEY + '_' + userId)
        if (cached) setNotes(JSON.parse(cached))
      }
    } catch {
      const cached = localStorage.getItem(LS_NOTES_KEY + '_' + userId)
      if (cached) setNotes(JSON.parse(cached))
    }
    setLoading(false)
  }

  const saveNote = useCallback(async (note) => {
    setSaving(true)
    const updated = { ...note, updated_at: new Date().toISOString() }

    // Update local state
    setNotes(prev => {
      const next = prev.map(n => n.id === updated.id ? updated : n)
      localStorage.setItem(LS_NOTES_KEY + '_' + userId, JSON.stringify(next))
      return next
    })

    // Persist to Supabase
    try {
      await supabase.from('notas_personales').upsert(updated)
    } catch { /* localStorage is the fallback */ }

    setSaving(false)
  }, [userId])

  const autoSave = useCallback((note) => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => saveNote(note), 800)
  }, [saveNote])

  const createNote = async () => {
    const newNote = {
      id: crypto.randomUUID(),
      user_id: userId,
      title: 'Nueva nota',
      content: '',
      pinned: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setNotes(prev => {
      const next = [newNote, ...prev]
      localStorage.setItem(LS_NOTES_KEY + '_' + userId, JSON.stringify(next))
      return next
    })
    setActiveNote(newNote)

    try {
      await supabase.from('notas_personales').insert(newNote)
    } catch { /* localStorage fallback */ }
  }

  const deleteNote = async (note) => {
    if (!confirm('¿Eliminar esta nota?')) return
    setNotes(prev => {
      const next = prev.filter(n => n.id !== note.id)
      localStorage.setItem(LS_NOTES_KEY + '_' + userId, JSON.stringify(next))
      return next
    })
    if (activeNote?.id === note.id) setActiveNote(null)

    try {
      await supabase.from('notas_personales').delete().eq('id', note.id)
    } catch { /* ok */ }
  }

  const togglePin = async (note) => {
    const updated = { ...note, pinned: !note.pinned }
    await saveNote(updated)
    if (activeNote?.id === note.id) setActiveNote(updated)
  }

  const effectiveSearch = filterQuery || search
  const filtered = notes.filter(n =>
    n.title?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
    n.content?.toLowerCase().includes(effectiveSearch.toLowerCase())
  )

  const pinned = filtered.filter(n => n.pinned)
  const unpinned = filtered.filter(n => !n.pinned)

  if (loading) return <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>

  return (
    <div className="flex gap-4 h-[calc(100vh-220px)] min-h-[500px]">
      {/* Notes sidebar */}
      <div className="w-72 shrink-0 flex flex-col rounded-xl border border-white/[0.06] overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.02)' }}>
        <div className="p-3 border-b border-white/[0.06] space-y-2">
          <Button size="sm" fullWidth onClick={createNote} className="gap-2">
            <FiPlus size={14} /> Nueva nota
          </Button>
          <Input
            placeholder="Buscar notas..."
            icon={<FiSearch size={14} />}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {pinned.length > 0 && (
            <>
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold px-2 mb-1 mt-1">Fijadas</p>
              {pinned.map(note => (
                <NoteListItem key={note.id} note={note} active={activeNote?.id === note.id}
                  onClick={() => setActiveNote(note)} onDelete={() => deleteNote(note)} onPin={() => togglePin(note)} />
              ))}
            </>
          )}
          {unpinned.length > 0 && (
            <>
              {pinned.length > 0 && <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold px-2 mb-1 mt-2">Recientes</p>}
              {unpinned.map(note => (
                <NoteListItem key={note.id} note={note} active={activeNote?.id === note.id}
                  onClick={() => setActiveNote(note)} onDelete={() => deleteNote(note)} onPin={() => togglePin(note)} />
              ))}
            </>
          )}
          {filtered.length === 0 && (
            <p className="text-sm text-white/20 text-center py-8">Sin notas</p>
          )}
        </div>
      </div>

      {/* Note editor */}
      <div className="flex-1 flex flex-col rounded-xl border border-white/[0.06] overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.02)' }}>
        {activeNote ? (
          <>
            <div className="flex items-center gap-3 p-3 border-b border-white/[0.06]">
              <input
                value={activeNote.title}
                onChange={e => {
                  const updated = { ...activeNote, title: e.target.value }
                  setActiveNote(updated)
                  autoSave(updated)
                }}
                className="flex-1 bg-transparent text-white font-semibold text-lg outline-none placeholder:text-white/20"
                placeholder="Título de la nota"
              />
              <AnimatePresence>
                {saving && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-xs text-white/30">Guardando...</motion.span>
                )}
              </AnimatePresence>
              <button onClick={() => togglePin(activeNote)}
                className={`p-1.5 rounded-lg transition-colors ${activeNote.pinned ? 'text-yellow-400' : 'text-white/30 hover:text-white/60'}`}>
                <FiStar size={15} fill={activeNote.pinned ? 'currentColor' : 'none'} />
              </button>
            </div>
            <RichEditor
              content={activeNote.content}
              onChange={html => {
                const updated = { ...activeNote, content: html }
                setActiveNote(updated)
                autoSave(updated)
              }}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState icon={<FiFileText size={40} className="text-white/20" />}
              title="Selecciona una nota" description="O crea una nueva para empezar" />
          </div>
        )}
      </div>
    </div>
  )
}

function NoteListItem({ note, active, onClick, onDelete, onPin }) {
  return (
    <motion.div
      layout
      onClick={onClick}
      className={`group flex items-start gap-2 p-2.5 rounded-lg cursor-pointer transition-all duration-150 ${
        active
          ? 'bg-[color-mix(in_srgb,var(--c-primary)_12%,transparent)] border border-[color-mix(in_srgb,var(--c-primary)_30%,transparent)]'
          : 'hover:bg-white/[0.04] border border-transparent'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {note.pinned && <FiStar size={10} className="text-yellow-400 shrink-0" fill="currentColor" />}
          <p className={`text-sm font-medium truncate ${active ? 'text-white' : 'text-white/60'}`}>
            {note.title || 'Sin título'}
          </p>
        </div>
        <p className="text-[10px] text-white/25 mt-0.5">{formatDate(note.updated_at)}</p>
      </div>
      <button onClick={e => { e.stopPropagation(); onDelete() }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded text-white/30 hover:text-[#EF4444] transition-all">
        <FiTrash2 size={12} />
      </button>
    </motion.div>
  )
}

// ─── Snippets Tab ───────────────────────────────────────────────────────────

function SnippetsTab({ userId, filterQuery = '' }) {
  const [snippets, setSnippets] = useState([])
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(null)

  useEffect(() => { loadSnippets() }, [userId])

  const loadSnippets = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('notas_personales')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'snippet')
        .order('updated_at', { ascending: false })

      if (!error && data) {
        setSnippets(data)
        localStorage.setItem(LS_SNIPPETS_KEY + '_' + userId, JSON.stringify(data))
      } else {
        const cached = localStorage.getItem(LS_SNIPPETS_KEY + '_' + userId)
        if (cached) setSnippets(JSON.parse(cached))
      }
    } catch {
      const cached = localStorage.getItem(LS_SNIPPETS_KEY + '_' + userId)
      if (cached) setSnippets(JSON.parse(cached))
    }
    setLoading(false)
  }

  const saveSnippet = async (snippet) => {
    const updated = { ...snippet, type: 'snippet', updated_at: new Date().toISOString() }

    setSnippets(prev => {
      const exists = prev.find(s => s.id === updated.id)
      const next = exists ? prev.map(s => s.id === updated.id ? updated : s) : [updated, ...prev]
      localStorage.setItem(LS_SNIPPETS_KEY + '_' + userId, JSON.stringify(next))
      return next
    })

    try {
      await supabase.from('notas_personales').upsert(updated)
    } catch { /* ok */ }

    setEditing(null)
  }

  const createSnippet = () => {
    setEditing({
      id: crypto.randomUUID(),
      user_id: userId,
      title: '',
      content: '',
      tags: [],
      type: 'snippet',
      monospace: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  const deleteSnippet = async (snippet) => {
    if (!confirm('¿Eliminar este snippet?')) return
    setSnippets(prev => {
      const next = prev.filter(s => s.id !== snippet.id)
      localStorage.setItem(LS_SNIPPETS_KEY + '_' + userId, JSON.stringify(next))
      return next
    })
    try {
      await supabase.from('notas_personales').delete().eq('id', snippet.id)
    } catch { /* ok */ }
  }

  const copyToClipboard = async (text, id) => {
    await navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const allTags = [...new Set(snippets.flatMap(s => s.tags || []))]

  const effectiveSearch = filterQuery || search
  const filtered = snippets.filter(s => {
    const matchSearch = s.title?.toLowerCase().includes(effectiveSearch.toLowerCase()) ||
      s.content?.toLowerCase().includes(effectiveSearch.toLowerCase())
    const matchTag = !tagFilter || (s.tags || []).includes(tagFilter)
    return matchSearch && matchTag
  })

  if (loading) return <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input placeholder="Buscar snippets..." icon={<FiSearch size={14} />}
          value={search} onChange={e => setSearch(e.target.value)} containerClass="flex-1" />
        {allTags.length > 0 && (
          <select value={tagFilter} onChange={e => setTagFilter(e.target.value)}
            className="bg-white/[0.04] border border-white/10 rounded-lg text-white/70 text-sm px-3 py-2 outline-none">
            <option value="">Todos los tags</option>
            {allTags.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        )}
        <Button size="sm" onClick={createSnippet} className="gap-2 shrink-0">
          <FiPlus size={14} /> Nuevo snippet
        </Button>
      </div>

      {/* Editing modal */}
      <AnimatePresence>
        {editing && (
          <SnippetEditor snippet={editing} onSave={saveSnippet} onCancel={() => setEditing(null)} />
        )}
      </AnimatePresence>

      {/* Snippet grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filtered.map(snippet => (
          <motion.div key={snippet.id} layout
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-white/[0.06] overflow-hidden group"
            style={{ background: 'rgba(255,255,255,0.02)' }}>
            <div className="flex items-center justify-between p-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-2 min-w-0">
                <FiCode size={14} className="text-white/40 shrink-0" />
                <h3 className="text-sm font-medium text-white truncate">{snippet.title || 'Sin título'}</h3>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => copyToClipboard(snippet.content, snippet.id)}
                  className="p-1.5 rounded-lg text-white/30 hover:text-white/70 transition-colors" title="Copiar">
                  {copied === snippet.id ? <FiCheck size={13} className="text-green-400" /> : <FiCopy size={13} />}
                </button>
                <button onClick={() => setEditing(snippet)}
                  className="p-1.5 rounded-lg text-white/30 hover:text-white/70 transition-colors" title="Editar">
                  <FiEdit3 size={13} />
                </button>
                <button onClick={() => deleteSnippet(snippet)}
                  className="p-1.5 rounded-lg text-white/30 hover:text-[#EF4444] transition-colors" title="Eliminar">
                  <FiTrash2 size={13} />
                </button>
              </div>
            </div>
            <pre className="p-3 text-xs text-white/60 overflow-x-auto max-h-48 font-mono leading-relaxed whitespace-pre-wrap">
              {snippet.content}
            </pre>
            {(snippet.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-3 pt-0">
                {snippet.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-medium border"
                    style={{
                      background: 'color-mix(in srgb, var(--c-secondary) 10%, transparent)',
                      borderColor: 'color-mix(in srgb, var(--c-secondary) 30%, transparent)',
                      color: 'var(--c-secondary)',
                    }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <EmptyState icon={<FiCode size={40} className="text-white/20" />}
          title="Sin snippets" description="Guarda fragmentos de código y texto rápido"
          action={createSnippet} actionLabel="Crear snippet" />
      )}
    </div>
  )
}

function SnippetEditor({ snippet, onSave, onCancel }) {
  const [form, setForm] = useState({ ...snippet })
  const [tagInput, setTagInput] = useState('')

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase()
    if (tag && !(form.tags || []).includes(tag)) {
      setForm(f => ({ ...f, tags: [...(f.tags || []), tag] }))
    }
    setTagInput('')
  }

  const removeTag = (tag) => {
    setForm(f => ({ ...f, tags: (f.tags || []).filter(t => t !== tag) }))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      className="rounded-xl border border-white/[0.08] p-4 space-y-3"
      style={{ background: 'rgba(255,255,255,0.03)' }}>
      <Input placeholder="Título del snippet" value={form.title}
        onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
      <textarea
        value={form.content}
        onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
        placeholder="Contenido del snippet..."
        rows={8}
        className="w-full bg-white/[0.04] border border-white/10 rounded-lg text-white/80 text-sm font-mono
          px-3.5 py-2.5 outline-none focus:border-[color-mix(in_srgb,var(--c-primary)_60%,transparent)]
          focus:bg-white/[0.06] transition-all duration-200 resize-y placeholder:text-white/20"
      />
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <FiTag size={13} className="text-white/30" />
          {(form.tags || []).map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border"
              style={{
                background: 'color-mix(in srgb, var(--c-secondary) 10%, transparent)',
                borderColor: 'color-mix(in srgb, var(--c-secondary) 30%, transparent)',
                color: 'var(--c-secondary)',
              }}>
              {tag}
              <button onClick={() => removeTag(tag)} className="hover:text-white"><FiX size={10} /></button>
            </span>
          ))}
        </div>
        <input
          value={tagInput}
          onChange={e => setTagInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
          placeholder="+ tag"
          className="bg-transparent text-xs text-white/50 outline-none w-20 placeholder:text-white/20"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancelar</Button>
        <Button size="sm" onClick={() => onSave(form)} className="gap-1.5">
          <FiCheck size={13} /> Guardar
        </Button>
      </div>
    </motion.div>
  )
}

// ─── Files Tab ──────────────────────────────────────────────────────────────

function FilesTab({ userId, filterQuery = '' }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => { loadFiles() }, [userId])

  const loadFiles = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.storage
        .from('archivos-personales')
        .list(userId, { sortBy: { column: 'created_at', order: 'desc' } })

      if (!error && data) {
        setFiles(data.filter(f => f.name !== '.emptyFolderPlaceholder'))
      }
    } catch { /* empty */ }
    setLoading(false)
  }

  const uploadFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const path = `${userId}/${Date.now()}_${file.name}`

    try {
      const { error } = await supabase.storage
        .from('archivos-personales')
        .upload(path, file)

      if (!error) await loadFiles()
    } catch { /* empty */ }

    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const downloadFile = async (fileName) => {
    const { data } = await supabase.storage
      .from('archivos-personales')
      .download(`${userId}/${fileName}`)

    if (data) {
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName.replace(/^\d+_/, '')
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  const deleteFile = async (fileName) => {
    const { error } = await supabase.storage
      .from('archivos-personales')
      .remove([`${userId}/${fileName}`])

    if (!error) {
      setFiles(prev => prev.filter(f => f.name !== fileName))
      setDeleteConfirm(null)
    }
  }

  const getPreview = async (fileName) => {
    const { data } = supabase.storage
      .from('archivos-personales')
      .getPublicUrl(`${userId}/${fileName}`)

    if (data?.publicUrl) setPreviewUrl(data.publicUrl)
  }

  const isImage = (name) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)

  const effectiveSearch = filterQuery || search
  const filtered = files.filter(f =>
    f.name?.toLowerCase().includes(effectiveSearch.toLowerCase())
  )

  if (loading) return <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <Input placeholder="Buscar archivos..." icon={<FiSearch size={14} />}
          value={search} onChange={e => setSearch(e.target.value)} containerClass="flex-1" />
        <Button size="sm" onClick={() => fileInputRef.current?.click()} loading={uploading}
          className="gap-2 shrink-0">
          <FiUpload size={14} /> Subir archivo
        </Button>
        <input ref={fileInputRef} type="file" className="hidden" onChange={uploadFile} />
      </div>

      {/* Image preview modal */}
      <AnimatePresence>
        {previewUrl && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => setPreviewUrl(null)}>
            <motion.img
              initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              src={previewUrl} alt="Preview"
              className="max-w-[90vw] max-h-[85vh] rounded-xl shadow-2xl object-contain"
            />
            <button onClick={() => setPreviewUrl(null)}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
              <FiX size={20} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File list */}
      <div className="rounded-xl border border-white/[0.06] overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.02)' }}>
        {filtered.length > 0 ? (
          <div className="divide-y divide-white/[0.04]">
            {filtered.map(file => {
              const FileIcon = getFileIcon(file.metadata?.mimetype)
              const displayName = file.name.replace(/^\d+_/, '')
              return (
                <div key={file.name}
                  className="flex items-center gap-3 p-3 hover:bg-white/[0.03] transition-colors group">
                  {isImage(file.name) ? (
                    <button onClick={() => getPreview(file.name)}
                      className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-white/10 hover:border-white/30 transition-colors">
                      <img
                        src={supabase.storage.from('archivos-personales').getPublicUrl(`${userId}/${file.name}`).data?.publicUrl}
                        alt="" className="w-full h-full object-cover"
                      />
                    </button>
                  ) : (
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: 'color-mix(in srgb, var(--c-primary) 10%, transparent)' }}>
                      <FileIcon size={18} style={{ color: 'var(--c-primary)' }} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 font-medium truncate">{displayName}</p>
                    <p className="text-[10px] text-white/30">
                      {formatBytes(file.metadata?.size)} — {formatDate(file.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {isImage(file.name) && (
                      <button onClick={() => getPreview(file.name)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-white/70 transition-colors" title="Vista previa">
                        <FiImage size={14} />
                      </button>
                    )}
                    <button onClick={() => downloadFile(file.name)}
                      className="p-1.5 rounded-lg text-white/30 hover:text-white/70 transition-colors" title="Descargar">
                      <FiDownload size={14} />
                    </button>
                    {deleteConfirm === file.name ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => deleteFile(file.name)}
                          className="p-1.5 rounded-lg text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors text-xs font-medium">
                          <FiCheck size={14} />
                        </button>
                        <button onClick={() => setDeleteConfirm(null)}
                          className="p-1.5 rounded-lg text-white/30 hover:text-white/70 transition-colors">
                          <FiX size={14} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(file.name)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-[#EF4444] transition-colors" title="Eliminar">
                        <FiTrash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <EmptyState icon={<FiUpload size={40} className="text-white/20" />}
            title="Sin archivos" description="Sube tus archivos personales aquí"
            action={() => fileInputRef.current?.click()} actionLabel="Subir archivo" />
        )}
      </div>
    </div>
  )
}

// ─── Solicitudes Tab ───────────────────────────────────────────────────────

function SolicitudesTab({ userId }) {
  const { getMyPendingSolicitudes, getPendingSolicitudes, respondSolicitud, nodos } = useNodos()
  const { isAdmin } = useAuth()
  const [mySolicitudes, setMySolicitudes] = useState([])
  const [receivedSolicitudes, setReceivedSolicitudes] = useState([])
  const [loading, setLoading] = useState(true)
  const [responding, setResponding] = useState(null)

  useEffect(() => {
    loadSolicitudes()
  }, [userId])

  const loadSolicitudes = async () => {
    setLoading(true)
    const [myReqs, receivedReqs] = await Promise.all([
      getMyPendingSolicitudes(),
      isAdmin ? getPendingSolicitudes() : Promise.resolve([]),
    ])
    setMySolicitudes(myReqs || [])
    setReceivedSolicitudes(receivedReqs || [])
    setLoading(false)
  }

  const handleRespondSolicitud = async (solicitudId, nodoId, usuarioId, estado) => {
    setResponding(solicitudId)
    const result = await respondSolicitud(solicitudId, estado, nodoId, usuarioId)
    setResponding(null)
    if (!result.error) {
      loadSolicitudes()
    }
  }

  const getNodoName = (nodoId) => nodos?.find(n => n.id === nodoId)?.nombre || 'Nodo desconocido'
  const getEstadoColor = (estado) => {
    if (estado === 'pendiente') return '#F59E0B'
    if (estado === 'aprobada') return '#22c55e'
    if (estado === 'rechazada') return '#EF4444'
    return '#FC651F'
  }
  const getEstadoIcon = (estado) => {
    if (estado === 'pendiente') return FiClock
    if (estado === 'aprobada') return FiCheckCircle
    if (estado === 'rechazada') return FiXCircle
    return FiAlertCircle
  }

  if (loading) return <div className="flex items-center justify-center py-16"><Spinner size="lg" /></div>

  const hasAny = mySolicitudes.length > 0 || receivedSolicitudes.length > 0

  return (
    <div className="space-y-6">
      {/* Mis Solicitudes */}
      <div className="rounded-xl border border-white/[0.06] p-6" style={{ background: 'rgba(255,255,255,0.02)' }}>
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FiUpload size={18} /> Solicitudes que Envié
        </h3>
        {mySolicitudes.length > 0 ? (
          <div className="space-y-3">
            {mySolicitudes.map(sol => {
              const Icon = getEstadoIcon(sol.estado)
              const color = getEstadoColor(sol.estado)
              const nodoName = getNodoName(sol.nodo_id)
              return (
                <motion.div
                  key={sol.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-white/[0.06] hover:border-white/[0.1] transition-colors"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
                    >
                      <Icon size={14} style={{ color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white">{nodoName}</p>
                      <p className="text-xs text-white/40">Enviada hace {formatDate(sol.created_at)}</p>
                    </div>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-1 rounded capitalize"
                    style={{ color, background: `color-mix(in srgb, ${color} 12%, transparent)` }}
                  >
                    {sol.estado === 'pendiente' ? 'Pendiente' : sol.estado === 'aprobada' ? 'Aprobada' : 'Rechazada'}
                  </span>
                </motion.div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-white/40">No has enviado solicitudes de acceso</p>
        )}
      </div>

      {/* Solicitudes Recibidas (Admin only) */}
      {isAdmin && (
        <div className="rounded-xl border border-white/[0.06] p-6" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FiDownload size={18} /> Solicitudes Recibidas
          </h3>
          {receivedSolicitudes.length > 0 ? (
            <div className="space-y-3">
              {receivedSolicitudes.map(sol => {
                const nodoName = getNodoName(sol.nodo_id)
                return (
                  <motion.div
                    key={sol.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-white/[0.06] hover:border-white/[0.1] transition-colors"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: 'color-mix(in srgb, #F59E0B 12%, transparent)' }}
                      >
                        <FiClock size={14} style={{ color: '#F59E0B' }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">{nodoName}</p>
                        <p className="text-xs text-white/40">Pendiente de revisión</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRespondSolicitud(sol.id, sol.nodo_id, sol.usuario_id, 'aprobada')}
                        disabled={responding === sol.id}
                        className="px-3 py-1 rounded text-xs font-medium bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors disabled:opacity-50"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleRespondSolicitud(sol.id, sol.nodo_id, sol.usuario_id, 'rechazada')}
                        disabled={responding === sol.id}
                        className="px-3 py-1 rounded text-xs font-medium bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                      >
                        Rechazar
                      </button>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-white/40">Sin solicitudes pendientes en tus nodos</p>
          )}
        </div>
      )}

      {!hasAny && (
        <EmptyState icon={<FiUsers size={40} className="text-white/20" />}
          title="Sin solicitudes" description="No tienes solicitudes de acceso a nodos" />
      )}
    </div>
  )
}

// ─── Main Workspace Page ────────────────────────────────────────────────────

export default function Workspace() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('notes')
  const [globalSearch, setGlobalSearch] = useState('')

  if (!user) return null

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-title text-white">Mi Espacio</h1>
          <p className="text-white/40 text-sm mt-1">Tu espacio personal: notas, snippets y archivos.</p>
        </div>
        <div className="relative w-full sm:w-72">
          <FiSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar en todo el espacio..."
            value={globalSearch}
            onChange={e => setGlobalSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/20 transition-colors"
          />
          {globalSearch && (
            <button
              onClick={() => setGlobalSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
            >
              <FiX size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl border border-white/[0.06]"
        style={{ background: 'rgba(255,255,255,0.02)' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id ? 'text-white' : 'text-white/40 hover:text-white/60 hover:bg-white/[0.03]'
            }`}
            style={activeTab === tab.id ? {
              background: 'color-mix(in srgb, var(--c-primary) 12%, transparent)',
              color: 'var(--c-primary)',
            } : {}}
          >
            <tab.icon size={15} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'notes' && <NotesTab userId={user.id} filterQuery={globalSearch} />}
          {activeTab === 'snippets' && <SnippetsTab userId={user.id} filterQuery={globalSearch} />}
          {activeTab === 'files' && <FilesTab userId={user.id} filterQuery={globalSearch} />}
          {activeTab === 'solicitudes' && <SolicitudesTab userId={user.id} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
