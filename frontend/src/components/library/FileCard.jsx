import { useState } from 'react'
import { motion } from 'framer-motion'
import { FiDownload, FiTrash2, FiFile, FiFilm, FiImage, FiCode, FiStar, FiLink, FiDatabase, FiGlobe, FiLock, FiUsers, FiFileText, FiEdit2 } from 'react-icons/fi'
import Avatar from '../ui/Avatar'
import { timeAgo, formatBytes } from '../../lib/utils'
import { toast } from 'sonner'

const TYPE_META = {
  pdf:     { icon: FiFileText, color: '#EF4444', label: 'PDF' },
  ppt:     { icon: FiFile,     color: '#F59E0B', label: 'PPT' },
  dataset: { icon: FiDatabase, color: '#22c55e', label: 'Dataset' },
  code:    { icon: FiCode,     color: '#00D1FF', label: 'Código' },
  video:   { icon: FiFilm,     color: '#8B5CF6', label: 'Video' },
  imagen:  { icon: FiImage,    color: '#FC651F', label: 'Imagen' },
  general: { icon: FiFile,     color: '#6b7280', label: 'Archivo' },
}

const VISIBILIDAD_BADGE = {
  todos:      { icon: FiGlobe, label: 'Público',    color: '#22c55e' },
  miembros:   { icon: FiUsers, label: 'Miembros',   color: '#00D1FF' },
  fundadores: { icon: FiStar,  label: 'Fundadores', color: '#F59E0B' },
  privado:    { icon: FiLock,  label: 'Privado',    color: '#6b7280' },
}

export default function FileCard({ file, onDelete, canDelete, canEdit, onEdit, index = 0, isFavorite, onToggleFavorite }) {
  const { nombre, url, tipo, tamanio_bytes, fecha_subida, subido, descargas = 0, tags = [], visibilidad } = file
  const meta = TYPE_META[tipo] || TYPE_META.general
  const visBadge = visibilidad ? VISIBILIDAD_BADGE[visibilidad] : null
  const isImage = tipo === 'imagen'
  const [imgError, setImgError] = useState(false)

  const handleDownload = (e) => {
    e.stopPropagation()
    window.open(url, '_blank')
    toast.success('Descargando archivo...')
  }

  const handleCopyLink = (e) => {
    e.stopPropagation()
    const platformUrl = `${window.location.origin}/library?file=${file.id}`
    const doCopy = (text) => {
      const el = document.createElement('textarea')
      el.value = text
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      toast.success('Enlace copiado')
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(platformUrl).then(() => toast.success('Enlace copiado')).catch(() => doCopy(platformUrl))
    } else {
      doCopy(platformUrl)
    }
  }

  const handleFav = (e) => {
    e.stopPropagation()
    onToggleFavorite?.(file.id)
  }

  const TypeIcon = meta.icon

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="h-full"
    >
      <div className="h-full flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.03] overflow-hidden group hover:border-white/10 transition-all hover:shadow-[0_0_20px_rgba(252,101,31,0.06)]">

        {/* Header — image thumbnail or colored icon area */}
        <div className="relative h-36 shrink-0 overflow-hidden"
          style={{ background: isImage && url && !imgError ? 'black' : `${meta.color}10` }}>
          {isImage && url && !imgError ? (
            <img
              src={url}
              alt={nombre}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <TypeIcon size={40} style={{ color: meta.color, opacity: 0.4 }} />
            </div>
          )}

          {/* Type label top-left */}
          <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: `${meta.color}30`, color: meta.color, backdropFilter: 'blur(4px)' }}>
            {meta.label}
          </span>

          {/* Favorite button top-right */}
          {onToggleFavorite && (
            <button onClick={handleFav}
              className="absolute top-1.5 right-1.5 p-1.5 rounded-lg transition-all"
              style={{
                background: 'rgba(0,0,0,0.4)',
                color: isFavorite ? '#F59E0B' : 'rgba(255,255,255,0.4)',
                backdropFilter: 'blur(4px)',
              }}
              title={isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
            >
              <FiStar size={12} fill={isFavorite ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex flex-col gap-2 p-3 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-white leading-snug line-clamp-2 flex-1">{nombre}</p>
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {tamanio_bytes && (
              <span className="text-[10px] text-white/25">{formatBytes(tamanio_bytes)}</span>
            )}
            {visBadge && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded"
                style={{ color: visBadge.color, background: `${visBadge.color}18` }}>
                <visBadge.icon size={8} /> {visBadge.label}
              </span>
            )}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map(t => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/30">{t}</span>
              ))}
              {tags.length > 3 && <span className="text-[10px] text-white/20">+{tags.length - 3}</span>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/[0.06] px-3 py-2 mt-auto">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar name={subido?.nombre || ''} area={subido?.area_investigacion} size="xs" />
            <div className="min-w-0">
              <p className="text-[11px] text-white/40 truncate">{subido?.nombre}</p>
              <p className="text-[10px] text-white/20">{timeAgo(fecha_subida)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-white/20 mr-0.5">{descargas}</span>
            <button onClick={handleCopyLink}
              className="p-1.5 rounded-lg text-white/25 hover:text-[var(--c-accent)] hover:bg-[var(--c-accent)]/10 transition-all"
              title="Copiar enlace">
              <FiLink size={12} />
            </button>
            <button onClick={handleDownload}
              className="p-1.5 rounded-lg text-white/25 hover:text-[#00D1FF] hover:bg-[#00D1FF]/10 transition-all"
              title="Descargar">
              <FiDownload size={13} />
            </button>
            {canEdit && (
              <button onClick={(e) => { e.stopPropagation(); onEdit?.(file) }}
                className="p-1.5 rounded-lg text-white/25 hover:text-[var(--c-secondary)] hover:bg-[var(--c-secondary)]/10 transition-all"
                title="Editar archivo">
                <FiEdit2 size={13} />
              </button>
            )}
            {canDelete && (
              <button onClick={(e) => {
                e.stopPropagation()
                toast('¿Eliminar este archivo?', {
                  action: { label: 'Eliminar', onClick: () => onDelete?.(file.id, file.url) },
                  cancel: { label: 'Cancelar' },
                })
              }}
                className="p-1.5 rounded-lg text-white/25 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all"
                title="Eliminar">
                <FiTrash2 size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
