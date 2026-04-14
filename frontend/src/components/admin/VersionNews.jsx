import { useState } from 'react'
import { motion } from 'framer-motion'
import { FiTrendingUp, FiZap, FiAlertCircle, FiEye, FiMessageSquare, FiPlus, FiX } from 'react-icons/fi'
import Card from '../ui/Card'
import Button from '../ui/Button'
import { toast } from 'sonner'

const CHANGELOG_ENTRIES = [
  {
    id: 'feat-moderation-nav',
    type: 'feature',
    title: 'Navegación desde Moderación',
    description: 'Agregado botón "Ver en contexto" en el panel de moderación para navegar directamente al contenido reportado (mensajes, ideas, proyectos)',
    version: 'v2.1.0',
    date: '2026-04-13',
    author: 'Admin',
  },
  {
    id: 'feat-moderation-highlight',
    type: 'feature',
    title: 'Resaltado de Mensajes Reportados',
    description: 'Los mensajes reportados ahora se destacan con un borde rojo y badge "Reportado" en el chat. Los administradores pueden ver fácilmente qué mensajes tienen reportes pendientes',
    version: 'v2.1.0',
    date: '2026-04-13',
    author: 'Admin',
  },
  {
    id: 'feat-message-navigation',
    type: 'feature',
    title: 'Navegación a Mensaje Específico',
    description: 'El moderador puede ir directamente al mensaje reportado usando el parámetro ?msg=[id] en la URL. El mensaje se resalta y centra automáticamente',
    version: 'v2.1.0',
    date: '2026-04-13',
    author: 'Admin',
  },
  {
    id: 'fix-achievements-z-index',
    type: 'fix',
    title: 'Corregido Z-index de Logros',
    description: 'Las notificaciones de logros desbloqueados ahora aparecen correctamente encima de todos los modales y overlays',
    version: 'v2.0.1',
    date: '2026-04-12',
    author: 'Admin',
  },
  {
    id: 'fix-sounds-default',
    type: 'fix',
    title: 'Corregido Default de Sonidos',
    description: 'Los sonidos ahora están habilitados por defecto al primera vez que el usuario accede. La preferencia se guarda en localStorage',
    version: 'v2.0.1',
    date: '2026-04-12',
    author: 'Admin',
  },
]

const TYPE_ICONS = {
  feature: { icon: FiZap, bg: '#00D1FF', label: 'Característica' },
  fix: { icon: FiAlertCircle, bg: '#22c55e', label: 'Corrección' },
  improvement: { icon: FiTrendingUp, bg: '#F59E0B', label: 'Mejora' },
  security: { icon: FiEye, bg: '#EF4444', label: 'Seguridad' },
}

export default function VersionNews() {
  const [entries, setEntries] = useState(CHANGELOG_ENTRIES)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    type: 'feature',
    title: '',
    description: '',
    version: 'v2.1.0',
  })

  const handleAddEntry = () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.error('Completa todos los campos')
      return
    }

    const newEntry = {
      id: `entry-${Date.now()}`,
      ...form,
      date: new Date().toISOString().split('T')[0],
      author: 'Admin',
    }

    setEntries([newEntry, ...entries])
    setForm({ type: 'feature', title: '', description: '', version: 'v2.1.0' })
    setShowForm(false)
    toast.success('Novedad agregada')
  }

  const handleDeleteEntry = (id) => {
    setEntries(entries.filter(e => e.id !== id))
    toast.success('Novedad eliminada')
  }

  const groupedByVersion = entries.reduce((acc, entry) => {
    if (!acc[entry.version]) acc[entry.version] = []
    acc[entry.version].push(entry)
    return acc
  }, {})

  const sortedVersions = Object.keys(groupedByVersion).sort().reverse()

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <FiTrendingUp size={16} className="text-[#FC651F]" />
          <h2 className="text-lg font-semibold text-white">Novedades de Versión</h2>
          <span className="text-xs px-2 py-1 rounded-full bg-[#FC651F]/15 text-[#FC651F]">{entries.length}</span>
        </div>
        <Button
          variant="solid"
          size="sm"
          className="gap-1.5"
          onClick={() => setShowForm(!showForm)}
        >
          <FiPlus size={13} />
          Agregar novedad
        </Button>
      </motion.div>

      {/* Add Form */}
      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
        >
          <Card className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-1.5">Tipo</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-[#0c0608] border border-white/[0.08] text-sm text-white outline-none focus:border-[#FC651F]/40 transition-colors [&>option]:bg-[#0c0608]"
                >
                  <option value="feature">Característica</option>
                  <option value="fix">Corrección</option>
                  <option value="improvement">Mejora</option>
                  <option value="security">Seguridad</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-1.5">Versión</label>
                <input
                  type="text"
                  placeholder="v2.1.0"
                  value={form.version}
                  onChange={e => setForm(f => ({ ...f, version: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-[#0c0608] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none focus:border-[#FC651F]/40 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-1.5">Título</label>
              <input
                type="text"
                placeholder="Ej: Navegación desde Moderación"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-[#0c0608] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none focus:border-[#FC651F]/40 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] text-white/40 uppercase tracking-wider font-semibold mb-1.5">Descripción</label>
              <textarea
                placeholder="Describe la novedad en detalle..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-[#0c0608] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none focus:border-[#FC651F]/40 transition-colors resize-none"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button variant="solid" size="sm" onClick={handleAddEntry}>Guardar novedad</Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Changelog Entries by Version */}
      <div className="space-y-6">
        {sortedVersions.length === 0 ? (
          <Card className="text-center py-10">
            <FiMessageSquare size={28} className="mx-auto text-white/10 mb-3" />
            <p className="text-white/30 text-sm">No hay novedades registradas</p>
          </Card>
        ) : (
          sortedVersions.map(version => (
            <div key={version} className="space-y-3">
              <h3 className="text-sm font-semibold text-white/70 flex items-center gap-2 px-1">
                <span className="text-[10px] uppercase tracking-wider text-white/40">Versión</span>
                <span className="text-white">{version}</span>
                <span className="text-[10px] text-white/20">
                  {groupedByVersion[version].length > 0 && `· ${groupedByVersion[version][0].date}`}
                </span>
              </h3>

              <div className="space-y-2">
                {groupedByVersion[version].map(entry => {
                  const typeInfo = TYPE_ICONS[entry.type]
                  const IconComponent = typeInfo.icon

                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <Card className="!p-3">
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                            style={{ background: `${typeInfo.bg}20`, color: typeInfo.bg }}
                          >
                            <IconComponent size={14} />
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-medium text-white">{entry.title}</p>
                              <span
                                className="text-[9px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full shrink-0"
                                style={{ background: `${typeInfo.bg}15`, color: typeInfo.bg }}
                              >
                                {typeInfo.label}
                              </span>
                            </div>
                            <p className="text-xs text-white/50 leading-relaxed">{entry.description}</p>
                          </div>

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteEntry(entry.id)}
                            className="text-white/20 hover:text-white/50 transition-colors shrink-0 p-1"
                            title="Eliminar"
                          >
                            <FiX size={14} />
                          </button>
                        </div>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
