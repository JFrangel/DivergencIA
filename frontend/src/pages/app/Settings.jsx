import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  FiUser, FiLock, FiBell, FiMonitor, FiShield, FiSave,
  FiMail, FiGlobe, FiEye, FiEyeOff, FiCheck, FiAlertTriangle,
  FiTrash2, FiDownload, FiToggleLeft, FiToggleRight,
} from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useTheme, THEMES } from '../../context/ThemeContext'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { toast } from 'sonner'

const TABS = [
  { id: 'account',       label: 'Cuenta',          icon: FiUser },
  { id: 'security',      label: 'Seguridad',       icon: FiLock },
  { id: 'notifications', label: 'Notificaciones',  icon: FiBell },
  { id: 'appearance',    label: 'Apariencia',      icon: FiMonitor },
  { id: 'privacy',       label: 'Privacidad',      icon: FiShield },
  { id: 'data',          label: 'Datos',            icon: FiDownload },
]

function Toggle({ enabled, onToggle, label, desc }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0">
      <div>
        <p className="text-sm text-white/80">{label}</p>
        {desc && <p className="text-xs text-white/30 mt-0.5">{desc}</p>}
      </div>
      <button onClick={onToggle} className="text-white/60 hover:text-white transition-colors">
        {enabled
          ? <FiToggleRight size={24} className="text-[var(--c-primary)]" />
          : <FiToggleLeft size={24} />
        }
      </button>
    </div>
  )
}

export default function Settings() {
  const { user, profile, updateProfile, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const [tab, setTab] = useState('account')

  // Account form
  const [nombre, setNombre] = useState('')
  const [correo, setCorreo] = useState('')
  const [carrera, setCarrera] = useState('')
  const [semestre, setSemestre] = useState('')
  const [saving, setSaving] = useState(false)

  // Security
  const [oldPass, setOldPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [changingPass, setChangingPass] = useState(false)

  // Notification prefs (local storage)
  const [notifPrefs, setNotifPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('divergencia_notif_prefs') || '{}') } catch { return {} }
  })

  // Appearance prefs — reactive state backed by localStorage
  const [reduceMotion, setReduceMotion] = useState(() => localStorage.getItem('reduce_motion') === 'true')
  const [soundsEnabled, setSoundsEnabled] = useState(() => localStorage.getItem('sounds_enabled') !== 'false')

  // Privacy prefs — synced to Supabase usuarios table
  const [privacyPrefs, setPrivacyPrefs] = useState({
    publicProfile: true,
    showEmail: false,
    showActivity: true,
    showInGraph: true,
    atheniaMemory: true,
  })

  useEffect(() => {
    if (profile) {
      setNombre(profile.nombre || '')
      setCorreo(profile.correo || '')
      setCarrera(profile.carrera || '')
      setSemestre(profile.semestre?.toString() || '')
      // Load privacy prefs from DB columns
      setPrivacyPrefs({
        publicProfile: profile.perfil_privado !== true,
        showEmail: profile.mostrar_correo === true,
        showActivity: profile.mostrar_actividad !== false,
        showInGraph: profile.mostrar_en_grafo !== false,
        atheniaMemory: profile.athenia_memory !== false,
      })
    }
  }, [profile])

  const NOTIF_LABELS = {
    comments: 'Nuevos comentarios',
    votes: 'Votos en ideas',
    advances: 'Nuevos avances',
    tasks: 'Asignación de tareas',
    achievements: 'Logros desbloqueados',
    joinRequests: 'Solicitudes de ingreso',
    weeklyDigest: 'Resumen semanal',
  }

  const PRIVACY_LABELS = {
    publicProfile: 'Perfil público',
    showEmail: 'Mostrar correo',
    showActivity: 'Mostrar actividad',
    showInGraph: 'Aparecer en el Universo',
    atheniaMemory: 'Memoria ATHENIA',
  }

  const saveNotifPrefs = (key, val) => {
    const next = { ...notifPrefs, [key]: val }
    setNotifPrefs(next)
    localStorage.setItem('divergencia_notif_prefs', JSON.stringify(next))
    const label = NOTIF_LABELS[key] || key
    toast(val ? `${label} activado` : `${label} desactivado`, {
      icon: val ? '🔔' : '🔕',
    })
  }

  const savePrivacyPrefs = async (key, val) => {
    const next = { ...privacyPrefs, [key]: val }
    setPrivacyPrefs(next)
    const dbMap = {
      publicProfile: { perfil_privado: !val },
      showEmail:     { mostrar_correo: val },
      showActivity:  { mostrar_actividad: val },
      showInGraph:   { mostrar_en_grafo: val },
      atheniaMemory: { athenia_memory: val },
    }
    if (dbMap[key] && user) {
      await supabase.from('usuarios').update(dbMap[key]).eq('id', user.id)
    }
    const label = PRIVACY_LABELS[key] || key
    toast(val ? `${label} activado` : `${label} desactivado`, {
      icon: val ? '✅' : '🚫',
    })
  }

  const handleSaveAccount = async () => {
    setSaving(true)
    try {
      // If email changed, update via Supabase Auth (sends verification email)
      if (correo && correo !== (profile?.correo || '')) {
        const { error: emailError } = await supabase.auth.updateUser({ email: correo })
        if (emailError) {
          toast.error('Error al cambiar correo: ' + emailError.message)
          setSaving(false)
          return
        }
        toast.info('Se envió un enlace de verificación al nuevo correo')
      }
      const { error } = await updateProfile({
        nombre,
        carrera,
        semestre: semestre ? parseInt(semestre) : null,
      })
      if (error) toast.error('Error al guardar')
      else toast.success('Cuenta actualizada')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (newPass !== confirmPass) { toast.error('Las contraseñas no coinciden'); return }
    if (newPass.length < 6) { toast.error('Mínimo 6 caracteres'); return }
    setChangingPass(true)
    const { error } = await supabase.auth.updateUser({ password: newPass })
    setChangingPass(false)
    if (error) toast.error('Error al cambiar contraseña')
    else {
      toast.success('Contraseña actualizada')
      setOldPass(''); setNewPass(''); setConfirmPass('')
    }
  }

  const handleExportData = async () => {
    const { data: userData } = await supabase.from('usuarios').select('*').eq('id', user.id).single()
    const { data: projects } = await supabase.from('miembros_proyecto').select('*, proyecto:proyectos(*)').eq('usuario_id', user.id)
    const { data: ideas } = await supabase.from('ideas').select('*').eq('autor_id', user.id)
    const { data: avances } = await supabase.from('avances').select('*').eq('autor_id', user.id)

    const exportData = { perfil: userData, proyectos: projects, ideas, avances, exportedAt: new Date().toISOString() }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `divergencia-data-${Date.now()}.json`; a.click()
    URL.revokeObjectURL(url)
    toast.success('Datos exportados')
  }

  const handleDeleteAccount = async () => {
    if (!window.confirm('¿Estás seguro? Esta acción es irreversible y eliminará todos tus datos.')) return
    if (!window.confirm('ÚLTIMA OPORTUNIDAD: ¿Realmente quieres eliminar tu cuenta?')) return
    // Soft delete - deactivate
    await updateProfile({ activo: false })
    await signOut()
    toast.success('Cuenta desactivada')
  }

  return (
    <div className="max-w-4xl space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold font-title text-white">Configuración</h1>
        <p className="text-sm text-white/40 mt-1">Administra tu cuenta, seguridad y preferencias</p>
      </motion.div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar tabs */}
        <motion.div
          className="md:w-56 shrink-0"
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="p-2">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  tab === t.id
                    ? 'bg-[var(--c-primary)]/15 text-[var(--c-primary)]'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <t.icon size={15} />
                {t.label}
              </button>
            ))}
          </Card>
        </motion.div>

        {/* Content */}
        <motion.div
          className="flex-1 min-w-0"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          key={tab}
        >
          {/* ─── ACCOUNT ─── */}
          {tab === 'account' && (
            <Card>
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-5">Información de cuenta</h2>
              <div className="space-y-4">
                <Input label="Nombre completo" value={nombre} onChange={e => setNombre(e.target.value)} icon={<FiUser size={14} />} />
                <div className="space-y-1">
                  <Input label="Correo electrónico" value={correo} onChange={e => setCorreo(e.target.value)} icon={<FiMail size={14} />} />
                  {correo !== (profile?.correo || '') && (
                    <p className="text-[11px] text-[var(--c-accent)]">
                      Se enviará un enlace de verificación al nuevo correo para confirmar el cambio.
                    </p>
                  )}
                  {correo === (profile?.correo || '') && (
                    <p className="text-[10px] text-white/20">
                      Al cambiar el correo, recibirás un email de verificación en la nueva dirección.
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Carrera" value={carrera} onChange={e => setCarrera(e.target.value)} />
                  <Input label="Semestre" type="number" min={1} max={12} value={semestre} onChange={e => setSemestre(e.target.value)} />
                </div>
                <div className="pt-2">
                  <Button variant="solid" size="sm" onClick={handleSaveAccount} loading={saving} className="gap-2">
                    <FiSave size={13} /> Guardar cambios
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* ─── SECURITY ─── */}
          {tab === 'security' && (
            <div className="space-y-4">
              <Card>
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-5">Cambiar contraseña</h2>
                <div className="space-y-4 max-w-sm">
                  <div className="relative">
                    <Input label="Nueva contraseña" type={showPass ? 'text' : 'password'}
                      value={newPass} onChange={e => setNewPass(e.target.value)}
                      icon={<FiLock size={14} />} placeholder="Mínimo 6 caracteres" />
                    <button
                      type="button"
                      onClick={() => setShowPass(s => !s)}
                      className="absolute right-3 top-8 text-white/30 hover:text-white/60 transition-colors"
                    >
                      {showPass ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                    </button>
                  </div>
                  <Input label="Confirmar contraseña" type={showPass ? 'text' : 'password'}
                    value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                    icon={<FiLock size={14} />} placeholder="Repite la contraseña" />
                  {newPass && confirmPass && newPass !== confirmPass && (
                    <p className="text-xs text-[#EF4444] flex items-center gap-1">
                      <FiAlertTriangle size={11} /> Las contraseñas no coinciden
                    </p>
                  )}
                  {newPass && confirmPass && newPass === confirmPass && newPass.length >= 6 && (
                    <p className="text-xs text-[#22c55e] flex items-center gap-1">
                      <FiCheck size={11} /> Las contraseñas coinciden
                    </p>
                  )}
                  <Button variant="solid" size="sm" onClick={handleChangePassword} loading={changingPass}
                    disabled={!newPass || newPass !== confirmPass || newPass.length < 6} className="gap-2">
                    <FiLock size={13} /> Actualizar contraseña
                  </Button>
                </div>
              </Card>

              <Card>
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Sesiones activas</h2>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                  <div className="w-8 h-8 rounded-lg bg-[#22c55e]/10 flex items-center justify-center text-[#22c55e]">
                    <FiMonitor size={14} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-white/70">Sesión actual</p>
                    <p className="text-[11px] text-white/30">Navegador web · Última actividad: ahora</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#22c55e]/10 text-[#22c55e]">Activa</span>
                </div>
              </Card>
            </div>
          )}

          {/* ─── NOTIFICATIONS ─── */}
          {tab === 'notifications' && (
            <Card>
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Preferencias de notificaciones</h2>
              <Toggle label="Nuevos comentarios" desc="Recibir notificación cuando comenten en tus publicaciones"
                enabled={notifPrefs.comments !== false} onToggle={() => saveNotifPrefs('comments', !notifPrefs.comments)} />
              <Toggle label="Votos en ideas" desc="Cuando alguien vote en tus ideas"
                enabled={notifPrefs.votes !== false} onToggle={() => saveNotifPrefs('votes', !notifPrefs.votes)} />
              <Toggle label="Nuevos avances" desc="Cuando se registre un avance en tus proyectos"
                enabled={notifPrefs.advances !== false} onToggle={() => saveNotifPrefs('advances', !notifPrefs.advances)} />
              <Toggle label="Asignación de tareas" desc="Cuando te asignen una nueva tarea"
                enabled={notifPrefs.tasks !== false} onToggle={() => saveNotifPrefs('tasks', !notifPrefs.tasks)} />
              <Toggle label="Logros desbloqueados" desc="Cuando obtengas un nuevo logro"
                enabled={notifPrefs.achievements !== false} onToggle={() => saveNotifPrefs('achievements', !notifPrefs.achievements)} />
              <Toggle label="Solicitudes de ingreso" desc="Solo admin: nuevas solicitudes al semillero"
                enabled={notifPrefs.joinRequests !== false} onToggle={() => saveNotifPrefs('joinRequests', !notifPrefs.joinRequests)} />
              <Toggle label="Resumen semanal" desc="Recibir un resumen semanal de actividad por email"
                enabled={notifPrefs.weeklyDigest === true} onToggle={() => saveNotifPrefs('weeklyDigest', !notifPrefs.weeklyDigest)} />
            </Card>
          )}

          {/* ─── APPEARANCE ─── */}
          {tab === 'appearance' && (
            <div className="space-y-4">
              <Card>
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-5">Tema visual</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {THEMES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => setTheme(t.id)}
                      className={`relative p-4 rounded-xl border transition-all text-left ${
                        theme === t.id
                          ? 'border-[var(--c-primary)] bg-[var(--c-primary)]/10'
                          : 'border-white/[0.06] hover:border-white/[0.15] bg-white/[0.02]'
                      }`}
                    >
                      {theme === t.id && (
                        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--c-primary)] flex items-center justify-center">
                          <FiCheck size={11} className="text-white" />
                        </div>
                      )}
                      <div className="flex gap-1.5 mb-3">
                        <div className="w-4 h-4 rounded-full" style={{ background: t.colors['--c-primary'] }} />
                        <div className="w-4 h-4 rounded-full" style={{ background: t.colors['--c-secondary'] }} />
                        <div className="w-4 h-4 rounded-full" style={{ background: t.colors['--c-accent'] }} />
                      </div>
                      <p className="text-sm font-medium text-white/80">{t.label}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">
                        {t.id === 'default' && 'Naranja neón + Morado'}
                        {t.id === 'ocean' && 'Azul profundo + Cian'}
                        {t.id === 'forest' && 'Verde esmeralda + Lima'}
                        {t.id === 'sunset' && 'Rosa cálido + Dorado'}
                        {t.id === 'cyber' && 'Neón puro + Matrix'}
                      </p>
                    </button>
                  ))}
                </div>
              </Card>

              <Card>
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Interfaz</h2>
                <Toggle label="Animaciones reducidas" desc="Reduce las animaciones para mejor rendimiento"
                  enabled={reduceMotion}
                  onToggle={() => {
                    const next = !reduceMotion
                    setReduceMotion(next)
                    localStorage.setItem('reduce_motion', next.toString())
                    toast.success(next ? 'Animaciones reducidas' : 'Animaciones activadas')
                  }} />
                <Toggle label="Sonidos del sistema" desc="Efectos de sonido en interacciones"
                  enabled={soundsEnabled}
                  onToggle={() => {
                    const next = !soundsEnabled
                    setSoundsEnabled(next)
                    localStorage.setItem('sounds_enabled', next.toString())
                    toast.success(next ? 'Sonidos activados' : 'Sonidos desactivados')
                  }} />
              </Card>
            </div>
          )}

          {/* ─── PRIVACY ─── */}
          {tab === 'privacy' && (
            <Card>
              <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Privacidad del perfil</h2>
              <Toggle label="Perfil público" desc="Permitir que visitantes vean tu perfil"
                enabled={privacyPrefs.publicProfile !== false} onToggle={() => savePrivacyPrefs('publicProfile', !(privacyPrefs.publicProfile !== false))} />
              <Toggle label="Mostrar correo" desc="Mostrar tu correo en tu perfil público"
                enabled={privacyPrefs.showEmail === true} onToggle={() => savePrivacyPrefs('showEmail', !privacyPrefs.showEmail)} />
              <Toggle label="Mostrar actividad" desc="Mostrar tu calendario de actividad a otros miembros"
                enabled={privacyPrefs.showActivity !== false} onToggle={() => savePrivacyPrefs('showActivity', !(privacyPrefs.showActivity !== false))} />
              <Toggle label="Aparecer en el Universo" desc="Tu nodo aparece en el grafo universal"
                enabled={privacyPrefs.showInGraph !== false} onToggle={() => savePrivacyPrefs('showInGraph', !(privacyPrefs.showInGraph !== false))} />
              <Toggle label="Memoria ATHENIA" desc="Permitir que ATHENIA recuerde tus conversaciones previas"
                enabled={privacyPrefs.atheniaMemory !== false} onToggle={() => savePrivacyPrefs('atheniaMemory', !(privacyPrefs.atheniaMemory !== false))} />
            </Card>
          )}

          {/* ─── DATA ─── */}
          {tab === 'data' && (
            <div className="space-y-4">
              <Card>
                <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Exportar mis datos</h2>
                <p className="text-sm text-white/40 mb-4">
                  Descarga toda tu información: perfil, proyectos, ideas y avances en formato JSON.
                </p>
                <Button variant="outline" size="sm" onClick={handleExportData} className="gap-2">
                  <FiDownload size={13} /> Exportar datos
                </Button>
              </Card>

              <Card className="border-[#EF4444]/20">
                <h2 className="text-sm font-semibold text-[#EF4444]/70 uppercase tracking-wider mb-3">Zona peligrosa</h2>
                <p className="text-sm text-white/40 mb-4">
                  Al desactivar tu cuenta, tu perfil dejará de ser visible y perderás acceso a la plataforma.
                  Esta acción puede ser revertida por un administrador.
                </p>
                <Button variant="outline" size="sm" onClick={handleDeleteAccount}
                  className="gap-2 border-[#EF4444]/30 text-[#EF4444]/70 hover:bg-[#EF4444]/10 hover:text-[#EF4444]">
                  <FiTrash2 size={13} /> Desactivar cuenta
                </Button>
              </Card>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
