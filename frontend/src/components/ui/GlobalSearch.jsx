import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiFolder, FiUsers, FiStar, FiBook, FiX, FiCpu } from 'react-icons/fi'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'

const CATEGORIES = {
  proyectos: { icon: FiFolder, color: '#FC651F', route: (id) => `/projects/${id}` },
  usuarios:  { icon: FiUsers, color: '#8B5CF6', route: (id) => `/members/${id}` },
  ideas:     { icon: FiStar,  color: '#00D1FF', route: (id) => `/ideas/${id}` },
  archivos:  { icon: FiBook,  color: '#22c55e', route: () => '/library' },
  temas:     { icon: FiCpu,   color: '#F59E0B', route: () => '/learning' },
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  // Keyboard shortcut: Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
      setResults([])
    }
  }, [open])

  const search = useCallback(async (q) => {
    if (!q || q.length < 2) { setResults([]); return }
    setLoading(true)
    const term = `%${q}%`

    const [{ data: proyectos }, { data: usuarios }, { data: ideas }, { data: archivos }, { data: temas }] = await Promise.all([
      supabase.from('proyectos').select('id, titulo, estado').ilike('titulo', term).limit(4),
      supabase.from('usuarios').select('id, nombre, area_investigacion').ilike('nombre', term).eq('activo', true).limit(4),
      supabase.from('ideas').select('id, titulo, estado').ilike('titulo', term).limit(4),
      supabase.from('archivos').select('id, nombre, tipo').ilike('nombre', term).limit(3),
      supabase.from('temas_aprendizaje').select('id, titulo, categoria').ilike('titulo', term).eq('activo', true).limit(3),
    ])

    const items = [
      ...(proyectos || []).map(p => ({ ...p, type: 'proyectos', label: p.titulo, sub: p.estado })),
      ...(usuarios  || []).map(u => ({ ...u, type: 'usuarios',  label: u.nombre,  sub: u.area_investigacion })),
      ...(ideas     || []).map(i => ({ ...i, type: 'ideas',     label: i.titulo,  sub: i.estado })),
      ...(archivos  || []).map(a => ({ ...a, type: 'archivos',  label: a.nombre,  sub: a.tipo })),
      ...(temas     || []).map(t => ({ ...t, type: 'temas',     label: t.titulo,  sub: t.categoria })),
    ]
    setResults(items)
    setLoading(false)
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => search(query), 250)
    return () => clearTimeout(timeout)
  }, [query, search])

  const handleSelect = (item) => {
    const cat = CATEGORIES[item.type]
    if (cat) navigate(cat.route(item.id))
    setOpen(false)
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-white/25 hover:text-white/50 hover:border-white/[0.12] transition-all text-xs"
      >
        <FiSearch size={13} />
        <span className="hidden sm:inline">Buscar...</span>
        <kbd className="hidden sm:inline text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-white/20 ml-2 font-mono">⌘K</kbd>
      </button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.div
              className="fixed top-[15%] left-1/2 -translate-x-1/2 z-50 w-full max-w-lg"
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ duration: 0.15 }}
            >
              <div className="glass rounded-2xl overflow-hidden shadow-2xl">
                {/* Search input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
                  <FiSearch size={16} className="text-white/30 shrink-0" />
                  <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Buscar proyectos, ideas, miembros, temas, archivos..."
                    className="flex-1 bg-transparent text-sm text-white placeholder:text-white/20 outline-none"
                  />
                  {query && (
                    <button onClick={() => setQuery('')} className="text-white/20 hover:text-white/50">
                      <FiX size={14} />
                    </button>
                  )}
                </div>

                {/* Results */}
                <div className="max-h-80 overflow-y-auto">
                  {loading && (
                    <div className="px-4 py-8 text-center text-white/15 text-xs">Buscando...</div>
                  )}
                  {!loading && query.length >= 2 && results.length === 0 && (
                    <div className="px-4 py-8 text-center text-white/15 text-xs">No se encontraron resultados</div>
                  )}
                  {!loading && results.length > 0 && (
                    <div className="py-2">
                      {results.map((item, i) => {
                        const cat = CATEGORIES[item.type]
                        const Icon = cat?.icon || FiSearch
                        return (
                          <button
                            key={`${item.type}-${item.id}`}
                            onClick={() => handleSelect(item)}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors text-left"
                          >
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                              style={{ background: `${cat?.color}12`, color: cat?.color }}
                            >
                              <Icon size={13} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-white/70 truncate">{item.label}</p>
                              {item.sub && <p className="text-[10px] text-white/25 capitalize">{item.sub}</p>}
                            </div>
                            <span className="text-[9px] text-white/15 capitalize shrink-0">{{ proyectos:"Proyecto", usuarios:"Miembro", ideas:"Idea", archivos:"Archivo", temas:"Tema" }[item.type]}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {!loading && !query && (
                    <div className="px-4 py-6 text-center text-white/10 text-xs">
                      Escribe al menos 2 caracteres para buscar
                    </div>
                  )}
                </div>

                {/* Footer hint */}
                <div className="px-4 py-2 border-t border-white/[0.04] flex items-center gap-4 text-[9px] text-white/15">
                  <span>↵ Seleccionar</span>
                  <span>ESC Cerrar</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
