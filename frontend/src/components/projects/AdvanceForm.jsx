import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FiSave, FiX } from 'react-icons/fi'
import Modal from '../ui/Modal'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'
import Button from '../ui/Button'

const schema = z.object({
  titulo: z.string().min(3, 'Mínimo 3 caracteres'),
  descripcion: z.string().optional(),
  proximos_pasos: z.string().optional(),
})

export default function AdvanceForm({ open, onClose, onSubmit }) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })
  const submit = async (data) => { await onSubmit(data); reset(); onClose() }
  return (
    <Modal open={open} onClose={() => { reset(); onClose() }} title="Registrar avance" size="md">
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <Input label="Título del avance *" placeholder="Ej. Implementación del modelo base"
          error={errors.titulo?.message} {...register('titulo')} />
        <Textarea label="Descripción" rows={3} placeholder="¿Qué se logró en este avance?"
          {...register('descripcion')} />
        <Textarea label="Próximos pasos" rows={2} placeholder="¿Qué sigue?"
          {...register('proximos_pasos')} />
        <div className="flex gap-2 pt-2">
          <Button type="submit" variant="solid" size="sm" loading={isSubmitting} className="gap-2">
            <FiSave size={13} /> Guardar avance
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => { reset(); onClose() }} className="gap-2">
            <FiX size={13} /> Cancelar
          </Button>
        </div>
      </form>
    </Modal>
  )
}
