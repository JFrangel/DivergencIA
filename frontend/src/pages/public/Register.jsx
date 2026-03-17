import { lazy, Suspense, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FiZap, FiMail, FiLock, FiUser, FiAlertCircle } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'

const ImmersiveBackground = lazy(() => import('../../components/visuals/ImmersiveBackground'))

const schema = z.object({
  nombre: z.string().min(2, 'Nombre requerido'),
  email: z.string().email('Correo inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  carrera: z.string().optional(),
  area_investigacion: z.string().optional(),
})

const AREAS = [
  { value: '', label: 'Área de investigación (opcional)' },
  { value: 'ML', label: 'Machine Learning' },
  { value: 'NLP', label: 'Procesamiento de Lenguaje' },
  { value: 'Vision', label: 'Computer Vision' },
  { value: 'Datos', label: 'Datos & Analytics' },
  { value: 'General', label: 'General / Otro' },
]

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [authError, setAuthError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data) => {
    setAuthError('')
    const { error } = await signUp({
      email: data.email,
      password: data.password,
      nombre: data.nombre,
    })
    if (error) {
      setAuthError(error.message || 'Error al crear cuenta')
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden py-8" style={{ background: 'var(--c-bg)' }}>
      <Suspense fallback={null}>
        <ImmersiveBackground intensity={0.5} />
      </Suspense>

      <div className="absolute inset-0 z-[1]" style={{
        background: 'radial-gradient(ellipse at center, transparent 0%, rgba(6,3,4,0.75) 100%)',
      }} />

      <motion.div
        className="relative z-10 w-full max-w-sm px-4"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="flex items-center gap-2.5 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #FC651F, #8B5CF6)' }}
            >
              <FiZap size={20} className="text-white" />
            </div>
            <span className="font-bold text-white text-xl font-title tracking-tight">
              Divergenc<span style={{ color: '#FC651F' }}>IA</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-white font-title">Únete al semillero</h1>
          <p className="text-sm text-white/40 mt-1">Crea tu cuenta de investigador</p>
        </div>

        <div className="glass rounded-2xl p-6 neon-border">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {authError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-sm">
                <FiAlertCircle size={15} />
                {authError}
              </div>
            )}

            <Input
              label="Nombre completo"
              placeholder="Tu nombre"
              icon={<FiUser size={15} />}
              error={errors.nombre?.message}
              {...register('nombre')}
            />

            <Input
              label="Correo electrónico"
              type="email"
              placeholder="tu@correo.com"
              icon={<FiMail size={15} />}
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Contraseña"
              type="password"
              placeholder="Mínimo 8 caracteres"
              icon={<FiLock size={15} />}
              error={errors.password?.message}
              {...register('password')}
            />

            <Input
              label="Carrera (opcional)"
              placeholder="Ej. Ingeniería en Sistemas"
              {...register('carrera')}
            />

            <Select
              options={AREAS}
              {...register('area_investigacion')}
            />

            <Button
              type="submit"
              variant="solid"
              size="md"
              className="w-full mt-2"
              loading={isSubmitting}
            >
              Crear cuenta
            </Button>
          </form>

          <p className="text-center text-sm text-white/40 mt-4">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-[#FC651F] hover:text-[#FF8040] transition-colors font-medium">
              Iniciar sesión
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
