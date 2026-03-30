import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSend, FiUsers, FiZap, FiLoader, FiMail, FiBell, FiAlertTriangle, FiStar, FiClock } from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import { generateBroadcastMessages } from '../../lib/gemini'
import { sendEmailBatch } from '../../lib/emailService'
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
  const [enviarEmail, setEnviarEmail] = useState(false)

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

      // Also send emails if requested
      if (enviarEmail) {
        let emailQ = supabase.from('usuarios').select('correo, nombre').eq('activo', true).not('correo', 'is', null)
        if (destino === 'rol') emailQ = emailQ.eq('rol', rolFilter)
        if (destino === 'grupo') emailQ = emailQ.eq('grupo_nodo', grupoFilter)
        const { data: emailTargets } = await emailQ

        if (emailTargets?.length) {
          const tipoColor = TIPO_META[tipo]?.color || '#00D1FF'
          const batch = emailTargets.map(u => ({
            to: u.correo,
            subject: `${titulo} — DivergencIA`,
            html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#060304;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
<table width="100%" cellspacing="0" cellpadding="0" style="background:#060304;">
<tr><td align="center" style="padding:32px 16px;">
<table width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;">
<tr><td style="background:#0d0608;border:1px solid rgba(255,255,255,0.07);border-radius:18px;overflow:hidden;">
<div style="height:4px;background:${tipoColor};"></div>
<div style="padding:28px 28px 32px;">
<p style="margin:0 0 4px;font-size:11px;color:rgba(255,255,255,0.25);text-transform:uppercase;letter-spacing:1.5px;font-weight:700;">
DivergencIA · ${TIPO_META[tipo]?.label || 'Notificación'}
</p>
<h1 style="margin:0 0 12px;font-size:20px;font-weight:900;color:rgba(255,255,255,0.92);">${titulo}</h1>
<p style="margin:0;font-size:14px;color:rgba(255,255,255,0.55);line-height:1.8;">${mensaje}</p>
</div>
</td></tr>
<tr><td style="padding-top:16px;text-align:center;">
<p style="color:rgba(255,255,255,0.12);font-size:10px;margin:0;">Email automático de DivergencIA · No respondas</p>
</td></tr>
</table></td></tr></table></body></html>`,
          }))
          sendEmailBatch(batch)
            .then(() => toast.success(`Emails enviados a ${batch.length} destinatarios`))
            .catch(() => toast.warning('Notificaciones enviadas pero hubo un error con los emails'))
        }
      }

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

        {/* Email toggle */}
        <label className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] cursor-pointer hover:bg-white/[0.05] transition-colors">
          <FiMail size={14} style={{ color: enviarEmail ? '#00D1FF' : 'rgba(255,255,255,0.3)' }} className="shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-white/70">También enviar por email</p>
            <p className="text-[10px] text-white/30 mt-0.5">Envía el broadcast al correo de los destinatarios</p>
          </div>
          <div
            className="w-9 h-5 rounded-full relative shrink-0 transition-colors"
            style={{ background: enviarEmail ? '#00D1FF' : 'rgba(255,255,255,0.1)' }}
          >
            <div
              className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
              style={{ left: enviarEmail ? '18px' : '2px' }}
            />
          </div>
          <input type="checkbox" className="sr-only" checked={enviarEmail} onChange={e => setEnviarEmail(e.target.checked)} />
        </label>

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
