import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Maps DB `estado` values to normalized states for the UI.
 * DB uses: actual | proxima | bloqueada | completada
 * UI uses: completado | en_progreso | pendiente | bloqueado
 */
function mapEstado(dbEstado) {
  switch (dbEstado) {
    case 'completada': return 'completado'
    case 'actual':     return 'en_progreso'
    case 'proxima':    return 'pendiente'
    case 'bloqueada':  return 'bloqueado'
    default:           return 'pendiente'
  }
}

function normalizeFases(data) {
  return data.map(fase => ({
    id: fase.id,
    orden: fase.orden,
    titulo: fase.titulo,
    descripcion: fase.descripcion,
    estado: mapEstado(fase.estado),
    estadoOriginal: fase.estado,
    fecha_estimada: fase.fecha_estimada,
    color: fase.color,
    hitos: (fase.milestones || []).map(m => ({
      titulo: m.titulo,
      completado: m.completado,
    })),
  }))
}

export function useRoadmap() {
  const [roadmap, setRoadmap] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchRoadmap = useCallback(async () => {
    const { data, error } = await supabase
      .from('roadmap_fases')
      .select('*')
      .order('orden', { ascending: true })

    if (error || !data?.length) {
      setRoadmap([])
    } else {
      setRoadmap(normalizeFases(data))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchRoadmap()
  }, [fetchRoadmap])

  /** Update a phase's editable fields (titulo, descripcion, fecha_estimada, color). */
  async function updatePhase(id, updates) {
    const { error } = await supabase
      .from('roadmap_fases')
      .update(updates)
      .eq('id', id)

    if (error) throw error
    await fetchRoadmap()
  }

  /** Toggle a milestone's completado status within the milestones JSONB array. */
  async function toggleMilestone(phaseId, milestoneTitle) {
    // Find the current phase in local state to get its milestones
    const phase = roadmap.find(p => p.id === phaseId)
    if (!phase) throw new Error('Fase no encontrada')

    const updatedMilestones = phase.hitos.map(m =>
      m.titulo === milestoneTitle ? { ...m, completado: !m.completado } : m
    )

    const { error } = await supabase
      .from('roadmap_fases')
      .update({ milestones: updatedMilestones })
      .eq('id', phaseId)

    if (error) throw error
    await fetchRoadmap()
  }

  /** Change a phase's estado using DB values (completada|actual|proxima|bloqueada). */
  async function updatePhaseEstado(id, newEstado) {
    const { error } = await supabase
      .from('roadmap_fases')
      .update({ estado: newEstado })
      .eq('id', id)

    if (error) throw error
    await fetchRoadmap()
  }

  return { roadmap, loading, updatePhase, toggleMilestone, updatePhaseEstado }
}
