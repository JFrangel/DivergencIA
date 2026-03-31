import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const NotifContext = createContext(null)

// Map notification types (from DB) to Settings pref keys
const TYPE_TO_PREF = {
  comments:        'comments',
  comentarios:     'comments',
  votos:           'votes',
  votes:           'votes',
  avances:         'advances',
  advances:        'advances',
  tareas:          'tasks',
  tasks:           'tasks',
  logros:          'achievements',
  achievements:    'achievements',
  solicitudes:     'joinRequests',
  joinRequests:    'joinRequests',
  mensaje_nuevo:   'messages',
  mensaje_directo: 'messages',
}

function getNotifPrefs() {
  try { return JSON.parse(localStorage.getItem('divergencia_notif_prefs') || '{}') } catch { return {} }
}

/** Check if a notification type is enabled in user preferences */
export function shouldNotify(type) {
  const prefs = getNotifPrefs()
  const key = TYPE_TO_PREF[type] || type
  // Default to true if the user hasn't explicitly disabled it
  return prefs[key] !== false
}

export function NotifProvider({ children }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [lastIncoming, setLastIncoming] = useState(null)

  // Fetch notifications
  const fetchNotifs = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('notificaciones')
      .select('*')
      .eq('usuario_id', user.id)
      .order('fecha', { ascending: false })
      .limit(20)
    setNotifications(data || [])
    setUnreadCount(data?.filter(n => !n.leida).length || 0)
  }, [user])

  useEffect(() => { fetchNotifs() }, [fetchNotifs])

  // Realtime subscription — respect notification preferences
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('notifs')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notificaciones',
        filter: `usuario_id=eq.${user.id}`,
      }, (payload) => {
        const notifType = payload.new?.tipo
        setNotifications(prev => [payload.new, ...prev])
        if (!notifType || shouldNotify(notifType)) {
          setUnreadCount(c => c + 1)
          setLastIncoming(payload.new)
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'notificaciones',
        filter: `usuario_id=eq.${user.id}`,
      }, (payload) => {
        setNotifications(prev => prev.map(n => n.id === payload.new.id ? { ...n, ...payload.new } : n))
        setUnreadCount(prev => {
          // Recalculate from current notifications state (reliable)
          return prev // Will be corrected by re-fetch below
        })
        // Recalculate unread from DB to stay accurate
        supabase.from('notificaciones').select('id', { count: 'exact', head: true })
          .eq('usuario_id', user.id).eq('leida', false)
          .then(({ count }) => setUnreadCount(count || 0))
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'notificaciones',
      }, (payload) => {
        setNotifications(prev => prev.filter(n => n.id !== payload.old.id))
        setUnreadCount(prev => {
          const wasUnread = !payload.old.leida
          return wasUnread ? Math.max(0, prev - 1) : prev
        })
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [user])

  const markAsRead = useCallback(async (id) => {
    await supabase.from('notificaciones').update({ leida: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n))
    setUnreadCount(c => Math.max(0, c - 1))
  }, [])

  const markAllRead = useCallback(async () => {
    if (!user) return
    await supabase.from('notificaciones').update({ leida: true }).eq('usuario_id', user.id).eq('leida', false)
    setNotifications(prev => prev.map(n => ({ ...n, leida: true })))
    setUnreadCount(0)
  }, [user])

  return (
    <NotifContext.Provider value={{ notifications, unreadCount, lastIncoming, markAsRead, markAllRead, refresh: fetchNotifs, shouldNotify }}>
      {children}
    </NotifContext.Provider>
  )
}

export function useNotifs() {
  return useContext(NotifContext) || { notifications: [], unreadCount: 0, lastIncoming: null, markAsRead: () => {}, markAllRead: () => {} }
}
