import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FiZap } from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import { getPlatformName } from '../../hooks/usePlatformConfig'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('Verificando sesión...')
  const platformName = getPlatformName()

  useEffect(() => {
    let handled = false

    const handleSession = async (session) => {
      if (handled) return
      handled = true

      if (!session?.user) {
        navigate('/login', { replace: true })
        return
      }

      const { user } = session
      setStatus('Configurando tu perfil...')

      // Check if profile already exists in usuarios table
      const { data: existing } = await supabase
        .from('usuarios')
        .select('id, nombre')
        .eq('id', user.id)
        .maybeSingle()

      if (!existing) {
        // New OAuth user — create profile from Google metadata
        const meta = user.user_metadata || {}
        const nombre =
          meta.full_name || meta.name || user.email?.split('@')[0] || 'Investigador'
        const foto_url = meta.avatar_url || meta.picture || null

        await supabase.from('usuarios').insert({
          id: user.id,
          nombre,
          correo: user.email,
          foto_url,
          rol: 'miembro',
          activo: true,
          created_at: new Date().toISOString(),
        })

        // Welcome notification
        await supabase.from('notificaciones').insert({
          usuario_id: user.id,
          tipo: 'bienvenida',
          titulo: `¡Bienvenido/a a ${platformName}!`,
          mensaje: `Hola ${nombre}, ya eres parte del semillero. Explora proyectos, comparte ideas y conecta con investigadores.`,
          leida: false,
          fecha: new Date().toISOString(),
        })

        // Send welcome email via Edge Function (best-effort)
        try {
          await supabase.functions.invoke('send-email', {
            body: { to: user.email, tipo: 'bienvenida', nombre },
          })
        } catch { /* ignore email errors */ }

        setStatus('¡Bienvenido/a al semillero!')
      } else {
        setStatus('Sesión iniciada ✓')
      }

      setTimeout(() => navigate('/dashboard', { replace: true }), 900)
    }

    // Handle existing session (page reload case)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) handleSession(session)
    })

    // Handle OAuth redirect (code exchange triggers SIGNED_IN)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        handleSession(session)
      } else if (event === 'SIGNED_OUT') {
        navigate('/login', { replace: true })
      }
    })

    // Timeout fallback — if nothing happens in 8s, redirect to login
    const timeout = setTimeout(() => {
      if (!handled) navigate('/login', { replace: true })
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [navigate])

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center"
      style={{ background: 'var(--c-bg)' }}
    >
      <motion.div
        className="flex flex-col items-center gap-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Logo */}
        <motion.div
          className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl"
          style={{ background: 'linear-gradient(135deg, #FC651F, #8B5CF6)' }}
          animate={{ scale: [1, 1.07, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <FiZap size={28} className="text-white" />
        </motion.div>

        {/* Text */}
        <div className="text-center">
          <p className="text-white font-bold text-xl font-title tracking-tight">
            {platformName}
          </p>
          <p className="text-white/40 text-sm mt-1.5">{status}</p>
        </div>

        {/* Dots */}
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{ background: '#FC651F' }}
              animate={{ opacity: [0.2, 1, 0.2] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3, ease: 'easeInOut' }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  )
}
