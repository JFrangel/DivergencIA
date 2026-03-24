import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiUpload, FiFile, FiX, FiGlobe, FiLock, FiUsers, FiStar } from 'react-icons/fi'
import { formatBytes } from '../../lib/utils'
import Button from '../ui/Button'
import { toast } from 'sonner'

const MAX_SIZE = 50 * 1024 * 1024 // 50 MB

const VISIBILIDAD_OPTIONS = [
  { value: 'todos',      label: 'Todos',       icon: FiGlobe,  desc: 'Cualquier persona puede verlo' },
  { value: 'miembros',   label: 'Miembros',    icon: FiUsers,  desc: 'Solo miembros del semillero' },
  { value: 'fundadores', label: 'Fundadores',  icon: FiStar,   desc: 'Solo miembros fundadores' },
  { value: 'privado',    label: 'Privado',     icon: FiLock,   desc: 'Solo tú y los admins' },
]

export default function FileUploadZone({ onUpload, uploading }) {
  const [dragging, setDragging] = useState(false)
  const [queued, setQueued] = useState([])
  const [visibilidad, setVisibilidad] = useState('miembros')

  const addFiles = (incoming) => {
    const valid = []
    for (const f of incoming) {
      if (f.size > MAX_SIZE) {
        toast.error(`"${f.name}" supera el límite de 50 MB`)
      } else {
        valid.push(f)
      }
    }
    setQueued(prev => [...prev, ...valid])
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    addFiles(Array.from(e.dataTransfer.files))
  }, [])

  const handleSelect = (e) => {
    addFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  const removeQueued = (i) => setQueued(q => q.filter((_, idx) => idx !== i))

  const handleUpload = async () => {
    for (const file of queued) {
      await onUpload(file, { visibilidad, publico: visibilidad === 'todos' })
    }
    setQueued([])
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-200 cursor-pointer ${
          dragging
            ? 'border-[#FC651F]/60 bg-[#FC651F]/5'
            : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
        }`}
        onClick={() => document.getElementById('file-input').click()}
      >
        <input id="file-input" type="file" multiple className="hidden" onChange={handleSelect} />
        <motion.div animate={{ y: dragging ? -4 : 0 }} className="flex flex-col items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: dragging ? 'rgba(252,101,31,0.2)' : 'rgba(255,255,255,0.05)', color: dragging ? '#FC651F' : '#666' }}
          >
            <FiUpload size={22} />
          </div>
          <div>
            <p className="text-white/60 text-sm font-medium">
              {dragging ? 'Suelta los archivos aquí' : 'Arrastra archivos o haz clic para seleccionar'}
            </p>
            <p className="text-white/25 text-xs mt-1">PDF, PPT, CSV, código, imágenes, videos · máx. 50 MB</p>
          </div>
        </motion.div>
      </div>

      {/* Visibility selector */}
      <div className="glass rounded-xl p-3 space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-white/30 font-medium">¿Quién puede ver estos archivos?</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {VISIBILIDAD_OPTIONS.map(opt => {
            const Icon = opt.icon
            const active = visibilidad === opt.value
            return (
              <button
                key={opt.value}
                onClick={() => setVisibilidad(opt.value)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all ${
                  active
                    ? 'border-[var(--c-primary)]/30 bg-[var(--c-primary)]/10 text-[var(--c-primary)]'
                    : 'border-white/10 bg-white/[0.02] text-white/40 hover:text-white/60 hover:border-white/20'
                }`}
                title={opt.desc}
              >
                <Icon size={14} />
                <span className="font-medium">{opt.label}</span>
              </button>
            )
          })}
        </div>
        <p className="text-[10px] text-white/20">
          {VISIBILIDAD_OPTIONS.find(o => o.value === visibilidad)?.desc}
        </p>
      </div>

      {/* Queue */}
      <AnimatePresence>
        {queued.length > 0 && (
          <motion.div
            className="space-y-2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {queued.map((f, i) => (
              <div key={`${f.name}-${i}`} className="flex items-center gap-3 p-3 glass rounded-xl">
                <FiFile size={14} className="text-white/40 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/70 truncate">{f.name}</p>
                  <p className="text-[10px] text-white/30">{formatBytes(f.size)}</p>
                </div>
                <button onClick={() => removeQueued(i)} className="text-white/20 hover:text-[#EF4444] transition-colors">
                  <FiX size={14} />
                </button>
              </div>
            ))}
            <Button variant="solid" size="sm" loading={uploading} onClick={handleUpload} className="w-full gap-2">
              <FiUpload size={13} />
              Subir {queued.length} archivo{queued.length > 1 ? 's' : ''}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
