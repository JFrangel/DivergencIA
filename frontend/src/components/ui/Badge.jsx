import { cn } from '../../lib/utils'

const presets = {
  // Estados proyecto
  idea:          'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
  desarrollo:    'bg-[#FC651F]/15 text-[#FC651F] border-[#FC651F]/30',
  investigacion: 'bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/30',
  pruebas:       'bg-[#00D1FF]/15 text-[#00D1FF] border-[#00D1FF]/30',
  finalizado:    'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30',
  cancelado:     'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
  pausa:         'bg-white/10 text-white/50 border-white/20',
  // Roles
  admin:         'bg-[#FC651F]/15 text-[#FC651F] border-[#FC651F]/30',
  miembro:       'bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/30',
  fundador:      'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
  // Prioridades
  baja:          'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30',
  media:         'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
  alta:          'bg-[#FC651F]/15 text-[#FC651F] border-[#FC651F]/30',
  critica:       'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
  // Ideas
  votacion:      'bg-[#00D1FF]/15 text-[#00D1FF] border-[#00D1FF]/30',
  aprobada:      'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30',
  rechazada:     'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30',
  modificacion:  'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
  // Áreas
  ML:     'bg-[#FC651F]/15 text-[#FC651F] border-[#FC651F]/30',
  NLP:    'bg-[#8B5CF6]/15 text-[#8B5CF6] border-[#8B5CF6]/30',
  Vision: 'bg-[#00D1FF]/15 text-[#00D1FF] border-[#00D1FF]/30',
  Datos:  'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30',
  General:'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
  // Tareas
  pendiente:    'bg-white/10 text-white/50 border-white/20',
  en_progreso:  'bg-[#00D1FF]/15 text-[#00D1FF] border-[#00D1FF]/30',
  revision:     'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/30',
  completada:   'bg-[#22c55e]/15 text-[#22c55e] border-[#22c55e]/30',
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

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border font-medium',
        sizeClass,
        presets[key] || 'bg-white/10 text-white/60 border-white/20',
        className,
      )}
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
