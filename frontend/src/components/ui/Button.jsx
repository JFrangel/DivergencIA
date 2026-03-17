import { cn } from '../../lib/utils'
import Spinner from './Spinner'

const variants = {
  solid:   'bg-[#FC651F] hover:bg-[#e55a15] text-white border border-[#FC651F]/50',
  outline: 'bg-transparent border border-[#FC651F]/60 text-[#FC651F] hover:bg-[#FC651F]/10',
  ghost:   'bg-transparent text-white/70 hover:bg-white/5 hover:text-white border border-transparent',
  neon:    'bg-transparent border border-[#FC651F]/40 text-white animated-border hover:bg-[#FC651F]/5',
  accent:  'bg-[#00D1FF]/10 border border-[#00D1FF]/40 text-[#00D1FF] hover:bg-[#00D1FF]/20',
  secondary: 'bg-[#8B5CF6]/10 border border-[#8B5CF6]/40 text-[#8B5CF6] hover:bg-[#8B5CF6]/20',
  danger:  'bg-[#EF4444]/10 border border-[#EF4444]/40 text-[#EF4444] hover:bg-[#EF4444]/20',
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
