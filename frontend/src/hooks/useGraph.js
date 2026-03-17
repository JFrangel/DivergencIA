import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const AREA_COLOR = {
  ML: '#FC651F',
  NLP: '#8B5CF6',
  Vision: '#00D1FF',
  Datos: '#22c55e',
  General: '#F59E0B',
  default: '#6b7280',
}

function areaColor(area) {
  return AREA_COLOR[area] || AREA_COLOR.default
}

export function useGraph() {
  const { user } = useAuth()
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Check if current user opted out of appearing in graph
      let hideUserId = null
      try {
        const privacyPrefs = JSON.parse(localStorage.getItem('divergencia_privacy_prefs') || '{}')
        if (privacyPrefs.showInGraph === false && user?.id) {
          hideUserId = user.id
        }
      } catch { /* ignore */ }
      const [
        { data: miembros },
        { data: proyectos },
        { data: ideas },
        { data: miembrosProy },
      ] = await Promise.all([
        supabase.from('usuarios').select('id, nombre, area_investigacion, es_fundador, rol').eq('activo', true),
        supabase.from('proyectos').select('id, titulo, estado, creador_id').order('created_at', { ascending: false }).limit(20),
        supabase.from('ideas').select('id, titulo, estado, autor_id, votos_favor').order('votos_favor', { ascending: false }).limit(15),
        supabase.from('miembros_proyecto').select('proyecto_id, usuario_id').eq('activo', true),
      ])

      const built_nodes = []
      const built_edges = []
      const SPACING = 220

      // Hub node — center
      built_nodes.push({
        id: 'hub',
        type: 'hub',
        position: { x: 0, y: 0 },
        data: { label: 'DivergencIA' },
      })

      // Member nodes — ring around hub (exclude self if privacy pref is off)
      const memberList = (miembros || []).filter(m => m.id !== hideUserId)
      const memberAngle = (2 * Math.PI) / (memberList.length || 1)
      const memberRadius = SPACING * 2

      memberList.forEach((m, i) => {
        const angle = i * memberAngle - Math.PI / 2
        const x = Math.cos(angle) * memberRadius
        const y = Math.sin(angle) * memberRadius
        built_nodes.push({
          id: `member-${m.id}`,
          type: m.es_fundador ? 'founder' : 'member',
          position: { x, y },
          data: { label: m.nombre, area: m.area_investigacion, id: m.id },
        })
        built_edges.push({
          id: `hub-member-${m.id}`,
          source: 'hub',
          target: `member-${m.id}`,
          type: 'pulsing',
          animated: false,
          style: { stroke: `${areaColor(m.area_investigacion)}40`, strokeWidth: 1 },
        })
      })

      // Project nodes — outer ring
      const projList = proyectos || []
      const projAngle = (2 * Math.PI) / (projList.length || 1)
      const projRadius = SPACING * 3.8

      projList.forEach((p, i) => {
        const angle = i * projAngle
        const x = Math.cos(angle) * projRadius
        const y = Math.sin(angle) * projRadius
        built_nodes.push({
          id: `project-${p.id}`,
          type: 'project',
          position: { x, y },
          data: { label: p.titulo, estado: p.estado, id: p.id },
        })

        // Connect to creator
        if (p.creador_id) {
          built_edges.push({
            id: `creator-${p.id}`,
            source: `member-${p.creador_id}`,
            target: `project-${p.id}`,
            animated: true,
            style: { stroke: '#FC651F40', strokeWidth: 1.5, strokeDasharray: '4 4' },
          })
        }

        // Connect project members
        const projMembers = (miembrosProy || []).filter(mp => mp.proyecto_id === p.id)
        projMembers.forEach(mp => {
          if (mp.usuario_id !== p.creador_id) {
            built_edges.push({
              id: `member-proj-${mp.usuario_id}-${p.id}`,
              source: `member-${mp.usuario_id}`,
              target: `project-${p.id}`,
              style: { stroke: '#8B5CF640', strokeWidth: 1 },
            })
          }
        })
      })

      // Idea nodes — scattered outer positions
      const ideaList = ideas || []
      ideaList.forEach((idea, i) => {
        const angle = (i / (ideaList.length || 1)) * 2 * Math.PI + Math.PI / 4
        const radius = SPACING * 2.5 + (i % 3) * SPACING * 0.5
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius
        built_nodes.push({
          id: `idea-${idea.id}`,
          type: 'idea',
          position: { x, y },
          data: { label: idea.titulo, votos: idea.votos_favor, id: idea.id },
        })

        // Connect to author
        if (idea.autor_id) {
          built_edges.push({
            id: `idea-author-${idea.id}`,
            source: `member-${idea.autor_id}`,
            target: `idea-${idea.id}`,
            style: { stroke: '#00D1FF30', strokeWidth: 1, strokeDasharray: '3 6' },
          })
        }
      })

      setNodes(built_nodes)
      setEdges(built_edges)
      setLoading(false)
    }

    load()
  }, [])

  return { nodes, edges, loading }
}
