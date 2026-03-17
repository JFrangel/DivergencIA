import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { FiStar, FiArrowUpRight, FiTrendingUp } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Card from '../ui/Card'

export default function IdeasWidget() {
  const [ideas, setIdeas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('ideas')
      .select('id, titulo, votos_favor, votos_contra, autor:usuarios!ideas_autor_id_fkey(nombre), fecha_publicacion')
      .order('votos_favor', { ascending: false })
      .limit(5)
      .then(({ data }) => {
        setIdeas(data || [])
        setLoading(false)
      })
  }, [])

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#00D1FF]/10 flex items-center justify-center">
            <FiStar size={13} className="text-[#00D1FF]" />
          </div>
          <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Ideas Trending</h3>
        </div>
        <Link to="/ideas" className="text-[11px] text-[#FC651F] hover:text-[#FC651F]/80 flex items-center gap-0.5">
          Ver todas <FiArrowUpRight size={10} />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 rounded-lg bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      ) : ideas.length === 0 ? (
        <p className="text-white/20 text-sm text-center py-4">No hay ideas aún</p>
      ) : (
        <div className="space-y-2">
          {ideas.map((idea, i) => {
            const score = (idea.votos_favor || 0) - (idea.votos_contra || 0)
            return (
              <motion.div
                key={idea.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.04] transition-colors group"
              >
                <div className="flex items-center gap-1 shrink-0 w-10">
                  <FiTrendingUp size={10} className="text-[#00D1FF]/50" />
                  <span className="text-[11px] font-semibold text-[#00D1FF]/70">{score}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/70 truncate group-hover:text-white/90 transition-colors">
                    {idea.titulo}
                  </p>
                  <p className="text-[10px] text-white/20">{idea.autor?.nombre}</p>
                </div>
                <span className="text-[10px] text-white/15 shrink-0">#{i + 1}</span>
              </motion.div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
