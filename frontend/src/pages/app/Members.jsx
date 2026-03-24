import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FiSearch, FiUsers, FiFilter, FiList, FiGlobe } from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'
import MemberNetwork from '../../components/members/MemberNetwork'

const AREAS = ['Todos', 'ML', 'NLP', 'Vision', 'Datos', 'General']
const AREA_COLOR = { ML: '#FC651F', NLP: '#8B5CF6', Vision: '#00D1FF', Datos: '#22c55e', General: '#F59E0B' }

export default function Members() {
  const [members, setMembers] = useState([])
  const [allMembers, setAllMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [areaFilter, setAreaFilter] = useState('Todos')
  const [view, setView] = useState('lista')

  useEffect(() => {
    /* Fetch active members for list view */
    supabase
      .from('usuarios')
      .select('id, nombre, rol, carrera, area_investigacion, bio, es_fundador, habilidades')
      .eq('activo', true)
      .order('es_fundador', { ascending: false })
      .then(({ data }) => { setMembers(data || []); setLoading(false) })

    /* Fetch ALL members (including inactive/egresados) for network view */
    supabase
      .from('usuarios')
      .select('id, nombre, foto_url, area_investigacion, es_fundador, activo, rol, fecha_registro, habilidades, carrera')
      .order('es_fundador', { ascending: false })
      .then(({ data }) => { setAllMembers(data || []) })
  }, [])

  const filtered = members.filter(m => {
    const matchSearch = !search ||
      m.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      m.carrera?.toLowerCase().includes(search.toLowerCase()) ||
      m.bio?.toLowerCase().includes(search.toLowerCase())
    const matchArea = areaFilter === 'Todos' || m.area_investigacion === areaFilter
    return matchSearch && matchArea
  })

  return (
    <div className="space-y-6 max-w-7xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold font-title text-white">Investigadores</h1>
            <p className="text-white/40 text-sm mt-1">Directorio del semillero · {members.length} miembro{members.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* View toggle */}
            <div className="flex items-center gap-1 p-1 glass rounded-xl">
              {[
                { id: 'lista', icon: <FiList size={14} />, label: 'Lista' },
                { id: 'red',   icon: <FiGlobe size={14} />, label: 'Red' },
              ].map(v => (
                <button
                  key={v.id}
                  onClick={() => setView(v.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200 ${
                    view === v.id ? 'text-white' : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {view === v.id && (
                    <motion.span
                      className="absolute inset-0 rounded-lg"
                      style={{ background: 'color-mix(in srgb, var(--c-primary) 15%, rgba(255,255,255,0.05))' }}
                      layoutId="members-view-pill"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">{v.icon}{v.label}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/25">
              <span className="pulse-dot" /> Tiempo real
            </div>
          </div>
        </div>
      </motion.div>

      {/* Network view */}
      {view === 'red' ? (
        loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            <MemberNetwork members={allMembers.length ? allMembers : members} />
          </motion.div>
        )
      ) : (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 max-w-sm">
              <Input placeholder="Buscar por nombre, carrera o bio..." icon={<FiSearch size={14} />} value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <FiFilter size={13} className="text-white/25 shrink-0" />
              {AREAS.map(area => (
                <button
                  key={area}
                  onClick={() => setAreaFilter(area)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={areaFilter === area
                    ? { background: `${AREA_COLOR[area] || '#FC651F'}20`, color: AREA_COLOR[area] || '#FC651F', border: `1px solid ${AREA_COLOR[area] || '#FC651F'}40` }
                    : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.07)' }
                  }
                >
                  {area}
                </button>
              ))}
            </div>
          </div>

          {/* Area stats */}
          {!loading && (
            <div className="flex flex-wrap gap-4">
              {Object.entries(AREA_COLOR).map(([area, color]) => {
                const count = members.filter(m => m.area_investigacion === area).length
                if (!count) return null
                return (
                  <div key={area} className="flex items-center gap-2 text-xs text-white/35">
                    <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                    {area}: {count}
                  </div>
                )
              })}
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-white/30">
              <FiUsers size={32} className="mx-auto mb-3 opacity-20" />
              Sin resultados
            </div>
          ) : (
            <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-stretch" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {filtered.map((m, i) => {
                const color = AREA_COLOR[m.area_investigacion] || '#6b7280'
                return (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="h-full">
                    <Link to={`/members/${m.id}`} className="block h-full">
                      <motion.div
                        className="glass rounded-2xl p-5 flex flex-col items-center text-center gap-3 cursor-pointer relative overflow-hidden group h-full"
                        style={{ border: m.es_fundador ? '1px solid rgba(245,158,11,0.2)' : '1px solid rgba(255,255,255,0.06)' }}
                        whileHover={{ y: -5, scale: 1.02 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl" style={{ background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${color}08 0%, transparent 70%)` }} />
                        <Avatar name={m.nombre} area={m.area_investigacion} size="lg" isFounded={m.es_fundador} />
                        <div>
                          <p className="font-semibold text-white text-sm">{m.nombre}</p>
                          <p className="text-xs text-white/35 mt-0.5 truncate max-w-[160px]">{m.carrera || 'Investigador'}</p>
                        </div>
                        <div className="flex flex-wrap justify-center gap-1">
                          {m.area_investigacion && <Badge area={m.area_investigacion} size="xs" />}
                          {m.es_fundador && <Badge variant="founder" size="xs" />}
                        </div>
                        <p className="text-[11px] text-white/25 leading-relaxed line-clamp-2 mt-auto min-h-[28px]">{m.bio || ''}</p>
                      </motion.div>
                    </Link>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}
