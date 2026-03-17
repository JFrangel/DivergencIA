import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FiActivity, FiFolder, FiStar, FiUpload, FiUser } from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import { useRealtime } from '../../hooks/useRealtime'
import Avatar from '../ui/Avatar'
import { timeAgo } from '../../lib/utils'
import Card from '../ui/Card'
import Spinner from '../ui/Spinner'

const TYPE_META = {
  avance:  { icon: FiActivity, color: '#FC651F', label: 'Avance registrado' },
  idea:    { icon: FiStar,     color: '#8B5CF6', label: 'Idea publicada' },
  archivo: { icon: FiUpload,   color: '#00D1FF', label: 'Archivo subido' },
  miembro: { icon: FiUser,     color: '#22c55e', label: 'Nuevo miembro' },
}

export default function ActivityFeed({ limit = 8 }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const loadFeed = async () => {
    const [avances, ideas, archivos] = await Promise.all([
      supabase.from('avances')
        .select('id, titulo, fecha, autor:usuarios(id, nombre, foto_url, area_investigacion), proyecto:proyectos(id, titulo)')
        .order('fecha', { ascending: false }).limit(limit),
      supabase.from('ideas')
        .select('id, titulo, fecha_publicacion, autor:usuarios(id, nombre, foto_url, area_investigacion)')
        .order('fecha_publicacion', { ascending: false }).limit(limit),
      supabase.from('archivos')
        .select('id, nombre, fecha_subida, subido:usuarios(id, nombre, foto_url, area_investigacion)')
        .order('fecha_subida', { ascending: false }).limit(limit),
    ])

    const feed = [
      ...(avances.data || []).map(a => ({ type: 'avance', id: a.id, title: a.titulo, date: a.fecha, user: a.autor, sub: a.proyecto?.titulo })),
      ...(ideas.data || []).map(i => ({ type: 'idea', id: i.id, title: i.titulo, date: i.fecha_publicacion, user: i.autor })),
      ...(archivos.data || []).map(f => ({ type: 'archivo', id: f.id, title: f.nombre, date: f.fecha_subida, user: f.subido })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, limit)

    setItems(feed)
    setLoading(false)
  }

  useEffect(() => { loadFeed() }, [])

  // Realtime: nuevo avance → prepend
  useRealtime('avances', {
    onInsert: async (row) => {
      const { data: autor } = await supabase.from('usuarios').select('id, nombre, foto_url, area_investigacion').eq('id', row.autor_id).single()
      setItems(prev => [{ type: 'avance', id: row.id, title: row.titulo, date: row.fecha, user: autor }, ...prev].slice(0, limit))
    },
  })

  return (
    <Card>
      <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
        <FiActivity size={14} /> Actividad reciente
      </h2>
      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : items.length === 0 ? (
        <p className="text-white/20 text-sm text-center py-8">Sin actividad aún</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => {
            const meta = TYPE_META[item.type]
            return (
              <motion.div
                key={`${item.type}-${item.id}`}
                className="flex items-start gap-3"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                {/* Icon */}
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: `${meta.color}15`, color: meta.color }}
                >
                  <meta.icon size={13} />
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 truncate">{item.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Avatar name={item.user?.nombre || ''} area={item.user?.area_investigacion} size="xs" />
                    <span className="text-[11px] text-white/30">{item.user?.nombre}</span>
                    {item.sub && <span className="text-[11px] text-white/20">· {item.sub}</span>}
                  </div>
                </div>
                {/* Time */}
                <span className="text-[11px] text-white/20 shrink-0">{timeAgo(item.date)}</span>
              </motion.div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
