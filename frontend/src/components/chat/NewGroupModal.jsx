import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiX, FiSearch, FiCheck } from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import Avatar from '../ui/Avatar'

export default function NewGroupModal({ onClose, onCreateGroup }) {
  const [nombre, setNombre] = useState('')
  const [query, setQuery] = useState('')
  const [allMembers, setAllMembers] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('usuarios')
        .select('id, nombre, foto_url, area_investigacion')
        .eq('activo', true)
        .order('nombre')
        .limit(80)
      setAllMembers(data || [])
      setLoading(false)
    }
    fetchMembers()
  }, [])

  const filtered = query.trim()
    ? allMembers.filter(m => m.nombre.toLowerCase().includes(query.toLowerCase()))
    : allMembers

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleCreate = async () => {
    if (!nombre.trim() || selected.size === 0) return
    setCreating(true)
    await onCreateGroup(nombre, [...selected])
    setCreating(false)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: '#0e0608', border: '1px solid rgba(255,255,255,0.08)' }}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <h3 className="text-sm font-semibold text-white">Nuevo grupo</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
            <FiX size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Group name */}
          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 block">Nombre del grupo</label>
            <input
              autoFocus
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Equipo Alpha, Reunión NLP..."
              className="w-full px-3 py-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none focus:border-[var(--c-primary)]/50 transition-colors"
            />
          </div>

          {/* Member search */}
          <div>
            <label className="text-[11px] text-white/40 uppercase tracking-wider mb-1.5 block">
              Añadir miembros ({selected.size} seleccionados)
            </label>
            <div className="relative mb-2">
              <FiSearch size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Buscar miembro..."
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
              {loading ? (
                <p className="text-center text-white/20 text-xs py-4">Cargando...</p>
              ) : filtered.length === 0 ? (
                <p className="text-center text-white/20 text-xs py-4">Sin resultados</p>
              ) : filtered.map(m => {
                const isSel = selected.has(m.id)
                return (
                  <button
                    key={m.id}
                    onClick={() => toggle(m.id)}
                    className="w-full flex items-center gap-3 px-3 py-2 transition-colors rounded-lg"
                    style={{ background: isSel ? 'color-mix(in srgb, var(--c-primary) 10%, transparent)' : 'transparent' }}
                  >
                    <Avatar name={m.nombre} area={m.area_investigacion} size="xs" />
                    <span className="text-sm text-white/70 flex-1 text-left">{m.nombre}</span>
                    {isSel && <FiCheck size={12} style={{ color: 'var(--c-primary)' }} />}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/[0.06] flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-white/40 hover:text-white hover:bg-white/[0.04] transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!nombre.trim() || selected.size === 0 || creating}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{ background: 'linear-gradient(135deg, var(--c-primary), var(--c-secondary))' }}
          >
            {creating ? 'Creando...' : `Crear grupo (${selected.size})`}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
