import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { FiClock } from 'react-icons/fi'

function calcRemaining(deadline) {
  if (!deadline) return null
  const ms = new Date(deadline).getTime() - Date.now()
  if (ms <= 0) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0, pct: 0 }
  const days = Math.floor(ms / 86400000)
  const hours = Math.floor((ms % 86400000) / 3600000)
  const minutes = Math.floor((ms % 3600000) / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  return { expired: false, days, hours, minutes, seconds, total: ms }
}

export default function VotingTimer({ deadline, createdAt, compact = false, onExpire }) {
  const [remaining, setRemaining] = useState(() => calcRemaining(deadline))

  useEffect(() => {
    if (!deadline) return
    const id = setInterval(() => {
      const r = calcRemaining(deadline)
      setRemaining(r)
      if (r?.expired && onExpire) onExpire()
    }, 1000)
    return () => clearInterval(id)
  }, [deadline, onExpire])

  // Fire onExpire on mount if already expired
  useEffect(() => {
    if (remaining?.expired && onExpire) onExpire()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Percentage of time elapsed
  const pct = useMemo(() => {
    if (!deadline || !createdAt) return 0
    const total = new Date(deadline).getTime() - new Date(createdAt).getTime()
    const elapsed = Date.now() - new Date(createdAt).getTime()
    if (total <= 0) return 100
    return Math.min(100, Math.max(0, (elapsed / total) * 100))
  }, [deadline, createdAt, remaining])

  if (!deadline || !remaining) return null

  if (remaining.expired) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30 font-medium">
          Votacion cerrada
        </span>
      </div>
    )
  }

  const isUrgent = remaining.days === 0 && remaining.hours < 6
  const isWarning = remaining.days === 0 && remaining.hours < 24

  const timerColor = isUrgent
    ? '#EF4444'
    : isWarning
      ? '#F59E0B'
      : 'var(--c-accent)'

  if (compact) {
    return (
      <div className="flex items-center gap-1.5">
        <FiClock size={10} style={{ color: timerColor }} />
        <span className="text-[10px] font-mono" style={{ color: timerColor }}>
          {remaining.days > 0 && `${remaining.days}d `}
          {String(remaining.hours).padStart(2, '0')}:
          {String(remaining.minutes).padStart(2, '0')}
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {/* Timer bar */}
      <div className="h-1 rounded-full overflow-hidden bg-white/[0.07]">
        <motion.div
          className="h-full rounded-full"
          style={{ background: timerColor }}
          initial={{ width: 0 }}
          animate={{ width: `${100 - pct}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      {/* Countdown */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <FiClock size={11} style={{ color: timerColor }} />
          <span className="text-[11px] font-medium" style={{ color: timerColor }}>
            Tiempo restante
          </span>
        </div>
        <div className="flex items-center gap-1">
          {remaining.days > 0 && (
            <TimeUnit value={remaining.days} label="d" color={timerColor} />
          )}
          <TimeUnit value={remaining.hours} label="h" color={timerColor} />
          <TimeUnit value={remaining.minutes} label="m" color={timerColor} />
          {remaining.days === 0 && (
            <TimeUnit value={remaining.seconds} label="s" color={timerColor} />
          )}
        </div>
      </div>
    </div>
  )
}

function TimeUnit({ value, label, color }) {
  return (
    <span
      className="text-[11px] font-mono px-1 py-px rounded"
      style={{
        color,
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
      }}
    >
      {String(value).padStart(2, '0')}{label}
    </span>
  )
}
