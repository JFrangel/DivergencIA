import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { toast } from 'sonner'

// Fire-and-forget: notify channel members of a new message
async function notifyChannelMembers({ canalId, canalTipo, canalNombre, senderName, senderId, contenido, tipo }) {
  // Only notify for DMs, groups, and node channels — skip noisy global channels
  if (canalTipo === 'global') return
  if (tipo === 'sistema') return

  const { data: memberships } = await supabase
    .from('canal_miembros')
    .select('usuario_id')
    .eq('canal_id', canalId)
    .neq('usuario_id', senderId)

  if (!memberships?.length) return

  const tipoNotif = canalTipo === 'directo' ? 'mensaje_directo' : 'mensaje_nuevo'
  let preview = contenido
  if (tipo === 'sticker') preview = 'envió un sticker'
  else if (tipo === 'imagen') preview = 'envió una imagen'
  else if (tipo === 'archivo') preview = 'envió un archivo'
  else if (contenido.length > 70) preview = contenido.substring(0, 70) + '…'

  const mensaje = canalTipo === 'directo'
    ? `${senderName} te envió un mensaje`
    : `${senderName} en #${canalNombre}: ${preview}`

  await supabase.from('notificaciones').insert(
    memberships.map(m => ({
      usuario_id: m.usuario_id,
      tipo: tipoNotif,
      mensaje,
      referencia_id: canalId,
      leida: false,
      fecha: new Date().toISOString(),
    }))
  )
}

// ─── useChannels — lista de canales del usuario ───────────────────────────────
export function useChannels() {
  const { user, isAdmin } = useAuth()
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchChannels = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data } = await supabase
      .from('canal_miembros')
      .select(`
        canal:canales(
          id, tipo, nombre, descripcion, creado_por, nodo_id, nodo_tipo, created_at, privado, welcome_msg, slowmode_seconds
        ),
        puede_escribir
      `)
      .eq('usuario_id', user.id)
      .order('unido_en', { ascending: true })

    if (data) {
      let ch = data
        .map(d => ({ ...d.canal, puede_escribir: d.puede_escribir }))
        .filter(Boolean)

      // Enrich DM channels with the other person's info
      const dmIds = ch.filter(c => c.tipo === 'directo').map(c => c.id)
      if (dmIds.length > 0) {
        const { data: dmMembers } = await supabase
          .from('canal_miembros')
          .select('canal_id, usuario:usuarios(id, nombre, foto_url, area_investigacion)')
          .in('canal_id', dmIds)
          .neq('usuario_id', user.id)
        const partnerMap = {}
        ;(dmMembers || []).forEach(m => { if (m.usuario) partnerMap[m.canal_id] = m.usuario })
        ch = ch.map(c => c.tipo === 'directo' ? { ...c, dm_partner: partnerMap[c.id] || null } : c)
      }

      setChannels(ch)
    }
    setLoading(false)
  }, [user])

  useEffect(() => { fetchChannels() }, [fetchChannels])

  // Realtime: si me añaden a un canal nuevo, refetch
  useEffect(() => {
    if (!user) return
    const sub = supabase
      .channel('my_canal_miembros')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'canal_miembros',
        filter: `usuario_id=eq.${user.id}`,
      }, () => fetchChannels())
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [user, fetchChannels])

  // Obtener o crear DM
  const openDM = useCallback(async (otherUserId) => {
    if (!user) return null
    const { data, error } = await supabase.rpc('get_or_create_dm', {
      user_a: user.id,
      user_b: otherUserId,
    })
    if (error) { toast.error('No se pudo abrir el chat'); return null }
    await fetchChannels()
    return data
  }, [user, fetchChannels])

  // Crear grupo
  const createGroup = useCallback(async (nombre, memberIds) => {
    if (!user || !nombre.trim()) return null
    const { data: canal, error } = await supabase
      .from('canales')
      .insert({ tipo: 'grupo', nombre: nombre.trim(), creado_por: user.id })
      .select()
      .single()
    if (error) { toast.error('Error al crear grupo'); return null }

    const members = [...new Set([user.id, ...memberIds])].map(uid => ({
      canal_id: canal.id,
      usuario_id: uid,
      puede_escribir: true,
    }))
    await supabase.from('canal_miembros').insert(members)
    await fetchChannels()
    return canal
  }, [user, fetchChannels])

  // Obtener o crear canal de nodo
  const getOrCreateNodeChannel = useCallback(async (nodoId, nodoTipo, nodoNombre, memberIds = [], isMember = true) => {
    if (!user) return null

    const { data: existing } = await supabase
      .from('canales')
      .select('*')
      .eq('nodo_id', nodoId)
      .eq('nodo_tipo', nodoTipo)
      .single()

    if (existing) {
      const { data: membership } = await supabase
        .from('canal_miembros')
        .select('puede_escribir')
        .eq('canal_id', existing.id)
        .eq('usuario_id', user.id)
        .maybeSingle()

      if (!membership) {
        await supabase.from('canal_miembros').insert({
          canal_id: existing.id,
          usuario_id: user.id,
          puede_escribir: isMember,
        })
      } else if (isMember && !membership.puede_escribir) {
        await supabase.from('canal_miembros')
          .update({ puede_escribir: true })
          .eq('canal_id', existing.id)
          .eq('usuario_id', user.id)
      }
      await fetchChannels()
      return existing
    }

    const { data: canal, error } = await supabase
      .from('canales')
      .insert({ tipo: 'nodo', nombre: nodoNombre, nodo_id: nodoId, nodo_tipo: nodoTipo, creado_por: user.id })
      .select()
      .single()
    if (error) return null

    const allMemberIds = [...new Set([...memberIds])]
    if (allMemberIds.length > 0) {
      await supabase.from('canal_miembros').insert(
        allMemberIds.map(uid => ({ canal_id: canal.id, usuario_id: uid, puede_escribir: true }))
      )
    }
    if (!allMemberIds.includes(user.id)) {
      await supabase.from('canal_miembros').insert({
        canal_id: canal.id, usuario_id: user.id, puede_escribir: isMember,
      })
    }
    await fetchChannels()
    return canal
  }, [user, fetchChannels])

  // Crear canal de nodo (admin only)
  const createNodeChannel = useCallback(async (nombre, descripcion = '', memberIds = []) => {
    if (!user || !nombre.trim()) return null
    const { data: canal, error } = await supabase
      .from('canales')
      .insert({ tipo: 'nodo', nombre: nombre.trim().toLowerCase().replace(/\s+/g, '-'), descripcion, creado_por: user.id })
      .select()
      .single()
    if (error) { toast.error('Error al crear canal de nodo'); return null }

    const allMemberIds = [...new Set([user.id, ...memberIds])]
    await supabase.from('canal_miembros').insert(
      allMemberIds.map(uid => ({ canal_id: canal.id, usuario_id: uid, puede_escribir: true }))
    )
    await fetchChannels()
    toast.success(`Canal "#${canal.nombre}" creado`)
    return canal
  }, [user, fetchChannels])

  return { channels, loading, openDM, createGroup, createNodeChannel, getOrCreateNodeChannel, refetch: fetchChannels }
}

// ─── useChat — mensajes de un canal ──────────────────────────────────────────
export function useChat(canalId) {
  const { user, profile } = useAuth()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [members, setMembers] = useState([])
  const [channelInfo, setChannelInfo] = useState(null)

  const MSG_SELECT = '*, autor:usuarios(id, nombre, foto_url, area_investigacion, rol, es_fundador, grupo_nodo, grupos_nodo)'

  const fetchMessages = useCallback(async () => {
    if (!canalId || !user) return
    setLoading(true)
    const { data } = await supabase
      .from('mensajes')
      .select(MSG_SELECT)
      .eq('canal_id', canalId)
      .order('created_at', { ascending: true })
      .limit(150)
    setMessages(data || [])
    setLoading(false)
  }, [canalId, user])

  const fetchMembers = useCallback(async () => {
    if (!canalId) return
    const { data } = await supabase
      .from('canal_miembros')
      .select('usuario_id, puede_escribir, rol_canal, usuario:usuarios(id, nombre, foto_url, area_investigacion, activo, rol)')
      .eq('canal_id', canalId)
    setMembers(
      data?.map(d => ({ ...d.usuario, puede_escribir: d.puede_escribir, rol_canal: d.rol_canal || 'miembro' }))
           .filter(Boolean) || []
    )
  }, [canalId])

  useEffect(() => {
    fetchMessages()
    fetchMembers()
    if (canalId) {
      supabase.from('canales').select('tipo, nombre').eq('id', canalId).single()
        .then(({ data }) => { if (data) setChannelInfo(data) })
    }
  }, [fetchMessages, fetchMembers, canalId])

  // Realtime para mensajes
  useEffect(() => {
    if (!canalId || !user) return
    const sub = supabase
      .channel(`chat_${canalId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensajes',
        filter: `canal_id=eq.${canalId}`,
      }, async (payload) => {
        const { data } = await supabase
          .from('mensajes')
          .select(MSG_SELECT)
          .eq('id', payload.new.id)
          .single()
        if (data) setMessages(prev => {
          if (prev.some(m => m.id === data.id)) return prev
          return [...prev, data]
        })
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'mensajes',
        filter: `canal_id=eq.${canalId}`,
      }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id))
      })
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [canalId, user])

  const sendMessage = useCallback(async (contenido, archivoId = null, tipo = 'texto', fileUrl = null, replyToId = null) => {
    if (!user || !canalId || !contenido.trim()) return false
    setSending(true)
    const { data: newMsg, error } = await supabase.from('mensajes').insert({
      canal_id: canalId,
      autor_id: user.id,
      contenido: contenido.trim(),
      archivo_id: archivoId || null,
      tipo,
      file_url: fileUrl || null,
      reply_to: replyToId || null,
    }).select(MSG_SELECT).single()
    setSending(false)
    if (error) { toast.error('Error al enviar'); return false }
    if (newMsg) {
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev
        return [...prev, newMsg]
      })
      // Notify other channel members (fire-and-forget)
      if (channelInfo) {
        notifyChannelMembers({
          canalId,
          canalTipo: channelInfo.tipo,
          canalNombre: channelInfo.nombre,
          senderName: profile?.nombre || user.email?.split('@')[0] || 'Alguien',
          senderId: user.id,
          contenido,
          tipo,
        })
      }
    }
    return true
  }, [user, profile, canalId, channelInfo])

  const deleteMessage = useCallback(async (id) => {
    await supabase.from('mensajes').delete().eq('id', id)
  }, [])

  const updateMemberRolCanal = useCallback(async (userId, rolCanal) => {
    await supabase.from('canal_miembros')
      .update({ rol_canal: rolCanal })
      .eq('canal_id', canalId)
      .eq('usuario_id', userId)
    fetchMembers()
  }, [canalId, fetchMembers])

  const updateChannelPrivacy = useCallback(async (privado) => {
    await supabase.from('canales').update({ privado }).eq('id', canalId)
  }, [canalId])

  const deleteChannel = useCallback(async () => {
    await supabase.from('mensajes').delete().eq('canal_id', canalId)
    await supabase.from('canal_miembros').delete().eq('canal_id', canalId)
    await supabase.from('canales').delete().eq('id', canalId)
  }, [canalId])

  const updateChannel = useCallback(async (updates) => {
    await supabase.from('canales').update(updates).eq('id', canalId)
  }, [canalId])

  return { messages, loading, sending, members, sendMessage, deleteMessage, updateMemberRolCanal, updateChannelPrivacy, deleteChannel, updateChannel, refetch: fetchMessages }
}

// ─── useUnreadCounts — mensajes no leídos por canal ──────────────────────────
export function useUnreadCounts(channels) {
  const { user } = useAuth()
  const [counts, setCounts] = useState({})

  useEffect(() => {
    if (!user || !channels.length) return
    const canalIds = channels.map(c => c.id)

    const fetchCounts = async () => {
      const results = {}
      await Promise.all(canalIds.map(async (cid) => {
        const { count } = await supabase
          .from('mensajes')
          .select('*', { count: 'exact', head: true })
          .eq('canal_id', cid)
          .not('leido_por', 'cs', `{${user.id}}`)
          .neq('autor_id', user.id)
        results[cid] = count || 0
      }))
      setCounts(results)
    }

    fetchCounts()

    const subs = channels.map(c =>
      supabase
        .channel(`unread_${c.id}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
          filter: `canal_id=eq.${c.id}`,
        }, (payload) => {
          if (payload.new.autor_id !== user.id) {
            setCounts(prev => ({ ...prev, [c.id]: (prev[c.id] || 0) + 1 }))
          }
        })
        .subscribe()
    )

    return () => subs.forEach(s => supabase.removeChannel(s))
  }, [user, channels])

  const markRead = useCallback(async (canalId) => {
    if (!user) return
    await supabase.rpc('mark_channel_read', { p_canal_id: canalId, p_user_id: user.id }).catch(() => {})
    setCounts(prev => ({ ...prev, [canalId]: 0 }))
  }, [user])

  const totalUnread = Object.values(counts).reduce((a, b) => a + b, 0)

  return { counts, totalUnread, markRead }
}
