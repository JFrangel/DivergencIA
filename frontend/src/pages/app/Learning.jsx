import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiPlus, FiMap, FiGrid } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useTopics } from '../../hooks/useTopics'
import { useLearningProgress, useLearningStats } from '../../hooks/useLearningProgress'
import TopicCard from '../../components/learning/TopicCard'
import TopicDetail from '../../components/learning/TopicDetail'
import TopicForm from '../../components/learning/TopicForm'
import LearningPath from '../../components/learning/LearningPath'
import LearningStatsBar from '../../components/learning/LearningStatsBar'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import Badge from '../../components/ui/Badge'

const CATEGORIAS_BASE = ['ML', 'NLP', 'Vision', 'Datos', 'General']
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
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'path'

  const [editingTopic, setEditingTopic] = useState(null)

  const { topics, loading, createTopic, updateTopic, deleteTopic, refetch } = useTopics({
    categoria: filterCategoria || undefined,
    nivel: filterNivel || undefined,
  })

  const { progress, markSectionComplete, unmarkSection, saveQuizScore, getTopicProgress } = useLearningProgress()
  const stats = useLearningStats(topics)

  // Dynamic categories: presets + any custom ones from DB
  const allCategorias = useMemo(() => {
    const fromTopics = topics.map(t => t.categoria).filter(Boolean)
    return [...new Set([...CATEGORIAS_BASE, ...fromTopics])]
  }, [topics])

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

  const handleUpdate = async (id, data) => {
    setSaving(true)
    const result = await updateTopic(id, data)
    setSaving(false)
    if (!result.error) {
      setEditingTopic(null)
      // Refresh selectedTopic if it was the one updated
      if (selectedTopic?.id === id && result.data) {
        setSelectedTopic(result.data)
      }
    }
    return result
  }

  const handleDelete = async (id) => {
    const result = await deleteTopic(id)
    if (!result.error) {
      if (selectedTopic?.id === id) setSelectedTopic(null)
    }
    return result
  }

  const handleEditFromCard = (e, topic) => {
    e.stopPropagation()
    setEditingTopic(topic)
    setShowForm(true)
  }

  const handleFormSave = async (data) => {
    if (editingTopic) {
      setSaving(true)
      const result = await updateTopic(editingTopic.id, data)
      setSaving(false)
      if (!result.error) {
        setShowForm(false)
        setEditingTopic(null)
        if (selectedTopic?.id === editingTopic.id && result.data) {
          setSelectedTopic(result.data)
        }
      }
    } else {
      await handleCreate(data)
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
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-white/10 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className="p-2 transition-colors"
              style={viewMode === 'grid' ? {
                background: 'color-mix(in srgb, var(--c-primary) 15%, transparent)',
                color: 'var(--c-primary)',
              } : { color: 'rgba(255,255,255,0.4)' }}
              title="Vista de cuadricula"
            >
              <FiGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode('path')}
              className="p-2 transition-colors"
              style={viewMode === 'path' ? {
                background: 'color-mix(in srgb, var(--c-primary) 15%, transparent)',
                color: 'var(--c-primary)',
              } : { color: 'rgba(255,255,255,0.4)' }}
              title="Vista de ruta"
            >
              <FiMap size={16} />
            </button>
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
      </div>

      {/* Stats overview */}
      <LearningStatsBar
        topicsStarted={stats.topicsStarted}
        topicsCompleted={stats.topicsCompleted}
        totalSectionsCompleted={stats.totalSectionsCompleted}
        averageQuizScore={stats.averageQuizScore}
      />

      {/* Learning path view */}
      {viewMode === 'path' && topics.length > 0 && (
        <LearningPath
          topics={topics}
          progressMap={progress}
          onSelectTopic={setSelectedTopic}
        />
      )}

      {/* Filters */}
      <div className="flex flex-col gap-2">
        <Input
          icon={<FiSearch size={15} />}
          placeholder="Buscar temas..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          containerClass="max-w-md"
        />
        {/* Scrollable filter pills */}
        <div className="overflow-x-auto scrollbar-none -mx-1 px-1">
          <div className="flex items-center gap-1.5 min-w-max">
            {/* Categoria filters */}
            <button
              onClick={() => setFilterCategoria('')}
              className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
              style={!filterCategoria ? {
                background: 'color-mix(in srgb, var(--c-primary) 15%, transparent)',
                color: 'var(--c-primary)',
                border: '1px solid color-mix(in srgb, var(--c-primary) 30%, transparent)',
              } : {
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.5)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              Todas
            </button>
            {allCategorias.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategoria(filterCategoria === cat ? '' : cat)}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                style={filterCategoria === cat ? {
                  background: 'color-mix(in srgb, var(--c-primary) 15%, transparent)',
                  color: 'var(--c-primary)',
                  border: '1px solid color-mix(in srgb, var(--c-primary) 30%, transparent)',
                } : {
                  background: 'rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {cat}
              </button>
            ))}

            {/* Divider */}
            <div className="w-px h-5 bg-white/10 mx-0.5 shrink-0" />

            {/* Nivel filters */}
            {NIVELES.map(nv => (
              <button
                key={nv}
                onClick={() => setFilterNivel(filterNivel === nv ? '' : nv)}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                style={filterNivel === nv ? {
                  background: 'color-mix(in srgb, var(--c-secondary) 15%, transparent)',
                  color: 'var(--c-secondary)',
                  border: '1px solid color-mix(in srgb, var(--c-secondary) 30%, transparent)',
                } : {
                  background: 'rgba(255,255,255,0.04)',
                  color: 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                {NIVEL_LABELS[nv]}
              </button>
            ))}
          </div>
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
      ) : viewMode === 'grid' ? (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
          layout
        >
          {filtered.map((topic, i) => {
            const totalSections = Array.isArray(topic.contenido) ? topic.contenido.length : 0
            const pd = getTopicProgress(topic.id, totalSections)
            return (
              <TopicCard
                key={topic.id}
                topic={topic}
                index={i}
                onClick={() => setSelectedTopic(topic)}
                progressData={pd}
                isAdmin={isAdmin}
                onEdit={(e) => handleEditFromCard(e, topic)}
                onDelete={deleteTopic}
              />
            )
          })}
        </motion.div>
      ) : (
        /* In path mode, show a simplified card list below the path */
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          layout
        >
          {filtered.map((topic, i) => {
            const totalSections = Array.isArray(topic.contenido) ? topic.contenido.length : 0
            const pd = getTopicProgress(topic.id, totalSections)
            return (
              <TopicCard
                key={topic.id}
                topic={topic}
                index={i}
                onClick={() => setSelectedTopic(topic)}
                progressData={pd}
                isAdmin={isAdmin}
                onEdit={(e) => handleEditFromCard(e, topic)}
                onDelete={deleteTopic}
              />
            )
          })}
        </motion.div>
      )}

      {/* Topic Detail */}
      <AnimatePresence>
        {selectedTopic && (
          <TopicDetail
            topic={selectedTopic}
            onClose={() => setSelectedTopic(null)}
            progressData={getTopicProgress(
              selectedTopic.id,
              Array.isArray(selectedTopic.contenido) ? selectedTopic.contenido.length : 0
            )}
            onMarkComplete={markSectionComplete}
            onUnmark={unmarkSection}
            onQuizScore={saveQuizScore}
            onUpdateTopic={handleUpdate}
            onDeleteTopic={handleDelete}
          />
        )}
      </AnimatePresence>

      {/* Create / Edit Form */}
      <TopicForm
        open={showForm}
        onClose={() => { setShowForm(false); setEditingTopic(null) }}
        onSave={handleFormSave}
        initialData={editingTopic}
        loading={saving}
        existingCategories={[...new Set(topics.map(t => t.categoria).filter(Boolean))]}
      />
    </div>
  )
}
