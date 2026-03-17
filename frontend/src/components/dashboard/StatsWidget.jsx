import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FiFolder, FiUsers, FiStar, FiBook, FiActivity, FiTrendingUp } from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import MetricCard from '../ui/MetricCard'

export default function StatsWidget() {
  const [stats, setStats] = useState({ proyectos: 0, miembros: 0, ideas: 0, archivos: 0, avances: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('proyectos').select('*', { count: 'exact', head: true }),
      supabase.from('usuarios').select('*', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('ideas').select('*', { count: 'exact', head: true }),
      supabase.from('archivos').select('*', { count: 'exact', head: true }),
      supabase.from('avances').select('*', { count: 'exact', head: true }),
    ]).then(([{ count: p }, { count: m }, { count: i }, { count: a }, { count: av }]) => {
      setStats({ proyectos: p || 0, miembros: m || 0, ideas: i || 0, archivos: a || 0, avances: av || 0 })
      setLoading(false)
    })
  }, [])

  const cards = [
    { label: 'Proyectos', value: stats.proyectos, icon: <FiFolder />, color: 'var(--c-primary)' },
    { label: 'Investigadores', value: stats.miembros, icon: <FiUsers />, color: 'var(--c-secondary)' },
    { label: 'Ideas activas', value: stats.ideas, icon: <FiStar />, color: 'var(--c-accent)' },
    { label: 'Avances totales', value: stats.avances, icon: <FiTrendingUp />, color: '#22c55e' },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c, i) => (
        <motion.div
          key={c.label}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
        >
          <MetricCard
            label={c.label}
            value={loading ? '—' : c.value}
            icon={c.icon}
            color={c.color}
          />
        </motion.div>
      ))}
    </div>
  )
}
