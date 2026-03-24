import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FiSave, FiX, FiClock, FiCalendar } from 'react-icons/fi'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'
import Select from '../ui/Select'
import Button from '../ui/Button'

const schema = z.object({
  titulo:                  z.string().min(5, { message: 'Mínimo 5 caracteres' }),
  descripcion:             z.string().optional(),
  area_relacionada:        z.string().optional(),
  fecha_limite_votacion:   z.string().optional(),
  custom_deadline:         z.string().optional(),
  tags:                    z.string().optional(),
})

const AREAS = [
  { value: '',        label: 'Sin área específica' },
  { value: 'ML',      label: 'Machine Learning' },
  { value: 'NLP',     label: 'Procesamiento de Lenguaje' },
  { value: 'Vision',  label: 'Computer Vision' },
  { value: 'Datos',   label: 'Datos & Analytics' },
  { value: 'General', label: 'General / Otro' },
]

const DEADLINE_PRESETS = [
  { value: '',       label: 'Sin límite de votación' },
  { value: '1d',     label: '1 día' },
  { value: '3d',     label: '3 días' },
  { value: '7d',     label: '1 semana' },
  { value: '14d',    label: '2 semanas' },
  { value: '30d',    label: '1 mes' },
  { value: 'custom', label: 'Fecha personalizada...' },
]

function resolveDeadline(preset, customDate) {
  if (!preset || preset === '') return null
  if (preset === 'custom') return customDate || null
  const days = parseInt(preset, 10)
  if (isNaN(days)) return null
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString()
}

function formatExistingDeadline(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  const now = Date.now()
  if (d.getTime() < now) return `Vencida: ${d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}`
  return `Actual: ${d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`
}

export default function IdeaForm({ open, onClose, onSubmit, editIdea = null }) {
  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      titulo: '', descripcion: '', area_relacionada: '', tags: '',
      fecha_limite_votacion: '', custom_deadline: '',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        titulo:                editIdea?.titulo        || '',
        descripcion:           editIdea?.descripcion   || '',
        area_relacionada:      editIdea?.area_relacionada || '',
        tags:                  editIdea?.tags?.join(', ') || '',
        fecha_limite_votacion: '',
        custom_deadline:       '',
      })
    }
  }, [open, editIdea, reset])

  const deadlinePreset = watch('fecha_limite_votacion')
  const isCustomDeadline = deadlinePreset === 'custom'
  const existingDeadlineLabel = editIdea ? formatExistingDeadline(editIdea.fecha_limite_votacion) : null

  const submit = async (data) => {
    const payload = {
      titulo:           data.titulo,
      descripcion:      data.descripcion  || null,
      area_relacionada: data.area_relacionada || null,
      tags:             data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    }

    // Only include fecha_limite_votacion if the user explicitly set one
    const deadline = resolveDeadline(
      data.fecha_limite_votacion,
      data.custom_deadline?.trim() ? new Date(data.custom_deadline).toISOString() : null
    )
    if (deadline) payload.fecha_limite_votacion = deadline

    const result = await onSubmit(payload)
    // Only close if no error (when editing, parent controls modal state)
    if (!result?.error && !editIdea) {
      reset()
      onClose()
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => { reset(); onClose() }}
      title={editIdea ? 'Editar idea' : 'Nueva idea'}
      size="md"
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <Input
          label="Título de la idea *"
          placeholder="Ej. Sistema de detección de deepfakes en tiempo real"
          error={errors.titulo?.message}
          {...register('titulo')}
        />
        <Textarea
          label="Descripción (opcional)"
          rows={3}
          placeholder="Describe tu idea, su potencial impacto y cómo podría implementarse..."
          {...register('descripcion')}
        />
        <Select
          label="Área de investigación"
          options={AREAS}
          placeholder={null}
          {...register('area_relacionada')}
        />

        <Input
          label="Etiquetas (separadas por coma)"
          placeholder="Ej. IA, etica, deteccion, seguridad"
          {...register('tags')}
        />

        {/* Voting deadline */}
        <div className="space-y-2">
          <Select
            label={
              <span className="flex items-center gap-1.5">
                <FiClock size={12} className="text-[var(--c-accent)]" />
                Límite de votación
              </span>
            }
            options={DEADLINE_PRESETS}
            placeholder={null}
            {...register('fecha_limite_votacion')}
          />

          {/* Show existing deadline hint when editing */}
          {existingDeadlineLabel && !deadlinePreset && (
            <p className="text-[11px] text-white/40 flex items-center gap-1.5">
              <FiCalendar size={10} className="text-amber-400/60" />
              {existingDeadlineLabel}
              <span className="text-white/25"> · Selecciona una opción para cambiarla</span>
            </p>
          )}

          {isCustomDeadline && (
            <input
              type="datetime-local"
              className="w-full bg-[#0c0608] border border-white/10 rounded-lg text-white text-sm px-3.5 py-2.5 focus:outline-none focus:border-[var(--c-accent)]/60 transition-all"
              min={new Date().toISOString().slice(0, 16)}
              {...register('custom_deadline')}
            />
          )}

          {deadlinePreset && deadlinePreset !== '' && deadlinePreset !== 'custom' && (
            <p className="text-[11px] text-[var(--c-accent)]/60 flex items-center gap-1">
              <FiClock size={10} />
              La votación cerrará automáticamente al cumplirse el plazo
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button type="submit" variant="solid" size="sm" loading={isSubmitting} className="gap-2">
            <FiSave size={13} /> {editIdea ? 'Guardar cambios' : 'Publicar idea'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => { reset(); onClose() }} className="gap-2">
            <FiX size={13} /> Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
