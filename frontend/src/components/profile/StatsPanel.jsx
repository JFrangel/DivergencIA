import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FiFolder, FiZap, FiLayers, FiUploadCloud } from 'react-icons/fi'
import Card from '../ui/Card'
import { supabase } from '../../lib/supabase'

const METRICS = [
  { key: 'projects',  label: 'Proyectos',        icon: FiFolder,      color: 'var(--c-primary)' },
  { key: 'ideas',     label: 'Ideas',             icon: FiZap,         color: 'var(--c-secondary)' },
  { key: 'avances',   label: 'Avances',           icon: FiLayers,      color: 'var(--c-accent)' },
  { key: 'files',     label: 'Archivos subidos',  icon: FiUploadCloud, color: '#22c55e' },
]

function AnimatedNumber({ value, color, delay = 0 }) {
  return (
    <motion.span
      className="text-3xl font-bold font-title"
      style={{ color }}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
    >
      {value}
    </motion.span>
  )
}

export default function StatsPanel({ userId }) {
  const [stats, setStats] = useState({ projects: 0, ideas: 0, avances: 0, files: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    const fetchStats = async () => {
      setLoading(true)

      const [
        { count: projectCount },
        { count: ideaCount },
        { count: avanceCount },
        { count: fileCount },
      ] = await Promise.all([
        supabase
          .from('miembros_proyecto')
          .select('*', { count: 'exact', head: true })
          .eq('usuario_id', userId),
        supabase
          .from('ideas')
          .select('*', { count: 'exact', head: true })
          .eq('autor_id', userId),
        supabase
          .from('avances')
          .select('*', { count: 'exact', head: true })
          .eq('autor_id', userId),
        supabase
          .from('archivos')
          .select('*', { count: 'exact', head: true })
          .eq('subido_por', userId),
      ])

      setStats({
        projects: projectCount ?? 0,
        ideas:    ideaCount ?? 0,
        avances:  avanceCount ?? 0,
        files:    fileCount ?? 0,
      })
      setLoading(false)
    }

    fetchStats()
  }, [userId])

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {METRICS.map((metric, i) => {
        const Icon = metric.icon
        const value = stats[metric.key]

        return (
          <Card key={metric.key} className="shimmer" hover>
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-2 truncate">
                  {metric.label}
                </p>
                {loading ? (
                  <div className="h-9 w-12 rounded-md bg-white/[0.04] animate-pulse" />
                ) : (
                  <AnimatedNumber value={value} color={metric.color} delay={i * 0.1} />
                )}
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg"
                style={{ background: `color-mix(in srgb, ${metric.color} 12%, transparent)`, color: metric.color }}
              >
                <Icon size={18} />
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
