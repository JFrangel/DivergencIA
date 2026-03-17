import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FiAlertTriangle, FiCheck, FiX, FiFlag, FiEye, FiTrash2 } from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import Card from '../ui/Card'
import Badge from '../ui/Badge'
import Button from '../ui/Button'
import Avatar from '../ui/Avatar'
import { toast } from 'sonner'
import { timeAgo } from '../../lib/utils'

const REPORT_STATUS = {
  pendiente: { label: 'Pendiente', color: '#F59E0B' },
  revisado: { label: 'Revisado', color: '#22c55e' },
  accion_tomada: { label: 'Acción tomada', color: '#EF4444' },
}

export default function ContentModerator() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('reportes')
      .select('*, reportado_por:usuarios!reportes_reportado_por_fkey(nombre, foto_url)')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        // If table doesn't exist, show empty state gracefully
        if (error) setReports([])
        else setReports(data || [])
        setLoading(false)
      })
  }, [])

  const updateStatus = async (id, estado) => {
    const { error } = await supabase.from('reportes').update({ estado }).eq('id', id)
    if (error) { toast.error('Error'); return }
    setReports(prev => prev.map(r => r.id === id ? { ...r, estado } : r))
    toast.success('Estado actualizado')
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => (
          <div key={i} className="h-20 rounded-xl bg-white/[0.03] animate-pulse" />
        ))}
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <Card className="text-center py-12">
        <FiFlag size={32} className="mx-auto text-white/10 mb-4" />
        <p className="text-white/30 text-sm font-medium">Sin reportes de contenido</p>
        <p className="text-white/15 text-xs mt-1">Los reportes de contenido inapropiado aparecerán aquí</p>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <FiAlertTriangle size={14} className="text-[#F59E0B]" />
        <span className="text-sm text-white/50 font-medium">
          {reports.filter(r => r.estado === 'pendiente').length} reportes pendientes
        </span>
      </div>

      {reports.map((r, i) => {
        const status = REPORT_STATUS[r.estado] || REPORT_STATUS.pendiente
        return (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-[#F59E0B]/10 text-[#F59E0B]">
                  <FiFlag size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-white/70">{r.tipo_contenido || 'Contenido'}</p>
                    <span
                      className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                      style={{ background: `${status.color}15`, color: status.color }}
                    >
                      {status.label}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mb-1">{r.razon || 'Sin razón especificada'}</p>
                  {r.reportado_por && (
                    <p className="text-[10px] text-white/20 flex items-center gap-1">
                      Reportado por: {r.reportado_por.nombre} · {timeAgo(r.created_at)}
                    </p>
                  )}
                </div>
                {r.estado === 'pendiente' && (
                  <div className="flex gap-1 shrink-0">
                    <button
                      onClick={() => updateStatus(r.id, 'revisado')}
                      className="p-1.5 rounded text-white/20 hover:text-[#22c55e] hover:bg-[#22c55e]/10 transition-all"
                      title="Marcar como revisado"
                    >
                      <FiEye size={13} />
                    </button>
                    <button
                      onClick={() => updateStatus(r.id, 'accion_tomada')}
                      className="p-1.5 rounded text-white/20 hover:text-[#EF4444] hover:bg-[#EF4444]/10 transition-all"
                      title="Tomar acción"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}
