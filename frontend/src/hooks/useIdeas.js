import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { toast } from 'sonner'
import { createNotification } from './useNotifications'
import { trackProgress } from '../lib/trackProgress'

export function useIdeas({ estado, area, sort = 'votos', searchQuery = '' } = {}) {
  const { user } = useAuth()
  const [ideas, setIdeas] = useState([])
  const [loading, setLoading] = useState(true)
  const [myVotes, setMyVotes] = useState({}) // { idea_id: 'favor'|'contra' }
  const [voteCounts, setVoteCounts] = useState({}) // { idea_id: count }

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('ideas')
      .select('*, autor:usuarios!ideas_autor_id_fkey(id, nombre, foto_url, area_investigacion)')

    if (estado) query = query.eq('estado', estado)
    if (area) query = query.eq('area_relacionada', area)

    // Apply sort
    if (sort === 'votos') {
      query = query.order('votos_favor', { ascending: false })
    } else if (sort === 'fecha') {
      query = query.order('created_at', { ascending: false })
    } else if (sort === 'deadline') {
      query = query.order('fecha_limite_votacion', { ascending: true, nullsFirst: false })
    }

    const { data } = await query
    setIdeas(data || [])

    // Load my votes
    if (user) {
      const { data: votes } = await supabase
        .from('votos_ideas')
        .select('idea_id, tipo')
        .eq('usuario_id', user.id)
      const map = {}
      votes?.forEach(v => { map[v.idea_id] = v.tipo })
      setMyVotes(map)
    }

    // Load vote counts per idea
    if (data?.length) {
      const ids = data.map(i => i.id)
      const { data: counts } = await supabase
        .from('votos_ideas')
        .select('idea_id')
        .in('idea_id', ids)
      const countMap = {}
      counts?.forEach(v => {
        countMap[v.idea_id] = (countMap[v.idea_id] || 0) + 1
      })
      setVoteCounts(countMap)
    }

    setLoading(false)
  }, [estado, area, sort, user])

  useEffect(() => { fetch() }, [fetch])

  // Client-side filtering for search
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return ideas
    const q = searchQuery.toLowerCase()
    return ideas.filter(i =>
      i.titulo?.toLowerCase().includes(q) ||
      i.descripcion?.toLowerCase().includes(q) ||
      i.area_relacionada?.toLowerCase().includes(q)
    )
  }, [ideas, searchQuery])

  // Check if voting is expired for a given idea
  const isVotingExpired = useCallback((idea) => {
    if (!idea?.fecha_limite_votacion) return false
    return new Date(idea.fecha_limite_votacion).getTime() < Date.now()
  }, [])

  const create = async (payload) => {
    const { data, error } = await supabase
      .from('ideas')
      .insert({ ...payload, autor_id: user?.id, estado: payload.estado || 'votacion' })
      .select('*, autor:usuarios!ideas_autor_id_fkey(id, nombre, foto_url, area_investigacion)')
      .single()
    if (error) { toast.error('Error al crear idea'); return { error } }
    setIdeas(i => [data, ...i])
    toast.success('Idea publicada')
    trackProgress(user?.id, 'ideas_submitted', 1)
    return { data }
  }

  const vote = async (ideaId, tipo) => {
    if (!user) return

    // Check deadline
    const idea = ideas.find(i => i.id === ideaId)
    if (idea && isVotingExpired(idea)) {
      toast.error('La votacion de esta idea ha cerrado')
      return
    }

    const current = myVotes[ideaId]

    if (current === tipo) {
      // Remove vote
      await supabase.from('votos_ideas').delete()
        .eq('usuario_id', user.id).eq('idea_id', ideaId)
      setMyVotes(v => { const n = { ...v }; delete n[ideaId]; return n })
      setVoteCounts(c => ({ ...c, [ideaId]: Math.max(0, (c[ideaId] || 1) - 1) }))
    } else if (current) {
      // Change vote
      await supabase.from('votos_ideas')
        .update({ tipo })
        .eq('usuario_id', user.id).eq('idea_id', ideaId)
      setMyVotes(v => ({ ...v, [ideaId]: tipo }))
    } else {
      // New vote
      await supabase.from('votos_ideas')
        .insert({ usuario_id: user.id, idea_id: ideaId, tipo })
      setMyVotes(v => ({ ...v, [ideaId]: tipo }))
      setVoteCounts(c => ({ ...c, [ideaId]: (c[ideaId] || 0) + 1 }))
      trackProgress(user.id, 'votes_cast', 1)
    }

    // Notify the idea author about the new vote (only for new votes, not removals)
    if (!current || current !== tipo) {
      const idea = ideas.find(i => i.id === ideaId)
      const authorId = idea?.autor_id || idea?.autor?.id
      if (authorId && authorId !== user.id) {
        const voteLabel = tipo === 'favor' ? 'a favor' : 'en contra'
        createNotification(
          authorId,
          'votos',
          `Alguien voto ${voteLabel} de tu idea "${idea.titulo || 'Sin titulo'}"`,
          ideaId
        )
      }
    }

    // Refresh counters for this idea
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

  const updateEstado = async (id, nuevoEstado) => {
    const { error } = await supabase.from('ideas').update({ estado: nuevoEstado }).eq('id', id)
    if (!error) {
      setIdeas(i => i.map(x => x.id === id ? { ...x, estado: nuevoEstado } : x))
      toast.success('Estado actualizado')
    }
    return { error }
  }

  const updateIdea = async (id, payload) => {
    // Clean payload — only send columns that exist in the table
    const clean = {
      titulo:                payload.titulo,
      descripcion:           payload.descripcion ?? null,
      area_relacionada:      payload.area_relacionada ?? null,
      tags:                  payload.tags ?? [],
    }
    if (payload.fecha_limite_votacion !== undefined) {
      clean.fecha_limite_votacion = payload.fecha_limite_votacion
    }

    const { data, error } = await supabase
      .from('ideas')
      .update(clean)
      .eq('id', id)
      .select('*, autor:usuarios!ideas_autor_id_fkey(id, nombre, foto_url, area_investigacion)')
      .single()
    if (error) {
      console.error('[updateIdea]', error)
      toast.error(`Error: ${error.message || 'No se pudo actualizar'}`)
      return { error }
    }
    setIdeas(i => i.map(x => x.id === id ? data : x))
    toast.success('Idea actualizada')
    // Only track edits to own ideas
    const editedIdea = ideas.find(i => i.id === id)
    if (editedIdea?.autor_id === user?.id || editedIdea?.autor?.id === user?.id) {
      trackProgress(user?.id, 'ideas_edited', 1)
    }
    return { data }
  }

  // Merge ideas
  const mergeIdeas = async (targetId, sourceId, method = 'combinar') => {
    const target = ideas.find(i => i.id === targetId)
    const source = ideas.find(i => i.id === sourceId)
    if (!target || !source) return { error: 'Ideas no encontradas' }

    if (method === 'combinar') {
      // Merge descriptions and combine tags
      const merged = {
        descripcion: [target.descripcion, source.descripcion].filter(Boolean).join('\n\n---\n\n'),
        votos_favor: (target.votos_favor || 0) + (source.votos_favor || 0),
        votos_contra: (target.votos_contra || 0) + (source.votos_contra || 0),
        tags: [...new Set([...(target.tags || []), ...(source.tags || [])])],
      }
      await supabase.from('ideas').update(merged).eq('id', targetId)
      await supabase.from('ideas').update({ estado: 'archivada' }).eq('id', sourceId)
    } else if (method === 'absorber') {
      // Keep primary, archive secondary
      const merged = {
        votos_favor: (target.votos_favor || 0) + (source.votos_favor || 0),
        votos_contra: (target.votos_contra || 0) + (source.votos_contra || 0),
      }
      await supabase.from('ideas').update(merged).eq('id', targetId)
      await supabase.from('ideas').update({ estado: 'archivada' }).eq('id', sourceId)
    } else if (method === 'sintesis' || method === 'nueva_sintesis') {
      // Create new idea from both, archive originals
      const newIdea = {
        titulo: `${target.titulo} + ${source.titulo}`,
        descripcion: `## Origen: ${target.titulo}\n${target.descripcion || ''}\n\n## Origen: ${source.titulo}\n${source.descripcion || ''}`,
        area_relacionada: target.area_relacionada || source.area_relacionada,
        estado: 'votacion',
        autor_id: user?.id,
        votos_favor: 0,
        votos_contra: 0,
        tags: [...new Set([...(target.tags || []), ...(source.tags || [])])],
      }
      await supabase.from('ideas').insert(newIdea)
      await supabase.from('ideas').update({ estado: 'archivada' }).eq('id', targetId)
      await supabase.from('ideas').update({ estado: 'archivada' }).eq('id', sourceId)
    }

    await fetch()
    trackProgress(user?.id, 'ideas_merged', 1)
    return { success: true }
  }

  // Get vote details for an idea
  const getVoteDetails = async (ideaId) => {
    const { data } = await supabase
      .from('votos_ideas')
      .select('*, usuario:usuarios!votos_ideas_usuario_id_fkey(id, nombre, foto_url, area_investigacion)')
      .eq('idea_id', ideaId)
      .order('created_at', { ascending: false })
    return data || []
  }

  // Get related ideas by tags or area
  const getRelatedIdeas = useCallback((idea) => {
    if (!idea) return []
    return ideas.filter(i =>
      i.id !== idea.id && (
        i.area_relacionada === idea.area_relacionada ||
        (idea.tags?.length && i.tags?.some(t => idea.tags.includes(t)))
      )
    ).slice(0, 5)
  }, [ideas])

  return {
    ideas: filtered,
    allIdeas: ideas,
    loading,
    myVotes,
    voteCounts,
    refetch: fetch,
    create,
    vote,
    updateEstado,
    updateIdea,
    mergeIdeas,
    isVotingExpired,
    getVoteDetails,
    getRelatedIdeas,
  }
}
