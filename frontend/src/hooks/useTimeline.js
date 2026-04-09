import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const PAGE_SIZE = 20

/**
 * Fetches timeline entries with pagination, optional type/proyecto filters,
 * and realtime subscription that prepends new items.
 */
export function useTimeline({ tipo = null, proyectoId = null, limit = PAGE_SIZE } = {}) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const offsetRef = useRef(0)

  const buildQuery = useCallback((from = 0) => {
    let q = supabase
      .from('timeline_eventos')
      .select(`
        id, tipo, titulo, descripcion, icono,
        referencia_id, referencia_tabla,
        proyecto_id, nodo_id, metadata, es_publico, created_at,
        usuario:usuario_id(id, nombre, foto_url, area_investigacion),
        proyecto:proyecto_id(id, titulo),
        nodo:nodo_id(id, nombre, color)
      `)
      .eq('es_publico', true)
      .order('created_at', { ascending: false })
      .range(from, from + limit - 1)

    if (tipo) q = q.eq('tipo', tipo)
    if (proyectoId) q = q.eq('proyecto_id', proyectoId)

    return q
  }, [tipo, proyectoId, limit])

  const fetch = useCallback(async () => {
    if (!user) return
    setLoading(true)
    offsetRef.current = 0
    const { data, error } = await buildQuery(0)
    if (!error) {
      setItems(data || [])
      setHasMore((data || []).length === limit)
    }
    setLoading(false)
  }, [user, buildQuery, limit])

  const fetchMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const nextOffset = offsetRef.current + limit
    const { data } = await buildQuery(nextOffset)
    if (data?.length) {
      setItems(prev => [...prev, ...data])
      offsetRef.current = nextOffset
      setHasMore(data.length === limit)
    } else {
      setHasMore(false)
    }
    setLoadingMore(false)
  }, [loadingMore, hasMore, buildQuery, limit])

  useEffect(() => { fetch() }, [fetch])

  // Realtime: prepend new items as they arrive
  useEffect(() => {
    if (!user) return
    const ch = supabase
      .channel('timeline-realtime')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'timeline_eventos',
      }, async (payload) => {
        // Fetch the full row with joins
        const { data } = await supabase
          .from('timeline_eventos')
          .select(`
            id, tipo, titulo, descripcion, icono,
            referencia_id, referencia_tabla,
            proyecto_id, nodo_id, metadata, es_publico, created_at,
            usuario:usuario_id(id, nombre, foto_url, area_investigacion),
            proyecto:proyecto_id(id, titulo),
            nodo:nodo_id(id, nombre, color)
          `)
          .eq('id', payload.new.id)
          .maybeSingle()
        if (data) {
          setItems(prev => [data, ...prev])
        }
      })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [user])

  return { items, loading, loadingMore, hasMore, fetchMore, refetch: fetch }
}

/**
 * Lightweight version for dashboard widgets — no pagination, no realtime.
 */
export function useTimelineRecent(count = 5) {
  const { user } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    setLoading(true)
    supabase
      .from('timeline_eventos')
      .select(`
        id, tipo, titulo, icono, created_at,
        usuario:usuario_id(nombre, foto_url),
        proyecto:proyecto_id(id, titulo)
      `)
      .eq('es_publico', true)
      .order('created_at', { ascending: false })
      .limit(count)
      .then(({ data }) => {
        setItems(data || [])
        setLoading(false)
      })
  }, [user, count])

  return { items, loading }
}
