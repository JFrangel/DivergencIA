import { cn } from '../../lib/utils'

export default function Input({
  label,
  error,
  hint,
  icon,
  iconRight,
  className = '',
  containerClass = '',
  type = 'text',
  ...props
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', containerClass)}>
      {label && (
        <label className="text-sm font-medium text-white/70">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none">
            {icon}
          </span>
        )}
        <input
          type={type}
          className={cn(
            'w-full bg-white/[0.04] border border-white/10 rounded-lg',
            'text-white placeholder:text-white/30 text-sm',
            'px-3.5 py-2.5',
            'focus:outline-none focus:border-[#FC651F]/60 focus:bg-white/[0.06]',
            'transition-all duration-200',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            icon && 'pl-9',
            iconRight && 'pr-9',
            error && 'border-[#EF4444]/60 focus:border-[#EF4444]',
            className,
          )}
          {...props}
        />
        {iconRight && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">
            {iconRight}
          </span>
        )}
      </div>
      {error && <p className="text-xs text-[#EF4444]">{error}</p>}
      {hint && !error && <p className="text-xs text-white/40">{hint}</p>}
    </div>
  )
}
