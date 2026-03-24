import { lazy, Suspense, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FiZap, FiMail, FiLock, FiAlertCircle, FiCheck, FiArrowLeft } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

const ImmersiveBackground = lazy(() => import('../../components/visuals/ImmersiveBackground'))

const schema = z.object({
  email: z.string().email('Correo inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

const magicSchema = z.object({
  email: z.string().email('Correo inválido'),
})

export default function Login() {
  const { signIn, signInWithMagicLink, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [authError, setAuthError] = useState('')
  const [loginMode, setLoginMode] = useState('password') // 'password' | 'magic'
  const [magicSent, setMagicSent] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
  })

  const { register: regMagic, handleSubmit: handleMagic, formState: { errors: magicErrors, isSubmitting: magicSubmitting } } = useForm({
    resolver: zodResolver(magicSchema),
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

  const onMagicSubmit = async ({ email }) => {
    setAuthError('')
    const { error } = await signInWithMagicLink(email)
    if (error) {
      setAuthError('Error al enviar el enlace. Intenta de nuevo.')
    } else {
      setMagicSent(true)
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
          {/* Mode toggle */}
          <div className="flex rounded-xl bg-white/[0.04] p-1 mb-5">
            <button
              type="button"
              onClick={() => { setLoginMode('password'); setAuthError(''); setMagicSent(false) }}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${loginMode === 'password' ? 'bg-[var(--c-primary)]/15 text-[var(--c-primary)]' : 'text-white/30 hover:text-white/50'}`}
            >
              <FiLock className="inline mr-1.5" size={12} />Contraseña
            </button>
            <button
              type="button"
              onClick={() => { setLoginMode('magic'); setAuthError(''); setMagicSent(false) }}
              className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${loginMode === 'magic' ? 'bg-[var(--c-secondary)]/15 text-[var(--c-secondary)]' : 'text-white/30 hover:text-white/50'}`}
            >
              <FiMail className="inline mr-1.5" size={12} />Magic Link
            </button>
          </div>

          {authError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-sm mb-4">
              <FiAlertCircle size={15} />
              {authError}
            </div>
          )}

          <AnimatePresence mode="wait">
            {loginMode === 'password' ? (
              <motion.form
                key="password"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4"
              >
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
              </motion.form>
            ) : magicSent ? (
              <motion.div
                key="magic-sent"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 space-y-3"
              >
                <div className="w-14 h-14 rounded-full bg-[#22c55e]/15 border border-[#22c55e]/20 flex items-center justify-center mx-auto">
                  <FiCheck size={24} className="text-[#22c55e]" />
                </div>
                <h3 className="text-white font-semibold">¡Enlace enviado!</h3>
                <p className="text-white/40 text-sm">Revisa tu bandeja de entrada y haz clic en el enlace para iniciar sesión.</p>
                <button
                  type="button"
                  onClick={() => { setMagicSent(false); setLoginMode('password') }}
                  className="text-xs text-white/30 hover:text-white/50 transition-colors flex items-center gap-1 mx-auto mt-3"
                >
                  <FiArrowLeft size={11} /> Volver al login
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="magic"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleMagic(onMagicSubmit)}
                className="space-y-4"
              >
                <p className="text-xs text-white/30 mb-2">Te enviaremos un enlace de acceso a tu correo. Sin contraseña necesaria.</p>
                <Input
                  label="Correo electrónico"
                  type="email"
                  placeholder="tu@correo.com"
                  icon={<FiMail size={15} />}
                  error={magicErrors.email?.message}
                  {...regMagic('email')}
                />
                <Button
                  type="submit"
                  variant="solid"
                  size="md"
                  className="w-full mt-2"
                  loading={magicSubmitting}
                >
                  Enviar enlace mágico
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Google OAuth */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.07]" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-3 text-[11px] text-white/25" style={{ background: 'rgba(14,6,9,0.6)' }}>o continúa con</span>
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
            ¿No tienes cuenta?{' '}
            <Link to="/register" className="text-[var(--c-primary)] hover:brightness-125 transition-all font-medium">
              Únete al semillero
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
