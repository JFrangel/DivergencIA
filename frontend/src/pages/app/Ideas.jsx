import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Link, useParams } from 'react-router-dom'
import { FiPlus, FiSearch, FiLock, FiMap, FiGitMerge } from 'react-icons/fi'
import { toast } from 'sonner'
import { supabase } from '../../lib/supabase'
import { useIdeas } from '../../hooks/useIdeas'
import { useAuth } from '../../context/AuthContext'
import IdeaCard from '../../components/ideas/IdeaCard'
import IdeaForm from '../../components/ideas/IdeaForm'
import ConceptMap from '../../components/ideas/ConceptMap'
import IdeaMergeModal from '../../components/ideas/IdeaMergeModal'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Tabs from '../../components/ui/Tabs'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'

export default function Ideas() {
  const { user, profile, isAdmin } = useAuth()
  const { id: linkedId } = useParams()
  const canChangeEstado = profile?.rol === 'admin' || profile?.rol === 'directora'
  const [tab, setTab] = useState('votacion')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [mergeIdea, setMergeIdea] = useState(null)
  const [editingIdea, setEditingIdea] = useState(null)
  const cardRefs = useRef({})
  const [pendingHighlight, setPendingHighlight] = useState(null) // idea id to highlight after tab loads

  const { ideas, loading, myVotes, create, vote, updateEstado, updateIdea, mergeIdeas, refetch } = useIdeas({ estado: tab })

  const handleEditSubmit = async (payload) => {
    if (!editingIdea) return
    const { error } = await updateIdea(editingIdea.id, payload)
    if (!error) setEditingIdea(null) // only close on success
  }

  // Step 1: when URL has :id, fetch its estado and switch tab
  useEffect(() => {
    if (!linkedId) return
    supabase.from('ideas').select('id,estado').eq('id', linkedId).single()
      .then(({ data }) => {
        if (!data) return
        setPendingHighlight(linkedId)
        setTab(data.estado)
      })
  }, [linkedId])

  // Step 2: once ideas loaded, poll until the card ref appears then scroll+highlight
  useEffect(() => {
    if (!pendingHighlight || loading) return
    const idea = ideas.find(i => i.id === pendingHighlight)
    if (!idea) return

    let attempts = 0
    const tryScroll = () => {
      const el = cardRefs.current[pendingHighlight]
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.style.boxShadow = '0 0 0 2px var(--c-primary)'
        setTimeout(() => { if (el) el.style.boxShadow = '' }, 2200)
        setPendingHighlight(null)
      } else if (attempts < 15) {
        attempts++
        setTimeout(tryScroll, 80)
      } else {
        setPendingHighlight(null) // give up after ~1.2s
      }
    }
    requestAnimationFrame(tryScroll)
  }, [pendingHighlight, ideas, loading])

  const handleVote = (ideaId, tipo) => {
    if (!user) { return } // guest — GuestBanner handles the prompt
    vote(ideaId, tipo)
  }

  const filtered = ideas.filter(i =>
    i.titulo?.toLowerCase().includes(search.toLowerCase())
  )

  const handleChangeEstado = async (id, nuevoEstado) => {
    const { error } = await updateEstado(id, nuevoEstado)
    if (!error) refetch()
  }

  const tabs = [
    { id: 'votacion',      label: 'En votación' },
    { id: 'aprobada',      label: 'Aprobadas' },
    { id: 'en_desarrollo', label: 'En desarrollo' },
    { id: 'completada',    label: 'Completadas' },
    { id: 'rechazada',     label: 'Rechazadas' },
    { id: 'archivada',     label: 'Archivadas' },
    { id: 'modificacion',  label: 'En modificación' },
  ]

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-title text-white">Banco de Ideas</h1>
          <p className="text-white/40 text-sm mt-1">Propone, vota y debate ideas de investigación.</p>
        </div>
        {user ? (
          <div className="flex items-center gap-2">
            <Button variant="solid" size="sm" className="gap-2" onClick={() => setShowForm(true)}>
              <FiPlus size={15} /> Nueva idea
            </Button>
            {canChangeEstado && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-white/40" onClick={() => setMergeIdea(true)}>
                <FiGitMerge size={13} /> Fusionar
              </Button>
            )}
          </div>
        ) : (
          <Link to="/register">
            <Button variant="outline" size="sm" className="gap-2">
              <FiLock size={13} /> Únete para proponer
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Tabs tabs={tabs} value={tab} onChange={setTab} />
        <div className="ml-auto flex items-center gap-2">
          <div className="w-52">
            <Input
              placeholder="Buscar idea..."
              icon={<FiSearch size={14} />}
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowMap(s => !s)}
            className={`p-2 rounded-lg transition-all ${showMap ? 'bg-[#8B5CF6]/15 text-[#8B5CF6]' : 'text-white/30 hover:text-white/50 bg-white/[0.04]'}`}
            title="Mapa conceptual"
          >
            <FiMap size={16} />
          </button>
        </div>
      </div>

      {showMap ? (
        <ConceptMap ideas={filtered} />
      ) : loading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="💡"
          title="No hay ideas aquí"
          description="Sé el primero en proponer una idea al semillero."
          actionLabel="Proponer idea"
          action={() => setShowForm(true)}
        />
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {filtered.map((idea, i) => (
            <div key={idea.id} ref={el => cardRefs.current[idea.id] = el} style={{ borderRadius: 16, transition: 'box-shadow 0.4s' }}>
              <IdeaCard
                idea={idea}
                myVote={myVotes[idea.id]}
                onVote={user ? handleVote : null}
                canChangeEstado={canChangeEstado}
                onChangeEstado={handleChangeEstado}
                onEdit={setEditingIdea}
                currentUserId={user?.id}
                index={i}
              />
            </div>
          ))}
        </motion.div>
      )}

      <IdeaForm open={showForm} onClose={() => setShowForm(false)} onSubmit={create} />
      <IdeaForm
        open={!!editingIdea}
        onClose={() => setEditingIdea(null)}
        onSubmit={handleEditSubmit}
        editIdea={editingIdea}
      />
      <IdeaMergeModal
        open={!!mergeIdea}
        onClose={() => setMergeIdea(null)}
        ideas={ideas}
        onMerge={async (targetId, sourceId, method) => {
          try {
            const result = await mergeIdeas(targetId, sourceId, method)
            if (result?.error) {
              toast.error(result.error)
              return
            }
            toast.success('Ideas fusionadas correctamente')
            setMergeIdea(null)
            refetch()
          } catch (err) {
            toast.error('Error al fusionar ideas')
          }
        }}
      />
    </div>
  )
}
