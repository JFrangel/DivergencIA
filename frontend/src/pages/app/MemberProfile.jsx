import { useEffect, useState, lazy, Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiGithub, FiLinkedin, FiFolder, FiActivity, FiStar, FiAward, FiArrowLeft } from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import SkillTree from '../../components/profile/SkillTree'
import ActivityCalendar from '../../components/profile/ActivityCalendar'
import { timeAgo } from '../../lib/utils'

const Achievements3D = lazy(() => import('../../components/profile/Achievements3D'))

const AREA_COLOR = { ML: '#FC651F', NLP: '#8B5CF6', Vision: '#00D1FF', Datos: '#22c55e', General: '#F59E0B', default: '#6b7280' }
const ac = a => AREA_COLOR[a] || AREA_COLOR.default

export default function MemberProfile() {
  const { id } = useParams()
  const [member, setMember] = useState(null)
  const [stats, setStats] = useState({ proyectos: 0, avances: 0, ideas: 0, logros: [] })
  const [proyectos, setProyectos] = useState([])
  const [avances, setAvances] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [
        { data: m },
        { count: numProy },
        { count: numAv },
        { count: numIdeas },
        { data: logros },
        { data: proy },
        { data: avList },
      ] = await Promise.all([
        supabase.from('usuarios').select('*').eq('id', id).single(),
        supabase.from('miembros_proyecto').select('*', { count: 'exact', head: true }).eq('usuario_id', id),
        supabase.from('avances').select('*', { count: 'exact', head: true }).eq('autor_id', id),
        supabase.from('ideas').select('*', { count: 'exact', head: true }).eq('autor_id', id),
        supabase.from('logros').select('*').eq('usuario_id', id).order('fecha_obtenido', { ascending: false }),
        supabase.from('miembros_proyecto').select('proyecto:proyectos(id, titulo, estado)').eq('usuario_id', id).eq('activo', true).limit(6),
        supabase.from('avances').select('titulo, fecha, proyecto:proyectos(titulo)').eq('autor_id', id).order('fecha', { ascending: false }).limit(5),
      ])
      setMember(m)
      setStats({ proyectos: numProy || 0, avances: numAv || 0, ideas: numIdeas || 0, logros: logros || [] })
      setProyectos(proy?.map(p => p.proyecto).filter(Boolean) || [])
      setAvances(avList || [])
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (!member) return <div className="text-center py-20 text-white/30">Perfil no encontrado</div>

  const color = ac(member.area_investigacion)

  return (
    <div className="max-w-4xl space-y-6">
      <Link to="/members" className="inline-flex items-center gap-1.5 text-white/30 hover:text-white text-sm transition-colors">
        <FiArrowLeft size={14} /> Investigadores
      </Link>

      {/* Hero card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-32 opacity-10 pointer-events-none blur-3xl rounded-full" style={{ background: color }} />

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative">
              <Avatar name={member.nombre} area={member.area_investigacion} size="2xl" isFounded={member.es_fundador} />
              {member.es_fundador && (
                <motion.div
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[#F59E0B] flex items-center justify-center border-2 border-[#060304]"
                  animate={{ boxShadow: ['0 0 0 rgba(245,158,11,0)', '0 0 10px rgba(245,158,11,0.6)', '0 0 0 rgba(245,158,11,0)'] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  <FiAward size={12} className="text-[#060304]" />
                </motion.div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold font-title text-white">{member.nombre}</h1>
              <p className="text-white/40 text-sm mt-1">{member.carrera || 'Investigador'}</p>
              {member.semestre && <p className="text-white/25 text-xs mt-0.5">Semestre {member.semestre}</p>}
              <div className="flex flex-wrap gap-2 mt-3 justify-center sm:justify-start">
                {member.area_investigacion && <Badge area={member.area_investigacion} />}
                {member.es_fundador && <Badge variant="founder" />}
                <Badge rol={member.rol} />
              </div>
              {member.bio && (
                <p className="text-white/50 text-sm mt-4 leading-relaxed max-w-md">{member.bio}</p>
              )}
              <div className="flex items-center gap-3 mt-4 justify-center sm:justify-start">
                {member.github_url && (
                  <a href={member.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white transition-colors">
                    <FiGithub size={13} /> GitHub
                  </a>
                )}
                {member.linkedin_url && (
                  <a href={member.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-white/30 hover:text-[#00D1FF] transition-colors">
                    <FiLinkedin size={13} /> LinkedIn
                  </a>
                )}
              </div>
            </div>

            <div className="flex sm:flex-col gap-4 sm:gap-3 text-center">
              {[
                { label: 'Proyectos', value: stats.proyectos, color: '#FC651F' },
                { label: 'Avances', value: stats.avances, color: '#8B5CF6' },
                { label: 'Ideas', value: stats.ideas, color: '#00D1FF' },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-2xl font-bold font-title" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] text-white/30 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FiFolder size={13} /> Proyectos
            </h3>
            {proyectos.length === 0 ? (
              <p className="text-white/20 text-sm">Sin proyectos</p>
            ) : (
              <div className="space-y-3">
                {proyectos.map(p => (
                  <Link key={p.id} to={`/projects/${p.id}`} className="flex items-center gap-3 group">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-[#FC651F]/60" />
                    <p className="text-sm text-white/60 group-hover:text-white transition-colors truncate flex-1">{p.titulo}</p>
                    <Badge estado={p.estado} size="xs" />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FiActivity size={13} /> Avances recientes
            </h3>
            {avances.length === 0 ? (
              <p className="text-white/20 text-sm">Sin avances registrados</p>
            ) : (
              <div className="space-y-3">
                {avances.map((a, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-lg bg-[#FC651F]/10 text-[#FC651F] flex items-center justify-center shrink-0 mt-0.5">
                      <FiActivity size={11} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white/70 truncate">{a.titulo}</p>
                      <p className="text-[11px] text-white/25">{a.proyecto?.titulo} · {timeAgo(a.fecha)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {stats.logros.length > 0 && (
          <motion.div className="md:col-span-2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FiAward size={13} /> Logros
              </h3>
              <Suspense fallback={<div className="h-[200px] rounded-2xl bg-white/[0.02] animate-pulse" />}>
                <Achievements3D logros={stats.logros} />
              </Suspense>
            </Card>
          </motion.div>
        )}

        {/* Activity Calendar */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <Card>
            <ActivityCalendar userId={id} />
          </Card>
        </motion.div>

        {/* Skill Tree */}
        {member.habilidades?.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <SkillTree habilidades={member.habilidades} />
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  )
}
