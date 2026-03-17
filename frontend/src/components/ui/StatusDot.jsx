export default function StatusDot({ status = 'online', label, className = '' }) {
  const config = {
    online:  { dot: 'pulse-dot-green',  text: 'text-[#22c55e]', label: label || 'Online' },
    offline: { dot: '',                  text: 'text-white/40',  label: label || 'Offline' },
    warning: { dot: 'pulse-dot-orange', text: 'text-[#F59E0B]', label: label || 'Warning' },
    error:   { dot: 'pulse-dot-red',    text: 'text-[#EF4444]', label: label || 'Error' },
    active:  { dot: 'pulse-dot-cyan',   text: 'text-[#00D1FF]', label: label || 'Active' },
  }
  const c = config[status] || config.offline

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${c.text} ${className}`}>
      <span
        className={`pulse-dot ${c.dot}`}
        style={status === 'offline' ? { background: '#6b7280', width: 8, height: 8 } : {}}
      />
      {c.label}
    </span>
  )
}
