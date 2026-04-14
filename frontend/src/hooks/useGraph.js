import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { getPlatformName } from './usePlatformConfig'

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
  const [rawData, setRawData] = useState({
    miembros: [],
    proyectos: [],
    ideas: [],
    miembrosProy: [],
  })
  const [loading, setLoading] = useState(true)

  // Filter state
  const [filters, setFilters] = useState({
    nodeTypes: { members: true, projects: true, ideas: true },
    area: 'all',           // 'all' | 'ML' | 'NLP' | 'Vision' | 'Datos' | 'General'
    activityLevel: 'all',  // 'all' | 'high' | 'medium' | 'low'
    timeRange: null,       // { start: Date, end: Date } or null for all
  })

  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [highlightedNodeId, setHighlightedNodeId] = useState(null)

  useEffect(() => {
    async function load() {
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
        supabase.from('usuarios').select('id, nombre, area_investigacion, es_fundador, rol, fecha_registro').eq('activo', true),
        supabase.from('proyectos').select('id, titulo, estado, creador_id, created_at').order('created_at', { ascending: false }).limit(50),
        supabase.from('ideas').select('id, titulo, estado, autor_id, votos_favor, created_at').order('votos_favor', { ascending: false }).limit(30),
        supabase.from('miembros_proyecto').select('proyecto_id, usuario_id').eq('activo', true),
      ])

      const filteredMiembros = (miembros || []).filter(m => m.id !== hideUserId)

      setRawData({
        miembros: filteredMiembros,
        proyectos: proyectos || [],
        ideas: ideas || [],
        miembrosProy: miembrosProy || [],
      })
      setLoading(false)
    }

    load()
  }, [user?.id])

  // Calculate connection strength between members (shared projects)
  const connectionStrength = useMemo(() => {
    const strength = {}
    const { proyectos, miembrosProy } = rawData

    proyectos.forEach(p => {
      const projMembers = miembrosProy
        .filter(mp => mp.proyecto_id === p.id)
        .map(mp => mp.usuario_id)
      // Include creator
      if (p.creador_id && !projMembers.includes(p.creador_id)) {
        projMembers.push(p.creador_id)
      }
      // Create pairs
      for (let i = 0; i < projMembers.length; i++) {
        for (let j = i + 1; j < projMembers.length; j++) {
          const key = [projMembers[i], projMembers[j]].sort().join('-')
          strength[key] = (strength[key] || 0) + 1
        }
      }
    })
    return strength
  }, [rawData])

  // Stats
  const stats = useMemo(() => {
    const { miembros, proyectos, ideas, miembrosProy } = rawData

    // Most connected member: count how many unique connections each member has
    const connectionCount = {}
    miembros.forEach(m => { connectionCount[m.id] = 0 })
    Object.keys(connectionStrength).forEach(key => {
      const [a, b] = key.split('-')
      if (connectionCount[a] !== undefined) connectionCount[a] += connectionStrength[key]
      if (connectionCount[b] !== undefined) connectionCount[b] += connectionStrength[key]
    })
    // Also count project/idea connections
    miembrosProy.forEach(mp => {
      if (connectionCount[mp.usuario_id] !== undefined) connectionCount[mp.usuario_id]++
    })
    ideas.forEach(idea => {
      if (idea.autor_id && connectionCount[idea.autor_id] !== undefined) connectionCount[idea.autor_id]++
    })

    let mostConnectedMember = null
    let maxConnections = 0
    Object.entries(connectionCount).forEach(([id, count]) => {
      if (count > maxConnections) {
        maxConnections = count
        mostConnectedMember = miembros.find(m => m.id === id)
      }
    })

    // Most active project: most members
    const projMemberCounts = {}
    miembrosProy.forEach(mp => {
      projMemberCounts[mp.proyecto_id] = (projMemberCounts[mp.proyecto_id] || 0) + 1
    })
    let mostActiveProject = null
    let maxMembers = 0
    Object.entries(projMemberCounts).forEach(([pid, count]) => {
      if (count > maxMembers) {
        maxMembers = count
        mostActiveProject = proyectos.find(p => p.id === pid)
      }
    })

    // Area distribution
    const areaCounts = {}
    miembros.forEach(m => {
      const area = m.area_investigacion || 'General'
      areaCounts[area] = (areaCounts[area] || 0) + 1
    })

    return {
      totalNodes: miembros.length + proyectos.length + ideas.length + 1, // +1 for hub
      totalConnections: Object.keys(connectionStrength).length,
      totalMembers: miembros.length,
      totalProjects: proyectos.length,
      totalIdeas: ideas.length,
      mostConnectedMember: mostConnectedMember?.nombre || 'N/A',
      mostActiveProject: mostActiveProject?.titulo || 'N/A',
      areaCounts,
    }
  }, [rawData, connectionStrength])

  // Build filtered nodes and edges
  const { nodes, edges } = useMemo(() => {
    const { miembros, proyectos, ideas, miembrosProy } = rawData
    const built_nodes = []
    const built_edges = []
    const SPACING = 220

    // Hub node
    built_nodes.push({
      id: 'hub',
      type: 'hub',
      position: { x: 0, y: 0 },
      data: { label: getPlatformName() },
    })

    // Filter members by area
    let filteredMembers = miembros
    if (filters.area !== 'all') {
      filteredMembers = miembros.filter(m => m.area_investigacion === filters.area)
    }

    // Filter by time range
    if (filters.timeRange) {
      const { start, end } = filters.timeRange
      filteredMembers = filteredMembers.filter(m => {
        if (!m.fecha_registro) return true
        const d = new Date(m.fecha_registro)
        return d >= start && d <= end
      })
    }

    // Activity level filter
    if (filters.activityLevel !== 'all') {
      const memberProjectCount = {}
      miembrosProy.forEach(mp => {
        memberProjectCount[mp.usuario_id] = (memberProjectCount[mp.usuario_id] || 0) + 1
      })
      filteredMembers = filteredMembers.filter(m => {
        const count = memberProjectCount[m.id] || 0
        if (filters.activityLevel === 'high') return count >= 3
        if (filters.activityLevel === 'medium') return count >= 1 && count < 3
        if (filters.activityLevel === 'low') return count === 0
        return true
      })
    }

    // Member nodes
    if (filters.nodeTypes.members) {
      const memberAngle = (2 * Math.PI) / (filteredMembers.length || 1)
      const memberRadius = SPACING * 2

      filteredMembers.forEach((m, i) => {
        const angle = i * memberAngle - Math.PI / 2
        const x = Math.cos(angle) * memberRadius
        const y = Math.sin(angle) * memberRadius
        const isHighlighted = highlightedNodeId === `member-${m.id}`
        built_nodes.push({
          id: `member-${m.id}`,
          type: m.es_fundador ? 'founder' : 'member',
          position: { x, y },
          data: {
            label: m.nombre,
            area: m.area_investigacion,
            id: m.id,
            highlighted: isHighlighted,
          },
          style: isHighlighted ? { filter: 'drop-shadow(0 0 12px #FC651F)', zIndex: 100 } : undefined,
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
    }

    // Member-to-member connections based on shared projects
    if (filters.nodeTypes.members) {
      const memberIds = new Set(filteredMembers.map(m => m.id))
      Object.entries(connectionStrength).forEach(([key, strength]) => {
        const [a, b] = key.split('-')
        if (memberIds.has(a) && memberIds.has(b)) {
          built_edges.push({
            id: `collab-${key}`,
            source: `member-${a}`,
            target: `member-${b}`,
            animated: strength >= 3,
            style: {
              stroke: '#FC651F30',
              strokeWidth: Math.min(1 + strength * 0.8, 5),
              strokeDasharray: strength < 2 ? '4 4' : undefined,
            },
          })
        }
      })
    }

    // Project nodes
    if (filters.nodeTypes.projects) {
      let filteredProjects = proyectos
      if (filters.timeRange) {
        const { start, end } = filters.timeRange
        filteredProjects = proyectos.filter(p => {
          if (!p.created_at) return true
          const d = new Date(p.created_at)
          return d >= start && d <= end
        })
      }

      const projAngle = (2 * Math.PI) / (filteredProjects.length || 1)
      const projRadius = SPACING * 3.8

      filteredProjects.forEach((p, i) => {
        const angle = i * projAngle
        const x = Math.cos(angle) * projRadius
        const y = Math.sin(angle) * projRadius
        const isHighlighted = highlightedNodeId === `project-${p.id}`
        built_nodes.push({
          id: `project-${p.id}`,
          type: 'project',
          position: { x, y },
          data: { label: p.titulo, estado: p.estado, id: p.id, highlighted: isHighlighted },
          style: isHighlighted ? { filter: 'drop-shadow(0 0 12px #8B5CF6)', zIndex: 100 } : undefined,
        })

        // Connect to creator
        if (p.creador_id && filters.nodeTypes.members) {
          const creatorExists = filteredMembers.some(m => m.id === p.creador_id)
          if (creatorExists) {
            built_edges.push({
              id: `creator-${p.id}`,
              source: `member-${p.creador_id}`,
              target: `project-${p.id}`,
              animated: true,
              style: { stroke: '#FC651F40', strokeWidth: 1.5, strokeDasharray: '4 4' },
            })
          }
        }

        // Connect project members
        if (filters.nodeTypes.members) {
          const projMembers = miembrosProy.filter(mp => mp.proyecto_id === p.id)
          projMembers.forEach(mp => {
            const memberExists = filteredMembers.some(m => m.id === mp.usuario_id)
            if (memberExists && mp.usuario_id !== p.creador_id) {
              built_edges.push({
                id: `member-proj-${mp.usuario_id}-${p.id}`,
                source: `member-${mp.usuario_id}`,
                target: `project-${p.id}`,
                style: { stroke: '#8B5CF640', strokeWidth: 1 },
              })
            }
          })
        }
      })
    }

    // Idea nodes
    if (filters.nodeTypes.ideas) {
      let filteredIdeas = ideas
      if (filters.timeRange) {
        const { start, end } = filters.timeRange
        filteredIdeas = ideas.filter(idea => {
          if (!idea.created_at) return true
          const d = new Date(idea.created_at)
          return d >= start && d <= end
        })
      }

      filteredIdeas.forEach((idea, i) => {
        const angle = (i / (filteredIdeas.length || 1)) * 2 * Math.PI + Math.PI / 4
        const radius = SPACING * 2.5 + (i % 3) * SPACING * 0.5
        const x = Math.cos(angle) * radius
        const y = Math.sin(angle) * radius
        const isHighlighted = highlightedNodeId === `idea-${idea.id}`
        built_nodes.push({
          id: `idea-${idea.id}`,
          type: 'idea',
          position: { x, y },
          data: { label: idea.titulo, votos: idea.votos_favor, id: idea.id, highlighted: isHighlighted },
          style: isHighlighted ? { filter: 'drop-shadow(0 0 12px #00D1FF)', zIndex: 100 } : undefined,
        })

        if (idea.autor_id && filters.nodeTypes.members) {
          const authorExists = filteredMembers.some(m => m.id === idea.autor_id)
          if (authorExists) {
            built_edges.push({
              id: `idea-author-${idea.id}`,
              source: `member-${idea.autor_id}`,
              target: `idea-${idea.id}`,
              style: { stroke: '#00D1FF30', strokeWidth: 1, strokeDasharray: '3 6' },
            })
          }
        }
      })
    }

    return { nodes: built_nodes, edges: built_edges }
  }, [rawData, filters, connectionStrength, highlightedNodeId])

  // Search handler
  const searchNode = useCallback((query) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setHighlightedNodeId(null)
      return null
    }
    const q = query.toLowerCase()
    const found = nodes.find(n =>
      n.data.label?.toLowerCase().includes(q) && n.id !== 'hub'
    )
    if (found) {
      setHighlightedNodeId(found.id)
      return found
    }
    setHighlightedNodeId(null)
    return null
  }, [nodes])

  // Export graph data as JSON
  const exportGraph = useCallback(() => {
    const data = {
      nodes: nodes.map(n => ({ id: n.id, type: n.type, label: n.data.label, ...n.data })),
      edges: edges.map(e => ({ id: e.id, source: e.source, target: e.target })),
      stats,
      exportedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `divergencia-graph-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [nodes, edges, stats])

  return {
    nodes,
    edges,
    loading,
    stats,
    filters,
    setFilters,
    searchQuery,
    searchNode,
    highlightedNodeId,
    exportGraph,
    connectionStrength,
    rawData,
  }
}
