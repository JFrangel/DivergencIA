import { cn } from '../../lib/utils'

export default function Card({
  children,
  className = '',
  variant = 'default',  // 'default' | 'frosted' | 'clear' | 'neon' | 'flat'
  hover = false,
  shimmer = false,
  padding = true,
  onClick,
  ...props
}) {
  const variants = {
    default: 'glass',
    frosted: 'glass-frosted',
    clear:   'glass-clear',
    neon:    'glass neon-border',
    flat:    'bg-white/[0.03] border border-white/[0.06]',
  }

  return (
    <div
      className={cn(
        'rounded-xl',
        variants[variant] || 'glass',
        padding && 'p-5',
        hover && 'transition-all duration-200 hover:bg-white/[0.07] hover:-translate-y-0.5 hover:shadow-xl cursor-pointer',
        shimmer && 'shimmer',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  )
}
