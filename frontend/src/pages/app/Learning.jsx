import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiPlus, FiFilter } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useTopics } from '../../hooks/useTopics'
import TopicCard from '../../components/learning/TopicCard'
import TopicDetail from '../../components/learning/TopicDetail'
import TopicForm from '../../components/learning/TopicForm'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'

const CATEGORIAS = ['ML', 'NLP', 'Vision', 'Datos', 'General']
const NIVELES = ['basico', 'intermedio', 'avanzado']

const NIVEL_LABELS = {
  basico: 'Basico',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
}

export default function Learning() {
  const { isAdmin } = useAuth()
  const [filterCategoria, setFilterCategoria] = useState('')
  const [filterNivel, setFilterNivel] = useState('')
  const [search, setSearch] = useState('')
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const { topics, loading, createTopic, refetch } = useTopics({
    categoria: filterCategoria || undefined,
    nivel: filterNivel || undefined,
  })

  const filtered = useMemo(() => {
    if (!search.trim()) return topics
    const q = search.toLowerCase()
    return topics.filter(t =>
      t.titulo?.toLowerCase().includes(q) ||
      t.descripcion?.toLowerCase().includes(q)
    )
  }, [topics, search])

  const handleCreate = async (data) => {
    setSaving(true)
    const result = await createTopic(data)
    setSaving(false)
    if (!result.error) {
      setShowForm(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white font-title">Temas de Aprendizaje</h1>
          <p className="text-white/50 text-sm mt-1">
            Explora temas interactivos de IA, Machine Learning y mas
          </p>
        </div>
        {isAdmin && (
          <Button
            icon={<FiPlus size={16} />}
            onClick={() => setShowForm(true)}
          >
            Nuevo Tema
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          icon={<FiSearch size={15} />}
          placeholder="Buscar temas..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          containerClass="flex-1 max-w-md"
        />
        <div className="flex items-center gap-2 flex-wrap">
          {/* Categoria filters */}
          <button
            onClick={() => setFilterCategoria('')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              !filterCategoria
                ? 'bg-[#FC651F]/15 text-[#FC651F] border border-[#FC651F]/30'
                : 'bg-white/[0.04] text-white/50 border border-white/10 hover:bg-white/[0.08]'
            }`}
          >
            Todas
          </button>
          {CATEGORIAS.map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategoria(filterCategoria === cat ? '' : cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                filterCategoria === cat
                  ? 'bg-[#FC651F]/15 text-[#FC651F] border border-[#FC651F]/30'
                  : 'bg-white/[0.04] text-white/50 border border-white/10 hover:bg-white/[0.08]'
              }`}
            >
              {cat}
            </button>
          ))}

          {/* Divider */}
          <div className="w-px h-5 bg-white/10 mx-1 hidden sm:block" />

          {/* Nivel filters */}
          {NIVELES.map(nv => (
            <button
              key={nv}
              onClick={() => setFilterNivel(filterNivel === nv ? '' : nv)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                filterNivel === nv
                  ? 'bg-[#8B5CF6]/15 text-[#8B5CF6] border border-[#8B5CF6]/30'
                  : 'bg-white/[0.04] text-white/50 border border-white/10 hover:bg-white/[0.08]'
              }`}
            >
              {NIVEL_LABELS[nv]}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-white/40 text-sm">No se encontraron temas</p>
          {search && (
            <p className="text-white/30 text-xs mt-1">Intenta con otros terminos de busqueda</p>
          )}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          layout
        >
          {filtered.map((topic, i) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              index={i}
              onClick={() => setSelectedTopic(topic)}
            />
          ))}
        </motion.div>
      )}

      {/* Topic Detail */}
      <AnimatePresence>
        {selectedTopic && (
          <TopicDetail
            topic={selectedTopic}
            onClose={() => setSelectedTopic(null)}
          />
        )}
      </AnimatePresence>

      {/* Create Form */}
      <TopicForm
        open={showForm}
        onClose={() => setShowForm(false)}
        onSave={handleCreate}
        loading={saving}
      />
    </div>
  )
}
