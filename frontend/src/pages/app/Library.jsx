import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiUpload, FiSearch, FiGrid, FiList, FiChevronDown, FiChevronUp, FiStar, FiClock, FiX, FiTag } from 'react-icons/fi'
import { useLibrary } from '../../hooks/useLibrary'
import { useAuth } from '../../context/AuthContext'
import FileCard from '../../components/library/FileCard'
import FilePreview from '../../components/library/FilePreview'
import FileUploadZone from '../../components/library/FileUploadZone'
import TagsFilter from '../../components/library/TagsFilter'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'
import Modal from '../../components/ui/Modal'

function FileEditModal({ file, open, onClose, onSave }) {
  const [nombre, setNombre] = useState(file?.nombre || '')
  const [descripcion, setDescripcion] = useState(file?.descripcion || '')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState(file?.tags || [])
  const [saving, setSaving] = useState(false)

  // Reset when file changes
  useState(() => {
    if (file) {
      setNombre(file.nombre || '')
      setDescripcion(file.descripcion || '')
      setTags(file.tags || [])
    }
  }, [file])

  const addTag = () => {
    const t = tagInput.trim().toLowerCase()
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
    setTagInput('')
  }

  const handleSave = async () => {
    setSaving(true)
    await onSave(file.id, { nombre: nombre.trim(), descripcion: descripcion.trim(), tags })
    setSaving(false)
    onClose()
  }

  if (!file) return null

  return (
    <Modal open={open} onClose={onClose} title="Editar archivo" size="sm"
      footer={
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-white/10 text-white/40 text-sm hover:text-white/60 transition-all">Cancelar</button>
          <button onClick={handleSave} disabled={saving || !nombre.trim()}
            className="px-4 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-40 hover:brightness-110 transition-all"
            style={{ background: 'var(--c-primary)' }}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">Nombre del archivo</label>
          <input
            value={nombre}
            onChange={e => setNombre(e.target.value)}
            className="w-full text-sm rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white/80 placeholder-white/25 outline-none focus:border-[var(--c-primary)]/50"
          />
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">Descripción (opcional)</label>
          <textarea
            value={descripcion}
            onChange={e => setDescripcion(e.target.value)}
            rows={3}
            className="w-full text-sm rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-white/80 placeholder-white/25 outline-none focus:border-[var(--c-primary)]/50 resize-none"
            placeholder="Describe el contenido del archivo..."
          />
        </div>
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">Etiquetas</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {tags.map(t => (
              <span key={t} className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/50">
                {t}
                <button onClick={() => setTags(prev => prev.filter(x => x !== t))} className="text-white/25 hover:text-red-400 transition-colors">
                  <FiX size={9} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
              placeholder="Agregar etiqueta..."
              className="flex-1 text-xs rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white/70 placeholder-white/25 outline-none focus:border-[var(--c-primary)]/40"
            />
            <button onClick={addTag} className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white/40 hover:text-white/70 text-xs transition-all">
              <FiTag size={13} />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

const TIPOS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'pdf', label: 'PDF' },
  { value: 'ppt', label: 'Presentaciones' },
  { value: 'dataset', label: 'Datasets' },
  { value: 'code', label: 'Código' },
  { value: 'video', label: 'Videos' },
  { value: 'imagen', label: 'Imágenes' },
]

const SORT_OPTIONS = [
  { value: 'fecha_desc', label: 'Más recientes' },
  { value: 'fecha_asc', label: 'Más antiguos' },
  { value: 'nombre_asc', label: 'Nombre A-Z' },
  { value: 'nombre_desc', label: 'Nombre Z-A' },
  { value: 'tamanio_desc', label: 'Mayor tamaño' },
  { value: 'descargas_desc', label: 'Más descargados' },
]

const FAVORITES_KEY = 'divergencia_lib_favorites'

function getFavorites() {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]') } catch { return [] }
}
function toggleFavorite(id) {
  const favs = getFavorites()
  const next = favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id]
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
  return next
}

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000

export default function Library() {
  const { user, isAdmin } = useAuth()
  const [tipoFilter, setTipoFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [view, setView] = useState('grid')
  const [previewFile, setPreviewFile] = useState(null)
  const [selectedTags, setSelectedTags] = useState([])
  const [sort, setSort] = useState('fecha_desc')
  const [favorites, setFavorites] = useState(getFavorites)
  const [showOnlyFavs, setShowOnlyFavs] = useState(false)
  const [editFile, setEditFile] = useState(null)

  const { files, loading, uploading, upload, remove, updateVisibilidad, updateFile, updateContent, uploadVersion } = useLibrary({ tipo: tipoFilter || undefined })

  const allTags = useMemo(() => [...new Set(files.flatMap(f => f.tags || []))], [files])

  const recentFiles = useMemo(() =>
    files.filter(f => f.fecha_subida && (Date.now() - new Date(f.fecha_subida).getTime()) < ONE_WEEK),
    [files]
  )

  const sorted = useMemo(() => {
    const arr = [...files]
    switch (sort) {
      case 'fecha_asc':     return arr.sort((a, b) => new Date(a.fecha_subida) - new Date(b.fecha_subida))
      case 'nombre_asc':    return arr.sort((a, b) => a.nombre?.localeCompare(b.nombre))
      case 'nombre_desc':   return arr.sort((a, b) => b.nombre?.localeCompare(a.nombre))
      case 'tamanio_desc':  return arr.sort((a, b) => (b.tamanio_bytes || 0) - (a.tamanio_bytes || 0))
      case 'descargas_desc':return arr.sort((a, b) => (b.descargas || 0) - (a.descargas || 0))
      default:              return arr.sort((a, b) => new Date(b.fecha_subida) - new Date(a.fecha_subida))
    }
  }, [files, sort])

  const filtered = useMemo(() => {
    const base = sorted.filter(f => {
      const q = search.toLowerCase()
      const matchSearch = !q || f.nombre?.toLowerCase().includes(q) || (f.tags || []).some(t => t.toLowerCase().includes(q))
      const matchTags = selectedTags.length === 0 || selectedTags.some(t => (f.tags || []).includes(t))
      const matchFavs = !showOnlyFavs || favorites.includes(f.id)
      return matchSearch && matchTags && matchFavs
    })
    // Pin favorites to top (only when not filtering by favs exclusively)
    if (!showOnlyFavs && favorites.length > 0) {
      const favs = base.filter(f => favorites.includes(f.id))
      const rest = base.filter(f => !favorites.includes(f.id))
      return [...favs, ...rest]
    }
    return base
  }, [sorted, search, selectedTags, showOnlyFavs, favorites])

  const handleToggleFav = (id) => setFavorites(toggleFavorite(id))

  // Auto-open file from ?file= query param (shared links)
  useEffect(() => {
    if (!files.length) return
    const params = new URLSearchParams(window.location.search)
    const fileId = params.get('file')
    if (fileId) {
      const target = files.find(f => f.id === fileId)
      if (target) setPreviewFile(target)
    }
  }, [files])

  const gridClass = view === 'grid'
    ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
    : 'flex flex-col gap-3'

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-title text-white">Biblioteca</h1>
          <p className="text-white/40 text-sm mt-1">
            Papers, datasets, código y presentaciones
            {files.length > 0 && <span className="ml-1 text-white/20">· {files.length} archivos</span>}
          </p>
        </div>
        <Button
          variant={showUpload ? 'outline' : 'solid'}
          size="sm"
          className="gap-2"
          onClick={() => setShowUpload(s => !s)}
        >
          <FiUpload size={15} />
          {showUpload ? 'Cerrar' : 'Subir archivo'}
          {showUpload ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
        </Button>
      </div>

      {/* Upload zone */}
      <AnimatePresence>
        {showUpload && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <FileUploadZone onUpload={upload} uploading={uploading} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-64">
          <Input
            placeholder="Buscar por nombre o etiqueta..."
            icon={<FiSearch size={14} />}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select options={TIPOS} value={tipoFilter} onChange={e => setTipoFilter(e.target.value)} />
        </div>
        <div className="w-44">
          <Select options={SORT_OPTIONS} value={sort} onChange={e => setSort(e.target.value)} />
        </div>

        {/* Favorites toggle */}
        <button
          onClick={() => setShowOnlyFavs(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
            showOnlyFavs
              ? 'border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]'
              : 'border-white/10 bg-white/5 text-white/40 hover:text-white/60'
          }`}
        >
          <FiStar size={13} />
          Favoritos
          {favorites.length > 0 && <span className="ml-0.5 text-[10px] opacity-70">({favorites.length})</span>}
        </button>

        {/* View toggle */}
        <div className="ml-auto flex gap-1 glass rounded-lg p-1">
          {[{ id: 'grid', icon: FiGrid }, { id: 'list', icon: FiList }].map(v => (
            <button key={v.id} onClick={() => setView(v.id)}
              className={`p-2 rounded-md transition-all ${view === v.id ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}>
              <v.icon size={15} />
            </button>
          ))}
        </div>
      </div>

      {/* Tags filter */}
      {allTags.length > 0 && <TagsFilter tags={allTags} selected={selectedTags} onChange={setSelectedTags} />}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : (
        <>
          {/* Recent files section */}
          {recentFiles.length > 0 && !search && !tipoFilter && selectedTags.length === 0 && !showOnlyFavs && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FiClock size={13} className="text-[var(--c-accent)]" />
                <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Esta semana</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full text-[var(--c-accent)]"
                  style={{ background: 'rgba(0,209,255,0.1)' }}>
                  {recentFiles.length}
                </span>
              </div>
              <div className={gridClass}>
                {recentFiles.map((f, i) => (
                  <div key={f.id} onClick={() => setPreviewFile(f)} className="cursor-pointer">
                    <FileCard
                      file={f} index={i}
                      canDelete={f.subido_por === user?.id}
                      onDelete={remove}
                      canEdit={f.subido_por === user?.id || isAdmin}
                      onEdit={setEditFile}
                      isFavorite={favorites.includes(f.id)}
                      onToggleFavorite={handleToggleFav}
                    />
                  </div>
                ))}
              </div>
              <div className="border-t border-white/[0.06] pt-4">
                <span className="text-xs font-semibold text-white/40 uppercase tracking-wider">Todos los archivos</span>
              </div>
            </div>
          )}

          {/* All files */}
          {filtered.length === 0 ? (
            <EmptyState icon="📚" title="Biblioteca vacía" description="Sube el primer recurso del semillero."
              actionLabel="Subir archivo" action={() => setShowUpload(true)} />
          ) : (
            <motion.div className={gridClass} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {filtered.map((f, i) => (
                <div key={f.id} onClick={() => setPreviewFile(f)} className="cursor-pointer">
                  <FileCard
                    file={f} index={i}
                    canDelete={f.subido_por === user?.id}
                    onDelete={remove}
                    canEdit={f.subido_por === user?.id || isAdmin}
                    onEdit={setEditFile}
                    isFavorite={favorites.includes(f.id)}
                    onToggleFavorite={handleToggleFav}
                  />
                </div>
              ))}
            </motion.div>
          )}
        </>
      )}

      <FilePreview
        file={previewFile}
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        isFavorite={previewFile ? favorites.includes(previewFile.id) : false}
        onToggleFavorite={handleToggleFav}
        canManage={previewFile ? (previewFile.subido_por === user?.id || isAdmin) : false}
        onUpdateVisibilidad={updateVisibilidad}
        onUpdateContent={previewFile?.subido_por === user?.id ? updateContent : undefined}
        onUploadVersion={(archivoId, file) => uploadVersion(archivoId, file)}
      />

      <FileEditModal
        file={editFile}
        open={!!editFile}
        onClose={() => setEditFile(null)}
        onSave={updateFile}
      />
    </div>
  )
}
