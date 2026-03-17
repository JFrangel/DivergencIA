import { useState, useEffect } from 'react'
import { FiSave, FiTrash2, FiAlertTriangle, FiEdit3, FiClock } from 'react-icons/fi'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'
import Select from '../ui/Select'
import Button from '../ui/Button'

const ESTADO_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'revision', label: 'Revisión' },
  { value: 'completada', label: 'Completada' },
]

const PRIORIDAD_OPTIONS = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' },
]

export default function TaskEditModal({ task, open, onClose, onSave, onDelete, members = [] }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (task) {
      setForm({
        titulo: task.titulo || '',
        descripcion: task.descripcion || '',
        estado: task.estado || 'pendiente',
        prioridad: task.prioridad || 'media',
        asignado_a: task.asignado_a || '',
        fecha_limite: task.fecha_limite || '',
        tiempo_estimado: task.tiempo_estimado ?? '',
        tiempo_real: task.tiempo_real ?? '',
      })
    }
    setConfirmDelete(false)
  }, [task])

  const handleChange = (field, value) => {
    setForm(f => ({ ...f, [field]: value }))
  }

  const handleSave = async () => {
    if (!form.titulo.trim()) return
    setSaving(true)
    const payload = { ...form }
    // Convert empty strings to null for optional fields
    if (payload.asignado_a === '') payload.asignado_a = null
    if (payload.fecha_limite === '') payload.fecha_limite = null
    if (payload.tiempo_estimado === '') payload.tiempo_estimado = null
    else payload.tiempo_estimado = Number(payload.tiempo_estimado)
    if (payload.tiempo_real === '') payload.tiempo_real = null
    else payload.tiempo_real = Number(payload.tiempo_real)
    await onSave?.(task.id, payload)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    await onDelete?.(task.id)
  }

  const memberOptions = members.map(m => ({
    value: m.usuario?.id,
    label: m.usuario?.nombre || 'Sin nombre',
  }))

  const footer = (
    <>
      {confirmDelete ? (
        <div className="flex items-center gap-2 mr-auto">
          <FiAlertTriangle className="text-[#EF4444]" size={14} />
          <span className="text-xs text-[#EF4444]">Confirmar eliminación</span>
          <Button variant="danger" size="xs" onClick={handleDelete}>
            Sí, eliminar
          </Button>
          <Button variant="ghost" size="xs" onClick={() => setConfirmDelete(false)}>
            Cancelar
          </Button>
        </div>
      ) : (
        <Button variant="danger" size="sm" className="mr-auto gap-1.5" onClick={handleDelete}>
          <FiTrash2 size={13} /> Eliminar
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={onClose}>
        Cancelar
      </Button>
      <Button variant="solid" size="sm" className="gap-1.5" onClick={handleSave} loading={saving}>
        <FiSave size={13} /> Guardar
      </Button>
    </>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <FiEdit3 size={16} className="text-[#FC651F]" />
          Editar tarea
        </span>
      }
      size="lg"
      footer={footer}
    >
      <div className="space-y-5">
        {/* Titulo */}
        <Input
          label="Título"
          placeholder="Nombre de la tarea"
          value={form.titulo || ''}
          onChange={e => handleChange('titulo', e.target.value)}
          autoFocus
        />

        {/* Descripcion */}
        <Textarea
          label="Descripción"
          placeholder="Describe la tarea..."
          rows={3}
          value={form.descripcion || ''}
          onChange={e => handleChange('descripcion', e.target.value)}
        />

        {/* Row: Estado + Prioridad */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Estado"
            options={ESTADO_OPTIONS}
            placeholder=""
            value={form.estado || ''}
            onChange={e => handleChange('estado', e.target.value)}
          />
          <Select
            label="Prioridad"
            options={PRIORIDAD_OPTIONS}
            placeholder=""
            value={form.prioridad || ''}
            onChange={e => handleChange('prioridad', e.target.value)}
          />
        </div>

        {/* Row: Asignado + Fecha limite */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Asignado a"
            options={memberOptions}
            placeholder="Sin asignar"
            value={form.asignado_a || ''}
            onChange={e => handleChange('asignado_a', e.target.value)}
          />
          <Input
            label="Fecha límite"
            type="date"
            value={form.fecha_limite || ''}
            onChange={e => handleChange('fecha_limite', e.target.value)}
          />
        </div>

        {/* Row: Tiempo estimado + Tiempo real */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Tiempo estimado (horas)"
            type="number"
            min={0}
            step={0.5}
            placeholder="0"
            icon={<FiClock size={14} />}
            value={form.tiempo_estimado ?? ''}
            onChange={e => handleChange('tiempo_estimado', e.target.value)}
          />
          <Input
            label="Tiempo real (horas)"
            type="number"
            min={0}
            step={0.5}
            placeholder="0"
            icon={<FiClock size={14} />}
            value={form.tiempo_real ?? ''}
            onChange={e => handleChange('tiempo_real', e.target.value)}
          />
        </div>
      </div>
    </Modal>
  )
}
