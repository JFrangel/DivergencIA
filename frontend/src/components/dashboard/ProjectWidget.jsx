import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiFolder, FiArrowRight, FiPlus } from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import ProgressBar from '../ui/ProgressBar'
import Spinner from '../ui/Spinner'

export default function ProjectWidget() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    // Fetch projects where user is creator OR collaborator
    Promise.all([
      supabase
        .from('proyectos')
        .select('id, titulo, estado, tareas(estado)')
        .eq('creador_id', user.id)
        .neq('estado', 'finalizado')
        .neq('estado', 'cancelado'),
      supabase
        .from('miembros_proyecto')
        .select('proyecto:proyecto_id(id, titulo, estado, tareas(estado))')
        .eq('usuario_id', user.id)
        .eq('activo', true),
    ]).then(([{ data: own }, { data: member }]) => {
      const memberProjects = (member || []).map(m => m.proyecto).filter(Boolean)
      const all = [...(own || []), ...memberProjects]
      // Deduplicate by id
      const seen = new Set()
      const deduped = all.filter(p => {
        if (!p || seen.has(p.id)) return false
        seen.add(p.id)
        return p.estado !== 'finalizado' && p.estado !== 'cancelado'
      })
      deduped.sort((a, b) => 0) // preserve Supabase ordering
      setProjects(deduped.slice(0, 4))
      setLoading(false)
    })
  }, [user])

  const progress = (p) => {
    const all = p.tareas?.length || 0
    if (!all) return 0
    const done = p.tareas.filter(t => t.estado === 'completada').length
    return Math.round((done / all) * 100)
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
          <FiFolder size={14} /> Mis proyectos
        </h2>
        <Link to="/projects">
          <button className="text-xs text-white/30 hover:text-[#FC651F] transition-colors flex items-center gap-1">
            Ver todos <FiArrowRight size={11} />
          </button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Spinner /></div>
      ) : projects.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-white/20 text-sm mb-3">Sin proyectos activos</p>
          <Link to="/projects">
            <button className="text-xs text-[#FC651F] flex items-center gap-1 mx-auto hover:opacity-80">
              <FiPlus size={12} /> Crear proyecto
            </button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link to={`/projects/${p.id}`}>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.04] transition-colors group">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-[#FC651F]/10 text-[#FC651F]">
                    <FiFolder size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white/80 truncate group-hover:text-white transition-colors">{p.titulo}</p>
                    <ProgressBar value={progress(p)} max={100} className="mt-1.5" height={3} />
                  </div>
                  <Badge estado={p.estado} size="xs" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </Card>
  )
}
