import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useAthenia() {
  const { user } = useAuth()
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    supabase
      .from('athenia_memoria')
      .select('*')
      .eq('usuario_id', user.id)
      .order('timestamp', { ascending: true })
      .limit(50)
      .then(({ data }) => {
        setHistory(data || [])
        setLoading(false)
      })
  }, [user])

  const saveMessage = useCallback(async (mensaje, rol) => {
    if (!user) return
    const msg = {
      usuario_id: user.id,
      mensaje,
      rol, // 'user' | 'assistant'
    }
    const { data } = await supabase.from('athenia_memoria').insert(msg).select().single()
    if (data) setHistory(h => [...h, data])
    return data
  }, [user])

  const clearHistory = useCallback(async () => {
    if (!user) return
    await supabase.from('athenia_memoria').delete().eq('usuario_id', user.id)
    setHistory([])
  }, [user])

  // Build rich context string for Gemini
  const buildContext = useCallback(async () => {
    const [
      { count: miembros },
      { count: totalProyectos },
      { count: totalIdeas },
      { data: proyectosActivos },
      { data: ideasTop },
      { data: temas },
      { data: muralesUsuario },
    ] = await Promise.all([
      supabase.from('usuarios').select('*', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('proyectos').select('*', { count: 'exact', head: true }),
      supabase.from('ideas').select('*', { count: 'exact', head: true }),
      supabase.from('proyectos').select('titulo, estado, area').in('estado', ['activo', 'investigacion', 'desarrollo']).limit(6),
      supabase.from('ideas').select('titulo, votos_favor').order('votos_favor', { ascending: false }).limit(5),
      supabase.from('temas_aprendizaje').select('titulo, categoria, nivel, skills_relacionadas').order('created_at', { ascending: false }).limit(12),
      user ? supabase.from('murales').select('titulo, tipo').eq('creador_id', user.id).order('updated_at', { ascending: false }).limit(3) : Promise.resolve({ data: [] }),
    ])

    const projectList = proyectosActivos?.length
      ? proyectosActivos.map(p => `• ${p.titulo} (${p.estado}${p.area ? ', ' + p.area : ''})`).join('\n')
      : '• Sin proyectos activos registrados'

    const ideasList = ideasTop?.length
      ? ideasTop.map(i => `• [${i.votos_favor || 0}v] ${i.titulo}`).join('\n')
      : '• Sin ideas en el banco aún'

    const temasCtx = temas?.length
      ? temas.map(t => `• [${t.categoria || 'General'}/${t.nivel || 'basico'}] ${t.titulo}${t.skills_relacionadas?.length ? ' — skills: ' + t.skills_relacionadas.join(', ') : ''}`).join('\n')
      : '• Sin temas de aprendizaje registrados aún'

    const muralesCtx = muralesUsuario?.length
      ? muralesUsuario.map(m => `• "${m.titulo}" (${m.tipo})`).join('\n')
      : '• Sin murales creados aún'

    return `=== PLATAFORMA ATHENIA — SEMILLERO UNIVERSITARIO DE IA ===
Miembros activos: ${miembros || 0} | Proyectos: ${totalProyectos || 0} | Ideas en banco: ${totalIdeas || 0}

PROYECTOS EN CURSO:
${projectList}

IDEAS DESTACADAS (por votos):
${ideasList}

TEMAS DE APRENDIZAJE REGISTRADOS:
${temasCtx}

MIS MURALES:
${muralesCtx}

MÓDULOS DE LA PLATAFORMA DISPONIBLES:
• Dashboard — estadísticas, logros, tareas pendientes, actividad reciente
• Proyectos — Kanban de tareas, equipo, métricas, diagramas, biblioteca de archivos
• Ideas — banco de ideas con votación, ideas derivadas (padre-hijo)
• Aprendizaje — temas con secciones: texto, código, quiz, flashcards, imagen, video, presentaciones
• Nodos/Grupos — comunidades internas con chat en tiempo real
• Chat — mensajes directos y canales, llamadas de audio/video WebRTC
• Roadmap — fases del semillero, hitos, cronología, feed de actividad
• Calendario — eventos académicos y del semillero
• Biblioteca — archivos con versiones, filtros por tipo y visibilidad
• Murales — pizarrones colaborativos con IA integrada
• Red de Miembros — grafo de conexiones y perfiles
• ATHENIA (yo) — asistente IA con comandos y lenguaje natural`
  }, [user])

  return { history, loading, saveMessage, clearHistory, buildContext }
}
