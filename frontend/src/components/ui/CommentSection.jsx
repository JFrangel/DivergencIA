import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSend, FiTrash2, FiMessageSquare } from 'react-icons/fi'
import { useComentarios } from '../../hooks/useComentarios'
import { useAuth } from '../../context/AuthContext'
import Avatar from './Avatar'
import { toast } from 'sonner'

function timeAgoShort(date) {
  if (!date) return ''
  const diff = (Date.now() - new Date(date).getTime()) / 1000
  if (diff < 60) return 'ahora'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export default function CommentSection({ avanceId, ideaId, proyectoId, maxHeight = 300 }) {
  const { user } = useAuth()
  const { comentarios, loading, addComentario, deleteComentario } = useComentarios({ avanceId, ideaId, proyectoId })
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    const { error } = await addComentario(text)
    setSending(false)
    if (error) {
      toast.error('Error al enviar comentario')
    } else {
      setText('')
    }
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <FiMessageSquare size={13} className="text-white/30" />
        <span className="text-[11px] text-white/30 font-medium uppercase tracking-wider">
          {comentarios.length} comentario{comentarios.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Comments list */}
      <div
        className="space-y-2 overflow-y-auto pr-1"
        style={{ maxHeight }}
      >
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-12 rounded-lg bg-white/[0.02] animate-pulse" />
            ))}
          </div>
        ) : comentarios.length === 0 ? (
          <p className="text-white/15 text-xs text-center py-4">Sin comentarios aún</p>
        ) : (
          <AnimatePresence>
            {comentarios.map((c, i) => (
              <motion.div
                key={c.id}
                className="flex gap-2.5 group"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Avatar
                  name={c.autor?.nombre || ''}
                  area={c.autor?.area_investigacion}
                  size="xs"
                  className="mt-0.5 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-white/60">{c.autor?.nombre || 'Anónimo'}</span>
                    {c.autor?.es_fundador && (
                      <span className="text-[8px] px-1 py-px rounded bg-[#F59E0B]/15 text-[#F59E0B]/70 font-semibold">F</span>
                    )}
                    <span className="text-[9px] text-white/15">{timeAgoShort(c.fecha)}</span>
                    {user?.id === c.autor_id && (
                      <button
                        onClick={() => deleteComentario(c.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-white/15 hover:text-[#EF4444] ml-auto"
                      >
                        <FiTrash2 size={10} />
                      </button>
                    )}
                  </div>
                  <p className="text-[12px] text-white/45 leading-relaxed mt-0.5">{c.contenido}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Input */}
      {user ? (
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Escribe un comentario..."
            className="flex-1 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white/70 placeholder:text-white/15 outline-none focus:border-[var(--c-primary)]/30 transition-colors"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="p-2 rounded-lg bg-[var(--c-primary)]/10 text-[var(--c-primary)] hover:bg-[var(--c-primary)]/20 transition-all disabled:opacity-30"
          >
            <FiSend size={12} />
          </button>
        </form>
      ) : (
        <p className="text-[11px] text-white/15 text-center">Inicia sesión para comentar</p>
      )}
    </div>
  )
}
