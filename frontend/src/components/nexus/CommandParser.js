/**
 * ATHENIA Command Parser
 * Parses /commands and returns structured actions
 */

export const COMMANDS = {
  help: {
    usage: '/help',
    desc: 'Muestra todos los comandos disponibles',
  },
  status: {
    usage: '/status',
    desc: 'Estado del sistema ATHENIA',
  },
  members: {
    usage: '/members [área]',
    desc: 'Lista investigadores. Ej: /members ML',
  },
  projects: {
    usage: '/projects [estado]',
    desc: 'Lista proyectos activos. Ej: /projects desarrollo',
  },
  ideas: {
    usage: '/ideas [top|new]',
    desc: 'Ideas del banco. Ej: /ideas top',
  },
  connect: {
    usage: '/connect [TemaA] · [TemaB]',
    desc: 'Conecta dos áreas semánticamente con IA',
  },
  analyze: {
    usage: '/analyze',
    desc: 'Analiza imagen de pizarrón (adjunta imagen)',
  },
  roadmap: {
    usage: '/roadmap',
    desc: 'Ver fases del roadmap del semillero',
  },
  about: {
    usage: '/about',
    desc: 'Información sobre ATHENIA y ATHENIA',
  },
  tasks: {
    usage: '/tasks [mias|proyecto]',
    desc: 'Ver tareas pendientes. Ej: /tasks mias',
  },
  logros: {
    usage: '/logros',
    desc: 'Muestra tus logros desbloqueados',
  },
  stats: {
    usage: '/stats [user|global]',
    desc: 'Estadísticas personales o del semillero',
  },
  suggest: {
    usage: '/suggest [tema]',
    desc: 'Sugerencias de papers/datasets con IA',
  },
  export: {
    usage: '/export',
    desc: 'Exporta el historial de la terminal',
  },
  mural: {
    usage: '/mural [sugerir <tema> | analizar]',
    desc: 'Mural: resumen, sugerir layout con IA, o analizar elementos',
  },
  proyecto: {
    usage: '/proyecto <nombre>',
    desc: 'Busca un proyecto en la BD. Ej: /proyecto NLP Sentiment',
  },
  idea: {
    usage: '/idea <nombre>',
    desc: 'Busca una idea en la BD. Ej: /idea detector de plagio',
  },
  miembro: {
    usage: '/miembro <nombre>',
    desc: 'Busca un miembro del semillero. Ej: /miembro Juan',
  },
  clear: {
    usage: '/clear',
    desc: 'Limpia la terminal',
  },
  'crear-tema': {
    usage: '/crear-tema <título>',
    desc: '[Admin] Crea un tema de aprendizaje completo con IA. Ej: /crear-tema Transformers',
  },
  'editar-tema': {
    usage: '/editar-tema <título>',
    desc: '[Admin] Regenera el contenido de un tema existente con IA. Ej: /editar-tema Transformers',
  },
}

/**
 * Parse a terminal input string
 * Returns { type: 'command' | 'message', command?, args?, raw }
 */
export function parseInput(input) {
  const trimmed = input.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('/')) {
    const parts = trimmed.slice(1).split(/\s+/)
    const command = parts[0].toLowerCase()
    const args = parts.slice(1).join(' ')
    return { type: 'command', command, args, raw: trimmed }
  }

  return { type: 'message', raw: trimmed }
}

/**
 * Build help output lines
 */
export function buildHelpLines() {
  const lines = [
    { type: 'system', text: '═══════════════ COMANDOS ATHENIA ═══════════════' },
    { type: 'info', text: 'Comandos disponibles:' },
    ...Object.values(COMMANDS).map(c => ({
      type: 'info',
      text: `  ${c.usage.padEnd(30)} — ${c.desc}`,
    })),
    { type: 'system', text: '═══════════════════════════════════════════════' },
    { type: 'info', text: 'También puedes escribir en lenguaje natural.' },
    { type: 'info', text: 'ATHENIA responde con contexto del semillero.' },
  ]
  return lines
}
