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

/** Reverse map: UI estado -> DB estado */
function reverseMapEstado(uiEstado) {
  switch (uiEstado) {
    case 'completado':  return 'completada'
    case 'en_progreso': return 'actual'
    case 'pendiente':   return 'proxima'
    case 'bloqueado':   return 'bloqueada'
    default:            return 'proxima'
  }
}

/**
 * Auto-compute phase estado based on milestone completion.
 * - All milestones complete → completado
 * - At least one milestone complete → en_progreso
 * - No milestones complete → keep original estado
 * Phases with estado 'bloqueado' are never auto-transitioned.
 */
function computeAutoEstado(hitos, originalEstado) {
  if (!hitos || hitos.length === 0) return originalEstado
  if (originalEstado === 'bloqueado') return 'bloqueado'

  const total = hitos.length
  const done = hitos.filter(h => h.completado).length

  if (done === total) return 'completado'
  if (done > 0) return 'en_progreso'
  return originalEstado
}

function normalizeFases(data) {
  return data.map(fase => {
    const hitos = (fase.milestones || []).map(m => ({
      titulo: m.titulo,
      completado: m.completado,
    }))

    const mappedEstado = mapEstado(fase.estado)
    const autoEstado = computeAutoEstado(hitos, mappedEstado)

    const total = hitos.length
    const done = hitos.filter(h => h.completado).length
    const progressPct = total > 0 ? Math.round((done / total) * 100) : 0

    return {
      id: fase.id,
      orden: fase.orden,
      titulo: fase.titulo,
      descripcion: fase.descripcion,
      estado: autoEstado,
      estadoOriginal: fase.estado,
      fecha_estimada: fase.fecha_estimada,
      color: fase.color,
      hitos,
      progressPct,
      completedHitos: done,
      totalHitos: total,
    }
  })
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
      const normalized = normalizeFases(data)
      setRoadmap(normalized)

      // Auto-sync phase estados to DB when milestone-based computation differs
      for (const fase of normalized) {
        const expectedDbEstado = reverseMapEstado(fase.estado)
        if (expectedDbEstado !== fase.estadoOriginal && fase.estadoOriginal !== 'bloqueada') {
          await supabase
            .from('roadmap_fases')
            .update({ estado: expectedDbEstado })
            .eq('id', fase.id)
        }
      }
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
    const phase = roadmap.find(p => p.id === phaseId)
    if (!phase) throw new Error('Fase no encontrada')

    const updatedMilestones = phase.hitos.map(m =>
      m.titulo === milestoneTitle ? { ...m, completado: !m.completado } : m
    )

    // Compute what the new estado should be after toggle
    const done = updatedMilestones.filter(m => m.completado).length
    const total = updatedMilestones.length
    let newDbEstado = phase.estadoOriginal
    if (phase.estadoOriginal !== 'bloqueada') {
      if (done === total) newDbEstado = 'completada'
      else if (done > 0) newDbEstado = 'actual'
      else newDbEstado = 'proxima'
    }

    const { error } = await supabase
      .from('roadmap_fases')
      .update({ milestones: updatedMilestones, estado: newDbEstado })
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

  /** Add a new milestone to a phase's milestones array. */
  async function addMilestone(phaseId, titulo) {
    const phase = roadmap.find(p => p.id === phaseId)
    if (!phase) throw new Error('Fase no encontrada')
    const milestones = [...phase.hitos.map(h => ({ titulo: h.titulo, completado: h.completado })), { titulo: titulo.trim(), completado: false }]
    const { error } = await supabase.from('roadmap_fases').update({ milestones }).eq('id', phaseId)
    if (error) throw error
    await fetchRoadmap()
  }

  /** Remove a milestone from a phase by title. */
  async function removeMilestone(phaseId, titulo) {
    const phase = roadmap.find(p => p.id === phaseId)
    if (!phase) throw new Error('Fase no encontrada')
    const milestones = phase.hitos.filter(h => h.titulo !== titulo).map(h => ({ titulo: h.titulo, completado: h.completado }))
    const { error } = await supabase.from('roadmap_fases').update({ milestones }).eq('id', phaseId)
    if (error) throw error
    await fetchRoadmap()
  }

  /** Create a new phase. */
  async function createPhase({ titulo, descripcion, color, fecha_estimada }) {
    const newOrden = roadmap.length > 0 ? Math.max(...roadmap.map(r => r.orden)) + 1 : 1
    const { error } = await supabase.from('roadmap_fases').insert({
      titulo,
      descripcion: descripcion || '',
      color: color || '#8B5CF6',
      fecha_estimada: fecha_estimada || null,
      estado: 'proxima',
      orden: newOrden,
      milestones: [],
    })
    if (error) throw error
    await fetchRoadmap()
  }

  return { roadmap, loading, updatePhase, toggleMilestone, updatePhaseEstado, addMilestone, removeMilestone, createPhase }
}
