import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSend, FiUsers, FiZap, FiLoader, FiMail, FiBell, FiAlertTriangle, FiStar, FiClock } from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import { generateBroadcastMessages } from '../../lib/gemini'
import { toast } from 'sonner'
import Card from '../ui/Card'

const TIPO_META = {
  info:          { label: 'Info',         color: '#00D1FF', icon: FiBell },
  alerta:        { label: 'Alerta',       color: '#EF4444', icon: FiAlertTriangle },
  logro:         { label: 'Logro',        color: '#22c55e', icon: FiStar },
  recordatorio:  { label: 'Recordatorio', color: '#F59E0B', icon: FiClock },
}

const inputClass = 'w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none focus:border-[#FC651F]/50 transition-colors'
const labelClass = 'block text-[11px] text-white/40 uppercase tracking-wider font-semibold mb-1.5'

export default function BroadcastPanel() {
  const [destino, setDestino] = useState('todos')
  const [rolFilter, setRolFilter] = useState('miembro')
  const [grupoFilter, setGrupoFilter] = useState('')
  const [tipo, setTipo] = useState('info')
  const [titulo, setTitulo] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [aiVariants, setAiVariants] = useState([])
  const [sending, setSending] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [targetCount, setTargetCount] = useState(0)
  const [grupos, setGrupos] = useState([])

  /* Fetch distinct nodo groups */
  useEffect(() => {
    supabase.from('usuarios').select('grupo_nodo').not('grupo_nodo', 'is', null)
      .then(({ data }) => {
        const unique = [...new Set((data || []).map(u => u.grupo_nodo).filter(Boolean))]
        setGrupos(unique)
        if (unique.length > 0) setGrupoFilter(unique[0])
      })
  }, [])

  /* Recount targets when filter changes */
  useEffect(() => {
    let q = supabase.from('usuarios').select('id', { count: 'exact', head: true }).eq('activo', true)
    if (destino === 'rol') q = q.eq('rol', rolFilter)
    if (destino === 'grupo') q = q.eq('grupo_nodo', grupoFilter)
    q.then(({ count }) => setTargetCount(count || 0))
  }, [destino, rolFilter, grupoFilter])

  const handleSuggestAI = async () => {
    if (!mensaje.trim()) { toast.error('Escribe un mensaje primero'); return }
    setAiLoading(true)
    setAiVariants([])
    try {
      const variants = await generateBroadcastMessages(tipo, mensaje, 3)
      setAiVariants(variants || [])
    } catch {
      toast.error('Error al generar sugerencias')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSend = async () => {
    if (!titulo.trim() || !mensaje.trim()) { toast.error('Completa el titulo y el mensaje'); return }
    setSending(true)
    try {
      let q = supabase.from('usuarios').select('id').eq('activo', true)
      if (destino === 'rol') q = q.eq('rol', rolFilter)
      if (destino === 'grupo') q = q.eq('grupo_nodo', grupoFilter)
      const { data: targets, error: qErr } = await q
      if (qErr) throw qErr

      if (!targets?.length) { toast.error('No hay destinatarios'); return }

      const rows = targets.map(u => ({
        usuario_id: u.id,
        tipo,
        titulo,
        mensaje,
        leida: false,
      }))
      const { error } = await supabase.from('notificaciones').insert(rows)
      if (error) throw error
      toast.success(`Broadcast enviado a ${targets.length} miembros`)
      setTitulo('')
      setMensaje('')
      setAiVariants([])
    } catch (err) {
      toast.error('Error al enviar broadcast')
    } finally {
      setSending(false)
    }
  }

  const TipoIcon = TIPO_META[tipo]?.icon || FiBell
  const tipoColor = TIPO_META[tipo]?.color || '#00D1FF'

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h2 className="text-lg font-bold font-title text-white flex items-center gap-2">
          <FiSend size={16} className="text-[#FC651F]" /> Broadcast de notificaciones
        </h2>
        <p className="text-sm text-white/30 mt-1">Envía notificaciones masivas a miembros del semillero</p>
      </div>

      <Card className="space-y-5">
        {/* Destino */}
        <div>
          <label className={labelClass}>Destinatarios</label>
          <div className="flex gap-2 flex-wrap">
            {[['todos', 'Todos'], ['rol', 'Por rol'], ['grupo', 'Por grupo']].map(([v, l]) => (
              <button
                key={v}
                onClick={() => setDestino(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                  destino === v
                    ? 'bg-[#FC651F]/15 border-[#FC651F]/40 text-[#FC651F]'
                    : 'border-white/[0.08] text-white/40 hover:text-white/60'
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <AnimatePresence>
            {destino === 'rol' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-3">
                  <label className={labelClass}>Rol</label>
                  <select value={rolFilter} onChange={e => setRolFilter(e.target.value)} className={inputClass}>
                    {['miembro', 'investigador', 'lider', 'admin'].map(r => (
                      <option key={r} value={r} className="bg-[#0c0608]">{r}</option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}
            {destino === 'grupo' && grupos.length > 0 && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-3">
                  <label className={labelClass}>Grupo / Nodo</label>
                  <select value={grupoFilter} onChange={e => setGrupoFilter(e.target.value)} className={inputClass}>
                    {grupos.map(g => (
                      <option key={g} value={g} className="bg-[#0c0608]">{g}</option>
                    ))}
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-3 flex items-center gap-2 text-xs text-white/30">
            <FiUsers size={12} className="text-[#FC651F]" />
            <span>Este broadcast llegará a <strong className="text-white/60">{targetCount}</strong> miembros</span>
          </div>
        </div>

        {/* Tipo */}
        <div>
          <label className={labelClass}>Tipo</label>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(TIPO_META).map(([v, meta]) => {
              const Icon = meta.icon
              return (
                <button
                  key={v}
                  onClick={() => setTipo(v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    tipo === v
                      ? 'border-current'
                      : 'border-white/[0.06] text-white/30 hover:text-white/50'
                  }`}
                  style={tipo === v ? { background: `${meta.color}15`, borderColor: `${meta.color}40`, color: meta.color } : {}}
                >
                  <Icon size={11} /> {meta.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Titulo */}
        <div>
          <label className={labelClass}>Titulo</label>
          <input
            type="text"
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            placeholder="Titulo de la notificacion"
            className={inputClass}
          />
        </div>

        {/* Mensaje */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={labelClass} style={{ marginBottom: 0 }}>Mensaje</label>
            <button
              onClick={handleSuggestAI}
              disabled={aiLoading}
              className="flex items-center gap-1 text-[10px] text-[#8B5CF6] hover:text-[#8B5CF6]/80 transition-colors disabled:opacity-50"
            >
              {aiLoading ? <FiLoader size={10} className="animate-spin" /> : <FiZap size={10} />}
              Sugerir con IA
            </button>
          </div>
          <textarea
            value={mensaje}
            onChange={e => setMensaje(e.target.value)}
            placeholder="Contenido de la notificacion..."
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* AI variants */}
        <AnimatePresence>
          {aiVariants.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-2">Variantes sugeridas (click para usar)</p>
              <div className="space-y-2">
                {aiVariants.map((v, i) => (
                  <button
                    key={i}
                    onClick={() => setMensaje(v)}
                    className="w-full text-left text-xs text-white/50 p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-[#8B5CF6]/30 hover:text-white/70 transition-all"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Preview */}
        {(titulo || mensaje) && (
          <div>
            <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-2">Vista previa</p>
            <div
              className="p-3 rounded-xl border flex items-start gap-3"
              style={{ background: `${tipoColor}08`, borderColor: `${tipoColor}25` }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${tipoColor}15` }}
              >
                <TipoIcon size={14} style={{ color: tipoColor }} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white/80">{titulo || '(sin titulo)'}</p>
                <p className="text-xs text-white/40 mt-0.5">{mensaje || '(sin mensaje)'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={sending || !titulo.trim() || !mensaje.trim()}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FC651F]/15 text-[#FC651F] text-sm font-semibold hover:bg-[#FC651F]/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed border border-[#FC651F]/20"
        >
          {sending ? (
            <FiLoader size={14} className="animate-spin" />
          ) : (
            <FiSend size={14} />
          )}
          Enviar broadcast
        </button>
      </Card>
    </div>
  )
}
