import { cn } from '../../lib/utils'
import Spinner from './Spinner'

const variants = {
  solid:   'btn-solid text-white border',
  outline: 'btn-outline bg-transparent border',
  ghost:   'bg-transparent text-white/70 hover:bg-white/5 hover:text-white border border-transparent',
  neon:    'btn-neon bg-transparent border text-white animated-border',
  accent:  'btn-accent border',
  secondary: 'btn-secondary border',
  danger:  'bg-[#EF4444]/10 border border-[#EF4444]/40 text-[#EF4444] hover:bg-[#EF4444]/20',
}

const variantStyles = {
  solid: {
    background: 'var(--c-primary)',
    borderColor: 'color-mix(in srgb, var(--c-primary) 50%, transparent)',
  },
  outline: {
    borderColor: 'color-mix(in srgb, var(--c-primary) 60%, transparent)',
    color: 'var(--c-primary)',
  },
  neon: {
    borderColor: 'color-mix(in srgb, var(--c-primary) 40%, transparent)',
  },
  accent: {
    background: 'color-mix(in srgb, var(--c-accent) 10%, transparent)',
    borderColor: 'color-mix(in srgb, var(--c-accent) 40%, transparent)',
    color: 'var(--c-accent)',
  },
  secondary: {
    background: 'color-mix(in srgb, var(--c-secondary) 10%, transparent)',
    borderColor: 'color-mix(in srgb, var(--c-secondary) 40%, transparent)',
    color: 'var(--c-secondary)',
  },
}

const sizes = {
  xs: 'px-2.5 py-1 text-xs rounded-md gap-1.5',
  sm: 'px-3.5 py-1.5 text-sm rounded-lg gap-2',
  md: 'px-5 py-2 text-sm rounded-lg gap-2',
  lg: 'px-6 py-2.5 text-base rounded-xl gap-2.5',
  xl: 'px-8 py-3.5 text-base rounded-xl gap-3',
}

export default function Button({
  children,
  variant = 'solid',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  className = '',
  onClick,
  type = 'button',
  fullWidth = false,
  ...props
}) {
  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-all duration-200',
        'cursor-pointer select-none',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        'active:scale-[0.97]',
        variants[variant] || variants.solid,
        sizes[size] || sizes.md,
        fullWidth && 'w-full',
        className,
      )}
      style={variantStyles[variant] || variantStyles.solid}
      {...props}
    >
      {loading ? (
        <Spinner size="sm" color="currentColor" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
      {!loading && iconRight && <span className="shrink-0 ml-auto">{iconRight}</span>}
    </button>
  )
}
