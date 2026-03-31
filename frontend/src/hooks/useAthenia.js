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
      { data: muralesUsuario },
    ] = await Promise.all([
      supabase.from('usuarios').select('*', { count: 'exact', head: true }).eq('activo', true),
      supabase.from('proyectos').select('*', { count: 'exact', head: true }),
      supabase.from('ideas').select('*', { count: 'exact', head: true }),
      supabase.from('proyectos').select('titulo, estado, area').in('estado', ['activo', 'investigacion', 'desarrollo']).limit(5),
      supabase.from('ideas').select('titulo, votos_favor').order('votos_favor', { ascending: false }).limit(3),
      user ? supabase.from('murales').select('titulo, tipo, data').eq('creador_id', user.id).order('updated_at', { ascending: false }).limit(3) : Promise.resolve({ data: [] }),
    ])

    const projectList = proyectosActivos?.length
      ? proyectosActivos.map(p => `• ${p.titulo} (${p.estado}${p.area ? ', ' + p.area : ''})`).join('\n')
      : '• Sin proyectos activos registrados'

    const ideasList = ideasTop?.length
      ? ideasTop.map(i => `• [${i.votos_favor || 0}v] ${i.titulo}`).join('\n')
      : '• Sin ideas en el banco aún'

    const muralesCtx = muralesUsuario?.length
      ? muralesUsuario.map(m => {
          const elementos = m.data?.elements || []
          const tipos = elementos.reduce((acc, el) => {
            const t = el.type || 'otro'
            acc[t] = (acc[t] || 0) + 1
            return acc
          }, {})
          const resumen = Object.entries(tipos).map(([t, n]) => `${n} ${t}`).join(', ')
          return `• "${m.titulo}" (${m.tipo}): ${elementos.length} elementos${resumen ? ' — ' + resumen : ''}`
        }).join('\n')
      : '• Sin murales creados aún'

    return `=== SEMILLERO ATHENIA ===
Miembros activos: ${miembros || 0} | Proyectos totales: ${totalProyectos || 0} | Ideas en banco: ${totalIdeas || 0}

PROYECTOS EN CURSO:
${projectList}

IDEAS DESTACADAS (por votos):
${ideasList}

MIS MURALES:
${muralesCtx}`
  }, [user])

  return { history, loading, saveMessage, clearHistory, buildContext }
}
