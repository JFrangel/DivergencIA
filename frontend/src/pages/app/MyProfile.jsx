import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import {
  FiSave, FiGithub, FiLinkedin, FiAward,
  FiCalendar, FiX, FiPlus,
} from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
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
import { toast } from 'sonner'

const AREAS = [
  { value: '', label: 'Sin área definida' },
  { value: 'ML', label: 'Machine Learning' },
  { value: 'NLP', label: 'Procesamiento de Lenguaje' },
  { value: 'Vision', label: 'Computer Vision' },
  { value: 'Datos', label: 'Datos & Analytics' },
  { value: 'General', label: 'General / Otro' },
]

export default function MyProfile() {
  const { user, profile, updateProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [newSkill, setNewSkill] = useState('')
  const [skills, setSkills] = useState([])
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm()
  const { logros, getMeta } = useAchievements()

  useEffect(() => {
    if (profile) {
      reset(profile)
      setSkills(profile.habilidades || [])
    }
  }, [profile, reset])

  const onSubmit = async (data) => {
    const { error } = await updateProfile({ ...data, habilidades: skills })
    if (error) {
      toast.error('Error al guardar cambios')
    } else {
      toast.success('Perfil actualizado')
      setEditing(false)
    }
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
      />

      {/* Stats */}
      {user && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <StatsPanel userId={user.id} />
        </motion.div>
      )}

      {/* Achievements */}
      {logros.length > 0 && !editing && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <FiAward size={16} className="text-[#F59E0B]" />
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Logros Desbloqueados</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {logros.map(l => {
                const meta = getMeta(l.tipo)
                return (
                  <motion.div
                    key={l.id}
                    className="text-center p-3 rounded-xl border border-white/[0.06] bg-white/[0.02]"
                    whileHover={{ scale: 1.05, borderColor: meta.color + '40' }}
                  >
                    <span className="text-2xl">{meta.icon}</span>
                    <p className="text-xs font-medium mt-1" style={{ color: meta.color }}>{meta.label}</p>
                    <p className="text-[9px] text-white/20 mt-0.5">{new Date(l.fecha_obtenido).toLocaleDateString()}</p>
                  </motion.div>
                )
              })}
            </div>
          </Card>
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
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">Editar información</h2>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Nombre" {...register('nombre')} />
                  <Input label="Carrera" {...register('carrera')} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select label="Área de investigación" options={AREAS} {...register('area_investigacion')} />
                  <Input label="Semestre" type="number" min={1} max={12} {...register('semestre')} />
                </div>
                <Textarea label="Bio" rows={3} placeholder="Cuéntanos sobre ti..." {...register('bio')} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="GitHub URL" icon={<FiGithub size={14} />} placeholder="https://github.com/..." {...register('github_url')} />
                  <Input label="LinkedIn URL" icon={<FiLinkedin size={14} />} placeholder="https://linkedin.com/in/..." {...register('linkedin_url')} />
                </div>

                {/* Skills editor */}
                <div>
                  <label className="block text-xs text-white/40 mb-2 uppercase tracking-wider font-medium">Habilidades</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {skills.map(sk => (
                      <span key={sk} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-[var(--c-secondary)]/10 text-[var(--c-secondary)] border border-[var(--c-secondary)]/20">
                        {sk}
                        <button type="button" onClick={() => removeSkill(sk)} className="hover:text-[#EF4444] transition-colors">
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
                      <FiPlus size={11} /> Añadir
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
