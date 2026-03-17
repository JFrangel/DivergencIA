import { cn } from '../../lib/utils'

const PRESET_COLORS = {
  // Estados proyecto
  idea:          '#F59E0B',
  desarrollo:    'var(--c-primary)',
  investigacion: 'var(--c-secondary)',
  pruebas:       'var(--c-accent)',
  finalizado:    '#22c55e',
  cancelado:     '#EF4444',
  pausa:         null,
  // Roles
  admin:         'var(--c-primary)',
  miembro:       'var(--c-secondary)',
  fundador:      '#F59E0B',
  // Prioridades
  baja:          '#22c55e',
  media:         '#F59E0B',
  alta:          'var(--c-primary)',
  critica:       '#EF4444',
  // Ideas
  votacion:      'var(--c-accent)',
  aprobada:      '#22c55e',
  rechazada:     '#EF4444',
  modificacion:  '#F59E0B',
  // Áreas
  ML:            'var(--c-primary)',
  NLP:           'var(--c-secondary)',
  Vision:        'var(--c-accent)',
  Datos:         '#22c55e',
  General:       '#F59E0B',
  // Tareas
  pendiente:     null,
  en_progreso:   'var(--c-accent)',
  revision:      '#F59E0B',
  completada:    '#22c55e',
}

/* For static hex colors, keep Tailwind classes for performance */
const STATIC_PRESETS = {
  idea:          'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
  finalizado:    'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30',
  cancelado:     'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
  pausa:         'bg-white/10 text-white/50 border-white/20',
  fundador:      'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
  baja:          'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30',
  media:         'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
  critica:       'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
  aprobada:      'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30',
  rechazada:     'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
  modificacion:  'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
  Datos:         'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30',
  General:       'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
  pendiente:     'bg-white/10 text-white/50 border-white/20',
  revision:      'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
  completada:    'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30',
}

const LABELS = {
  // Áreas
  ML: 'Machine Learning', NLP: 'NLP', Vision: 'Computer Vision',
  Datos: 'Datos & Analytics', General: 'General',
  // Roles
  admin: 'Admin', miembro: 'Miembro', fundador: 'Fundador',
  // Founder variant
  founder: 'Fundador',
  // secondary / accent generic
  secondary: 'Módulo', accent: 'Módulo',
}

export default function Badge({
  children, preset, variant,
  area, rol, estado,
  className = '', dot = false, size = 'sm',
}) {
  // Resolve key: explicit preset → variant → area → rol → estado
  const key = preset || variant || area || rol || estado
  const sizeClass = size === 'xs' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'

  const label = children ?? LABELS[key] ?? key ?? '—'

  const staticClass = STATIC_PRESETS[key]
  const themeColor = PRESET_COLORS[key]
  const isThemeVar = themeColor && themeColor.startsWith('var(')

  // For theme vars, use inline styles; for static hex colors, use Tailwind classes
  const varStyle = isThemeVar
    ? {
        background: `color-mix(in srgb, ${themeColor} 15%, transparent)`,
        color: themeColor,
        borderColor: `color-mix(in srgb, ${themeColor} 30%, transparent)`,
      }
    : undefined

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border font-medium',
        sizeClass,
        !isThemeVar && (staticClass || 'bg-white/10 text-white/60 border-white/20'),
        className,
      )}
      style={varStyle}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: 'currentColor', opacity: 0.8 }}
        />
      )}
      {label}
    </span>
  )
}
