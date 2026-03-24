const NODE_GROUPS = {
  fundadores:     { label: 'Fundadores',     color: '#F59E0B', icon: '\u{1F451}' },
  investigadores: { label: 'Investigadores', color: '#FC651F', icon: '\u{1F52C}' },
  egresados:      { label: 'Egresados',      color: '#8B5CF6', icon: '\u{1F393}' },
  colaboradores:  { label: 'Colaboradores',  color: '#00D1FF', icon: '\u{1F91D}' },
  nuevos:         { label: 'Nuevos',         color: '#22c55e', icon: '\u{1F331}' },
  visitantes:     { label: 'Visitantes',     color: '#6b7280', icon: '\u{1F441}\uFE0F' },
}

export { NODE_GROUPS }

const SIZE_CLASSES = {
  xs: 'text-[10px] px-1.5 py-0.5 gap-1',
  sm: 'text-xs px-2 py-0.5 gap-1',
  md: 'text-sm px-2.5 py-1 gap-1.5',
}

export default function NodeGroupBadge({ group, size = 'sm' }) {
  const info = NODE_GROUPS[group]
  if (!info) return null

  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.sm

  return (
    <span
      className={`inline-flex items-center rounded-md border font-medium ${sizeClass}`}
      style={{
        background: `${info.color}18`,
        color: info.color,
        borderColor: `${info.color}30`,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: info.color }}
      />
      <span>{info.icon}</span>
      {info.label}
    </span>
  )
}
