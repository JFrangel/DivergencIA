import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { toast } from 'sonner'
import { getCached, setCached } from '../lib/queryCache'

export function useTopics({ categoria, nivel } = {}) {
  const { user } = useAuth()
  const cacheKey = `topics:${categoria || ''}:${nivel || ''}`
  const [topics, setTopics] = useState(() => getCached(cacheKey).data || [])
  const [loading, setLoading] = useState(() => !getCached(cacheKey).data)

  const fetchTopics = useCallback(async (background = false) => {
    if (!background) setLoading(true)
    let query = supabase
      .from('temas_aprendizaje')
      .select('*, skills_relacionadas, autor:usuarios!temas_aprendizaje_autor_id_fkey(id, nombre, foto_url, area_investigacion)')
      .eq('activo', true)
      .order('orden', { ascending: true })

    if (categoria) query = query.eq('categoria', categoria)
    if (nivel) query = query.eq('nivel', nivel)

    const { data, error } = await query
    if (error) {
      toast.error('Error al cargar temas')
      console.error(error)
    }
    setCached(cacheKey, data || [])
    setTopics(data || [])
    setLoading(false)
  }, [categoria, nivel, cacheKey])

  useEffect(() => {
    const { stale } = getCached(cacheKey)
    fetchTopics(stale === false)
  }, [fetchTopics, cacheKey])

  const createTopic = async (payload) => {
    const { data, error } = await supabase
      .from('temas_aprendizaje')
      .insert({
        ...payload,
        autor_id: user?.id,
        activo: true,
        contenido: payload.contenido || [],
        recursos: payload.recursos || [],
      })
      .select('*, skills_relacionadas, autor:usuarios!temas_aprendizaje_autor_id_fkey(id, nombre, foto_url, area_investigacion)')
      .single()

    if (error) {
      toast.error('Error al crear tema')
      return { error }
    }
    setTopics(prev => [data, ...prev])
    toast.success('Tema creado exitosamente')
    return { data }
  }

  const updateTopic = async (id, updates) => {
    const { data, error } = await supabase
      .from('temas_aprendizaje')
      .update(updates)
      .eq('id', id)
      .select('*, skills_relacionadas, autor:usuarios!temas_aprendizaje_autor_id_fkey(id, nombre, foto_url, area_investigacion)')
      .single()

    if (error) {
      toast.error('Error al actualizar tema')
      return { error }
    }
    setTopics(prev => prev.map(t => t.id === id ? data : t))
    toast.success('Tema actualizado')
    return { data }
  }

  const deleteTopic = async (id) => {
    const { error } = await supabase
      .from('temas_aprendizaje')
      .update({ activo: false })
      .eq('id', id)

    if (error) {
      toast.error('Error al eliminar tema')
      return { error }
    }
    setTopics(prev => prev.filter(t => t.id !== id))
    toast.success('Tema eliminado')
    return { success: true }
  }

  return { topics, loading, refetch: fetchTopics, createTopic, updateTopic, deleteTopic }
}
