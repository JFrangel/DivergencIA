import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiX, FiZap, FiCheck, FiSearch, FiHash } from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import Avatar from '../ui/Avatar'

export default function NewNodeChannelModal({ onClose, onCreate }) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [members, setMembers] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    setLoading(true)
    supabase
      .from('usuarios')
      .select('id, nombre, foto_url, area_investigacion, rol')
      .eq('activo', true)
      .order('nombre')
      .then(({ data }) => { setMembers(data || []); setLoading(false) })
  }, [])

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleCreate = async () => {
    if (!nombre.trim()) return
    setCreating(true)
    await onCreate(nombre.trim(), descripcion.trim(), [...selected])
    setCreating(false)
    onClose()
  }

  const filtered = members.filter(m =>
    !search || m.nombre?.toLowerCase().includes(search.toLowerCase())
  )

  const previewName = nombre.trim().toLowerCase().replace(/\s+/g, '-') || 'nombre-canal'

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="w-full max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'rgba(14,6,9,0.98)', border: '1px solid rgba(255,255,255,0.08)' }}
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #FC651F, #8B5CF6)' }}>
              <FiZap size={14} className="text-white" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Nuevo Canal de Nodo</h3>
              <p className="text-[10px] text-white/30">Solo administradores pueden crear canales</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors p-1">
            <FiX size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 block">Nombre del canal</label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] focus-within:border-[#FC651F]/40 transition-colors">
              <FiHash size={13} className="text-white/30 shrink-0" />
              <input
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                placeholder="nombre-del-canal"
                className="flex-1 bg-transparent text-sm text-white placeholder-white/20 outline-none"
                autoFocus
              />
            </div>
            {nombre && (
              <p className="text-[10px] text-white/25 mt-1 ml-1">
                Se creará como <span className="text-[#FC651F]">#{previewName}</span>
              </p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 block">Descripción (opcional)</label>
            <input
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="¿Para qué es este canal?"
              className="w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none focus:border-white/20 transition-colors"
            />
          </div>

          {/* Members */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] text-white/30 uppercase tracking-wider">Agregar miembros</label>
              {selected.size > 0 && (
                <span className="text-[10px] font-semibold" style={{ color: '#8B5CF6' }}>{selected.size} seleccionados</span>
              )}
            </div>
            <div className="rounded-xl border border-white/[0.08] overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06]">
                <FiSearch size={11} className="text-white/25 shrink-0" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="flex-1 text-xs bg-transparent text-white/70 placeholder-white/20 outline-none"
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-4 h-4 border border-white/10 border-t-[#8B5CF6] rounded-full animate-spin" />
                  </div>
                ) : filtered.map(m => {
                  const sel = selected.has(m.id)
                  return (
                    <button
                      key={m.id}
                      onClick={() => toggle(m.id)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 transition-colors border-b border-white/[0.04] last:border-0"
                      style={{ background: sel ? 'rgba(139,92,246,0.06)' : 'transparent' }}
                    >
                      <div
                        className="w-5 h-5 rounded shrink-0 flex items-center justify-center border"
                        style={sel ? { background: '#8B5CF6', borderColor: '#8B5CF6' } : { background: 'transparent', borderColor: 'rgba(255,255,255,0.15)' }}
                      >
                        {sel && <FiCheck size={9} className="text-white" />}
                      </div>
                      <Avatar name={m.nombre || ''} src={m.foto_url} area={m.area_investigacion} size="xs" />
                      <span className="text-xs flex-1 text-left truncate" style={{ color: sel ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)' }}>
                        {m.nombre}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-white/[0.06]">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/[0.04] transition-all">
            Cancelar
          </button>
          <button
            onClick={handleCreate}
            disabled={!nombre.trim() || creating}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg, #FC651F, #8B5CF6)' }}
          >
            {creating ? (
              <><motion.div className="w-3 h-3 border border-white/40 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />Creando...</>
            ) : (
              <><FiZap size={12} />Crear canal</>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
