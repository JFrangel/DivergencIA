import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useChannels, useUnreadCounts } from '../../hooks/useChat'
import { useAuth } from '../../context/AuthContext'
import ChannelList from '../../components/chat/ChannelList'
import ChatArea from '../../components/chat/ChatArea'
import NewDMModal from '../../components/chat/NewDMModal'
import NewGroupModal from '../../components/chat/NewGroupModal'
import NewNodeChannelModal from '../../components/chat/NewNodeChannelModal'
import Spinner from '../../components/ui/Spinner'

export default function Chat() {
  const { user, isAdmin } = useAuth()
  const { channels, loading, openDM, createGroup, createNodeChannel, refetch } = useChannels()
  const [activeChannel, setActiveChannel] = useState(null)
  const { counts, markRead } = useUnreadCounts(channels, activeChannel?.id ?? null)
  const [showNewDM, setShowNewDM] = useState(false)
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [showNewNode, setShowNewNode] = useState(false)
  const [searchParams] = useSearchParams()

  // Auto-select from URL param or default to #general
  useEffect(() => {
    if (!channels.length) return

    const canalId = searchParams.get('canal')
    if (canalId) {
      const found = channels.find(c => c.id === canalId)
      if (found) { setActiveChannel(found); return }
    }

    // Default to #general
    if (!activeChannel) {
      const general = channels.find(c => c.tipo === 'global' && c.nombre === 'general')
      if (general) setActiveChannel(general)
    }
  }, [channels, searchParams])

  // Mark channel as read when selected
  const handleSelectChannel = (ch) => {
    setActiveChannel(ch)
    markRead(ch.id)
  }

  const handleOpenDM = async (userId) => {
    const canalId = await openDM(userId)
    if (canalId) {
      await refetch()
      const ch = channels.find(c => c.id === canalId)
      if (ch) setActiveChannel(ch)
    }
  }

  const handleCreateGroup = async (nombre, memberIds) => {
    const canal = await createGroup(nombre, memberIds)
    if (canal) setActiveChannel(canal)
  }

  const handleCreateNode = async (nombre, descripcion, memberIds) => {
    const canal = await createNodeChannel(nombre, descripcion, memberIds)
    if (canal) { await refetch(); setActiveChannel(canal) }
  }

  // Determine if current user can write in active channel
  const activeMembership = channels.find(c => c.id === activeChannel?.id)
  const puedeEscribir = activeMembership?.puede_escribir ?? false

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-white/30 text-sm">Debes iniciar sesión para usar el chat.</p>
      </div>
    )
  }

  return (
    <div
      className="flex h-[calc(100vh-56px)] overflow-hidden"
      style={{ background: 'var(--c-bg)' }}
    >
      {/* Channel list sidebar */}
      <div
        className="w-56 shrink-0 flex flex-col border-r border-white/[0.06] overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.015)' }}
      >
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Spinner size="sm" />
          </div>
        ) : (
          <ChannelList
            channels={channels}
            activeChannel={activeChannel}
            onSelect={handleSelectChannel}
            counts={counts}
            onNewDM={() => setShowNewDM(true)}
            onNewGroup={() => setShowNewGroup(true)}
            onNewNode={() => setShowNewNode(true)}
          />
        )}
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatArea
          channel={activeChannel}
          puedeEscribir={puedeEscribir}
        />
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showNewDM && (
          <NewDMModal
            onClose={() => setShowNewDM(false)}
            onOpenDM={handleOpenDM}
          />
        )}
        {showNewGroup && (
          <NewGroupModal
            onClose={() => setShowNewGroup(false)}
            onCreateGroup={handleCreateGroup}
          />
        )}
        {showNewNode && isAdmin && (
          <NewNodeChannelModal
            onClose={() => setShowNewNode(false)}
            onCreate={handleCreateNode}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
