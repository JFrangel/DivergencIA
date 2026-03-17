import { motion } from 'framer-motion'

const TYPE_STYLES = {
  system:  { color: 'text-[#00D1FF]/70',  prefix: '[SYS]  ' },
  user:    { color: 'text-white/80',       prefix: '›      ' },
  ai:      { color: 'text-[#8B5CF6]',     prefix: 'A.I.   ' },
  success: { color: 'text-[#22c55e]/80',  prefix: '[OK]   ' },
  error:   { color: 'text-[#EF4444]/80',  prefix: '[ERR]  ' },
  info:    { color: 'text-white/40',       prefix: '       ' },
  warning: { color: 'text-[#F59E0B]/80',  prefix: '[WARN] ' },
  prompt:  { color: 'text-[#FC651F]/80',  prefix: '───    ' },
}

export default function TerminalLine({ type = 'info', text, timestamp, animate = true }) {
  const style = TYPE_STYLES[type] || TYPE_STYLES.info

  const content = (
    <div className={`flex items-start gap-0 font-mono text-sm leading-relaxed ${style.color}`}>
      <span className="shrink-0 text-[11px] opacity-60 mr-1 pt-px select-none">{style.prefix}</span>
      <span className="flex-1 whitespace-pre-wrap break-words">{text}</span>
      {timestamp && (
        <span className="shrink-0 text-[10px] text-white/15 ml-3 pt-px select-none tabular-nums">
          {new Date(timestamp).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      )}
    </div>
  )

  if (!animate) return content

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      {content}
    </motion.div>
  )
}

/* Typing cursor line */
export function TerminalCursor({ text = '' }) {
  return (
    <div className="flex items-center gap-0 font-mono text-sm text-[#00D1FF]/80">
      <span className="text-[11px] opacity-60 mr-1 select-none">›      </span>
      <span>{text}</span>
      <motion.span
        className="inline-block w-2 h-4 bg-[#00D1FF] ml-0.5 rounded-sm"
        animate={{ opacity: [1, 0, 1] }}
        transition={{ repeat: Infinity, duration: 1.1 }}
      />
    </div>
  )
}
