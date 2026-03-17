import { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { FiPlus, FiSearch, FiLock, FiMap, FiGitMerge } from 'react-icons/fi'
import { toast } from 'sonner'
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
  const { user, profile } = useAuth()
  const [tab, setTab] = useState('votacion')
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [mergeIdea, setMergeIdea] = useState(null)

  const { ideas, loading, myVotes, create, vote } = useIdeas({ estado: tab })

  const handleVote = (ideaId, tipo) => {
    if (!user) { return } // guest — GuestBanner handles the prompt
    vote(ideaId, tipo)
  }

  const filtered = ideas.filter(i =>
    i.titulo?.toLowerCase().includes(search.toLowerCase())
  )

  const tabs = [
    { id: 'votacion',   label: 'En votación' },
    { id: 'aprobada',  label: 'Aprobadas' },
    { id: 'rechazada', label: 'Rechazadas' },
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
            {profile?.rol === 'admin' && (
              <Button variant="ghost" size="sm" className="gap-1.5 text-white/40" onClick={() => setMergeIdea(filtered[0] || null)}>
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
        <Tabs tabs={tabs} defaultTab="votacion" onChange={setTab} />
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
            <IdeaCard
              key={idea.id}
              idea={idea}
              myVote={myVotes[idea.id]}
              onVote={user ? handleVote : null}
              index={i}
            />
          ))}
        </motion.div>
      )}

      <IdeaForm open={showForm} onClose={() => setShowForm(false)} onSubmit={create} />
      <IdeaMergeModal
        open={!!mergeIdea}
        onClose={() => setMergeIdea(null)}
        ideas={ideas}
        selectedIdea={mergeIdea}
        onMerge={async (targetId, sourceId) => { setMergeIdea(null); toast.success('Ideas fusionadas') }}
      />
    </div>
  )
}
