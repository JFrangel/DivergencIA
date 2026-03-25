import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

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
      .maybeSingle()

    if (!data) {
      // Profile missing (OAuth user who bypassed /auth/callback) — auto-create
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser) {
        const meta = authUser.user_metadata || {}
        const nombre = meta.full_name || meta.name || authUser.email?.split('@')[0] || 'Investigador'
        const foto_url = meta.avatar_url || meta.picture || null
        const { data: created } = await supabase
          .from('usuarios')
          .insert({ id: userId, nombre, correo: authUser.email, foto_url, rol: 'miembro', activo: true })
          .select()
          .single()
        setProfile(created)
        setRole('miembro')
      } else {
        setProfile(null)
        setRole(null)
      }
    } else {
      setProfile(data)
      setRole(data?.rol ?? 'miembro')
    }
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
        titulo: '¡Bienvenido/a a DivergencIA!',
        mensaje: 'Explora proyectos, comparte ideas y aprende con la comunidad.',
        leida: false,
        fecha: new Date().toISOString(),
      })

      // Send welcome email via Edge Function (best-effort)
      try {
        await supabase.functions.invoke('send-email', {
          body: { to: data.user.email, tipo: 'bienvenida', nombre },
        })
      } catch { /* ignore email errors */ }
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
      options: { redirectTo: `${siteUrl}/auth/callback` },
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
