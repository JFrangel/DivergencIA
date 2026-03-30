import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useCallHistory(canalId) {
  const { user } = useAuth()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user || !canalId) return
    setLoading(true)
    supabase
      .from('historial_llamadas')
      .select('*, iniciador:iniciador_id(nombre, foto_url)')
      .eq('canal_id', canalId)
      .order('iniciada_en', { ascending: false })
      .limit(20)
      .then(({ data }) => { setHistory(data || []); setLoading(false) })
  }, [user, canalId])

  return { history, loading }
}
