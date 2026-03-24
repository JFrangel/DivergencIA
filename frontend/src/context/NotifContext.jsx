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
        // Always store the notification, but only bump unread if type is enabled
        setNotifications(prev => [payload.new, ...prev])
        if (!notifType || shouldNotify(notifType)) {
          setUnreadCount(c => c + 1)
          setLastIncoming(payload.new)
        }
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
