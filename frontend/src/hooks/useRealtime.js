import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Suscribe a cambios en tiempo real de una tabla Supabase.
 * onInsert, onUpdate, onDelete reciben el registro nuevo/viejo.
 */
export function useRealtime(table, { onInsert, onUpdate, onDelete, filter } = {}) {
  const channelRef = useRef(null)

  useEffect(() => {
    let channel = supabase.channel(`realtime:${table}:${Math.random()}`)

    const cfg = { event: '*', schema: 'public', table }
    if (filter) cfg.filter = filter

    channel = channel.on('postgres_changes', cfg, (payload) => {
      if (payload.eventType === 'INSERT' && onInsert) onInsert(payload.new)
      if (payload.eventType === 'UPDATE' && onUpdate) onUpdate(payload.new, payload.old)
      if (payload.eventType === 'DELETE' && onDelete) onDelete(payload.old)
    })

    channel.subscribe()
    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, filter]) // eslint-disable-line react-hooks/exhaustive-deps

  return channelRef
}

/**
 * Hook para notificaciones del usuario actual en tiempo real.
 */
export function useNotifRealtime(userId, onNew) {
  useRealtime('notificaciones', {
    filter: `usuario_id=eq.${userId}`,
    onInsert: onNew,
  })
}
