import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiX, FiSearch, FiMessageSquare } from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import Avatar from '../ui/Avatar'
import { useAuth } from '../../context/AuthContext'

export default function NewDMModal({ onClose, onOpenDM }) {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [opening, setOpening] = useState(null)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('usuarios')
        .select('id, nombre, foto_url, area_investigacion, activo')
        .eq('activo', true)
        .neq('id', user?.id)
        .order('nombre')
        .limit(80)
      setMembers(data || [])
      setLoading(false)
    }
    if (user) fetch()
  }, [user])

  const filtered = query.trim()
    ? members.filter(m => m.nombre.toLowerCase().includes(query.toLowerCase()))
    : members

  const handleOpen = async (memberId) => {
    setOpening(memberId)
    await onOpenDM(memberId)
    setOpening(null)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        className="w-full max-w-sm rounded-2xl overflow-hidden"
        style={{ background: '#0e0608', border: '1px solid rgba(255,255,255,0.08)' }}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-semibold text-white">Mensaje directo</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
            <FiX size={16} />
          </button>
        </div>

        <div className="p-4">
          <div className="relative mb-3">
            <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar miembro..."
              className="w-full pl-8 pr-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none focus:border-[var(--c-primary)]/50 transition-colors"
            />
          </div>

          <div className="max-h-72 overflow-y-auto space-y-0.5">
            {loading ? (
              <p className="text-center text-white/20 text-xs py-6">Cargando miembros...</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-white/20 text-xs py-6">Sin resultados</p>
            ) : filtered.map(m => (
              <button
                key={m.id}
                onClick={() => handleOpen(m.id)}
                disabled={opening === m.id}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors hover:bg-white/[0.05] disabled:opacity-50"
              >
                <Avatar name={m.nombre} area={m.area_investigacion} size="sm" />
                <div className="flex-1 text-left">
                  <p className="text-sm text-white/80">{m.nombre}</p>
                  <p className="text-[10px] text-white/30 capitalize">{m.area_investigacion || 'General'}</p>
                </div>
                {opening === m.id ? (
                  <div className="w-3.5 h-3.5 border border-white/20 border-t-white/60 rounded-full animate-spin" />
                ) : (
                  <FiMessageSquare size={13} className="text-white/20" />
                )}
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
