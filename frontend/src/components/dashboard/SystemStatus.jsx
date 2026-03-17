import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Card from '../ui/Card'
import StatusDot from '../ui/StatusDot'

export default function SystemStatus() {
  const [db, setDb] = useState('loading')
  const [storage, setStorage] = useState('active')

  useEffect(() => {
    supabase.from('usuarios').select('id', { head: true }).limit(1)
      .then(({ error }) => setDb(error ? 'error' : 'active'))
  }, [])

  const items = [
    { label: 'Base de datos', status: db },
    { label: 'Storage', status: storage },
    { label: 'IA (Gemini)', status: 'warning' },
    { label: 'Realtime', status: 'active' },
  ]

  return (
    <Card>
      <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-4">
        Estado del sistema
      </h2>
      <div className="space-y-2.5">
        {items.map(item => (
          <div key={item.label} className="flex items-center justify-between">
            <span className="text-sm text-white/50">{item.label}</span>
            <div className="flex items-center gap-2">
              <StatusDot status={item.status === 'loading' ? 'warning' : item.status} />
              <span className="text-xs text-white/30 capitalize">
                {item.status === 'loading' ? 'verificando' :
                 item.status === 'active' ? 'activo' :
                 item.status === 'warning' ? 'pendiente' : 'error'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
