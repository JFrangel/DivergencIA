import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const LOGRO_META = {
  fundador:             { icon: '👑', label: 'Fundador',            color: '#F59E0B' },
  investigador_elite:   { icon: '🔬', label: 'Investigador Elite',  color: '#8B5CF6' },
  primer_avance:        { icon: '🚀', label: 'Primer Avance',       color: '#FC651F' },
  documentador_maestro: { icon: '📚', label: 'Documentador Maestro',color: '#00D1FF' },
  conector:             { icon: '🔗', label: 'Conector',             color: '#22c55e' },
  ideador:              { icon: '💡', label: 'Ideador',              color: '#F59E0B' },
  primera_idea:         { icon: '✨', label: 'Primera Idea',         color: '#EC4899' },
  idea_mvp:             { icon: '🏆', label: 'Idea MVP',             color: '#FC651F' },
}

export { LOGRO_META }

export function useAchievements(userId) {
  const { user } = useAuth()
  const targetId = userId || user?.id
  const [logros, setLogros] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!targetId) { setLoading(false); return }
    setLoading(true)
    const { data } = await supabase
      .from('logros')
      .select('*')
      .eq('usuario_id', targetId)
      .order('fecha_obtenido', { ascending: false })
    setLogros(data || [])
    setLoading(false)
  }, [targetId])

  useEffect(() => { fetch() }, [fetch])

  return {
    logros,
    loading,
    refetch: fetch,
    getMeta: (tipo) => LOGRO_META[tipo] || { icon: '🏅', label: tipo, color: '#888' },
  }
}
