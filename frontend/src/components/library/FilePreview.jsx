import { FiDownload, FiFile, FiImage, FiCode, FiExternalLink } from 'react-icons/fi'
import Modal from '../ui/Modal'
import { formatBytes, formatDate } from '../../lib/utils'

const CODE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.py', '.md', '.json', '.css', '.html']

function getFileCategory(tipo = '', nombre = '') {
  if (tipo.includes('image') || tipo === 'imagen') return 'image'
  if (tipo.includes('pdf') || tipo === 'pdf') return 'pdf'
  if (tipo === 'code' || CODE_EXTENSIONS.some(ext => nombre.toLowerCase().endsWith(ext))) return 'code'
  return 'other'
}

function MetaRow({ label, value }) {
  if (!value) return null
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-white/[0.06] last:border-0">
      <span className="text-xs text-white/30">{label}</span>
      <span className="text-xs text-white/60">{value}</span>
    </div>
  )
}

function PreviewArea({ file, category }) {
  switch (category) {
    case 'image':
      return (
        <div className="flex items-center justify-center rounded-xl overflow-hidden bg-black/30 max-h-80">
          <img
            src={file.url}
            alt={file.nombre}
            className="max-w-full max-h-80 object-contain rounded-xl"
          />
        </div>
      )

    case 'pdf':
      return (
        <div className="flex flex-col gap-3">
          <iframe
            src={file.url}
            title={file.nombre}
            className="w-full h-72 rounded-xl border border-white/[0.08] bg-black/30"
          />
          <a
            href={file.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--c-accent)] hover:underline"
          >
            <FiExternalLink size={13} />
            Abrir en nueva pestaña
          </a>
        </div>
      )

    case 'code':
      return (
        <div className="rounded-xl bg-black/40 border border-white/[0.08] p-4 overflow-auto max-h-72">
          <pre className="text-xs text-white/70 font-mono whitespace-pre-wrap leading-relaxed">
            {file.descripcion || 'Vista previa no disponible para este archivo.'}
          </pre>
        </div>
      )

    default:
      return (
        <div className="flex flex-col items-center justify-center gap-3 py-8 rounded-xl bg-black/20 border border-white/[0.06]">
          <FiFile size={36} className="text-white/20" />
          <p className="text-sm text-white/30">Vista previa no disponible</p>
        </div>
      )
  }
}

const CATEGORY_ICONS = {
  image: FiImage,
  pdf: FiFile,
  code: FiCode,
  other: FiFile,
}

export default function FilePreview({ file, open, onClose }) {
  if (!file) return null

  const category = getFileCategory(file.tipo, file.nombre)
  const Icon = CATEGORY_ICONS[category]

  const handleDownload = () => {
    window.open(file.url, '_blank')
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Icon size={16} className="text-[var(--c-primary)]" />
          {file.nombre}
        </span>
      }
      size="lg"
      footer={
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--c-primary)] text-white text-sm font-medium hover:brightness-110 transition-all"
        >
          <FiDownload size={15} />
          Descargar
        </button>
      }
    >
      <div className="flex flex-col gap-5">
        {/* Preview */}
        <PreviewArea file={file} category={category} />

        {/* Description */}
        {file.descripcion && category !== 'code' && (
          <p className="text-sm text-white/50 leading-relaxed">{file.descripcion}</p>
        )}

        {/* Metadata */}
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-2">
          <MetaRow label="Nombre" value={file.nombre} />
          <MetaRow label="Tipo" value={file.tipo} />
          <MetaRow label="Tamaño" value={file.size ? formatBytes(file.size) : null} />
          <MetaRow label="Subido" value={formatDate(file.created_at)} />
          <MetaRow label="Autor" value={file.autor} />
        </div>
      </div>
    </Modal>
  )
}
