import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useMembers({ area, search } = {}) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('usuarios')
      .select('id, nombre, rol, carrera, semestre, bio, foto_url, github_url, linkedin_url, habilidades, area_investigacion, activo, es_fundador, fecha_registro')
      .eq('activo', true)
      .order('es_fundador', { ascending: false })
      .order('fecha_registro', { ascending: true })

    if (area) query = query.eq('area_investigacion', area)
    if (search) query = query.ilike('nombre', `%${search}%`)

    const { data } = await query
    setMembers(data || [])
    setLoading(false)
  }, [area, search])

  useEffect(() => { fetch() }, [fetch])

  return { members, loading, refetch: fetch }
}

export function useMember(id) {
  const [member, setMember] = useState(null)
  const [stats, setStats] = useState({ proyectos: 0, avances: 0, ideas: 0, archivos: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([
      supabase.from('usuarios').select('*').eq('id', id).single(),
      supabase.from('miembros_proyecto').select('*', { count: 'exact', head: true }).eq('usuario_id', id),
      supabase.from('avances').select('*', { count: 'exact', head: true }).eq('autor_id', id),
      supabase.from('ideas').select('*', { count: 'exact', head: true }).eq('autor_id', id),
      supabase.from('archivos').select('*', { count: 'exact', head: true }).eq('subido_por', id),
      supabase.from('logros').select('*').eq('usuario_id', id),
    ]).then(([{ data: m }, { count: proy }, { count: av }, { count: id_ }, { count: arch }, { data: logros }]) => {
      setMember({ ...m, logros: logros || [] })
      setStats({ proyectos: proy || 0, avances: av || 0, ideas: id_ || 0, archivos: arch || 0 })
      setLoading(false)
    })
  }, [id])

  return { member, stats, loading }
}
