import { initials, areaColor } from '../../lib/utils'

const sizes = {
  xs:  { px: 24,  text: 'text-[10px]' },
  sm:  { px: 32,  text: 'text-xs' },
  md:  { px: 40,  text: 'text-sm' },
  lg:  { px: 56,  text: 'text-base' },
  xl:  { px: 80,  text: 'text-xl' },
  '2xl':{ px: 112, text: 'text-2xl' },
}

export default function Avatar({ name = '', src, area, size = 'md', className = '', online, isFounded = false }) {
  const { px, text } = sizes[size] || sizes.md
  const color = isFounded ? '#F59E0B' : (area ? areaColor(area) : '#FC651F')
  const init  = initials(name)

  return (
    <div className={`relative inline-flex shrink-0 ${className}`} style={{ width: px, height: px }}>
      {src ? (
        <img
          src={src}
          alt={name}
          className="w-full h-full rounded-full object-cover"
          style={{ border: `2px solid ${color}40` }}
        />
      ) : (
        <div
          className={`w-full h-full rounded-full flex items-center justify-center font-semibold select-none font-title ${text}`}
          style={{
            background: `${color}18`,
            border: isFounded ? `2px solid ${color}80` : `2px solid ${color}40`,
            color,
            boxShadow: isFounded ? `0 0 8px ${color}40` : 'none',
          }}
        >
          {init}
        </div>
      )}
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-[#060304] pulse-dot ${online ? 'pulse-dot-green' : ''}`}
          style={{ width: Math.max(8, px * 0.22), height: Math.max(8, px * 0.22), background: online ? 'var(--c-success)' : '#6b7280' }}
        />
      )}
    </div>
  )
}
