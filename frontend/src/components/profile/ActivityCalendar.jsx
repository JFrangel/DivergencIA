import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const DAYS = ['Lun', '', 'Mié', '', 'Vie', '', '']

function getDateKey(d) {
  return d.toISOString().slice(0, 10)
}

function generateCalendarDays(weeksBack = 20) {
  const days = []
  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - (weeksBack * 7) + (7 - today.getDay()))

  for (let i = 0; i < weeksBack * 7; i++) {
    const d = new Date(start)
    d.setDate(d.getDate() + i)
    if (d <= today) {
      days.push(getDateKey(d))
    }
  }
  return days
}

function getLevel(count) {
  if (count === 0) return 0
  if (count <= 1) return 1
  if (count <= 3) return 2
  if (count <= 6) return 3
  return 4
}

const LEVEL_COLORS = [
  'rgba(255,255,255,0.03)',   // 0
  'rgba(252,101,31,0.2)',     // 1
  'rgba(252,101,31,0.4)',     // 2
  'rgba(252,101,31,0.6)',     // 3
  'rgba(252,101,31,0.85)',    // 4
]

export default function ActivityCalendar({ userId }) {
  const [activityMap, setActivityMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [hoveredDay, setHoveredDay] = useState(null)

  const calendarDays = useMemo(() => generateCalendarDays(20), [])

  useEffect(() => {
    if (!userId) return
    const fetchActivity = async () => {
      const since = calendarDays[0]
      // Fetch from multiple tables in parallel
      const [{ data: avances }, { data: ideas }, { data: archivos }] = await Promise.all([
        supabase.from('avances').select('fecha').eq('autor_id', userId).gte('fecha', since),
        supabase.from('ideas').select('created_at').eq('autor_id', userId).gte('created_at', since),
        supabase.from('archivos').select('created_at').eq('subido_por', userId).gte('created_at', since),
      ])

      const map = {}
      ;[...(avances || [])].forEach(r => {
        const key = r.fecha?.slice(0, 10)
        if (key) map[key] = (map[key] || 0) + 1
      })
      ;[...(ideas || []), ...(archivos || [])].forEach(r => {
        const key = r.created_at?.slice(0, 10)
        if (key) map[key] = (map[key] || 0) + 1
      })
      setActivityMap(map)
      setLoading(false)
    }
    fetchActivity()
  }, [userId, calendarDays])

  // Group by weeks
  const weeks = []
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7))
  }

  const totalActivity = Object.values(activityMap).reduce((a, b) => a + b, 0)
  const activeDays = Object.keys(activityMap).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-white/60 uppercase tracking-wider">Actividad</p>
          <p className="text-[11px] text-white/25 mt-0.5">
            {totalActivity} contribuciones · {activeDays} días activos
          </p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-white/20 mr-1">Menos</span>
          {LEVEL_COLORS.map((c, i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-sm"
              style={{ background: c }}
            />
          ))}
          <span className="text-[9px] text-white/20 ml-1">Más</span>
        </div>
      </div>

      {/* Month labels */}
      <div className="flex gap-[3px] ml-7 mb-1">
        {weeks.map((week, wi) => {
          const firstDay = new Date(week[0])
          const showLabel = firstDay.getDate() <= 7
          return (
            <div key={wi} className="w-[11px] shrink-0">
              {showLabel && (
                <span className="text-[8px] text-white/15">{MONTHS[firstDay.getMonth()]}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Grid */}
      <div className="flex gap-0.5">
        {/* Day labels */}
        <div className="flex flex-col gap-[3px] mr-1 mt-0.5">
          {DAYS.map((d, i) => (
            <div key={i} className="h-[11px] flex items-center">
              <span className="text-[8px] text-white/15 w-5 text-right">{d}</span>
            </div>
          ))}
        </div>

        {/* Weeks columns */}
        <div className="flex gap-[3px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((day) => {
                const count = activityMap[day] || 0
                const level = getLevel(count)
                return (
                  <motion.div
                    key={day}
                    className="w-[11px] h-[11px] rounded-sm cursor-pointer relative"
                    style={{ background: LEVEL_COLORS[level] }}
                    whileHover={{ scale: 1.6, zIndex: 10 }}
                    onHoverStart={() => setHoveredDay({ day, count })}
                    onHoverEnd={() => setHoveredDay(null)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: wi * 0.01 }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip */}
      {hoveredDay && (
        <div className="mt-2 text-[10px] text-white/30">
          <span className="text-white/60 font-medium">{hoveredDay.count} contribuciones</span>
          {' '}el {new Date(hoveredDay.day).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
        </div>
      )}
    </div>
  )
}
