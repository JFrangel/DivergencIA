import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiPaperclip, FiUpload, FiX, FiFile, FiImage, FiFileText, FiDownload, FiTrash2 } from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { toast } from 'sonner'
import Button from '../ui/Button'

const FILE_ICONS = {
  'image/': FiImage,
  'application/pdf': FiFileText,
  'text/': FiFileText,
}

function getFileIcon(tipo) {
  for (const [prefix, Icon] of Object.entries(FILE_ICONS)) {
    if (tipo?.startsWith(prefix)) return Icon
  }
  return FiFile
}

function formatSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

export default function FileAttachments({ avanceId, attachments = [], onUpdate, bucket = 'avance-attachments' }) {
  const { user } = useAuth()
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const uploadFile = useCallback(async (file) => {
    if (!user || !avanceId) return
    setUploading(true)

    const ext = file.name.split('.').pop()
    const path = `${avanceId}/${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, { cacheControl: '3600', upsert: false })

    if (uploadError) {
      toast.error('Error al subir archivo')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)

    const newAttachment = {
      id: Date.now(),
      nombre: file.name,
      tipo: file.type,
      size: file.size,
      url: publicUrl,
      path,
    }

    onUpdate?.([...attachments, newAttachment])
    toast.success('Archivo adjuntado')
    setUploading(false)
  }, [user, avanceId, attachments, onUpdate, bucket])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) uploadFile(files[0])
  }, [uploadFile])

  const handleRemove = async (attachment) => {
    if (attachment.path) {
      await supabase.storage.from(bucket).remove([attachment.path])
    }
    onUpdate?.(attachments.filter(a => a.id !== attachment.id))
    toast.success('Archivo eliminado')
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <FiPaperclip size={11} className="text-white/30" />
        <span className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">
          Archivos adjuntos ({attachments.length})
        </span>
      </div>

      {/* Drop zone */}
      <div
        className={`relative border border-dashed rounded-lg p-3 transition-all text-center ${
          dragOver
            ? 'border-[#FC651F]/50 bg-[#FC651F]/5'
            : 'border-white/[0.08] hover:border-white/[0.15]'
        }`}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 py-2">
            <div className="w-4 h-4 border-2 border-[#FC651F]/30 border-t-[#FC651F] rounded-full animate-spin" />
            <span className="text-xs text-white/40">Subiendo...</span>
          </div>
        ) : (
          <label className="cursor-pointer flex flex-col items-center gap-1 py-1">
            <FiUpload size={14} className="text-white/20" />
            <span className="text-[10px] text-white/25">
              Arrastra o <span className="text-[#FC651F]">selecciona</span> un archivo
            </span>
            <input
              type="file"
              className="hidden"
              onChange={e => {
                if (e.target.files?.[0]) uploadFile(e.target.files[0])
              }}
            />
          </label>
        )}
      </div>

      {/* Attached files list */}
      <AnimatePresence>
        {attachments.map((att, i) => {
          const Icon = getFileIcon(att.tipo)
          return (
            <motion.div
              key={att.id}
              className="flex items-center gap-2.5 p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors group"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div className="w-8 h-8 rounded-md bg-white/[0.05] flex items-center justify-center shrink-0">
                <Icon size={13} className="text-white/30" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/60 truncate">{att.nombre}</p>
                <p className="text-[9px] text-white/20">{formatSize(att.size)}</p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {att.url && (
                  <a
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded text-white/20 hover:text-[#00D1FF] transition-colors"
                    title="Descargar"
                  >
                    <FiDownload size={11} />
                  </a>
                )}
                <button
                  onClick={() => handleRemove(att)}
                  className="p-1 rounded text-white/20 hover:text-[#EF4444] transition-colors"
                  title="Eliminar"
                >
                  <FiTrash2 size={11} />
                </button>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
