import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiCalendar, FiClock, FiMapPin, FiVideo, FiUsers, FiPlus } from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import { useAuth } from '../../context/AuthContext'

const TYPE_META = {
  reunion:    { label: 'Reunión', color: '#FC651F', icon: FiUsers },
  taller:     { label: 'Taller', color: '#8B5CF6', icon: FiVideo },
  conferencia:{ label: 'Conferencia', color: '#00D1FF', icon: FiMapPin },
  deadline:   { label: 'Deadline', color: '#EF4444', icon: FiClock },
  otro:       { label: 'Evento', color: '#F59E0B', icon: FiCalendar },
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const day = d.getDate()
  const month = d.toLocaleDateString('es-CO', { month: 'short' })
  const time = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  return { day, month, time }
}

function isToday(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  return d.toDateString() === now.toDateString()
}

function isTomorrow(dateStr) {
  const d = new Date(dateStr)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return d.toDateString() === tomorrow.toDateString()
}

export default function EventsWidget() {
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const now = new Date().toISOString()
    supabase
      .from('eventos')
      .select('*')
      .gte('fecha', now)
      .order('fecha', { ascending: true })
      .limit(5)
      .then(({ data, error }) => {
        if (!error) setEvents(data || [])
        setLoading(false)
      })
  }, [])

  // If no events table yet, show placeholder
  if (!loading && events.length === 0) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
            <FiCalendar size={12} className="text-[#FC651F]" />
            Próximos eventos
          </h3>
        </div>
        <div className="text-center py-6">
          <div className="text-3xl opacity-10 mb-3">📅</div>
          <p className="text-sm text-white/25">No hay eventos próximos</p>
          <p className="text-xs text-white/15 mt-1">Los eventos y reuniones aparecerán aquí</p>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
          <FiCalendar size={12} className="text-[#FC651F]" />
          Próximos eventos
        </h3>
        <span className="text-[10px] text-white/20">{events.length} próximos</span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="h-16 rounded-lg bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((ev, i) => {
            const meta = TYPE_META[ev.tipo] || TYPE_META.otro
            const { day, month, time } = formatDate(ev.fecha)
            const today = isToday(ev.fecha)
            const tomorrow = isTomorrow(ev.fecha)
            const Icon = meta.icon

            return (
              <motion.div
                key={ev.id}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.03] transition-colors group"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                {/* Date block */}
                <div
                  className="w-11 h-11 rounded-lg flex flex-col items-center justify-center shrink-0 text-center"
                  style={{ background: `${meta.color}12`, border: `1px solid ${meta.color}20` }}
                >
                  <span className="text-sm font-bold leading-none" style={{ color: meta.color }}>{day}</span>
                  <span className="text-[9px] uppercase leading-none mt-0.5" style={{ color: `${meta.color}80` }}>{month}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-white/80 truncate">{ev.titulo}</p>
                    {today && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#22c55e]/15 text-[#22c55e] font-semibold shrink-0">
                        Hoy
                      </span>
                    )}
                    {tomorrow && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#F59E0B]/15 text-[#F59E0B] font-semibold shrink-0">
                        Mañana
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-white/25 flex items-center gap-1">
                      <FiClock size={9} /> {time}
                    </span>
                    <span className="text-[10px] flex items-center gap-1" style={{ color: `${meta.color}70` }}>
                      <Icon size={9} /> {meta.label}
                    </span>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
