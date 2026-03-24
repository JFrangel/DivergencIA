import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiGithub, FiLinkedin, FiGlobe, FiExternalLink, FiFolder, FiActivity, FiAward, FiArrowLeft, FiLock, FiZap, FiMessageSquare } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { useChannels } from '../../hooks/useChat'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import DynamicBanner from '../../components/profile/DynamicBanner'
import SkillTree from '../../components/profile/SkillTree'
import AchievementGrid from '../../components/profile/AchievementGrid'
import ActivityCalendar from '../../components/profile/ActivityCalendar'
import { timeAgo } from '../../lib/utils'

/* ── Area colors ─────────────────────────────────────────────────────── */
const AREA_COLOR = { ML: '#FC651F', NLP: '#8B5CF6', Vision: '#00D1FF', Datos: '#22c55e', General: '#F59E0B', default: '#6b7280' }
const ac = a => AREA_COLOR[a] || AREA_COLOR.default

/* ── Node groups ─────────────────────────────────────────────────────── */
const NODE_GROUPS = {
  fundadores:      { label: 'Fundadores',             color: '#F59E0B', icon: '👑' },
  investigadores:  { label: 'Investigadores Activos',  color: '#FC651F', icon: '🔬' },
  egresados:       { label: 'Egresados',               color: '#8B5CF6', icon: '🎓' },
  colaboradores:   { label: 'Colaboradores',           color: '#00D1FF', icon: '🤝' },
  nuevos:          { label: 'Nuevos Miembros',         color: '#22c55e', icon: '🌱' },
  visitantes:      { label: 'Visitantes',              color: '#6b7280', icon: '👁️' },
}

function getNodeGroup(member) {
  if (member.grupo_nodo) return member.grupo_nodo
  if (member.es_fundador) return 'fundadores'
  if (member.rol === 'egresado') return 'egresados'
  if (member.rol === 'colaborador') return 'colaboradores'
  if (member.rol === 'invitado') return 'visitantes'
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
  if (member.fecha_registro && new Date(member.fecha_registro) > thirtyDaysAgo) return 'nuevos'
  return 'investigadores'
}

/* ── Social link helper ──────────────────────────────────────────────── */
const SOCIAL_ICONS = { github: FiGithub, linkedin: FiLinkedin, website: FiGlobe }

function SocialLink({ type, url }) {
  const Icon = SOCIAL_ICONS[type]
  if (!Icon || !url) return null
  const href = url.startsWith('http') ? url : `https://${url}`
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
    >
      <Icon size={14} />
      <span className="max-w-[140px] truncate">{url.replace(/^https?:\/\/(www\.)?/, '')}</span>
      <FiExternalLink size={10} className="shrink-0 opacity-50" />
    </a>
  )
}

/* ── Node group badge ────────────────────────────────────────────────── */
function NodeGroupBadge({ groupKey }) {
  const group = NODE_GROUPS[groupKey]
  if (!group) return null
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border"
      style={{
        color: group.color,
        background: `${group.color}10`,
        borderColor: `${group.color}25`,
      }}
    >
      <span>{group.icon}</span>
      {group.label}
    </span>
  )
}

/* ── Stat pill ───────────────────────────────────────────────────────── */
function StatPill({ label, value, color }) {
  return (
    <div className="flex flex-col items-center gap-0.5 px-4 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <p className="text-2xl font-bold font-title" style={{ color }}>{value}</p>
      <p className="text-[10px] text-white/30 uppercase tracking-wider">{label}</p>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════════════════
   Main component
   ════════════════════════════════════════════════════════════════════════ */
export default function MemberProfile() {
  const { id } = useParams()
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const { getOrCreateNodeChannel } = useChannels()
  const [member, setMember] = useState(null)
  const [stats, setStats] = useState({ proyectos: 0, avances: 0, ideas: 0 })
  const [proyectos, setProyectos] = useState([])
  const [avances, setAvances] = useState([])
  const [nodosData, setNodosData] = useState([])
  const [groupNodos, setGroupNodos] = useState([])
  const [loading, setLoading] = useState(true)

  const GROUP_META = {
    fundadores:     { label: 'Fundadores',            color: '#F59E0B', icon: '👑' },
    investigadores: { label: 'Investigadores Activos', color: '#FC651F', icon: '🔬' },
    egresados:      { label: 'Egresados',              color: '#8B5CF6', icon: '🎓' },
    colaboradores:  { label: 'Colaboradores',          color: '#00D1FF', icon: '🤝' },
    nuevos:         { label: 'Nuevos Miembros',        color: '#22c55e', icon: '🌱' },
    visitantes:     { label: 'Visitantes',             color: '#6b7280', icon: '👁️' },
  }

  useEffect(() => {
    async function load() {
      const [
        { data: m },
        { count: numProy },
        { count: numAv },
        { count: numIdeas },
        { data: proy },
        { data: avList },
        { data: nodosList },
        { data: groupList },
      ] = await Promise.all([
        supabase.from('usuarios').select('*').eq('id', id).single(),
        supabase.from('miembros_proyecto').select('*', { count: 'exact', head: true }).eq('usuario_id', id),
        supabase.from('avances').select('*', { count: 'exact', head: true }).eq('autor_id', id),
        supabase.from('ideas').select('*', { count: 'exact', head: true }).eq('autor_id', id),
        supabase.from('miembros_proyecto').select('proyecto:proyectos(id, titulo, estado)').eq('usuario_id', id).eq('activo', true).limit(6),
        supabase.from('avances').select('titulo, fecha, proyecto:proyectos(titulo)').eq('autor_id', id).order('fecha', { ascending: false }).limit(5),
        supabase.from('nodo_miembros').select('rol, nodo:nodos(id, nombre, descripcion, color, icono)').eq('usuario_id', id),
        supabase.from('canal_miembros')
          .select('canal:canales(id, nombre, nodo_tipo)')
          .eq('usuario_id', id),
      ])
      setMember(m)
      setStats({ proyectos: numProy || 0, avances: numAv || 0, ideas: numIdeas || 0 })
      setProyectos(proy?.map(p => p.proyecto).filter(Boolean) || [])
      setAvances(avList || [])
      setNodosData(nodosList?.map(n => ({ ...n.nodo, rol: n.rol })).filter(Boolean) || [])
      // Filter group canales and enrich with metadata
      const groups = (groupList || [])
        .map(cm => cm.canal)
        .filter(c => c && c.nodo_tipo === 'grupo')
        .map(c => ({ ...c, ...(GROUP_META[c.nombre] || { label: c.nombre, color: '#6b7280', icon: '👥' }) }))
      setGroupNodos(groups)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>
  if (!member) return <div className="text-center py-20 text-white/30">Perfil no encontrado</div>

  // Privacy check — read from DB column (works cross-browser, cross-user)
  const isOwnProfile = user?.id === id
  const isPrivate = member.perfil_privado === true
  if (isPrivate && !isOwnProfile && !isAdmin) {
    return (
      <div className="max-w-4xl space-y-6">
        <Link to="/members" className="inline-flex items-center gap-1.5 text-white/30 hover:text-white text-sm transition-colors">
          <FiArrowLeft size={14} /> Investigadores
        </Link>
        <Card className="flex flex-col items-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center bg-white/[0.04] text-white/20">
            <FiLock size={28} />
          </div>
          <div>
            <p className="text-white/50 font-semibold text-lg">Perfil privado</p>
            <p className="text-white/25 text-sm mt-1">Este investigador ha configurado su perfil como privado.</p>
          </div>
        </Card>
      </div>
    )
  }

  const color = ac(member.area_investigacion)
  const nodeGroup = getNodeGroup(member)
  // Fallback to localStorage for users who set banner before DB column existed
  const dynamicBannerType = member.dynamic_banner
    || localStorage.getItem(`banner_type_${member.id}`)
    || null

  return (
    <div className="max-w-4xl space-y-6">
      {/* Back link */}
      <Link to="/members" className="inline-flex items-center gap-1.5 text-white/30 hover:text-white text-sm transition-colors">
        <FiArrowLeft size={14} /> Investigadores
      </Link>

      {/* ── Hero section ─────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card variant="clear" padding={false} className="overflow-hidden">
          {/* Banner */}
          <div className="relative h-32 sm:h-40">
            {dynamicBannerType ? (
              <DynamicBanner type={dynamicBannerType} height={160} className="w-full h-full" interactive={false} />
            ) : member.banner_url ? (
              <img
                src={member.banner_url}
                alt="Banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-full h-full"
                style={{
                  background: `linear-gradient(135deg, ${color}40, var(--c-bg) 50%, ${color}20)`,
                }}
              />
            )}
            {/* Dark overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/30" />
          </div>

          {/* Content below banner */}
          <div className="relative px-5 pb-5">
            <div className="flex flex-col sm:flex-row gap-5">
              {/* Avatar overlapping banner */}
              <motion.div
                className="-mt-14 sm:-mt-16 relative shrink-0"
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <Avatar
                  name={member.nombre}
                  src={member.foto_url}
                  area={member.area_investigacion}
                  size="2xl"
                  isFounded={!!member.es_fundador}
                  className="ring-4 ring-[var(--c-bg)]"
                />
                {member.es_fundador && (
                  <motion.div
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center border-2"
                    style={{
                      background: '#F59E0B',
                      borderColor: 'var(--c-bg)',
                    }}
                    animate={{ boxShadow: ['0 0 0 rgba(245,158,11,0)', '0 0 12px rgba(245,158,11,0.6)', '0 0 0 rgba(245,158,11,0)'] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <FiAward size={12} className="text-[#060304]" />
                  </motion.div>
                )}
              </motion.div>

              {/* Info + stats */}
              <div className="flex-1 min-w-0 flex flex-col sm:flex-row gap-4 pt-1 sm:pt-2">
                {/* Left: Name, meta, badges, bio, social */}
                <motion.div
                  className="flex-1 min-w-0"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.2 }}
                >
                  <h1 className="text-xl sm:text-2xl font-bold font-title text-white/90 leading-tight">
                    {member.nombre}
                  </h1>

                  {(member.carrera || member.semestre) && (
                    <p className="text-sm text-white/40 mt-0.5">
                      {member.carrera}{member.carrera && member.semestre ? ' · ' : ''}{member.semestre && `${member.semestre}\u00B0 semestre`}
                    </p>
                  )}

                  {/* Badges row */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-3">
                    {member.area_investigacion && <Badge area={member.area_investigacion} dot />}
                    {member.es_fundador && <Badge preset="fundador" dot />}
                    {member.rol && member.rol !== 'fundador' && <Badge rol={member.rol} dot />}
                    <NodeGroupBadge groupKey={nodeGroup} />
                  </div>

                  {/* Bio */}
                  {member.bio && (
                    <p className="mt-3 text-sm text-white/50 leading-relaxed max-w-xl">
                      {member.bio}
                    </p>
                  )}

                  {/* Social links */}
                  {(member.github_url || member.linkedin_url || member.website_url) && (
                    <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-white/[0.06]">
                      <SocialLink type="github" url={member.github_url} />
                      <SocialLink type="linkedin" url={member.linkedin_url} />
                      <SocialLink type="website" url={member.website_url} />
                    </div>
                  )}
                </motion.div>

                {/* Right: Stats */}
                <motion.div
                  className="flex sm:flex-col gap-3 shrink-0"
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <StatPill label="Proyectos" value={stats.proyectos} color="var(--c-primary)" />
                  <StatPill label="Avances" value={stats.avances} color="var(--c-secondary)" />
                  <StatPill label="Ideas" value={stats.ideas} color="var(--c-accent)" />
                </motion.div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* ── Content grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Projects */}
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
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--c-primary)', opacity: 0.6 }} />
                    <p className="text-sm text-white/60 group-hover:text-white transition-colors truncate flex-1">{p.titulo}</p>
                    <Badge estado={p.estado} size="xs" />
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Recent advances */}
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
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: 'color-mix(in srgb, var(--c-primary) 10%, transparent)', color: 'var(--c-primary)' }}
                    >
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

        {/* Nodos de Investigación + Grupos */}
        {(nodosData.length > 0 || groupNodos.length > 0) && (
          <motion.div className="md:col-span-2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
            <Card>
              <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4 flex items-center gap-2">
                <FiZap size={13} style={{ color: '#FC651F' }} /> Nodos & Grupos
              </h3>
              <div className="space-y-4">
                {nodosData.length > 0 && (
                  <div>
                    <p className="text-[10px] text-white/25 uppercase tracking-wider mb-2">🔬 Investigación</p>
                    <div className="flex flex-wrap gap-2">
                      {nodosData.map(n => {
                        const nodeColor = n.color || '#8B5CF6'
                        return (
                          <div
                            key={n.id}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all"
                            style={{ borderColor: `${nodeColor}30`, background: `${nodeColor}08` }}
                          >
                            <span className="text-base leading-none">{n.icono || '🔬'}</span>
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate" style={{ color: nodeColor }}>{n.nombre}</p>
                              {n.rol && <p className="text-[10px] text-white/25 capitalize">{n.rol}</p>}
                            </div>
                            {user && (
                              <button
                                onClick={async () => {
                                  const canal = await getOrCreateNodeChannel(n.id, 'investigacion', n.nombre, [])
                                  if (canal) navigate(`/chat?canal=${canal.id}`)
                                }}
                                className="ml-1 p-1 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-all"
                                title="Ir al chat del nodo"
                              >
                                <FiMessageSquare size={11} />
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                {groupNodos.length > 0 && (
                  <div>
                    <p className="text-[10px] text-white/25 uppercase tracking-wider mb-2">👥 Grupos</p>
                    <div className="flex flex-wrap gap-2">
                      {groupNodos.map(g => (
                        <div
                          key={g.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all"
                          style={{ borderColor: `${g.color}30`, background: `${g.color}08` }}
                        >
                          <span className="text-base leading-none">{g.icon}</span>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: g.color }}>{g.label}</p>
                          </div>
                          {user && (
                            <button
                              onClick={() => navigate(`/chat?canal=${g.id}`)}
                              className="ml-1 p-1 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-all"
                              title="Ir al canal del grupo"
                            >
                              <FiMessageSquare size={11} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}

        {/* Achievements — always shown */}
        <motion.div className="md:col-span-2" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <AchievementGrid userId={id} />
        </motion.div>

        {/* Activity Calendar — hidden if owner disabled showActivity */}
        {(isOwnProfile || member.mostrar_actividad !== false) && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card>
              <ActivityCalendar userId={id} />
            </Card>
          </motion.div>
        )}

        {/* Skill Tree — always shown */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card>
            <SkillTree habilidades={member.habilidades || []} learningProgress={{}} projects={proyectos} />
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
