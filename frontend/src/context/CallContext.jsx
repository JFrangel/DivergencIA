import { createContext, useContext, useState, useCallback } from 'react'
import { useCall } from '../hooks/useCall'
import CallModal from '../components/chat/CallModal'

const CallCtx = createContext(null)

/* ── Provider — mounts once at app level ────────────────────────────────────── */
export function CallProvider({ children }) {
  const [activeChannelId, setActiveChannelId] = useState(null)
  // pendingCall: set when user clicks "start call" — shows pre-call setup screen
  const [pendingCall, setPendingCall] = useState(null) // { canalId, type, channelName }

  const callHook = useCall(activeChannelId)

  const setCallChannel = useCallback((id) => {
    if (callHook.callState === 'idle') setActiveChannelId(id)
  }, [callHook.callState])

  // Show pre-call setup instead of starting immediately
  const startCallInChannel = useCallback((canalId, type, channelName = '') => {
    if (callHook.callState !== 'idle') return
    setActiveChannelId(canalId)
    setPendingCall({ canalId, type, channelName })
  }, [callHook.callState])

  // User confirmed in pre-call setup
  const confirmCall = useCallback((cameraId, micId) => {
    if (!pendingCall) return
    const { type } = pendingCall
    setPendingCall(null)
    setTimeout(() => callHook.startCall(type, cameraId, micId), 0)
  }, [pendingCall, callHook])

  const cancelPendingCall = useCallback(() => {
    setPendingCall(null)
  }, [])

  return (
    <CallCtx.Provider value={{ callHook, setCallChannel, startCallInChannel, activeChannelId }}>
      {children}
      <CallModal
        callHook={callHook}
        canalId={activeChannelId}
        pendingCall={pendingCall}
        onConfirmCall={confirmCall}
        onCancelCall={cancelPendingCall}
      />
    </CallCtx.Provider>
  )
}

export function useCallContext() {
  const ctx = useContext(CallCtx)
  if (!ctx) throw new Error('useCallContext must be inside CallProvider')
  return ctx
}
