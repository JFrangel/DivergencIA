import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FiSave, FiX } from 'react-icons/fi'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'
import Select from '../ui/Select'
import Button from '../ui/Button'
import Modal from '../ui/Modal'

const schema = z.object({
  titulo: z.string().min(3, 'Mínimo 3 caracteres'),
  descripcion: z.string().optional(),
  estado: z.string().default('desarrollo'),
  fecha_inicio: z.string().optional(),
  fecha_fin: z.string().optional(),
  repositorio_url: z.string().url('URL inválida').optional().or(z.literal('')),
  publico: z.boolean().default(false),
})

const ESTADOS = [
  { value: 'idea', label: 'Idea' },
  { value: 'desarrollo', label: 'En desarrollo' },
  { value: 'investigacion', label: 'Investigación' },
  { value: 'pruebas', label: 'Pruebas' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'pausa', label: 'En pausa' },
]

export default function ProjectForm({ open, onClose, onSubmit, defaultValues }) {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues || { estado: 'desarrollo', publico: false },
  })

  const handleClose = () => { reset(); onClose() }

  const submit = async (data) => {
    await onSubmit(data)
    handleClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title={defaultValues ? 'Editar proyecto' : 'Nuevo proyecto'} size="md">
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <Input
          label="Título del proyecto *"
          placeholder="Ej. Sistema de Detección de Anomalías"
          error={errors.titulo?.message}
          {...register('titulo')}
        />

        <Textarea
          label="Descripción"
          rows={3}
          placeholder="¿De qué trata el proyecto?"
          {...register('descripcion')}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Estado"
            options={ESTADOS}
            {...register('estado')}
          />
          <Input
            label="Fecha límite"
            type="date"
            {...register('fecha_fin')}
          />
        </div>

        <Input
          label="Repositorio (opcional)"
          placeholder="https://github.com/..."
          error={errors.repositorio_url?.message}
          {...register('repositorio_url')}
        />

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            className="w-4 h-4 rounded accent-[#FC651F]"
            {...register('publico')}
          />
          <span className="text-sm text-white/60">Proyecto público (visible sin login)</span>
        </label>

        <div className="flex gap-2 pt-2">
          <Button type="submit" variant="solid" size="sm" loading={isSubmitting} className="gap-2">
            <FiSave size={13} /> {defaultValues ? 'Guardar cambios' : 'Crear proyecto'}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleClose} className="gap-2">
            <FiX size={13} /> Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
