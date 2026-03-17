import { useCallback, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiUpload, FiFile, FiX } from 'react-icons/fi'
import { formatBytes } from '../../lib/utils'
import Button from '../ui/Button'

export default function FileUploadZone({ onUpload, uploading }) {
  const [dragging, setDragging] = useState(false)
  const [queued, setQueued] = useState([])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    setQueued(prev => [...prev, ...files])
  }, [])

  const handleSelect = (e) => {
    const files = Array.from(e.target.files)
    setQueued(prev => [...prev, ...files])
    e.target.value = ''
  }

  const removeQueued = (i) => setQueued(q => q.filter((_, idx) => idx !== i))

  const handleUpload = async () => {
    for (const file of queued) {
      await onUpload(file)
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
        <input
          id="file-input"
          type="file"
          multiple
          className="hidden"
          onChange={handleSelect}
        />
        <motion.div
          animate={{ y: dragging ? -4 : 0 }}
          className="flex flex-col items-center gap-3"
        >
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
            <p className="text-white/25 text-xs mt-1">PDF, PPT, CSV, código, imágenes, videos</p>
          </div>
        </motion.div>
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
              <div
                key={`${f.name}-${i}`}
                className="flex items-center gap-3 p-3 glass rounded-xl"
              >
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
            <Button
              variant="solid"
              size="sm"
              loading={uploading}
              onClick={handleUpload}
              className="w-full gap-2"
            >
              <FiUpload size={13} />
              Subir {queued.length} archivo{queued.length > 1 ? 's' : ''}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
