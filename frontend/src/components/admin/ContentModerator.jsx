import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiAlertTriangle, FiEye, FiTrash2, FiFlag, FiChevronDown, FiChevronUp, FiMessageSquare, FiCheck } from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import Card from '../ui/Card'
import { toast } from 'sonner'
import { timeAgo } from '../../lib/utils'

const REPORT_STATUS = {
  pendiente:     { label: 'Pendiente',     color: '#F59E0B' },
  revisado:      { label: 'Revisado',      color: '#22c55e' },
  accion_tomada: { label: 'Acción tomada', color: '#EF4444' },
}

const TABLE_FOR_TYPE = {
  mensaje: 'mensajes',
  idea:    'ideas',
  archivo: 'archivos',
  proyecto:'proyectos',
  comentario: 'comentarios',
}

function ReportCard({ r, onStatusChange, onDeleteContent }) {
  const [expanded, setExpanded] = useState(false)
  const [notas, setNotas]       = useState(r.notas_admin || '')
  const [savingNotas, setSavingNotas] = useState(false)
  const status = REPORT_STATUS[r.estado] || REPORT_STATUS.pendiente

  const saveNotas = async () => {
    setSavingNotas(true)
    const { error } = await supabase.from('reportes').update({ notas_admin: notas }).eq('id', r.id)
    setSavingNotas(false)
    if (error) toast.error('Error al guardar notas')
    else toast.success('Notas guardadas')
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="overflow-hidden">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[#F59E0B]/10 text-[#F59E0B]">
            <FiFlag size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-semibold text-white/70 capitalize">{r.tipo_contenido || 'Contenido'}</span>
              <span
                className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                style={{ background: `${status.color}15`, color: status.color }}
              >
                {status.label}
              </span>
              <span className="text-[10px] text-white/20 ml-auto">{timeAgo(r.created_at)}</span>
            </div>
            <p className="text-xs text-white/50 leading-relaxed">{r.razon || 'Sin razón especificada'}</p>
            {r.reportado_por && (
              <p className="text-[10px] text-white/20 mt-1">
                Reportado por: <span className="text-white/35">{r.reportado_por.nombre}</span>
              </p>
            )}
          </div>
          {/* Quick actions */}
          <div className="flex gap-1 shrink-0 items-center">
            {r.estado === 'pendiente' && (
              <button
                onClick={() => onStatusChange(r.id, 'revisado')}
                className="p-1.5 rounded text-white/20 hover:text-[#22c55e] hover:bg-[#22c55e]/10 transition-all"
                title="Marcar revisado"
              >
                <FiEye size={13} />
              </button>
            )}
            {r.estado === 'revisado' && (
              <button
                onClick={() => onStatusChange(r.id, 'accion_tomada')}
                className="p-1.5 rounded text-white/20 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all"
                title="Marcar acción tomada"
              >
                <FiCheck size={13} />
              </button>
            )}
            <button
              onClick={() => setExpanded(v => !v)}
              className="p-1.5 rounded text-white/20 hover:text-white/60 hover:bg-white/[0.05] transition-all"
              title={expanded ? 'Colapsar' : 'Expandir'}
            >
              {expanded ? <FiChevronUp size={13} /> : <FiChevronDown size={13} />}
            </button>
          </div>
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 space-y-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>

                {/* Content snapshot */}
                {r.contenido_texto && (
                  <div>
                    <p className="text-[10px] text-white/25 mb-1 flex items-center gap-1">
                      <FiMessageSquare size={10} /> Contenido reportado
                    </p>
                    <div
                      className="text-xs text-white/45 leading-relaxed px-3 py-2 rounded-lg italic"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      "{r.contenido_texto}"
                    </div>
                  </div>
                )}

                {/* Notas admin */}
                <div>
                  <p className="text-[10px] text-white/25 mb-1">Notas del moderador</p>
                  <textarea
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                    placeholder="Añade notas internas…"
                    rows={2}
                    className="w-full resize-none rounded-lg px-3 py-2 text-xs text-white/70 outline-none placeholder:text-white/20"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)' }}
                  />
                  <button
                    onClick={saveNotas}
                    disabled={savingNotas}
                    className="mt-1.5 text-[10px] px-3 py-1 rounded-md font-medium transition-all disabled:opacity-40"
                    style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.5)' }}
                  >
                    {savingNotas ? 'Guardando…' : 'Guardar notas'}
                  </button>
                </div>

                {/* Delete content action */}
                {r.contenido_id && TABLE_FOR_TYPE[r.tipo_contenido] && r.estado !== 'accion_tomada' && (
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => onDeleteContent(r)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-90"
                      style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.2)' }}
                    >
                      <FiTrash2 size={11} /> Eliminar contenido
                    </button>
                    <span className="text-[10px] text-white/20">Elimina el {r.tipo_contenido} de la plataforma</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}

export default function ContentModerator() {
  const [reports, setReports] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('pendiente')

  const fetchReports = async () => {
    const { data, error } = await supabase
      .from('reportes')
      .select('*, reportado_por:usuarios!reportes_reportado_por_fkey(nombre, foto_url)')
      .order('created_at', { ascending: false })
    if (error) setReports([])
    else setReports(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchReports() }, [])

  const updateStatus = async (id, estado) => {
    const { error } = await supabase.from('reportes').update({ estado }).eq('id', id)
    if (error) { toast.error('Error'); return }
    setReports(prev => prev.map(r => r.id === id ? { ...r, estado } : r))
    toast.success('Estado actualizado')
  }

  const handleDeleteContent = async (report) => {
    const table = TABLE_FOR_TYPE[report.tipo_contenido]
    if (!table || !report.contenido_id) return
    const { error } = await supabase.from(table).delete().eq('id', report.contenido_id)
    if (error) { toast.error('No se pudo eliminar el contenido'); return }
    // Mark report as action taken
    await updateStatus(report.id, 'accion_tomada')
    toast.success(`${report.tipo_contenido} eliminado`, { description: 'El reporte se marcó como acción tomada.' })
  }

  const filtered = filter === 'todos' ? reports : reports.filter(r => r.estado === filter)
  const pending  = reports.filter(r => r.estado === 'pendiente').length

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 rounded-xl bg-white/[0.03] animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary + filter bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FiAlertTriangle size={14} className="text-[#F59E0B]" />
          <span className="text-sm text-white/50 font-medium">
            {pending} pendiente{pending !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex gap-1 ml-auto">
          {['pendiente', 'revisado', 'accion_tomada', 'todos'].map(f => {
            const labels = { pendiente: 'Pendientes', revisado: 'Revisados', accion_tomada: 'Acción', todos: 'Todos' }
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
                style={filter === f
                  ? { background: 'rgba(252,101,31,0.15)', color: '#FC651F' }
                  : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)' }
                }
              >
                {labels[f]}
              </button>
            )
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="text-center py-12">
          <FiFlag size={32} className="mx-auto text-white/10 mb-4" />
          <p className="text-white/30 text-sm font-medium">
            {filter === 'todos' ? 'Sin reportes de contenido' : `Sin reportes ${filter === 'pendiente' ? 'pendientes' : filter === 'revisado' ? 'revisados' : 'con acción tomada'}`}
          </p>
          <p className="text-white/15 text-xs mt-1">Los reportes de contenido inapropiado aparecerán aquí</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <ReportCard
              key={r.id}
              r={r}
              onStatusChange={updateStatus}
              onDeleteContent={handleDeleteContent}
            />
          ))}
        </div>
      )}
    </div>
  )
}
