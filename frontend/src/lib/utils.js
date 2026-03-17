// ─── Formateo de fechas ───────────────────────────────────────────────────
export function formatDate(dateStr, opts = {}) {
  if (!dateStr) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    ...opts,
  }).format(new Date(dateStr))
}

export function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora'
  if (mins < 60) return `hace ${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `hace ${days}d`
  return formatDate(dateStr)
}

export function greetingByHour() {
  const h = new Date().getHours()
  if (h < 12) return 'Buenos días'
  if (h < 18) return 'Buenas tardes'
  return 'Buenas noches'
}

// ─── Texto ────────────────────────────────────────────────────────────────
export function truncate(str, max = 80) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}

export function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')
}

export function initials(name = '') {
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
}

// ─── Formato de bytes ─────────────────────────────────────────────────────
export function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// ─── Colores por área ─────────────────────────────────────────────────────
export const AREA_COLORS = {
  ML: '#FC651F',
  NLP: '#8B5CF6',
  Vision: '#00D1FF',
  Datos: '#22c55e',
  General: '#F59E0B',
}

export function areaColor(area) {
  return AREA_COLORS[area] || AREA_COLORS.General
}

// ─── Clases CSS condicionales ─────────────────────────────────────────────
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

// ─── Tipo de archivo → ícono ──────────────────────────────────────────────
export function fileTypeIcon(tipo) {
  const map = {
    pdf: '📄', ppt: '📊', pptx: '📊', dataset: '🗃️',
    code: '💻', video: '🎬', imagen: '🖼️',
  }
  return map[tipo] || '📁'
}
