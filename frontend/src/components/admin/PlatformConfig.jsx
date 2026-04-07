import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  FiSettings, FiSave, FiToggleLeft, FiToggleRight,
  FiType, FiMail, FiUpload, FiRefreshCw, FiAlertCircle, FiImage,
  FiPlus, FiTrash2, FiEye, FiEyeOff, FiTag,
} from 'react-icons/fi'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { toast } from 'sonner'
import { DEFAULT_PLATFORM_CONFIG } from '../../hooks/usePlatformConfig'

const STORAGE_KEY = 'divergencia_platform_config'

const DEFAULT_CONFIG = {
  nombre_plataforma:   DEFAULT_PLATFORM_CONFIG.platformName,
  logo_url:            DEFAULT_PLATFORM_CONFIG.logoUrl,
  registro_publico:    DEFAULT_PLATFORM_CONFIG.allowPublicRegistration,
  requiere_aprobacion: DEFAULT_PLATFORM_CONFIG.requireApproval,
  athenia_activo:      DEFAULT_PLATFORM_CONFIG.enableAthenia,
  zen_mode_activo:     DEFAULT_PLATFORM_CONFIG.enableZenMode,
  roadmap_publico:     DEFAULT_PLATFORM_CONFIG.showPublicRoadmap,
  max_upload_mb:       Number(DEFAULT_PLATFORM_CONFIG.maxUploadSizeMB) || 50,
  email_contacto:      DEFAULT_PLATFORM_CONFIG.contactEmail,
}

function Toggle({ enabled, onToggle, label, description, disabled }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className="flex items-center justify-between gap-4 w-full p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] transition-all cursor-pointer group disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <div className="text-left">
        <p className="text-sm font-medium text-white/70 group-hover:text-white/90 transition-colors">
          {label}
        </p>
        {description && (
          <p className="text-xs text-white/30 mt-0.5">{description}</p>
        )}
      </div>
      <span className="shrink-0">
        {enabled
          ? <FiToggleRight size={22} className="text-[#22c55e]" />
          : <FiToggleLeft  size={22} className="text-white/20" />
        }
      </span>
    </button>
  )
}

export default function PlatformConfig() {
  const { user } = useAuth()
  const [config, setConfig]   = useState(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState(null)

  /* ── Load from Supabase ── */
  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data, error: err } = await supabase
        .from('configuracion_plataforma')
        .select('*')
        .eq('id', 1)
        .single()

      if (err) {
        // Tabla aún no migrada → fallback a localStorage legacy
        try {
          const stored = localStorage.getItem('divergencia_platform_config')
          if (stored) {
            const legacy = JSON.parse(stored)
            setConfig({
              nombre_plataforma:   legacy.platformName          ?? DEFAULT_CONFIG.nombre_plataforma,
              logo_url:            legacy.logoUrl               ?? DEFAULT_CONFIG.logo_url,
              registro_publico:    legacy.allowPublicRegistration ?? DEFAULT_CONFIG.registro_publico,
              requiere_aprobacion: legacy.requireApproval        ?? DEFAULT_CONFIG.requiere_aprobacion,
              athenia_activo:      legacy.enableAthenia          ?? DEFAULT_CONFIG.athenia_activo,
              zen_mode_activo:     legacy.enableZenMode          ?? DEFAULT_CONFIG.zen_mode_activo,
              roadmap_publico:     legacy.showPublicRoadmap      ?? DEFAULT_CONFIG.roadmap_publico,
              max_upload_mb:       Number(legacy.maxUploadSizeMB) || DEFAULT_CONFIG.max_upload_mb,
              email_contacto:      legacy.contactEmail           ?? DEFAULT_CONFIG.email_contacto,
            })
          }
        } catch { /* ignore */ }
        setError('Tabla no disponible aún — aplica la migración 014')
      } else if (data) {
        setConfig({
          nombre_plataforma:   data.nombre_plataforma,
          logo_url:            data.logo_url ?? '',
          registro_publico:    data.registro_publico,
          requiere_aprobacion: data.requiere_aprobacion,
          athenia_activo:      data.athenia_activo,
          zen_mode_activo:     data.zen_mode_activo,
          roadmap_publico:     data.roadmap_publico,
          max_upload_mb:       data.max_upload_mb,
          email_contacto:      data.email_contacto ?? '',
        })
        setError(null)
      }
      setLoading(false)
    }
    load()
  }, [])

  const updateField  = (key, value)  => setConfig(prev => ({ ...prev, [key]: value }))
  const toggleField  = (key)         => setConfig(prev => ({ ...prev, [key]: !prev[key] }))

  /* ── Save to Supabase ── */
  const handleSave = async () => {
    setSaving(true)
    // Always sync localStorage so usePlatformConfig hook reacts immediately
    const localPayload = JSON.stringify({
      platformName:            config.nombre_plataforma,
      logoUrl:                 config.logo_url,
      allowPublicRegistration: config.registro_publico,
      requireApproval:         config.requiere_aprobacion,
      enableAthenia:           config.athenia_activo,
      enableZenMode:           config.zen_mode_activo,
      showPublicRoadmap:       config.roadmap_publico,
      maxUploadSizeMB:         String(config.max_upload_mb),
      contactEmail:            config.email_contacto,
    })
    localStorage.setItem(STORAGE_KEY, localPayload)
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: localPayload }))

    const { error: err } = await supabase
      .from('configuracion_plataforma')
      .update({
        ...config,
        actualizado_en:  new Date().toISOString(),
        actualizado_por: user?.id,
      })
      .eq('id', 1)

    if (err) {
      toast.success('Configuración guardada (local)')
    } else {
      toast.success('Configuración guardada en la plataforma ✓')
    }
    setSaving(false)
  }

  const toggles = [
    { key: 'registro_publico',    label: 'Registro público',       description: 'Permitir que cualquier persona cree una cuenta' },
    { key: 'requiere_aprobacion', label: 'Aprobación de miembros', description: 'Requiere aprobación manual para nuevos registros' },
    { key: 'athenia_activo',      label: 'ATHENIA AI',             description: 'Activar el asistente de inteligencia artificial' },
    { key: 'zen_mode_activo',     label: 'Modo Zen',               description: 'Habilitar modo de lectura sin distracciones' },
    { key: 'roadmap_publico',     label: 'Roadmap público',        description: 'Mostrar el roadmap de la plataforma a visitantes' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <FiRefreshCw size={18} className="text-white/30 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <FiSettings size={14} className="text-[#FC651F]" />
        <span className="text-sm text-white/50 font-medium">Configuración de la plataforma</span>
        <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.1)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}>
          Supabase
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#F59E0B' }}>
          <FiAlertCircle size={13} />
          {error}
        </div>
      )}

      {/* Toggle options */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">
            Opciones generales
          </h3>
          <div className="space-y-2">
            {toggles.map(t => (
              <Toggle
                key={t.key}
                enabled={config[t.key]}
                onToggle={() => toggleField(t.key)}
                label={t.label}
                description={t.description}
                disabled={saving}
              />
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Text fields */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">
            Datos de la plataforma
          </h3>
          <div className="space-y-4">
            <Input
              label="Nombre de la plataforma"
              icon={<FiType size={14} />}
              value={config.nombre_plataforma}
              onChange={e => updateField('nombre_plataforma', e.target.value)}
              placeholder="DivergencIA"
              disabled={saving}
            />
            <div className="space-y-2">
              <Input
                label="URL del logo (imagen)"
                icon={<FiImage size={14} />}
                value={config.logo_url}
                onChange={e => updateField('logo_url', e.target.value)}
                placeholder="https://... (PNG, SVG recomendado)"
                disabled={saving}
              />
              {config.logo_url && (
                <div className="flex items-center gap-3 p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <img src={config.logo_url} alt="preview" className="w-10 h-10 object-contain rounded-lg bg-white/5" onError={e => { e.target.style.display='none' }} />
                  <span className="text-xs text-white/30">Vista previa del logo</span>
                </div>
              )}
            </div>
            <Input
              label="Tamaño máximo de archivo (MB)"
              icon={<FiUpload size={14} />}
              type="number"
              min="1"
              max="500"
              value={config.max_upload_mb}
              onChange={e => updateField('max_upload_mb', Number(e.target.value))}
              placeholder="50"
              disabled={saving}
            />
            <Input
              label="Email de contacto"
              icon={<FiMail size={14} />}
              type="email"
              value={config.email_contacto}
              onChange={e => updateField('email_contacto', e.target.value)}
              placeholder="admin@divergencia.com"
              disabled={saving}
            />
          </div>
        </Card>
      </motion.div>

      {/* Save */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
        className="flex justify-end"
      >
        <Button icon={<FiSave size={14} />} loading={saving} onClick={handleSave}>
          Guardar configuración
        </Button>
      </motion.div>

      {/* Changelog / novedades */}
      <ChangelogManager />
    </div>
  )
}

/* ──────── Changelog Manager ──────── */
function ChangelogManager() {
  const { user } = useAuth()
  const [novedades, setNovedades] = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]     = useState(false)
  const [form, setForm] = useState({ version: '', titulo: '', contenido: '', publicado: false })

  useEffect(() => {
    supabase.from('novedades_version')
      .select('*')
      .order('fecha', { ascending: false })
      .then(({ data }) => { setNovedades(data || []); setLoading(false) })
  }, [])

  const handleCreate = async () => {
    if (!form.version.trim() || !form.titulo.trim() || !form.contenido.trim()) {
      toast.error('Completa todos los campos'); return
    }
    setSaving(true)
    const { data, error } = await supabase.from('novedades_version')
      .insert({ ...form, creado_por: user?.id })
      .select().single()
    if (error) { toast.error('Error al guardar'); setSaving(false); return }
    setNovedades(prev => [data, ...prev])
    setForm({ version: '', titulo: '', contenido: '', publicado: false })
    setShowForm(false)
    toast.success('Novedad publicada ✓')
    setSaving(false)
  }

  const togglePublish = async (novedad) => {
    const nuevo = !novedad.publicado
    const { error } = await supabase.from('novedades_version').update({ publicado: nuevo }).eq('id', novedad.id)
    if (error) { toast.error('Error'); return }
    setNovedades(prev => prev.map(n => n.id === novedad.id ? { ...n, publicado: nuevo } : n))
    toast.success(nuevo ? 'Publicado ✓' : 'Despublicado')
  }

  const handleDelete = async (id) => {
    const { error } = await supabase.from('novedades_version').delete().eq('id', id)
    if (error) { toast.error('Error'); return }
    setNovedades(prev => prev.filter(n => n.id !== id))
    toast.success('Eliminado')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider flex items-center gap-2">
            <FiTag size={12} /> Novedades de versión
          </h3>
          <Button size="xs" icon={<FiPlus size={12} />} onClick={() => setShowForm(s => !s)}>
            Nueva versión
          </Button>
        </div>

        {/* New version form */}
        {showForm && (
          <div className="mb-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Versión (ej: v1.2.0)"
                value={form.version}
                onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                placeholder="v1.0.0"
                disabled={saving}
              />
              <Input
                label="Título"
                value={form.titulo}
                onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                placeholder="Mejoras de rendimiento"
                disabled={saving}
              />
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Contenido (Markdown soportado)</label>
              <textarea
                className="w-full rounded-xl px-3 py-2 text-sm text-white/80 bg-white/[0.04] border border-white/[0.08] placeholder-white/20 focus:outline-none focus:border-[var(--c-primary)]/50 resize-none"
                rows={5}
                placeholder="- Corrección del bug de notificaciones&#10;- Mejora del panel de admin&#10;- Nuevo sistema de logros"
                value={form.contenido}
                onChange={e => setForm(f => ({ ...f, contenido: e.target.value }))}
                disabled={saving}
              />
            </div>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, publicado: !f.publicado }))}
                className="flex items-center gap-2 text-xs text-white/40 hover:text-white/70 transition-colors"
              >
                {form.publicado
                  ? <FiEye size={13} className="text-green-400" />
                  : <FiEyeOff size={13} />
                }
                {form.publicado ? 'Publicar al guardar' : 'Guardar como borrador'}
              </button>
              <div className="flex gap-2">
                <Button size="xs" variant="ghost" onClick={() => setShowForm(false)}>Cancelar</Button>
                <Button size="xs" loading={saving} onClick={handleCreate}>Guardar</Button>
              </div>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-6"><FiRefreshCw size={16} className="text-white/30 animate-spin" /></div>
        ) : novedades.length === 0 ? (
          <p className="text-xs text-white/20 text-center py-6">No hay versiones publicadas aún</p>
        ) : (
          <div className="space-y-2">
            {novedades.map(n => (
              <div key={n.id} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono font-bold text-[var(--c-primary)]">{n.version}</span>
                    <span className="text-xs font-medium text-white/70">{n.titulo}</span>
                    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full ${n.publicado ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-white/30'}`}>
                      {n.publicado ? 'Publicado' : 'Borrador'}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/30 line-clamp-2 whitespace-pre-line">{n.contenido}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => togglePublish(n)}
                    className="p-1.5 rounded-lg text-white/30 hover:text-green-400 hover:bg-green-500/10 transition-all"
                    title={n.publicado ? 'Despublicar' : 'Publicar'}
                  >
                    {n.publicado ? <FiEyeOff size={12} /> : <FiEye size={12} />}
                  </button>
                  <button
                    onClick={() => handleDelete(n.id)}
                    className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    title="Eliminar"
                  >
                    <FiTrash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </motion.div>
  )
}
