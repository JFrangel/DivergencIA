import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import {
  FiSave, FiGithub, FiLinkedin, FiAward,
  FiCalendar, FiX, FiPlus, FiGlobe, FiBriefcase, FiZap, FiMessageSquare,
} from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useChannels } from '../../hooks/useChat'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Textarea from '../../components/ui/Textarea'
import Select from '../../components/ui/Select'
import ProfileHero from '../../components/profile/ProfileHero'
import StatsPanel from '../../components/profile/StatsPanel'
import SkillTree from '../../components/profile/SkillTree'
import ActivityCalendar from '../../components/profile/ActivityCalendar'
import { useAchievements } from '../../hooks/useAchievements'
import AchievementGrid from '../../components/profile/AchievementGrid'
import { toast } from 'sonner'

const GROUP_META = {
  fundadores:     { label: 'Fundadores',            color: '#F59E0B', icon: '👑' },
  investigadores: { label: 'Investigadores Activos', color: '#FC651F', icon: '🔬' },
  egresados:      { label: 'Egresados',              color: '#8B5CF6', icon: '🎓' },
  colaboradores:  { label: 'Colaboradores',          color: '#00D1FF', icon: '🤝' },
  nuevos:         { label: 'Nuevos Miembros',        color: '#22c55e', icon: '🌱' },
  visitantes:     { label: 'Visitantes',             color: '#6b7280', icon: '👁️' },
}

const AREAS = [
  { value: '', label: 'Sin area definida' },
  { value: 'ML', label: 'Machine Learning' },
  { value: 'NLP', label: 'Procesamiento de Lenguaje' },
  { value: 'Vision', label: 'Computer Vision' },
  { value: 'Datos', label: 'Datos & Analytics' },
  { value: 'General', label: 'General / Otro' },
]

export default function MyProfile() {
  const { user, profile, updateProfile, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const { getOrCreateNodeChannel } = useChannels()
  const [editing, setEditing] = useState(false)
  const [newSkill, setNewSkill] = useState('')
  const [skills, setSkills] = useState([])
  const [myNodos, setMyNodos] = useState([])
  const [myGroups, setMyGroups] = useState([])
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm()
  const { logros, getMeta } = useAchievements()

  useEffect(() => {
    if (profile) {
      reset(profile)
      setSkills(profile.habilidades || [])
    }
  }, [profile, reset])

  useEffect(() => {
    if (!user) return
    async function loadNodos() {
      const [{ data: nodosList }, { data: groupList }] = await Promise.all([
        supabase.from('nodo_miembros').select('rol, nodo:nodos(id, nombre, color, icono)').eq('usuario_id', user.id),
        supabase.from('canal_miembros').select('canal:canales(id, nombre, nodo_tipo)').eq('usuario_id', user.id),
      ])
      setMyNodos(nodosList?.map(n => ({ ...n.nodo, rol: n.rol })).filter(Boolean) || [])
      const groups = (groupList || [])
        .map(cm => cm.canal)
        .filter(c => c && c.nodo_tipo === 'grupo')
        .map(c => ({ ...c, ...(GROUP_META[c.nombre] || { label: c.nombre, color: '#6b7280', icon: '👥' }) }))
      setMyGroups(groups)
    }
    loadNodos()
  }, [user])

  const onSubmit = async (data) => {
    const { error } = await updateProfile({
      nombre: data.nombre,
      bio: data.bio,
      titulo: data.titulo,
      carrera: data.carrera,
      semestre: data.semestre,
      area_investigacion: data.area_investigacion,
      github_url: data.github_url,
      linkedin_url: data.linkedin_url,
      website_url: data.website_url,
      habilidades: skills,
    })
    if (error) {
      toast.error('Error al guardar cambios')
    } else {
      toast.success('Perfil actualizado')
      setEditing(false)
    }
  }

  const handleImageUploaded = async (field, error, publicUrl) => {
    if (error) { toast.error(error); return }
    // dynamic_banner: publicUrl is the banner type string, save it to DB
    if (field === 'dynamic_banner' && profile?.id) {
      await supabase.from('usuarios')
        .update({ dynamic_banner: publicUrl, banner_url: null })
        .eq('id', profile.id)
    }
    toast.success(field === 'foto_url' ? 'Foto actualizada' : 'Banner actualizado')
    refreshProfile()
  }

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      setSkills(s => [...s, newSkill.trim()])
      setNewSkill('')
    }
  }

  const removeSkill = (skill) => setSkills(s => s.filter(sk => sk !== skill))

  if (!profile) return null

  return (
    <div className="max-w-4xl space-y-6">
      {/* Hero */}
      <ProfileHero
        profile={profile}
        onEdit={() => setEditing(e => !e)}
        onImageUploaded={handleImageUploaded}
      />

      {/* Stats */}
      {user && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <StatsPanel userId={user.id} />
        </motion.div>
      )}

      {/* Achievements */}
      {!editing && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <AchievementGrid userId={user?.id} />
        </motion.div>
      )}

      {/* Edit form */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Editar informacion</h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Nombre" {...register('nombre')} />
                  <Input label="Titulo" icon={<FiBriefcase size={14} />} placeholder="Ej: Director del Semillero, Investigador ML" {...register('titulo')} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Carrera" {...register('carrera')} />
                  <Input label="Semestre" type="number" min={1} max={12} {...register('semestre')} />
                </div>
                <Select label="Area de investigacion" options={AREAS} {...register('area_investigacion')} />
                <Textarea label="Bio" rows={3} placeholder="Cuentanos sobre ti..." {...register('bio')} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="GitHub URL" icon={<FiGithub size={14} />} placeholder="https://github.com/..." {...register('github_url')} />
                  <Input label="LinkedIn URL" icon={<FiLinkedin size={14} />} placeholder="https://linkedin.com/in/..." {...register('linkedin_url')} />
                </div>
                <Input label="Website" icon={<FiGlobe size={14} />} placeholder="https://tuwebsite.com" {...register('website_url')} />

                {/* Skills editor */}
                <div>
                  <label className="block text-xs text-white/40 mb-2 uppercase tracking-wider font-medium">Habilidades</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {skills.map(sk => (
                      <span key={sk} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-[var(--c-secondary)]/10 text-[var(--c-secondary)] border border-[var(--c-secondary)]/20">
                        {sk}
                        <button type="button" onClick={() => removeSkill(sk)} className="hover:text-red-500 transition-colors">
                          <FiX size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={e => setNewSkill(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }}
                      placeholder="Agregar habilidad..."
                      className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white/70 placeholder:text-white/15 outline-none focus:border-[var(--c-primary)]/30 transition-colors"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addSkill} className="gap-1">
                      <FiPlus size={11} /> Anadir
                    </Button>
                  </div>
                </div>

                <Button type="submit" variant="solid" size="sm" loading={isSubmitting} className="gap-2">
                  <FiSave size={13} /> Guardar cambios
                </Button>
              </form>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nodos & Grupos */}
      {!editing && (myNodos.length > 0 || myGroups.length > 0) && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4 flex items-center gap-2">
              <FiZap size={13} style={{ color: '#FC651F' }} /> Mis Nodos & Grupos
            </h2>
            <div className="space-y-4">
              {myNodos.length > 0 && (
                <div>
                  <p className="text-[10px] text-white/25 uppercase tracking-wider mb-2">🔬 Investigación</p>
                  <div className="flex flex-wrap gap-2">
                    {myNodos.map(n => {
                      const nodeColor = n.color || '#8B5CF6'
                      return (
                        <div key={n.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border"
                          style={{ borderColor: `${nodeColor}30`, background: `${nodeColor}08` }}>
                          <span className="text-sm leading-none">{n.icono || '🔬'}</span>
                          <p className="text-xs font-medium" style={{ color: nodeColor }}>{n.nombre}</p>
                          <button
                            onClick={async () => {
                              const canal = await getOrCreateNodeChannel(n.id, 'investigacion', n.nombre, [])
                              if (canal) navigate(`/chat?canal=${canal.id}`)
                            }}
                            className="ml-1 p-1 rounded text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-all"
                          >
                            <FiMessageSquare size={10} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {myGroups.length > 0 && (
                <div>
                  <p className="text-[10px] text-white/25 uppercase tracking-wider mb-2">👥 Grupos</p>
                  <div className="flex flex-wrap gap-2">
                    {myGroups.map(g => (
                      <div key={g.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border"
                        style={{ borderColor: `${g.color}30`, background: `${g.color}08` }}>
                        <span className="text-sm leading-none">{g.icon}</span>
                        <p className="text-xs font-medium" style={{ color: g.color }}>{g.label}</p>
                        <button
                          onClick={() => navigate(`/chat?canal=${g.id}`)}
                          className="ml-1 p-1 rounded text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-all"
                        >
                          <FiMessageSquare size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </motion.div>
      )}

      {/* Activity Calendar */}
      {!editing && user && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <FiCalendar size={15} className="text-white/40" />
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Actividad Reciente</h2>
            </div>
            <ActivityCalendar userId={user.id} />
          </Card>
        </motion.div>
      )}

      {/* Skill Tree */}
      {!editing && skills.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <SkillTree habilidades={skills} />
          </Card>
        </motion.div>
      )}
    </div>
  )
}
