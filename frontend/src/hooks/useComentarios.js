import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

/**
 * Hook for comments on avances, ideas, projects, or files.
 * Pass exactly ONE of: { avanceId, ideaId, proyectoId, archivoId }
 */
export function useComentarios({ avanceId, ideaId, proyectoId, archivoId } = {}) {
  const { user } = useAuth()
  const [comentarios, setComentarios] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchComentarios = useCallback(async () => {
    let query = supabase
      .from('comentarios')
      .select('*, autor:autor_id(id, nombre, area_investigacion, es_fundador)')
      .order('fecha', { ascending: true })

    if (avanceId) query = query.eq('avance_id', avanceId)
    else if (ideaId) query = query.eq('idea_id', ideaId)
    else if (proyectoId) query = query.eq('proyecto_id', proyectoId)
    else if (archivoId) query = query.eq('archivo_id', archivoId)
    else { setLoading(false); return }

    const { data } = await query
    setComentarios(data || [])
    setLoading(false)
  }, [avanceId, ideaId, proyectoId, archivoId])

  useEffect(() => { fetchComentarios() }, [fetchComentarios])

  // Realtime subscription
  useEffect(() => {
    const filter = avanceId
      ? `avance_id=eq.${avanceId}`
      : ideaId
        ? `idea_id=eq.${ideaId}`
        : proyectoId
          ? `proyecto_id=eq.${proyectoId}`
          : archivoId
            ? `archivo_id=eq.${archivoId}`
            : null

    if (!filter) return

    const channel = supabase
      .channel(`comentarios-${filter}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comentarios',
        filter,
      }, () => fetchComentarios())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [avanceId, ideaId, proyectoId, archivoId, fetchComentarios])

  const addComentario = async (contenido) => {
    if (!user || !contenido.trim()) return { error: 'No content' }
    const row = {
      contenido: contenido.trim(),
      autor_id: user.id,
      ...(avanceId && { avance_id: avanceId }),
      ...(ideaId && { idea_id: ideaId }),
      ...(proyectoId && { proyecto_id: proyectoId }),
      ...(archivoId && { archivo_id: archivoId }),
    }
    const { error } = await supabase.from('comentarios').insert(row)
    return { error }
  }

  const deleteComentario = async (id) => {
    const { error } = await supabase.from('comentarios').delete().eq('id', id)
    if (!error) setComentarios(prev => prev.filter(c => c.id !== id))
    return { error }
  }

  return { comentarios, loading, addComentario, deleteComentario, refresh: fetchComentarios }
}
