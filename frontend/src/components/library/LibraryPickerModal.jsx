import { useState, useEffect, useCallback } from 'react'
import { FiSearch, FiX, FiFile, FiFilm, FiImage, FiCode, FiFileText, FiDatabase } from 'react-icons/fi'
import Modal from '../ui/Modal'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { formatBytes } from '../../lib/utils'

const TYPE_META = {
  pdf:     { icon: FiFileText, color: '#EF4444', label: 'PDF' },
  ppt:     { icon: FiFile,     color: '#F59E0B', label: 'PPT' },
  dataset: { icon: FiDatabase, color: '#22c55e', label: 'Dataset' },
  code:    { icon: FiCode,     color: '#00D1FF', label: 'Código' },
  video:   { icon: FiFilm,     color: '#8B5CF6', label: 'Video' },
  imagen:  { icon: FiImage,    color: '#FC651F', label: 'Imagen' },
  general: { icon: FiFile,     color: '#6b7280', label: 'Archivo' },
}

const TIPOS = ['todos', 'pdf', 'ppt', 'dataset', 'code', 'video', 'imagen']

export default function LibraryPickerModal({ open, onClose, onSelect, title = 'Seleccionar de Biblioteca' }) {
  const { user, profile } = useAuth()
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [tipoFilter, setTipoFilter] = useState('todos')

  const fetchFiles = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const isAdmin = profile?.rol === 'admin' || profile?.rol === 'directora'
    let query = supabase
      .from('archivos')
      .select('id, nombre, url, tipo, tamanio_bytes, tags')
      .order('fecha_subida', { ascending: false })
      .limit(80)

    if (!isAdmin) {
      query = query.or(`visibilidad.eq.todos,visibilidad.eq.miembros,visibilidad.is.null,subido_por.eq.${user.id}`)
    }
    if (tipoFilter !== 'todos') query = query.eq('tipo', tipoFilter)

    const { data } = await query
    setFiles(data || [])
    setLoading(false)
  }, [user, profile, tipoFilter])

  useEffect(() => {
    if (open) {
      setSearch('')
      fetchFiles()
    }
  }, [open, fetchFiles])

  const filtered = files.filter(f =>
    f.nombre?.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (archivo) => {
    onSelect(archivo)
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="lg">
      {/* Filters */}
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.07]">
          <FiSearch size={14} className="text-white/30 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar archivo por nombre..."
            className="flex-1 bg-transparent text-sm text-white/80 placeholder-white/25 outline-none"
            autoFocus
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-white/30 hover:text-white/60 transition-colors">
              <FiX size={13} />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {TIPOS.map(t => (
            <button
              key={t}
              onClick={() => setTipoFilter(t)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors capitalize ${
                tipoFilter === t
                  ? 'bg-[#FC651F]/20 text-[#FC651F] border border-[#FC651F]/30'
                  : 'bg-white/[0.04] text-white/40 border border-white/[0.06] hover:text-white/70'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* File list */}
      {loading ? (
        <div className="py-12 text-center text-white/30 text-sm">Cargando archivos...</div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <div className="text-3xl mb-2">📂</div>
          <p className="text-white/30 text-sm">
            {search ? `Sin resultados para "${search}"` : 'No hay archivos disponibles'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filtered.map(file => {
            const meta = TYPE_META[file.tipo] || TYPE_META.general
            const Icon = meta.icon
            return (
              <button
                key={file.id}
                onClick={() => handleSelect(file)}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.07] hover:border-white/10 transition-all text-left group"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `${meta.color}18` }}
                >
                  <Icon size={16} style={{ color: meta.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/80 font-medium truncate leading-tight">{file.nombre}</p>
                  <p className="text-[11px] text-white/30 mt-0.5">
                    {meta.label} · {formatBytes(file.tamanio_bytes || 0)}
                  </p>
                </div>
                <span className="text-[11px] text-white/20 group-hover:text-[#FC651F] transition-colors shrink-0 font-medium">
                  Seleccionar →
                </span>
              </button>
            )
          })}
        </div>
      )}
      <p className="text-[11px] text-white/20 text-center mt-4">
        {filtered.length} archivo{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}
      </p>
    </Modal>
  )
}
