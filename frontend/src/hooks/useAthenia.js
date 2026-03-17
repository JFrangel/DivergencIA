import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useAthenia() {
  const { user } = useAuth()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    supabase
      .from('athenia_memoria')
      .select('*')
      .eq('usuario_id', user.id)
      .order('timestamp', { ascending: true })
      .limit(50)
      .then(({ data }) => {
        setHistory(data || [])
        setLoading(false)
      })
  }, [user])

  const saveMessage = useCallback(async (mensaje, rol) => {
    if (!user) return
    const msg = {
      usuario_id: user.id,
      mensaje,
      rol, // 'user' | 'assistant'
    }
    const { data } = await supabase.from('athenia_memoria').insert(msg).select().single()
    if (data) setHistory(h => [...h, data])
    return data
  }, [user])

  const clearHistory = useCallback(async () => {
    if (!user) return
    await supabase.from('athenia_memoria').delete().eq('usuario_id', user.id)
    setHistory([])
  }, [user])

  // Build context string for Gemini
  const buildContext = useCallback(async () => {
    const [{ count: miembros }, { count: proyectos }, { count: ideas }] = await Promise.all([
      supabase.from('usuarios').select('*', { count: 'exact', head: true }),
      supabase.from('proyectos').select('*', { count: 'exact', head: true }),
      supabase.from('ideas').select('*', { count: 'exact', head: true }),
    ])
    return `Semillero DivergencIA: ${miembros} investigadores, ${proyectos} proyectos activos, ${ideas} ideas en el banco. Plataforma universitaria de investigación en IA.`
  }, [])

  return { history, loading, saveMessage, clearHistory, buildContext }
}
