import { lazy, Suspense, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FiZap, FiMail, FiLock, FiUser, FiAlertCircle, FiUsers } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'

const ImmersiveBackground = lazy(() => import('../../components/visuals/ImmersiveBackground'))

const schema = z.object({
  nombre: z.string().min(2, 'Nombre requerido'),
  email: z.string().email('Correo inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  tipo_cuenta: z.enum(['miembro', 'egresado']).default('miembro'),
  carrera: z.string().optional(),
  area_investigacion: z.string().optional(),
})

const ACCOUNT_TYPES = [
  { value: 'miembro', label: 'Miembro activo', desc: 'Acceso completo al semillero' },
  { value: 'egresado', label: 'Egresado', desc: 'Acceso de lectura + publicar ideas' },
]

const AREAS = [
  { value: '', label: 'Área de investigación (opcional)' },
  { value: 'ML', label: 'Machine Learning' },
  { value: 'NLP', label: 'Procesamiento de Lenguaje' },
  { value: 'Vision', label: 'Computer Vision' },
  { value: 'Datos', label: 'Datos & Analytics' },
  { value: 'General', label: 'General / Otro' },
]

export default function Register() {
  const { signUp, signInWithGoogle } = useAuth()
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
      rol: data.tipo_cuenta || 'miembro',
      carrera: data.carrera,
      area_investigacion: data.area_investigacion,
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

            {/* Account type selector */}
            <div>
              <label className="block text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-2">
                <FiUsers className="inline mr-1" size={11} />
                Tipo de cuenta
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ACCOUNT_TYPES.map(t => (
                  <label
                    key={t.value}
                    className="relative flex flex-col p-3 rounded-xl border cursor-pointer transition-all duration-200 hover:border-[var(--c-primary)]/30"
                    style={{
                      background: 'var(--c-surface-1)',
                      borderColor: 'var(--c-border)',
                    }}
                  >
                    <input
                      type="radio"
                      value={t.value}
                      {...register('tipo_cuenta')}
                      className="peer sr-only"
                      defaultChecked={t.value === 'miembro'}
                    />
                    <span className="text-xs font-semibold text-white/60 peer-checked:text-[var(--c-primary)] transition-colors">
                      {t.label}
                    </span>
                    <span className="text-[10px] text-white/25 mt-0.5">{t.desc}</span>
                    <div
                      className="absolute inset-0 rounded-xl border-2 border-transparent peer-checked:border-[var(--c-primary)]/40 pointer-events-none transition-all duration-200"
                      style={{ boxShadow: 'none' }}
                    />
                  </label>
                ))}
              </div>
            </div>

            <Input
              label="Carrera (opcional)"
              placeholder="Ej. Ingenieria en Sistemas"
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

          {/* Google OAuth */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.07]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-[11px] text-white/25" style={{ background: 'rgba(14,6,9,0.6)' }}>o regístrate con</span>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => { setAuthError(''); const { error } = await signInWithGoogle(); if (error) setAuthError('Error al iniciar con Google') }}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl border border-white/[0.1] text-sm text-white/70 hover:text-white hover:bg-white/[0.06] hover:border-white/20 transition-all"
          >
            <svg width="16" height="16" viewBox="0 0 48 48" fill="none">
              <path d="M43.6 20.5H42V20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" fill="#FFC107"/>
              <path d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.5 29.3 4 24 4c-7.7 0-14.4 4.4-17.7 10.7z" fill="#FF3D00"/>
              <path d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.4 35.5 26.8 36.5 24 36.5c-5.2 0-9.5-3.4-11.1-8l-6.5 5C9.6 39.6 16.4 44 24 44z" fill="#4CAF50"/>
              <path d="M43.6 20.5H42V20H24v8h11.3c-.8 2.4-2.4 4.4-4.3 5.8l6.2 5.2C36.9 37.2 44 32 44 24c0-1.2-.1-2.3-.4-3.5z" fill="#1976D2"/>
            </svg>
            Continuar con Google
          </button>

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
