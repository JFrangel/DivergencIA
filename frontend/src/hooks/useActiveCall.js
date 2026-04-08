import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/**
 * Returns a map of canalId → { tipo, iniciador_id, participantes, iniciada_en }
 * for all channels with an active call. Subscribes to realtime changes.
 */
export function useActiveCalls(canalIds = []) {
  const { user } = useAuth()
  const [activeCalls, setActiveCalls] = useState({}) // { [canalId]: callInfo }

  const fetchActive = useCallback(async () => {
    if (!user || !canalIds.length) return
    const { data } = await supabase
      .from('historial_llamadas')
      .select('id, canal_id, tipo, iniciador_id, participantes, iniciada_en')
      .eq('estado', 'activa')
      .in('canal_id', canalIds)
    const map = {}
    ;(data || []).forEach(c => { map[c.canal_id] = c })
    setActiveCalls(map)
  }, [user, canalIds.join(',')])

  useEffect(() => { fetchActive() }, [fetchActive])

  // Realtime: watch historial_llamadas changes
  useEffect(() => {
    if (!user) return
    const ch = supabase
      .channel('active-calls-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'historial_llamadas' }, () => {
        fetchActive()
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user, fetchActive])

  return activeCalls
}

/**
 * Returns active call info for a single canal, or null if none.
 */
export function useActiveCallForChannel(canalId) {
  const { user } = useAuth()
  const [activeCall, setActiveCall] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchActive = useCallback(async () => {
    if (!user || !canalId) { setLoading(false); return }
    const { data } = await supabase
      .from('historial_llamadas')
      .select('id, canal_id, tipo, iniciador_id, participantes, iniciada_en, iniciador:iniciador_id(nombre, foto_url)')
      .eq('estado', 'activa')
      .eq('canal_id', canalId)
      .order('iniciada_en', { ascending: false })
      .limit(1)
      .maybeSingle()
    setActiveCall(data || null)
    setLoading(false)
  }, [user, canalId])

  useEffect(() => { fetchActive() }, [fetchActive])

  useEffect(() => {
    if (!user || !canalId) return
    const ch = supabase
      .channel(`active-call-${canalId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'historial_llamadas',
        filter: `canal_id=eq.${canalId}`,
      }, () => { fetchActive() })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user, canalId, fetchActive])

  return { activeCall, loading, refetch: fetchActive }
}
