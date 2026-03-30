import { createContext, useContext, useState, useCallback } from 'react'
import { useCall } from '../hooks/useCall'
import CallModal from '../components/chat/CallModal'

const CallCtx = createContext(null)

/* ── Provider — mounts once at app level ────────────────────────────────────── */
export function CallProvider({ children }) {
  // Active channel for the call. Set by ChatArea when the user is viewing a channel.
  const [activeChannelId, setActiveChannelId] = useState(null)

  const callHook = useCall(activeChannelId)

  // Expose a setter so ChatArea can register which channel is "in scope"
  const setCallChannel = useCallback((id) => {
    // Only update if we're not already in a call (avoid resetting mid-call)
    if (callHook.callState === 'idle') {
      setActiveChannelId(id)
    } else if (id && callHook.callState === 'in-call') {
      // Allow switching channel context only if the new id matches current call
      // (prevents detaching the call when navigating)
    }
  }, [callHook.callState])

  // When a call starts/ends via the hook, ensure the channelId stays locked
  const startCallInChannel = useCallback((canalId, type, cameraId = null, micId = null) => {
    setActiveChannelId(canalId)
    // Use setTimeout to let state settle before starting
    setTimeout(() => callHook.startCall(type, cameraId, micId), 0)
  }, [callHook])

  return (
    <CallCtx.Provider value={{ callHook, setCallChannel, startCallInChannel, activeChannelId }}>
      {children}
      {/* Always mounted — renders incoming/active/mini bar anywhere in the app */}
      <CallModal callHook={callHook} />
    </CallCtx.Provider>
  )
}

export function useCallContext() {
  const ctx = useContext(CallCtx)
  if (!ctx) throw new Error('useCallContext must be inside CallProvider')
  return ctx
}
