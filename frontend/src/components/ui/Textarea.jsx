import { cn } from '../../lib/utils'

export default function Textarea({ label, error, hint, className = '', containerClass = '', rows = 4, ...props }) {
  return (
    <div className={cn('flex flex-col gap-1.5', containerClass)}>
      {label && <label className="text-sm font-medium text-white/70">{label}</label>}
      <textarea
        rows={rows}
        className={cn(
          'w-full bg-white/[0.04] border border-white/10 rounded-lg',
          'text-white placeholder:text-white/30 text-sm',
          'px-3.5 py-2.5 resize-none',
          'focus:outline-none focus:border-[#FC651F]/60 focus:bg-white/[0.06]',
          'transition-all duration-200',
          'disabled:opacity-40',
          error && 'border-[#EF4444]/60',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-[#EF4444]">{error}</p>}
      {hint && !error && <p className="text-xs text-white/40">{hint}</p>}
    </div>
  )
}
