import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FiPlus, FiGrid, FiList, FiSearch, FiLock } from 'react-icons/fi'
import { useProjects } from '../../hooks/useProjects'
import { useAuth } from '../../context/AuthContext'
import ProjectCard from '../../components/projects/ProjectCard'
import ProjectForm from '../../components/projects/ProjectForm'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'

const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'idea', label: 'Idea' },
  { value: 'desarrollo', label: 'Desarrollo' },
  { value: 'investigacion', label: 'Investigación' },
  { value: 'pruebas', label: 'Pruebas' },
  { value: 'finalizado', label: 'Finalizado' },
]

export default function Projects() {
  const { user } = useAuth()
  const { projects, loading, create } = useProjects({ all: true })
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('')
  const [view, setView] = useState('grid')

  const filtered = projects.filter(p => {
    const matchSearch = p.titulo?.toLowerCase().includes(search.toLowerCase())
    const matchEstado = !estadoFilter || p.estado === estadoFilter
    return matchSearch && matchEstado
  })

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-title text-white">Proyectos</h1>
          <p className="text-white/40 text-sm mt-1">
            {projects.length} proyecto{projects.length !== 1 ? 's' : ''} en el semillero
          </p>
        </div>
        {user ? (
          <Button variant="solid" size="sm" className="gap-2" onClick={() => setShowForm(true)}>
            <FiPlus size={15} /> Nuevo proyecto
          </Button>
        ) : (
          <Link to="/register">
            <Button variant="outline" size="sm" className="gap-2">
              <FiLock size={13} /> Únete para crear
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-full sm:w-64">
          <Input
            placeholder="Buscar proyecto..."
            icon={<FiSearch size={14} />}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select
            options={ESTADOS}
            value={estadoFilter}
            onChange={e => setEstadoFilter(e.target.value)}
          />
        </div>
        <div className="ml-auto flex gap-1 glass rounded-lg p-1">
          {[{ id: 'grid', icon: FiGrid }, { id: 'list', icon: FiList }].map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`p-2 rounded-md transition-all ${view === v.id ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'}`}
            >
              <v.icon size={15} />
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="🗂️"
          title={search ? 'Sin resultados' : 'No hay proyectos aún'}
          description={search ? `No se encontró "${search}"` : 'Crea el primer proyecto de investigación.'}
          actionLabel="Crear proyecto"
          action={() => setShowForm(true)}
        />
      ) : (
        <motion.div
          className={view === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'flex flex-col gap-3'
          }
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {filtered.map((p, i) => (
            <ProjectCard key={p.id} project={p} index={i} />
          ))}
        </motion.div>
      )}

      <ProjectForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSubmit={create}
      />
    </div>
  )
}
