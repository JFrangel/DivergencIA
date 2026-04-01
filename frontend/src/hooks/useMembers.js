import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getCached, setCached } from '../lib/queryCache'

export function useMembers({ area, search } = {}) {
  const cacheKey = `members:${area || ''}:${search || ''}`
  const [members, setMembers] = useState(() => getCached(cacheKey).data || [])
  const [loading, setLoading] = useState(() => !getCached(cacheKey).data)

  const fetch = useCallback(async (background = false) => {
    if (!background) setLoading(true)
    let query = supabase
      .from('usuarios')
      .select('id, nombre, rol, carrera, semestre, bio, foto_url, github_url, linkedin_url, habilidades, area_investigacion, activo, es_fundador, fecha_registro')
      .eq('activo', true)
      .order('es_fundador', { ascending: false })
      .order('fecha_registro', { ascending: true })

    if (area) query = query.eq('area_investigacion', area)
    if (search) query = query.ilike('nombre', `%${search}%`)

    const { data } = await query
    setCached(cacheKey, data || [])
    setMembers(data || [])
    setLoading(false)
  }, [area, search, cacheKey])

  useEffect(() => {
    const { stale } = getCached(cacheKey)
    fetch(stale === false)
  }, [fetch, cacheKey])

  return { members, loading, refetch: fetch }
}

export function useAllMembers() {
  const cacheKey = 'members:all'
  const [members, setMembers] = useState(() => getCached(cacheKey).data || [])
  const [loading, setLoading] = useState(() => !getCached(cacheKey).data)

  useEffect(() => {
    const { stale } = getCached(cacheKey)
    if (!stale) return // fresh cache — skip fetch
    supabase
      .from('usuarios')
      .select('id, nombre, foto_url, area_investigacion, es_fundador, activo, rol, fecha_registro, habilidades, carrera')
      .order('es_fundador', { ascending: false })
      .then(({ data }) => {
        setCached(cacheKey, data || [])
        setMembers(data || [])
        setLoading(false)
      })
  }, [])

  return { members, loading }
}

export function useMember(id) {
  const [member, setMember] = useState(null)
  const [stats, setStats] = useState({ proyectos: 0, avances: 0, ideas: 0, archivos: 0 })
  const [proyectos, setProyectos] = useState([])
  const [avances, setAvances] = useState([])
  const [nodosData, setNodosData] = useState([])
  const [groupCanales, setGroupCanales] = useState([])
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
      supabase.from('miembros_proyecto').select('proyecto:proyectos(id, titulo, estado)').eq('usuario_id', id).eq('activo', true).limit(6),
      supabase.from('avances').select('titulo, fecha, proyecto:proyectos(titulo)').eq('autor_id', id).order('fecha', { ascending: false }).limit(5),
      supabase.from('nodo_miembros').select('rol, nodo:nodos(id, nombre, descripcion, color, icono)').eq('usuario_id', id),
      supabase.from('canal_miembros').select('canal:canales(id, nombre, nodo_tipo)').eq('usuario_id', id),
    ]).then(([
      { data: m },
      { count: proy },
      { count: av },
      { count: id_ },
      { count: arch },
      { data: logros },
      { data: proyList },
      { data: avList },
      { data: nodosList },
      { data: groupList },
    ]) => {
      setMember({ ...m, logros: logros || [] })
      setStats({ proyectos: proy || 0, avances: av || 0, ideas: id_ || 0, archivos: arch || 0 })
      setProyectos(proyList?.map(p => p.proyecto).filter(Boolean) || [])
      setAvances(avList || [])
      setNodosData(nodosList?.map(n => ({ ...n.nodo, rol: n.rol })).filter(Boolean) || [])
      setGroupCanales((groupList || []).map(cm => cm.canal).filter(c => c && c.nodo_tipo === 'grupo'))
      setLoading(false)
    })
  }, [id])

  return { member, stats, proyectos, avances, nodosData, groupCanales, loading }
}
