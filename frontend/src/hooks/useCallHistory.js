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

export function useRecentCallHistory() {
  const { user } = useAuth()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    // Get calls where user was initiator or participant
    supabase
      .from('historial_llamadas')
      .select('*, iniciador:iniciador_id(nombre, foto_url), canal:canal_id(nombre, tipo)')
      .order('iniciada_en', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        // Filter to calls the user participated in
        const mine = (data || []).filter(c => {
          if (c.iniciador_id === user.id) return true
          const parts = c.participantes || []
          return parts.some(p => p.userId === user.id)
        })
        setHistory(mine)
        setLoading(false)
      })
  }, [user])

  return { history, loading }
}
