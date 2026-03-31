import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  FiSettings, FiSave, FiToggleLeft, FiToggleRight,
  FiType, FiMail, FiUpload, FiRefreshCw, FiAlertCircle,
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
    </div>
  )
}
