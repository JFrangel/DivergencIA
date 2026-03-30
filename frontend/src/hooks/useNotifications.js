import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { toast } from 'sonner'
import { getEmailTemplate } from '../lib/emailTemplates'

// ─── Notification type metadata ──────────────────────────────────────────────
export const NOTIFICATION_TYPES = {
  voto_recordatorio:    { label: 'Recordatorio de voto',    color: '#F59E0B', icon: 'vote'       },
  evento_proximo:       { label: 'Evento próximo',          color: '#00D1FF', icon: 'calendar'   },
  tarea_asignada:       { label: 'Tarea asignada',          color: '#FC651F', icon: 'task'       },
  idea_nueva:           { label: 'Nueva idea',              color: '#8B5CF6', icon: 'idea'       },
  proyecto_actualizado: { label: 'Proyecto actualizado',    color: '#22c55e', icon: 'project'    },
  logro_desbloqueado:   { label: 'Logro desbloqueado',      color: '#F59E0B', icon: 'achievement'},
  admin_broadcast:      { label: 'Anuncio del equipo',      color: '#EF4444', icon: 'broadcast'  },
  bienvenida:           { label: 'Bienvenida',              color: '#22c55e', icon: 'welcome'    },
  avance_nuevo:         { label: 'Nuevo avance',            color: '#00D1FF', icon: 'advance'    },
  sugerencia:           { label: 'Sugerencia',              color: '#8B5CF6', icon: 'suggestion' },
  recordatorio:         { label: 'Recordatorio',            color: '#F59E0B', icon: 'reminder'   },
  alerta:               { label: 'Alerta',                  color: '#EF4444', icon: 'alert'      },
  reconocimiento:       { label: 'Reconocimiento',          color: '#F59E0B', icon: 'award'      },
  mensaje_nuevo:        { label: 'Mensaje en canal',        color: '#00D1FF', icon: 'message'    },
  mensaje_directo:      { label: 'Mensaje directo',         color: '#22c55e', icon: 'dm'         },
  // Legacy types from existing system
  comentarios:          { label: 'Comentario',              color: '#FC651F', icon: 'comment'    },
  votos:                { label: 'Voto',                    color: '#F59E0B', icon: 'vote'       },
  avances:              { label: 'Avance',                  color: '#00D1FF', icon: 'advance'    },
  tareas:               { label: 'Tarea',                   color: '#FC651F', icon: 'task'       },
  logros:               { label: 'Logro',                   color: '#F59E0B', icon: 'achievement'},
  solicitudes:          { label: 'Solicitud',               color: '#8B5CF6', icon: 'request'    },
}

/** Get the route a notification should navigate to based on its type */
export function getNotificationRoute(notification) {
  const { tipo, referencia_id } = notification
  switch (tipo) {
    case 'tarea_asignada':
    case 'tareas':
    case 'proyecto_actualizado':
    case 'avance_nuevo':
    case 'avances':
      return referencia_id ? `/projects/${referencia_id}` : '/projects'
    case 'idea_nueva':
    case 'voto_recordatorio':
    case 'votos':
      return '/ideas'
    case 'evento_proximo':
      return '/calendar'
    case 'logro_desbloqueado':
    case 'logros':
      return '/profile'
    case 'bienvenida':
      return '/dashboard'
    case 'admin_broadcast':
    case 'recordatorio':
    case 'alerta':
    case 'reconocimiento':
      return '/notificaciones'
    case 'sugerencia':
      return '/learning'
    case 'solicitudes':
      return '/admin'
    case 'mensaje_nuevo':
    case 'mensaje_directo':
      return referencia_id ? `/chat?canal=${referencia_id}` : '/chat'
    default:
      return '/notificaciones'
  }
}

// ─── Main hook ───────────────────────────────────────────────────────────────
export function useNotifications() {
  const { user, isAdmin } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // 'all' | 'unread' | type string
  const channelRef = useRef(null)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!user) { setNotifications([]); setLoading(false); return }
    setLoading(true)
    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', user.id)
      .order('fecha', { ascending: false })
      .limit(100)
    if (error) console.error('Error fetching notifications:', error)
    setNotifications(data || [])
    setLoading(false)
  }, [user])

  useEffect(() => { fetchNotifications() }, [fetchNotifications])

  // ── Realtime subscription ──────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('notifs-hook')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notificaciones',
        filter: `usuario_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev])
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notificaciones',
        filter: `usuario_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev =>
          prev.map(n => n.id === payload.new.id ? payload.new : n)
        )
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'notificaciones',
        filter: `usuario_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => prev.filter(n => n.id !== payload.old.id))
      })
      .subscribe()
    channelRef.current = channel
    return () => supabase.removeChannel(channel)
  }, [user])

  // ── Mark as read ───────────────────────────────────────────────────────────
  const markAsRead = useCallback(async (id) => {
    const { error } = await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('id', id)
    if (error) { console.error(error); return }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
  }, [])

  // ── Mark as unread ─────────────────────────────────────────────────────────
  const markAsUnread = useCallback(async (id) => {
    const { error } = await supabase
      .from('notificaciones')
      .update({ leida: false })
      .eq('id', id)
    if (error) { console.error(error); return }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, leida: false } : n))
  }, [])

  // ── Mark all as read ───────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    if (!user) return
    const { error } = await supabase
      .from('notificaciones')
      .update({ leida: true })
      .eq('usuario_id', user.id)
      .eq('leida', false)
    if (error) { console.error(error); return }
    setNotifications(prev => prev.map(n => ({ ...n, leida: true })))
  }, [user])

  // ── Delete notification ────────────────────────────────────────────────────
  const deleteNotification = useCallback(async (id) => {
    const { error } = await supabase
      .from('notificaciones')
      .delete()
      .eq('id', id)
    if (error) { console.error(error); return }
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  // ── Delete all read notifications ─────────────────────────────────────────
  const deleteAllRead = useCallback(async () => {
    if (!user) return
    const { error } = await supabase
      .from('notificaciones')
      .delete()
      .eq('usuario_id', user.id)
      .eq('leida', true)
    if (error) { console.error(error); return }
    setNotifications(prev => prev.filter(n => !n.leida))
  }, [user])

  // ── Computed ───────────────────────────────────────────────────────────────
  const unreadCount = notifications.filter(n => !n.leida).length

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'all') return true
    if (filter === 'unread') return !n.leida
    return n.tipo === filter
  })

  // Group by date
  const groupedByDate = filteredNotifications.reduce((groups, n) => {
    const date = new Date(n.fecha).toLocaleDateString('es-CO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    })
    if (!groups[date]) groups[date] = []
    groups[date].push(n)
    return groups
  }, {})

  return {
    notifications,
    filteredNotifications,
    groupedByDate,
    unreadCount,
    loading,
    filter,
    setFilter,
    markAsRead,
    markAsUnread,
    markAllRead,
    deleteNotification,
    deleteAllRead,
    refetch: fetchNotifications,
  }
}

// ─── Create notification helper ──────────────────────────────────────────────
export async function createNotification(userId, tipo, mensaje, referenciaId = null) {
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

// ─── Send single email via edge function (fire-and-forget) ──────────────────
async function sendEmailEdge({ to, correo, subject, html }) {
  const target = to || correo
  if (!target) return
  try {
    await supabase.functions.invoke('send-email', {
      body: { to: target, subject, html },
    })
  } catch (e) {
    console.warn('Email send failed (non-critical):', e)
  }
}

// ─── Send multiple emails in one batch call ──────────────────────────────────
async function sendEmailBatch(items) {
  if (!items?.length) return
  try {
    await supabase.functions.invoke('send-email', {
      body: { batch: items },
    })
  } catch (e) {
    console.warn('Batch email send failed (non-critical):', e)
  }
}

// ─── Broadcast notification (admin/directora only) ────────────────────────────
// target: { type: 'todos' | 'nodo' | 'members', nodoId?: string, memberIds?: string[] }
// sendEmail: boolean — also send email to each recipient
export async function broadcastNotification(tipo, mensaje, target = { type: 'todos' }, sendEmail = false) {
  let userIds = []

  if (target.type === 'todos') {
    const { data, error } = await supabase.from('usuarios').select('id, nombre, correo').eq('activo', true)
    if (error) { toast.error('Error al obtener usuarios'); return { error } }
    userIds = data || []

  } else if (target.type === 'nodo' && target.nodoId) {
    const { data, error } = await supabase
      .from('canal_miembros')
      .select('usuario_id, usuario:usuarios(id, nombre, correo)')
      .eq('canal_id', target.nodoId)
    if (error) { toast.error('Error al obtener miembros del canal'); return { error } }
    userIds = (data || []).map(d => d.usuario).filter(Boolean)

  } else if (target.type === 'members' && target.memberIds?.length) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, correo')
      .in('id', target.memberIds)
    if (error) { toast.error('Error al obtener miembros'); return { error } }
    userIds = data || []
  }

  if (userIds.length === 0) { toast.error('Sin destinatarios'); return { error: 'no-users' } }

  // Insert in-app notifications (batch)
  const TIPO_LABELS = {
    admin_broadcast: 'Anuncio', evento_proximo: 'Evento próximo',
    recordatorio: 'Recordatorio', alerta: 'Alerta',
    sugerencia: 'Sugerencia', reconocimiento: 'Reconocimiento',
    voto_recordatorio: 'Recordatorio de voto', bienvenida: 'Bienvenida',
  }

  const rows = userIds.map(u => ({
    usuario_id: u.id,
    tipo,
    mensaje,
    leida: false,
    fecha: new Date().toISOString(),
  }))

  const { error: insertError } = await supabase.from('notificaciones').insert(rows)
  if (insertError) {
    console.error('Broadcast insert error:', insertError)
    toast.error('Error al enviar notificaciones')
    return { error: insertError }
  }

  // Send emails via premium templates — single batch call to avoid rate limits
  if (sendEmail) {
    const asunto = TIPO_LABELS[tipo] || 'Comunicado'
    const urgente = tipo === 'alerta'
    const batchItems = userIds
      .filter(u => u.correo)
      .map(u => {
        const { subject, html } = getEmailTemplate('broadcast', {
          nombre: u.nombre || 'investigador/a',
          mensaje,
          asunto,
          remitente: 'DivergencIA',
          rolRemitente: 'Administración',
          urgente,
        })
        return { to: u.correo, subject, html }
      })
    sendEmailBatch(batchItems)
  }

  toast.success(`✅ Notificación enviada a ${userIds.length} ${userIds.length === 1 ? 'miembro' : 'miembros'}${sendEmail ? ' + emails' : ''}`)
  return { count: userIds.length }
}
