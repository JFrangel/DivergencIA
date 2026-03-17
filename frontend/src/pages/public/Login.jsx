import { lazy, Suspense, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FiZap, FiMail, FiLock, FiAlertCircle } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

const ImmersiveBackground = lazy(() => import('../../components/visuals/ImmersiveBackground'))

const schema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [authError, setAuthError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  const onSubmit = async ({ email, password }) => {
    setAuthError('')
    const { error } = await signIn({ email, password })
    if (error) {
      setAuthError('Correo o contraseña incorrectos')
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden" style={{ background: 'var(--c-bg)' }}>
      <Suspense fallback={null}>
        <ImmersiveBackground intensity={0.6} />
      </Suspense>

      {/* Gradient overlay */}
      <div className="absolute inset-0 z-[1]" style={{
        background: 'radial-gradient(ellipse at center, transparent 0%, rgba(6,3,4,0.7) 100%)',
      }} />

      <motion.div
        className="relative z-10 w-full max-w-sm px-4"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="flex items-center gap-2.5 mb-3 group">
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
          <h1 className="text-2xl font-bold text-white font-title">Bienvenido de vuelta</h1>
          <p className="text-sm text-white/40 mt-1">Inicia sesión en tu cuenta</p>
        </div>

        {/* Form */}
        <div className="glass rounded-2xl p-6 neon-border">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {authError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-sm">
                <FiAlertCircle size={15} />
                {authError}
              </div>
            )}

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
              placeholder="••••••••"
              icon={<FiLock size={15} />}
              error={errors.password?.message}
              {...register('password')}
            />

            <Button
              type="submit"
              variant="solid"
              size="md"
              className="w-full mt-2"
              loading={isSubmitting}
            >
              Iniciar sesión
            </Button>
          </form>

          <p className="text-center text-sm text-white/40 mt-4">
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-[#FC651F] hover:text-[#FF8040] transition-colors font-medium">
              Únete al semillero
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
