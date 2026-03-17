import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiUpload, FiSearch, FiGrid, FiList, FiChevronDown, FiChevronUp } from 'react-icons/fi'
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

const TIPOS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'pdf', label: 'PDF' },
  { value: 'ppt', label: 'Presentaciones' },
  { value: 'dataset', label: 'Datasets' },
  { value: 'code', label: 'Código' },
  { value: 'video', label: 'Videos' },
  { value: 'imagen', label: 'Imágenes' },
]

export default function Library() {
  const { user } = useAuth()
  const [tipoFilter, setTipoFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showUpload, setShowUpload] = useState(false)
  const [view, setView] = useState('grid')
  const [previewFile, setPreviewFile] = useState(null)
  const [selectedTags, setSelectedTags] = useState([])

  const { files, loading, uploading, upload, remove } = useLibrary({ tipo: tipoFilter || undefined })

  const allTags = [...new Set(files.flatMap(f => f.etiquetas || []))]

  const filtered = files.filter(f => {
    const matchSearch = f.nombre?.toLowerCase().includes(search.toLowerCase())
    const matchTags = selectedTags.length === 0 || selectedTags.some(t => (f.etiquetas || []).includes(t))
    return matchSearch && matchTags
  })

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-title text-white">Biblioteca</h1>
          <p className="text-white/40 text-sm mt-1">Papers, datasets, código y presentaciones.</p>
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

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-64">
          <Input
            placeholder="Buscar archivo..."
            icon={<FiSearch size={14} />}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select options={TIPOS} value={tipoFilter} onChange={e => setTipoFilter(e.target.value)} />
        </div>
        <div className="ml-auto flex gap-1 glass rounded-lg p-1">
          {[{ id: 'grid', icon: FiGrid }, { id: 'list', icon: FiList }].map(v => (
            <button key={v.id} onClick={() => setView(v.id)}
              className={`p-2 rounded-md transition-all ${view === v.id ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}>
              <v.icon size={15} />
            </button>
          ))}
        </div>
      </div>

      {allTags.length > 0 && <TagsFilter tags={allTags} selected={selectedTags} onChange={setSelectedTags} />}

      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="📚" title="Biblioteca vacía" description="Sube el primer recurso del semillero."
          actionLabel="Subir archivo" action={() => setShowUpload(true)} />
      ) : (
        <motion.div
          className={view === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'flex flex-col gap-3'}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        >
          {filtered.map((f, i) => (
            <div key={f.id} onClick={() => setPreviewFile(f)} className="cursor-pointer">
              <FileCard file={f} index={i}
                canDelete={f.subido_por === user?.id} onDelete={remove} />
            </div>
          ))}
        </motion.div>
      )}

      <FilePreview file={previewFile} open={!!previewFile} onClose={() => setPreviewFile(null)} />
    </div>
  )
}
