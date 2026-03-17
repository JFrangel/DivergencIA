import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { toast } from 'sonner'

/** Insert a notification into the notificaciones table */
async function createNotification(userId, tipo, mensaje, referenciaId) {
  if (!userId) return
  const { error } = await supabase
    .from('notificaciones')
    .insert({
      usuario_id: userId,
      tipo,
      mensaje,
      referencia_id: referenciaId,
      leida: false,
      fecha: new Date().toISOString(),
    })
  if (error) console.error('Error creating notification:', error)
}

export function useProjects({ userId, all = false } = {}) {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('proyectos')
      .select(`
        *,
        creador:usuarios!proyectos_creador_id_fkey(id, nombre, foto_url, area_investigacion),
        miembros:miembros_proyecto(
          usuario:usuarios(id, nombre, foto_url, area_investigacion),
          rol_equipo, activo
        )
      `)
      .order('created_at', { ascending: false })

    if (!all && userId) {
      // proyectos donde el usuario es miembro o creador
      query = query.or(`creador_id.eq.${userId},id.in.(${
        // subquery via rpc no disponible directamente, usar join
        'select-placeholder'
      })`)
    }

    const { data, error } = await query
    if (error) { console.error(error); setLoading(false); return }
    setProjects(data || [])
    setLoading(false)
  }, [userId, all])

  useEffect(() => { fetch() }, [fetch])

  const create = async (payload) => {
    const { data, error } = await supabase
      .from('proyectos')
      .insert({ ...payload, creador_id: user?.id })
      .select()
      .single()
    if (error) { toast.error('Error al crear proyecto'); return { error } }
    setProjects(p => [data, ...p])
    toast.success('Proyecto creado')
    return { data }
  }

  const update = async (id, payload) => {
    const { data, error } = await supabase
      .from('proyectos')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) { toast.error('Error al actualizar'); return { error } }
    setProjects(p => p.map(x => x.id === id ? data : x))
    toast.success('Proyecto actualizado')
    return { data }
  }

  const remove = async (id) => {
    const { error } = await supabase.from('proyectos').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return { error } }
    setProjects(p => p.filter(x => x.id !== id))
    toast.success('Proyecto eliminado')
    return {}
  }

  return { projects, loading, refetch: fetch, create, update, remove }
}

export function useProject(id) {
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const { data } = await supabase
      .from('proyectos')
      .select(`
        *,
        creador:usuarios!proyectos_creador_id_fkey(id, nombre, foto_url, area_investigacion),
        miembros:miembros_proyecto(
          usuario:usuarios(id, nombre, foto_url, area_investigacion),
          rol_equipo, activo
        ),
        avances(*, autor:usuarios(id, nombre, foto_url)),
        tareas(*, asignado:usuarios(id, nombre, foto_url))
      `)
      .eq('id', id)
      .single()
    setProject(data)
    setLoading(false)
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  return { project, loading, refetch: fetch, setProject }
}

export function useAdvances(projectId) {
  const { user } = useAuth()
  const [advances, setAdvances] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!projectId) return
    supabase
      .from('avances')
      .select('*, autor:usuarios(id, nombre, foto_url, area_investigacion)')
      .eq('proyecto_id', projectId)
      .order('fecha', { ascending: false })
      .then(({ data }) => { setAdvances(data || []); setLoading(false) })
  }, [projectId])

  const create = async (payload) => {
    const { data, error } = await supabase
      .from('avances')
      .insert({ ...payload, proyecto_id: projectId, autor_id: user?.id })
      .select('*, autor:usuarios(id, nombre, foto_url, area_investigacion)')
      .single()
    if (error) { toast.error('Error al crear avance'); return { error } }
    setAdvances(a => [data, ...a])
    toast.success('Avance registrado')

    // Notify all project members about the new advance
    if (projectId) {
      const { data: members } = await supabase
        .from('miembros_proyecto')
        .select('usuario:usuarios(id)')
        .eq('proyecto_id', projectId)
        .eq('activo', true)
      const { data: proj } = await supabase
        .from('proyectos')
        .select('titulo')
        .eq('id', projectId)
        .single()
      const projectTitle = proj?.titulo || 'proyecto'
      ;(members || []).forEach((m) => {
        const memberId = m.usuario?.id
        if (memberId && memberId !== user?.id) {
          createNotification(
            memberId,
            'avances',
            `Nuevo avance "${data.titulo}" en "${projectTitle}"`,
            data.id
          )
        }
      })
    }

    return { data }
  }

  return { advances, loading, create }
}

export function useTasks(projectId) {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!projectId) return
    const { data } = await supabase
      .from('tareas')
      .select('*, asignado:usuarios(id, nombre, foto_url)')
      .eq('proyecto_id', projectId)
      .order('orden')
    setTasks(data || [])
    setLoading(false)
  }, [projectId])

  useEffect(() => { fetch() }, [fetch])

  const create = async (payload) => {
    const { data, error } = await supabase
      .from('tareas')
      .insert({ ...payload, proyecto_id: projectId })
      .select('*, asignado:usuarios(id, nombre, foto_url)')
      .single()
    if (error) { toast.error('Error al crear tarea'); return { error } }
    setTasks(t => [...t, data])

    // Notify the project creator about the new task
    if (projectId) {
      const { data: proj } = await supabase
        .from('proyectos')
        .select('creador_id, titulo')
        .eq('id', projectId)
        .single()
      if (proj && proj.creador_id && proj.creador_id !== user?.id) {
        createNotification(
          proj.creador_id,
          'tareas',
          `Nueva tarea "${data.titulo}" creada en "${proj.titulo}"`,
          data.id
        )
      }
    }

    return { data }
  }

  const updateTask = async (id, payload) => {
    const { data, error } = await supabase
      .from('tareas')
      .update(payload)
      .eq('id', id)
      .select('*, asignado:usuarios(id, nombre, foto_url)')
      .single()
    if (error) return { error }
    setTasks(t => t.map(x => x.id === id ? data : x))
    return { data }
  }

  const removeTask = async (id) => {
    await supabase.from('tareas').delete().eq('id', id)
    setTasks(t => t.filter(x => x.id !== id))
  }

  return { tasks, loading, refetch: fetch, create, updateTask, removeTask, setTasks }
}
