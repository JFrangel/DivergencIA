import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'
import { getCached, setCached, invalidateCache } from '../lib/queryCache'

const NODOS_CACHE_KEY = 'nodos:all'

export function useNodos() {
  const { user, isAdmin } = useAuth()
  const [nodos, setNodos] = useState(() => getCached(NODOS_CACHE_KEY).data?.nodos || [])
  const [members, setMembers] = useState(() => getCached(NODOS_CACHE_KEY).data?.members || [])
  const [loading, setLoading] = useState(() => !getCached(NODOS_CACHE_KEY).data)

  const fetchNodos = useCallback(async (background = false) => {
    if (!background) setLoading(true)

    // Fetch active nodos for everyone + pending nodos for the current user (creator)
    let nodosQuery = supabase.from('nodos').select('*').order('orden').order('created_at')

    if (user) {
      // Admins/directoras see all nodos; others see active + their own pending
      const nodosFilter = isAdmin
        ? nodosQuery
        : nodosQuery.or(`estado.eq.activo,and(estado.eq.pendiente_aprobacion,creado_por.eq.${user.id})`)
      const { data: nodosData } = await nodosFilter

      const [{ data: miembrosData }, { data: usersData }] = await Promise.all([
        supabase.from('nodo_miembros').select('nodo_id, usuario_id, rol, joined_at, usuario:usuarios(id, nombre, foto_url, area_investigacion, rol, es_fundador)'),
        supabase.from('usuarios').select('id, nombre, foto_url, area_investigacion, rol, es_fundador, activo').eq('activo', true).order('nombre'),
      ])

      if (nodosData) {
        const usersMap = {}
        ;(usersData || []).forEach(u => { usersMap[u.id] = u })

        const membersByNodo = {}
        ;(miembrosData || []).forEach(m => {
          if (!membersByNodo[m.nodo_id]) membersByNodo[m.nodo_id] = []
          const user = m.usuario || usersMap[m.usuario_id]
          if (user) membersByNodo[m.nodo_id].push({ ...user, rol_nodo: m.rol, joined_at: m.joined_at })
        })
        const nodosWithMembers = nodosData.map(n => ({ ...n, miembros: membersByNodo[n.id] || [] }))
        setCached(NODOS_CACHE_KEY, { nodos: nodosWithMembers, members: usersData || [] })
        setNodos(nodosWithMembers)
        setMembers(usersData || [])
      }
    } else {
      // Not logged in: only fetch active nodos
      const [{ data: nodosData }, { data: miembrosData }, { data: usersData }] = await Promise.all([
        nodosQuery.eq('estado', 'activo'),
        supabase.from('nodo_miembros').select('nodo_id, usuario_id, rol, joined_at, usuario:usuarios(id, nombre, foto_url, area_investigacion, rol, es_fundador)'),
        supabase.from('usuarios').select('id, nombre, foto_url, area_investigacion, rol, es_fundador, activo').eq('activo', true).order('nombre'),
      ])

      if (nodosData) {
        const usersMap = {}
        ;(usersData || []).forEach(u => { usersMap[u.id] = u })

        const membersByNodo = {}
        ;(miembrosData || []).forEach(m => {
          if (!membersByNodo[m.nodo_id]) membersByNodo[m.nodo_id] = []
          const user = m.usuario || usersMap[m.usuario_id]
          if (user) membersByNodo[m.nodo_id].push({ ...user, rol_nodo: m.rol, joined_at: m.joined_at })
        })
        const nodosWithMembers = nodosData.map(n => ({ ...n, miembros: membersByNodo[n.id] || [] }))
        setCached(NODOS_CACHE_KEY, { nodos: nodosWithMembers, members: usersData || [] })
        setNodos(nodosWithMembers)
        setMembers(usersData || [])
      }
    }

    setLoading(false)
  }, [user, isAdmin])

  useEffect(() => {
    const { stale } = getCached(NODOS_CACHE_KEY)
    fetchNodos(stale === false)
  }, [fetchNodos])

  // Realtime: refetch when nodos or memberships change (e.g. admin panel updates)
  useEffect(() => {
    const channel = supabase
      .channel('nodos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nodos' }, () => { fetchNodos() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nodo_miembros' }, () => { fetchNodos() })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchNodos])

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const createNodo = useCallback(async ({ nombre, descripcion, color, icono, parent_id }) => {
    if (!user) return null
    const maxOrden = nodos.filter(n => n.parent_id === (parent_id || null)).length
    const estadoInicial = isAdmin ? 'activo' : 'pendiente_aprobacion'
    const { data, error } = await supabase
      .from('nodos')
      .insert({ nombre, descripcion, color, icono, parent_id: parent_id || null, creado_por: user.id, orden: maxOrden, estado: estadoInicial })
      .select()
      .single()
    if (error) { toast.error('Error al crear nodo'); return null }

    // Only notify admins if created by non-admin (pending approval needed)
    if (!isAdmin) {
      const { data: admins } = await supabase
        .from('usuarios')
        .select('id')
        .in('rol', ['admin', 'directora'])
      if (admins && admins.length > 0) {
        await supabase.from('notificaciones').insert(
          admins.map(admin => ({
            usuario_id: admin.id,
            tipo: 'nodo_pendiente',
            titulo: 'Nuevo nodo pendiente de aprobación',
            mensaje: `Se ha creado un nuevo nodo "${nombre}" esperando tu aprobación`,
            leida: false,
          }))
        ).catch(() => {})
      }
    }

    // Auto-create chat channel for this nodo
    const canalNombre = nombre.trim().toLowerCase().replace(/\s+/g, '-')
    const { data: canal } = await supabase
      .from('canales')
      .insert({ tipo: 'nodo', nombre: canalNombre, descripcion: `Canal del nodo ${nombre}`, nodo_id: data.id, nodo_tipo: 'investigacion', creado_por: user.id })
      .select()
      .single()
    if (canal) {
      await supabase.from('canal_miembros').insert({ canal_id: canal.id, usuario_id: user.id, puede_escribir: true })
    }

    toast.success(isAdmin ? `Nodo "${nombre}" creado` : `Nodo "${nombre}" creado — esperando aprobación del administrador`)
    await fetchNodos()
    return data
  }, [user, nodos, fetchNodos])

  const updateNodo = useCallback(async (id, updates) => {
    const { error } = await supabase.from('nodos').update(updates).eq('id', id)
    if (error) { toast.error('Error al actualizar nodo'); return false }
    toast.success('Nodo actualizado')
    await fetchNodos()
    return true
  }, [fetchNodos])

  const deleteNodo = useCallback(async (id) => {
    // Reparent children to grandparent
    const nodo = nodos.find(n => n.id === id)
    if (nodo) {
      await supabase.from('nodos').update({ parent_id: nodo.parent_id || null }).eq('parent_id', id)
    }
    const { error } = await supabase.from('nodos').update({ activo: false }).eq('id', id)
    if (error) { toast.error('Error al eliminar nodo'); return false }
    toast.success('Nodo eliminado')
    await fetchNodos()
    return true
  }, [nodos, fetchNodos])

  const duplicateNodo = useCallback(async (id) => {
    const nodo = nodos.find(n => n.id === id)
    if (!nodo || !user) return null
    const { data, error } = await supabase
      .from('nodos')
      .insert({
        nombre: `${nodo.nombre} (copia)`,
        descripcion: nodo.descripcion,
        color: nodo.color,
        icono: nodo.icono,
        parent_id: nodo.parent_id,
        creado_por: user.id,
        orden: nodo.orden + 1,
      })
      .select()
      .single()
    if (error) { toast.error('Error al duplicar nodo'); return null }
    // Copy members
    if (nodo.miembros?.length > 0) {
      await supabase.from('nodo_miembros').insert(
        nodo.miembros.map(m => ({ nodo_id: data.id, usuario_id: m.id, rol: m.rol_nodo || 'miembro' }))
      )
    }
    toast.success(`Nodo duplicado como "${data.nombre}"`)
    await fetchNodos()
    return data
  }, [nodos, user, fetchNodos])

  // ── MEMBER MANAGEMENT ────────────────────────────────────────────────────
  const addMembersToNodo = useCallback(async (nodoId, userIds, rol = 'miembro') => {
    const existing = nodos.find(n => n.id === nodoId)?.miembros?.map(m => m.id) || []
    const toAdd = userIds.filter(id => !existing.includes(id))
    if (!toAdd.length) { toast.info('Todos ya son miembros'); return }
    const { error } = await supabase.from('nodo_miembros').insert(
      toAdd.map(uid => ({ nodo_id: nodoId, usuario_id: uid, rol }))
    )
    if (error) { toast.error('Error al agregar miembros'); return }
    toast.success(`${toAdd.length} miembro(s) agregado(s)`)
    await fetchNodos()
  }, [nodos, fetchNodos])

  const removeMembersFromNodo = useCallback(async (nodoId, userIds) => {
    const { error } = await supabase
      .from('nodo_miembros')
      .delete()
      .eq('nodo_id', nodoId)
      .in('usuario_id', userIds)
    if (error) { toast.error('Error al remover miembros'); return }
    toast.success('Miembro(s) removido(s)')
    await fetchNodos()
  }, [fetchNodos])

  const moveMembersToNodo = useCallback(async (fromNodoId, toNodoId, userIds) => {
    // Remove from source
    await supabase.from('nodo_miembros').delete().eq('nodo_id', fromNodoId).in('usuario_id', userIds)
    // Add to target (upsert to avoid duplicates)
    await supabase.from('nodo_miembros').upsert(
      userIds.map(uid => ({ nodo_id: toNodoId, usuario_id: uid, rol: 'miembro' })),
      { onConflict: 'nodo_id,usuario_id' }
    )
    toast.success(`${userIds.length} miembro(s) movido(s)`)
    await fetchNodos()
  }, [fetchNodos])

  const updateMemberRole = useCallback(async (nodoId, userId, rol) => {
    await supabase.from('nodo_miembros').update({ rol }).eq('nodo_id', nodoId).eq('usuario_id', userId)
    await fetchNodos()
  }, [fetchNodos])

  // ── JOIN REQUESTS ─────────────────────────────────────────────────────────
  const requestJoinNodo = useCallback(async (nodoId, mensaje = '') => {
    if (!user) return false
    const { error } = await supabase.from('nodo_solicitudes').insert({
      nodo_id: nodoId,
      usuario_id: user.id,
      mensaje: mensaje || null,
      estado: 'pendiente',
    })
    if (error) {
      if (error.code === '23505') { toast.info('Ya tienes una solicitud pendiente para este nodo'); return false }
      toast.error('Error al enviar solicitud'); return false
    }

    // Notify nodo admins + platform admins/directoras
    const nodo = nodos.find(n => n.id === nodoId)
    const nodoAdmins = (nodo?.miembros || []).filter(m => m.rol_nodo === 'admin' || m.rol_nodo === 'owner')
    const nodoAdminIds = new Set(nodoAdmins.map(a => a.id))

    // Always fetch platform admins/directoras to ensure someone gets notified
    const { data: platformAdmins } = await supabase
      .from('usuarios')
      .select('id')
      .in('rol', ['admin', 'directora'])

    const allRecipients = [
      ...nodoAdmins.map(a => a.id),
      ...(platformAdmins || []).map(a => a.id).filter(id => !nodoAdminIds.has(id)),
    ]

    if (allRecipients.length > 0) {
      await supabase.from('notificaciones').insert(
        allRecipients.map(uid => ({
          usuario_id: uid,
          tipo: 'nodo_solicitud',
          titulo: 'Nueva solicitud de ingreso',
          mensaje: `${user.user_metadata?.nombre || user.email || 'Un miembro'} quiere unirse al nodo "${nodo?.nombre}"`,
          referencia_id: nodoId,
          leida: false,
          fecha: new Date().toISOString(),
        }))
      ).catch(() => {})
    }

    toast.success('Solicitud enviada — espera la aprobación del administrador')
    return true
  }, [user, nodos])

  const respondSolicitud = useCallback(async (solicitudId, estado, nodoId, usuarioId) => {
    if (!user) return false
    const { error } = await supabase
      .from('nodo_solicitudes')
      .update({ estado, respondido_por: user.id, updated_at: new Date().toISOString() })
      .eq('id', solicitudId)
    if (error) { toast.error('Error al responder solicitud'); return false }

    if (estado === 'aprobada') {
      // Add user as member of the nodo
      await supabase.from('nodo_miembros').upsert(
        { nodo_id: nodoId, usuario_id: usuarioId, rol: 'miembro' },
        { onConflict: 'nodo_id,usuario_id' }
      )
      // Also add to the nodo's chat channel
      const nodo = nodos.find(n => n.id === nodoId)
      const canalNombre = nodo?.nombre?.trim().toLowerCase().replace(/\s+/g, '-')
      if (canalNombre) {
        const { data: canal } = await supabase
          .from('canales').select('id').eq('nodo_id', nodoId).eq('tipo', 'nodo').single()
        if (canal) {
          await supabase.from('canal_miembros').upsert(
            { canal_id: canal.id, usuario_id: usuarioId, puede_escribir: true },
            { onConflict: 'canal_id,usuario_id' }
          ).catch(() => {})
        }
      }
    }

    // Notify the requesting user of the decision
    const nodo = nodos.find(n => n.id === nodoId)
    await supabase.from('notificaciones').insert({
      usuario_id: usuarioId,
      tipo: estado === 'aprobada' ? 'nodo_aprobado' : 'nodo_rechazado',
      titulo: estado === 'aprobada' ? '¡Solicitud aprobada!' : 'Solicitud rechazada',
      mensaje: estado === 'aprobada'
        ? `Tu solicitud para unirte a "${nodo?.nombre}" fue aprobada`
        : `Tu solicitud para unirte a "${nodo?.nombre}" fue rechazada`,
      leida: false,
      fecha: new Date().toISOString(),
    }).catch(() => {})

    toast.success(estado === 'aprobada' ? 'Solicitud aprobada' : 'Solicitud rechazada')
    await fetchNodos()
    return true
  }, [user, nodos, fetchNodos])

  const getPendingSolicitudes = useCallback(async () => {
    if (!user) return []
    // Get requests for nodos where I am admin/owner
    const myAdminNodos = nodos
      .filter(n => n.miembros?.some(m => m.id === user.id && (m.rol_nodo === 'admin' || m.rol_nodo === 'owner')))
      .map(n => n.id)

    if (myAdminNodos.length === 0) return []
    const { data } = await supabase
      .from('nodo_solicitudes')
      .select('*, usuario:usuarios(id, nombre, foto_url, area_investigacion), nodo:nodos(id, nombre, color, icono)')
      .in('nodo_id', myAdminNodos)
      .eq('estado', 'pendiente')
      .order('created_at', { ascending: false })
    return data || []
  }, [user, nodos])

  const getMyPendingSolicitudes = useCallback(async () => {
    if (!user) return []
    const { data } = await supabase
      .from('nodo_solicitudes')
      .select('nodo_id, estado')
      .eq('usuario_id', user.id)
    return data || []
  }, [user])

  // ── NODO APPROVAL (ADMIN ONLY) ────────────────────────────────────────────
  const getPendingNodos = useCallback(async () => {
    if (!user) return []
    // Get pending nodos where user is admin
    const { data } = await supabase
      .from('nodos')
      .select('id, nombre, descripcion, creado_por, created_at, creator:usuarios(id, nombre, foto_url)')
      .eq('estado', 'pendiente_aprobacion')
      .order('created_at', { ascending: false })
    return data || []
  }, [user])

  const approvePendingNodo = useCallback(async (nodoId) => {
    const { error } = await supabase
      .from('nodos')
      .update({ estado: 'activo' })
      .eq('id', nodoId)
    if (error) { toast.error('Error al aprobar nodo'); return false }

    // Notify creator
    const nodo = nodos.find(n => n.id === nodoId)
    if (nodo?.creado_por) {
      await supabase.from('notificaciones').insert({
        usuario_id: nodo.creado_por,
        tipo: 'nodo_aprobado',
        titulo: '¡Nodo aprobado!',
        mensaje: `Tu nodo "${nodo.nombre}" ha sido aprobado y es ahora visible para todos`,
        leida: false,
      }).catch(() => {})
    }

    toast.success('Nodo aprobado')
    await fetchNodos()
    return true
  }, [nodos, fetchNodos])

  const rejectPendingNodo = useCallback(async (nodoId) => {
    const { error } = await supabase
      .from('nodos')
      .update({ estado: 'archivado' })
      .eq('id', nodoId)
    if (error) { toast.error('Error al rechazar nodo'); return false }

    // Notify creator
    const nodo = nodos.find(n => n.id === nodoId)
    if (nodo?.creado_por) {
      await supabase.from('notificaciones').insert({
        usuario_id: nodo.creado_por,
        tipo: 'nodo_rechazado',
        titulo: 'Nodo rechazado',
        mensaje: `Tu nodo "${nodo.nombre}" ha sido rechazado. Contacta al administrador para más información.`,
        leida: false,
      }).catch(() => {})
    }

    toast.success('Nodo rechazado')
    await fetchNodos()
    return true
  }, [nodos, fetchNodos])

  // Build tree structure
  const tree = buildTree(nodos)

  return {
    nodos, tree, members, loading, refetch: fetchNodos,
    createNodo, updateNodo, deleteNodo, duplicateNodo,
    addMembersToNodo, removeMembersFromNodo, moveMembersToNodo, updateMemberRole,
    requestJoinNodo, respondSolicitud, getPendingSolicitudes, getMyPendingSolicitudes,
    getPendingNodos, approvePendingNodo, rejectPendingNodo,
  }
}

// Build hierarchical tree from flat list
function buildTree(nodos) {
  const map = {}
  const roots = []
  nodos.forEach(n => { map[n.id] = { ...n, children: [] } })
  nodos.forEach(n => {
    if (n.parent_id && map[n.parent_id]) {
      map[n.parent_id].children.push(map[n.id])
    } else {
      roots.push(map[n.id])
    }
  })
  return roots
}
