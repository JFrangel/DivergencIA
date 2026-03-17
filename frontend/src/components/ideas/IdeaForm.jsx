import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FiSave, FiX } from 'react-icons/fi'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'
import Select from '../ui/Select'
import Button from '../ui/Button'

const schema = z.object({
  titulo: z.string().min(5, 'Mínimo 5 caracteres'),
  descripcion: z.string().optional(),
  area_relacionada: z.string().optional(),
})

const AREAS = [
  { value: '', label: 'Sin área específica' },
  { value: 'ML', label: 'Machine Learning' },
  { value: 'NLP', label: 'Procesamiento de Lenguaje' },
  { value: 'Vision', label: 'Computer Vision' },
  { value: 'Datos', label: 'Datos & Analytics' },
  { value: 'General', label: 'General / Otro' },
]

export default function IdeaForm({ open, onClose, onSubmit }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  const submit = async (data) => {
    await onSubmit(data)
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Nueva idea" size="md">
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <Input
          label="Título de la idea *"
          placeholder="Ej. Sistema de detección de deepfakes en tiempo real"
          error={errors.titulo?.message}
          {...register('titulo')}
        />
        <Textarea
          label="Descripción (opcional)"
          rows={4}
          placeholder="Describe tu idea, su potencial impacto y cómo podría implementarse..."
          {...register('descripcion')}
        />
        <Select
          label="Área de investigación"
          options={AREAS}
          {...register('area_relacionada')}
        />
        <div className="flex gap-2 pt-2">
          <Button type="submit" variant="solid" size="sm" loading={isSubmitting} className="gap-2">
            <FiSave size={13} /> Publicar idea
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => { reset(); onClose() }} className="gap-2">
            <FiX size={13} /> Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
