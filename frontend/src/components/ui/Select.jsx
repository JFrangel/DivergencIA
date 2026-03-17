import { cn } from '../../lib/utils'

export default function Select({ label, error, hint, options = [], className = '', containerClass = '', placeholder = 'Seleccionar...', ...props }) {
  return (
    <div className={cn('flex flex-col gap-1.5', containerClass)}>
      {label && <label className="text-sm font-medium text-white/70">{label}</label>}
      <select
        className={cn(
          'w-full bg-[#0c0608] border border-white/10 rounded-lg',
          'text-white text-sm',
          'px-3.5 py-2.5',
          'focus:outline-none focus:border-[#FC651F]/60',
          'transition-all duration-200',
          'disabled:opacity-40 cursor-pointer',
          '[&>option]:bg-[#0c0608]',
          error && 'border-[#EF4444]/60',
          className,
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <p className="text-xs text-[#EF4444]">{error}</p>}
      {hint && !error && <p className="text-xs text-white/40">{hint}</p>}
    </div>
  )
}
