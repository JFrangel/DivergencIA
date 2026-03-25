import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FiSave, FiX, FiZap, FiCheckSquare } from 'react-icons/fi'
import { HiLightBulb as FiLightbulb } from 'react-icons/hi'
import { motion, AnimatePresence } from 'framer-motion'
import Input from '../ui/Input'
import Textarea from '../ui/Textarea'
import Select from '../ui/Select'
import Button from '../ui/Button'
import Modal from '../ui/Modal'
import Badge from '../ui/Badge'
import { useAutoPopulate } from '../../hooks/useAutoPopulate'
import { supabase } from '../../lib/supabase'

const schema = z.object({
  titulo: z.string().min(3, 'Minimo 3 caracteres'),
  descripcion: z.string().optional().transform(v => v || null),
  estado: z.string().default('desarrollo'),
  area: z.string().optional().transform(v => v || null),
  fecha_inicio: z.string().optional().transform(v => v || null),
  fecha_fin: z.string().optional().transform(v => v || null),
  repositorio_url: z.string().url('URL invalida').optional().or(z.literal('')).or(z.null()).transform(v => v || null),
  publico: z.union([z.boolean(), z.null()]).transform(v => v ?? false),
})

const ESTADOS = [
  { value: 'idea', label: 'Idea' },
  { value: 'desarrollo', label: 'En desarrollo' },
  { value: 'investigacion', label: 'Investigacion' },
  { value: 'pruebas', label: 'Pruebas' },
  { value: 'finalizado', label: 'Finalizado' },
  { value: 'pausa', label: 'En pausa' },
]

const AREAS = [
  { value: '', label: 'Sin area' },
  { value: 'ML', label: 'Machine Learning' },
  { value: 'NLP', label: 'NLP' },
  { value: 'Vision', label: 'Computer Vision' },
  { value: 'Datos', label: 'Datos & Analytics' },
  { value: 'General', label: 'General' },
]

export default function ProjectForm({ open, onClose, onSubmit, defaultValues }) {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting }, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: defaultValues || { estado: 'desarrollo', publico: false, area: '' },
  })

  useEffect(() => {
    if (open) {
      supabase.from('ideas').select('id, titulo').in('estado', ['aprobada', 'en_desarrollo']).order('votos_favor', { ascending: false }).limit(30)
        .then(({ data }) => setIdeasDisponibles(data || []))
    }
  }, [open])

  useEffect(() => {
    if (open) {
      setIdeaOrigenId(defaultValues?.idea_origen_id || null)
      reset(defaultValues ? {
        titulo: defaultValues.titulo || '',
        descripcion: defaultValues.descripcion || '',
        estado: defaultValues.estado || 'desarrollo',
        area: defaultValues.area || '',
        fecha_inicio: defaultValues.fecha_inicio ? defaultValues.fecha_inicio.slice(0, 10) : '',
        fecha_fin: defaultValues.fecha_fin ? defaultValues.fecha_fin.slice(0, 10) : '',
        repositorio_url: defaultValues.repositorio_url || '',
        publico: defaultValues.publico ?? false,
      } : { titulo: '', descripcion: '', estado: 'desarrollo', area: '', fecha_inicio: '', fecha_fin: '', repositorio_url: '', publico: false })
    }
  }, [open, defaultValues, reset])

  const { suggestTasks, suggestWorkflow } = useAutoPopulate()
  const [autoGenerateTasks, setAutoGenerateTasks] = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)
  const [suggestedTasks, setSuggestedTasks] = useState([])
  const [suggestedWorkflow, setSuggestedWorkflow] = useState(null)
  const [ideaOrigenId, setIdeaOrigenId] = useState(defaultValues?.idea_origen_id || null)
  const [ideasDisponibles, setIdeasDisponibles] = useState([])

  const selectedArea = watch('area')

  const handleClose = () => {
    reset()
    setAutoGenerateTasks(false)
    setShowTemplate(false)
    setSuggestedTasks([])
    setSuggestedWorkflow(null)
    setIdeaOrigenId(null)
    onClose()
  }

  const handleUseTemplate = () => {
    const area = selectedArea || 'General'
    setSuggestedTasks(suggestTasks(area))
    setSuggestedWorkflow(suggestWorkflow(area))
    setShowTemplate(true)
  }

  const submit = async (data) => {
    const payload = { ...data }
    if (autoGenerateTasks || showTemplate) {
      payload._suggestedTasks = suggestedTasks.length > 0 ? suggestedTasks : suggestTasks(data.area || 'General')
    }
    if (suggestedWorkflow) {
      payload._suggestedWorkflow = suggestedWorkflow
    }
    if (ideaOrigenId) {
      payload.idea_origen_id = ideaOrigenId
    }
    await onSubmit(payload)
    handleClose()
  }

  const isNew = !defaultValues

  return (
    <Modal open={open} onClose={handleClose} title={defaultValues ? 'Editar proyecto' : 'Nuevo proyecto'} size="md">
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <Input
          label="Titulo del proyecto *"
          placeholder="Ej. Sistema de Deteccion de Anomalias"
          error={errors.titulo?.message}
          {...register('titulo')}
        />

        <Textarea
          label="Descripcion"
          rows={3}
          placeholder="De que trata el proyecto?"
          {...register('descripcion')}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Estado"
            options={ESTADOS}
            {...register('estado')}
          />
          <Select
            label="Area"
            options={AREAS}
            {...register('area')}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Fecha inicio"
            type="date"
            {...register('fecha_inicio')}
          />
          <Input
            label="Fecha limite"
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
          <span className="text-sm text-white/60">Proyecto publico (visible sin login)</span>
        </label>

        {/* Idea de origen (solo si hay ideas disponibles) */}
        {ideasDisponibles.length > 0 && (
          <div>
            <label className="flex items-center gap-1.5 text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1.5">
              <FiLightbulb size={11} className="text-[#F59E0B]" /> Idea de origen (opcional)
            </label>
            <select
              value={ideaOrigenId || ''}
              onChange={e => setIdeaOrigenId(e.target.value || null)}
              className="w-full px-3 py-2 rounded-lg text-sm text-white/80 focus:outline-none transition-all [&>option]:bg-[#0c0608]"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
              onFocus={e => (e.target.style.borderColor = '#F59E0B50')}
              onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
            >
              <option value="">— Sin idea vinculada —</option>
              {ideasDisponibles.map(idea => (
                <option key={idea.id} value={idea.id}>{idea.titulo}</option>
              ))}
            </select>
          </div>
        )}

        {/* Auto-population section - only for new projects */}
        {isNew && (
          <div className="border-t border-white/[0.06] pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/40 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                <FiZap size={11} className="text-[#FC651F]" /> Plantillas
              </span>
              <button
                type="button"
                onClick={handleUseTemplate}
                className="text-[10px] text-[#FC651F] hover:text-[#FC651F]/80 flex items-center gap-1 transition-colors"
              >
                <FiZap size={10} /> Usar plantilla
              </button>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-3.5 h-3.5 rounded accent-[#FC651F]"
                checked={autoGenerateTasks}
                onChange={e => setAutoGenerateTasks(e.target.checked)}
              />
              <span className="text-xs text-white/50 flex items-center gap-1.5">
                <FiCheckSquare size={11} /> Auto-generar tareas iniciales
              </span>
            </label>

            {/* Show suggested tasks preview */}
            <AnimatePresence>
              {showTemplate && suggestedTasks.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] space-y-1.5">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-2">
                      Tareas sugeridas
                    </p>
                    {suggestedTasks.map((task, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-white/20 shrink-0" />
                        <span className="text-white/60 flex-1">{task.titulo}</span>
                        <Badge preset={task.prioridad} size="xs">{task.prioridad}</Badge>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

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
