import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { getEmailTemplate } from '../lib/emailTemplates'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    // Escuchar cambios de sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setRole(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single()

    setProfile(data)
    setRole(data?.rol ?? 'miembro')
    setLoading(false)
  }

  // URL de redirección — usa la variable de entorno si existe, sino window.location.origin
  const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin

  async function signUp({ email, password, nombre, rol = 'miembro', carrera, area_investigacion }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nombre, rol, carrera, area_investigacion },
        emailRedirectTo: `${siteUrl}/dashboard`,
      },
    })

    // If signup succeeded and we have a user, update the usuarios table with extra fields
    if (!error && data?.user?.id) {
      const extraFields = {}
      if (carrera) extraFields.carrera = carrera
      if (area_investigacion) extraFields.area_investigacion = area_investigacion
      if (Object.keys(extraFields).length > 0) {
        await supabase
          .from('usuarios')
          .update(extraFields)
          .eq('id', data.user.id)
      }

      // Create welcome notification for the new user
      await supabase.from('notificaciones').insert({
        usuario_id: data.user.id,
        tipo: 'bienvenida',
        mensaje: 'Bienvenido/a al semillero. Explora proyectos, comparte ideas y aprende con la comunidad.',
        leida: false,
        fecha: new Date().toISOString(),
      })

      // Send welcome email using premium template
      try {
        const { subject, html } = getEmailTemplate('bienvenida', { nombre: nombre || email.split('@')[0] })
        await supabase.functions.invoke('send-email', { body: { to: email, subject, html } })
      } catch (e) {
        console.warn('Welcome email failed (non-critical):', e)
      }
    }

    return { data, error }
  }

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  async function signInWithMagicLink(email) {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${siteUrl}/dashboard` },
    })
    return { data, error }
  }

  async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${siteUrl}/dashboard` },
    })
    return { data, error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function updateProfile(updates) {
    if (!user) return
    const { data, error } = await supabase
      .from('usuarios')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    if (!error) setProfile(data)
    return { data, error }
  }

  const isAdmin = role === 'admin' || role === 'directora'
  const isDirectora = role === 'directora'
  const isEgresado = role === 'egresado'
  const isColaborador = role === 'colaborador'
  const isInvitado = role === 'invitado'
  const isMember = !!user
  const canEdit = !!user && role !== 'invitado'
  const canManageRoles = role === 'directora'

  return (
    <AuthContext.Provider value={{
      user, profile, role, loading,
      isAdmin, isDirectora, isEgresado, isColaborador, isInvitado, isMember,
      canEdit, canManageRoles,
      signUp, signIn, signInWithMagicLink, signInWithGoogle, signOut, updateProfile,
      refreshProfile: () => user && fetchProfile(user.id),
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
