import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { toast } from 'sonner'

export function useIdeas({ estado, area } = {}) {
  const { user } = useAuth()
  const [ideas, setIdeas] = useState([])
  const [loading, setLoading] = useState(true)
  const [myVotes, setMyVotes] = useState({}) // { idea_id: 'favor'|'contra' }

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('ideas')
      .select('*, autor:usuarios!ideas_autor_id_fkey(id, nombre, foto_url, area_investigacion)')
      .order('votos_favor', { ascending: false })

    if (estado) query = query.eq('estado', estado)
    if (area) query = query.eq('area_relacionada', area)

    const { data } = await query
    setIdeas(data || [])

    // Cargar mis votos
    if (user) {
      const { data: votes } = await supabase
        .from('votos_ideas')
        .select('idea_id, tipo')
        .eq('usuario_id', user.id)
      const map = {}
      votes?.forEach(v => { map[v.idea_id] = v.tipo })
      setMyVotes(map)
    }

    setLoading(false)
  }, [estado, area, user])

  useEffect(() => { fetch() }, [fetch])

  const create = async (payload) => {
    const { data, error } = await supabase
      .from('ideas')
      .insert({ ...payload, autor_id: user?.id })
      .select('*, autor:usuarios!ideas_autor_id_fkey(id, nombre, foto_url, area_investigacion)')
      .single()
    if (error) { toast.error('Error al crear idea'); return { error } }
    setIdeas(i => [data, ...i])
    toast.success('Idea publicada')
    return { data }
  }

  const vote = async (ideaId, tipo) => {
    if (!user) return
    const current = myVotes[ideaId]

    if (current === tipo) {
      // quitar voto
      await supabase.from('votos_ideas').delete()
        .eq('usuario_id', user.id).eq('idea_id', ideaId)
      setMyVotes(v => { const n = { ...v }; delete n[ideaId]; return n })
    } else if (current) {
      // cambiar voto
      await supabase.from('votos_ideas')
        .update({ tipo })
        .eq('usuario_id', user.id).eq('idea_id', ideaId)
      setMyVotes(v => ({ ...v, [ideaId]: tipo }))
    } else {
      // nuevo voto
      await supabase.from('votos_ideas')
        .insert({ usuario_id: user.id, idea_id: ideaId, tipo })
      setMyVotes(v => ({ ...v, [ideaId]: tipo }))
    }

    // Refrescar contadores de esta idea
    const { data: updated } = await supabase
      .from('ideas')
      .select('votos_favor, votos_contra')
      .eq('id', ideaId)
      .single()
    if (updated) {
      setIdeas(ideas => ideas.map(i =>
        i.id === ideaId ? { ...i, ...updated } : i
      ))
    }
  }

  const updateEstado = async (id, estado) => {
    const { error } = await supabase.from('ideas').update({ estado }).eq('id', id)
    if (!error) setIdeas(i => i.map(x => x.id === id ? { ...x, estado } : x))
  }

  return { ideas, loading, myVotes, refetch: fetch, create, vote, updateEstado }
}
