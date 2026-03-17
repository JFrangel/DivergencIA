import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiSettings, FiSave, FiToggleLeft, FiToggleRight, FiType, FiMail, FiUpload } from 'react-icons/fi'
import Card from '../ui/Card'
import Button from '../ui/Button'
import Input from '../ui/Input'
import { toast } from 'sonner'

const STORAGE_KEY = 'divergencia_platform_config'

const DEFAULT_CONFIG = {
  platformName: 'DivergencIA',
  allowPublicRegistration: true,
  requireApproval: false,
  enableAthenia: true,
  enableZenMode: false,
  showPublicRoadmap: false,
  maxUploadSizeMB: '50',
  contactEmail: '',
}

function Toggle({ enabled, onToggle, label, description }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between gap-4 w-full p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.06] transition-all cursor-pointer group"
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
        {enabled ? (
          <FiToggleRight size={22} className="text-[#22c55e]" />
        ) : (
          <FiToggleLeft size={22} className="text-white/20" />
        )}
      </span>
    </button>
  )
}

export default function PlatformConfig() {
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setConfig(prev => ({ ...prev, ...JSON.parse(stored) }))
      }
    } catch {
      // ignore corrupt data
    }
  }, [])

  const updateField = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const toggleField = (key) => {
    setConfig(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = () => {
    setSaving(true)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
      setTimeout(() => {
        setSaving(false)
        toast.success('Configuración guardada')
      }, 400)
    } catch {
      setSaving(false)
      toast.error('Error al guardar la configuración')
    }
  }

  const toggles = [
    {
      key: 'allowPublicRegistration',
      label: 'Registro público',
      description: 'Permitir que cualquier persona cree una cuenta',
    },
    {
      key: 'requireApproval',
      label: 'Aprobación de miembros',
      description: 'Requiere aprobación manual para nuevos registros',
    },
    {
      key: 'enableAthenia',
      label: 'ATHENIA AI',
      description: 'Activar el asistente de inteligencia artificial',
    },
    {
      key: 'enableZenMode',
      label: 'Modo Zen',
      description: 'Habilitar modo de lectura sin distracciones',
    },
    {
      key: 'showPublicRoadmap',
      label: 'Roadmap público',
      description: 'Mostrar el roadmap de la plataforma a visitantes',
    },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <FiSettings size={14} className="text-[#FC651F]" />
        <span className="text-sm text-white/50 font-medium">
          Configuración de la plataforma
        </span>
      </div>

      {/* Toggle options */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
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
              />
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Text fields */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-4">
            Datos de la plataforma
          </h3>
          <div className="space-y-4">
            <Input
              label="Nombre de la plataforma"
              icon={<FiType size={14} />}
              value={config.platformName}
              onChange={e => updateField('platformName', e.target.value)}
              placeholder="DivergencIA"
            />
            <Input
              label="Tamaño máximo de archivo (MB)"
              icon={<FiUpload size={14} />}
              type="number"
              min="1"
              max="500"
              value={config.maxUploadSizeMB}
              onChange={e => updateField('maxUploadSizeMB', e.target.value)}
              placeholder="50"
            />
            <Input
              label="Email de contacto"
              icon={<FiMail size={14} />}
              type="email"
              value={config.contactEmail}
              onChange={e => updateField('contactEmail', e.target.value)}
              placeholder="admin@divergencia.com"
            />
          </div>
        </Card>
      </motion.div>

      {/* Save button */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="flex justify-end"
      >
        <Button
          icon={<FiSave size={14} />}
          loading={saving}
          onClick={handleSave}
        >
          Guardar configuración
        </Button>
      </motion.div>
    </div>
  )
}
