import { motion } from 'framer-motion'
import { FiDownload, FiTrash2, FiFile, FiFilm, FiImage, FiCode } from 'react-icons/fi'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Avatar from '../ui/Avatar'
import { timeAgo, formatBytes } from '../../lib/utils'

const TYPE_ICONS = {
  pdf:     { icon: FiFile,  color: '#EF4444' },
  ppt:     { icon: FiFile,  color: '#F59E0B' },
  dataset: { icon: FiFile,  color: '#22c55e' },
  code:    { icon: FiCode,  color: '#00D1FF' },
  video:   { icon: FiFilm,  color: '#8B5CF6' },
  imagen:  { icon: FiImage, color: '#FC651F' },
  general: { icon: FiFile,  color: '#6b7280' },
}

export default function FileCard({ file, onDelete, canDelete, index = 0 }) {
  const { nombre, url, tipo, tamanio_bytes, fecha_subida, subido, descargas = 0, tags = [] } = file
  const meta = TYPE_ICONS[tipo] || TYPE_ICONS.general

  const handleDownload = () => {
    window.open(url, '_blank')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card hover className="flex flex-col gap-3 group">
        {/* Icon + name */}
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${meta.color}15`, color: meta.color }}
          >
            <meta.icon size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{nombre}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {tamanio_bytes && (
                <span className="text-[11px] text-white/25">{formatBytes(tamanio_bytes)}</span>
              )}
              {tipo && <Badge preset={tipo} size="xs" />}
            </div>
          </div>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map(t => (
              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/30">{t}</span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
          <div className="flex items-center gap-2">
            <Avatar name={subido?.nombre || ''} area={subido?.area_investigacion} size="xs" />
            <div>
              <p className="text-[11px] text-white/40">{subido?.nombre}</p>
              <p className="text-[10px] text-white/20">{timeAgo(fecha_subida)}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-white/20 mr-1">{descargas} descargas</span>
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg text-white/25 hover:text-[#00D1FF] hover:bg-[#00D1FF]/10 transition-all"
            >
              <FiDownload size={14} />
            </button>
            {canDelete && (
              <button
                onClick={() => onDelete?.(file.id, file.url)}
                className="p-1.5 rounded-lg text-white/25 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all"
              >
                <FiTrash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
