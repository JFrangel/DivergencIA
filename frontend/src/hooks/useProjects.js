import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { toast } from 'sonner'
import { trackProgress } from '../lib/trackProgress'
import { getCached, setCached, invalidateCache } from '../lib/queryCache'

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
  const cacheKey = `projects:${userId || 'all'}:${all}`
  const [projects, setProjects] = useState(() => getCached(cacheKey).data || [])
  const [loading, setLoading] = useState(() => !getCached(cacheKey).data)

  const fetch = useCallback(async (background = false) => {
    if (!background) setLoading(true)
    let query = supabase
      .from('proyectos')
      .select(`
        *,
        creador:usuarios!creador_id(id, nombre, foto_url, area_investigacion),
        miembros:miembros_proyecto(
          usuario_id,
          usuario:usuarios(id, nombre, foto_url, area_investigacion),
          rol_equipo, roles, activo
        )
      `)
      .order('created_at', { ascending: false })

    if (!all && userId) {
      // Fetch all then filter client-side since subqueries are not directly supported
      const { data, error } = await query
      if (error) { console.error(error); setLoading(false); return }
      const filtered = (data || []).filter(p =>
        p.creador_id === userId ||
        p.miembros?.some(m => m.usuario?.id === userId && m.activo)
      )
      setCached(cacheKey, filtered)
      setProjects(filtered)
      setLoading(false)
      return
    }

    const { data, error } = await query
    if (error) { console.error(error); setLoading(false); return }
    setCached(cacheKey, data || [])
    setProjects(data || [])
    setLoading(false)
  }, [userId, all, cacheKey])

  useEffect(() => {
    const { stale } = getCached(cacheKey)
    fetch(stale === false)
  }, [fetch, cacheKey])

  const create = async (payload) => {
    const { _suggestedTasks, _suggestedWorkflow, _teamMembers, ...projectData } = payload
    const { data, error } = await supabase
      .from('proyectos')
      .insert({ ...projectData, creador_id: user?.id })
      .select()
      .single()
    if (error) { toast.error('Error al crear proyecto'); return { error } }

    // Add creator as a team member automatically
    if (data && user?.id) {
      await supabase.from('miembros_proyecto').insert({
        proyecto_id: data.id,
        usuario_id: user.id,
        rol_equipo: 'lider',
        activo: true,
      })
    }

    // Add selected team members
    if (data && _teamMembers?.length > 0) {
      const memberInserts = _teamMembers
        .filter(id => id !== user?.id)
        .map(uid => ({
          proyecto_id: data.id,
          usuario_id: uid,
          rol_equipo: 'miembro',
          activo: true,
        }))
      if (memberInserts.length > 0) {
        await supabase.from('miembros_proyecto').insert(memberInserts)
        // Notify each added member
        for (const uid of _teamMembers.filter(id => id !== user?.id)) {
          createNotification(
            uid,
            'proyectos',
            `Te han agregado al proyecto "${data.titulo || 'Nuevo proyecto'}"`,
            data.id
          )
        }
      }
    }

    // Create suggested tasks if requested
    if (data && _suggestedTasks?.length > 0) {
      const taskInserts = _suggestedTasks.map((t, i) => ({
        ...t,
        proyecto_id: data.id,
        orden: i,
      }))
      await supabase.from('tareas').insert(taskInserts)
    }

    // Save workflow data if provided
    if (data && _suggestedWorkflow) {
      await supabase
        .from('proyectos')
        .update({ workflow_data: _suggestedWorkflow })
        .eq('id', data.id)
    }

    setProjects(p => [data, ...p])
    toast.success('Proyecto creado')
    trackProgress(user?.id, 'projects_created', 1)
    if (data?.visibilidad === 'publico') trackProgress(user?.id, 'public_projects', 1)
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
    setProjects(p => p.map(x => x.id === id ? { ...x, ...data } : x))
    toast.success('Proyecto actualizado')
    return { data }
  }

  const remove = async (id) => {
    // Delete related records first
    await supabase.from('miembros_proyecto').delete().eq('proyecto_id', id)
    await supabase.from('tareas').delete().eq('proyecto_id', id)
    await supabase.from('avances').delete().eq('proyecto_id', id)
    const { error } = await supabase.from('proyectos').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return { error } }
    setProjects(p => p.filter(x => x.id !== id))
    toast.success('Proyecto eliminado')
    return {}
  }

  /** Request to join a project as a member */
  const requestJoinProject = async (projectId, mensaje = '') => {
    if (!user) return { error: 'not authenticated' }
    const { error } = await supabase.from('solicitudes_proyecto').insert({
      proyecto_id: projectId,
      usuario_id: user.id,
      mensaje: mensaje || null,
    })
    if (error) {
      if (error.code === '23505') { toast.info('Ya tienes una solicitud pendiente'); return { error } }
      toast.error('Error al enviar solicitud')
      return { error }
    }
    // Notify project leaders
    const project = projects.find(p => p.id === projectId)
    const leaders = project?.miembros?.filter(m => m.rol_equipo === 'lider' && m.activo) || []
    if (leaders.length) {
      await supabase.from('notificaciones').insert(
        leaders.map(l => ({
          usuario_id: l.usuario_id,
          tipo: 'solicitud_proyecto',
          titulo: 'Nueva solicitud de proyecto',
          mensaje: `${user.user_metadata?.nombre || 'Un miembro'} quiere unirse a "${project?.titulo}"`,
          referencia_id: projectId,
          leida: false,
          fecha: new Date().toISOString(),
        }))
      )
    }
    toast.success('Solicitud enviada')
    return {}
  }

  /** Get pending join requests for projects where current user is leader */
  const getPendingProjectRequests = async () => {
    if (!user) return []
    const { data } = await supabase
      .from('solicitudes_proyecto')
      .select('*, proyecto:proyectos(id,titulo), solicitante:usuarios!solicitudes_proyecto_usuario_id_fkey(id,nombre,foto_url,carrera)')
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false })
    // Filter to projects where user is leader (already enforced by RLS, but filter client-side too)
    return data || []
  }

  /** Approve or reject a project join request */
  const respondProjectRequest = async (solicitudId, estado, proyectoId, usuarioId) => {
    const { error } = await supabase
      .from('solicitudes_proyecto')
      .update({ estado, respondida_por: user.id, updated_at: new Date().toISOString() })
      .eq('id', solicitudId)
    if (error) { toast.error('Error al responder solicitud'); return }

    if (estado === 'aprobada') {
      await supabase.from('miembros_proyecto').upsert({
        proyecto_id: proyectoId, usuario_id: usuarioId,
        rol_equipo: 'miembro', activo: true,
      }, { onConflict: 'proyecto_id,usuario_id' })
      await fetch() // refresh projects list
    }

    // Notify the requesting user
    const project = projects.find(p => p.id === proyectoId)
    await supabase.from('notificaciones').insert({
      usuario_id: usuarioId,
      tipo: 'solicitud_proyecto',
      titulo: estado === 'aprobada' ? '¡Solicitud aprobada!' : 'Solicitud rechazada',
      mensaje: estado === 'aprobada'
        ? `Fuiste aceptado en el proyecto "${project?.titulo}"`
        : `Tu solicitud para "${project?.titulo}" fue rechazada`,
      referencia_id: proyectoId,
      leida: false,
      fecha: new Date().toISOString(),
    })
    toast.success(estado === 'aprobada' ? 'Miembro añadido' : 'Solicitud rechazada')
  }

  return { projects, loading, refetch: fetch, create, update, remove, requestJoinProject, getPendingProjectRequests, respondProjectRequest }
}

export function useProject(id) {
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const { data, error } = await supabase
      .from('proyectos')
      .select(`
        *,
        creador:usuarios!proyectos_creador_id_fkey(id, nombre, foto_url, area_investigacion),
        miembros:miembros_proyecto(
          usuario_id,
          usuario:usuarios!miembros_proyecto_usuario_id_fkey(id, nombre, foto_url, area_investigacion, rol, es_fundador, carrera),
          rol_equipo, roles, activo
        ),
        avances(*, autor:usuarios!avances_autor_id_fkey(id, nombre, foto_url)),
        tareas(*, asignado:usuarios!tareas_asignado_a_fkey(id, nombre, foto_url))
      `)
      .eq('id', id)
      .single()
    if (error) console.error('Error fetching project:', error)
    setProject(data)
    setLoading(false)
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  const updateProject = async (payload) => {
    if (!id) return { error: 'No project id' }
    const { data, error } = await supabase
      .from('proyectos')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) { toast.error('Error al actualizar proyecto'); return { error } }
    setProject(p => ({ ...p, ...data }))
    toast.success('Proyecto actualizado')
    return { data }
  }

  const deleteProject = async () => {
    if (!id) return { error: 'No project id' }
    await supabase.from('miembros_proyecto').delete().eq('proyecto_id', id)
    await supabase.from('tareas').delete().eq('proyecto_id', id)
    await supabase.from('avances').delete().eq('proyecto_id', id)
    const { error } = await supabase.from('proyectos').delete().eq('id', id)
    if (error) { toast.error('Error al eliminar'); return { error } }
    toast.success('Proyecto eliminado')
    return {}
  }

  const addMember = async (userId, rolEquipo = 'miembro') => {
    if (!id || !userId) return { error: 'Missing data' }
    // Check if already a member (possibly inactive)
    const { data: existing } = await supabase
      .from('miembros_proyecto')
      .select('id, activo')
      .eq('proyecto_id', id)
      .eq('usuario_id', userId)
      .maybeSingle()

    if (existing) {
      if (!existing.activo) {
        // Reactivate
        const { error } = await supabase
          .from('miembros_proyecto')
          .update({ activo: true, rol_equipo: rolEquipo })
          .eq('id', existing.id)
        if (error) { toast.error('Error al agregar miembro'); return { error } }
      } else {
        toast.info('Ya es miembro del proyecto')
        return {}
      }
    } else {
      const { error } = await supabase.from('miembros_proyecto').insert({
        proyecto_id: id,
        usuario_id: userId,
        rol_equipo: rolEquipo,
        activo: true,
      })
      if (error) { toast.error('Error al agregar miembro'); return { error } }
    }

    // Notify the added member
    const { data: proj } = await supabase.from('proyectos').select('titulo').eq('id', id).single()
    createNotification(userId, 'proyectos', `Te han agregado al proyecto "${proj?.titulo || ''}"`, id)

    toast.success('Miembro agregado')
    await fetch() // Refresh project data
    return {}
  }

  const removeMember = async (userId) => {
    if (!id || !userId) return { error: 'Missing data' }
    const { error } = await supabase
      .from('miembros_proyecto')
      .update({ activo: false })
      .eq('proyecto_id', id)
      .eq('usuario_id', userId)
    if (error) { toast.error('Error al remover miembro'); return { error } }
    toast.success('Miembro removido')
    await fetch()
    return {}
  }

  const updateMemberRole = async (userId, rolEquipo, rolesArray) => {
    if (!id || !userId) return { error: 'Missing data' }
    const update = {}
    if (rolesArray !== undefined) update.roles = rolesArray
    if (rolEquipo !== undefined) update.rol_equipo = rolEquipo ?? (rolesArray?.[0] ?? null)
    const { error } = await supabase
      .from('miembros_proyecto')
      .update(update)
      .eq('proyecto_id', id)
      .eq('usuario_id', userId)
    if (error) { toast.error('Error al actualizar roles'); return { error } }
    toast.success('Roles actualizados')
    await fetch()
    return {}
  }

  return {
    project, loading, refetch: fetch, setProject,
    updateProject, deleteProject,
    addMember, removeMember, updateMemberRole,
  }
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
    trackProgress(user?.id, 'advances_logged', 1)

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
    const prevTask = tasks.find(t => t.id === id)
    const { data, error } = await supabase
      .from('tareas')
      .update(payload)
      .eq('id', id)
      .select('*, asignado:usuarios(id, nombre, foto_url)')
      .single()
    if (error) return { error }
    setTasks(t => t.map(x => x.id === id ? data : x))
    // Track task completion (only when transitioning to 'completada')
    if (payload.estado === 'completada' && prevTask?.estado !== 'completada') {
      trackProgress(user?.id, 'tasks_completed', 1)
      if (prevTask?.prioridad === 'alta') trackProgress(user?.id, 'critical_tasks', 1)
    }
    return { data }
  }

  const removeTask = async (id) => {
    await supabase.from('tareas').delete().eq('id', id)
    setTasks(t => t.filter(x => x.id !== id))
  }

  return { tasks, loading, refetch: fetch, create, updateTask, removeTask, setTasks }
}
