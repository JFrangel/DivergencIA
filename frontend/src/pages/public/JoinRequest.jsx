import { useState } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { FiSend, FiCheckCircle, FiArrowLeft } from 'react-icons/fi'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Textarea from '../../components/ui/Textarea'
import Button from '../../components/ui/Button'

export default function JoinRequest() {
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, formState: { isSubmitting, errors } } = useForm()

  const onSubmit = async (data) => {
    const { error } = await supabase.from('solicitudes_ingreso').insert({
      nombre: data.nombre,
      correo: data.correo,
      carrera: data.carrera,
      motivacion: data.motivacion,
      estado: 'pendiente',
    })
    if (!error) setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[var(--c-bg)]">
      <motion.div
        className="w-full max-w-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Link to="/" className="inline-flex items-center gap-1.5 text-white/30 hover:text-white text-sm mb-6 transition-colors">
          <FiArrowLeft size={14} /> Volver al inicio
        </Link>

        {sent ? (
          <Card className="text-center py-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
            >
              <FiCheckCircle size={48} className="mx-auto text-[#22c55e] mb-4" />
            </motion.div>
            <h2 className="text-xl font-bold font-title text-white mb-2">¡Solicitud enviada!</h2>
            <p className="text-white/40 text-sm max-w-xs mx-auto">
              El equipo fundador revisará tu solicitud. Te contactaremos por correo pronto.
            </p>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 mt-6 text-sm text-[var(--c-primary)] hover:text-[var(--c-primary)]/80 transition-colors"
            >
              <FiArrowLeft size={12} /> Volver al inicio
            </Link>
          </Card>
        ) : (
          <Card>
            <div className="mb-6">
              <h1 className="text-2xl font-bold font-title text-white mb-1">Únete a DivergencIA</h1>
              <p className="text-white/40 text-sm">
                Completa tu solicitud para unirte al semillero de investigación en IA.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Nombre completo"
                placeholder="Tu nombre"
                {...register('nombre', { required: 'El nombre es obligatorio' })}
                error={errors.nombre?.message}
              />
              <Input
                label="Correo electrónico"
                type="email"
                placeholder="tu@universidad.edu"
                {...register('correo', {
                  required: 'El correo es obligatorio',
                  pattern: { value: /^\S+@\S+$/i, message: 'Correo inválido' },
                })}
                error={errors.correo?.message}
              />
              <Input
                label="Carrera"
                placeholder="Ingeniería de Sistemas, Matemáticas..."
                {...register('carrera', { required: 'La carrera es obligatoria' })}
                error={errors.carrera?.message}
              />
              <Textarea
                label="¿Por qué quieres unirte?"
                rows={4}
                placeholder="Cuéntanos tu motivación, áreas de interés en IA, experiencia previa..."
                {...register('motivacion', {
                  required: 'La motivación es obligatoria',
                  minLength: { value: 30, message: 'Mínimo 30 caracteres' },
                })}
                error={errors.motivacion?.message}
              />

              <Button type="submit" variant="solid" className="w-full gap-2" loading={isSubmitting}>
                <FiSend size={14} /> Enviar solicitud
              </Button>

              <p className="text-[11px] text-white/20 text-center">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="text-[var(--c-primary)] hover:underline">Inicia sesión</Link>
              </p>
            </form>
          </Card>
        )}
      </motion.div>
    </div>
  )
}
