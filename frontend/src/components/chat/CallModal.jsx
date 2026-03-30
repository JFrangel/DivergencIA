import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff, FiPhone,
  FiMonitor, FiX,
} from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import Avatar from '../ui/Avatar'

/* ── Video tile for one participant ─────────────────────────────────────────── */
function VideoTile({ stream, name, muted = false, isLocal = false, isCameraOff = false, isMuted = false }) {
  const videoRef = useRef(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  const initials = name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div className="relative rounded-2xl overflow-hidden flex items-center justify-center"
      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', minHeight: 140 }}>

      {stream && !isCameraOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal || muted}
          className="w-full h-full object-cover"
          style={{ display: 'block' }}
        />
      ) : (
        <div className="flex flex-col items-center gap-2 py-6">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white"
            style={{ background: 'rgba(252,101,31,0.25)', border: '1px solid rgba(252,101,31,0.3)' }}>
            {initials}
          </div>
          <p className="text-xs text-white/50 truncate max-w-[120px]">{name}</p>
        </div>
      )}

      {/* Name + mute badge */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: 'rgba(0,0,0,0.65)', color: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(6px)' }}>
          {isLocal ? `${name} (tú)` : name}
        </span>
        {(isLocal ? isMuted : muted) && (
          <span className="w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(239,68,68,0.8)' }}>
            <FiMicOff size={10} color="white" />
          </span>
        )}
      </div>
    </div>
  )
}

/* ── Incoming call overlay ──────────────────────────────────────────────────── */
function IncomingCall({ incoming, onAccept, onDecline, callType }) {
  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="rounded-3xl p-8 flex flex-col items-center gap-6 w-72"
        style={{ background: 'rgba(14,6,9,0.97)', border: '1px solid rgba(255,255,255,0.1)' }}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.85, opacity: 0 }}
      >
        {/* Pulsing avatar */}
        <div className="relative">
          <div className="absolute inset-0 rounded-full animate-ping"
            style={{ background: 'rgba(34,197,94,0.3)', animationDuration: '1.5s' }} />
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white relative z-10"
            style={{ background: 'rgba(34,197,94,0.2)', border: '2px solid rgba(34,197,94,0.4)' }}>
            {incoming.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'}
          </div>
        </div>

        <div className="text-center">
          <p className="text-white font-semibold text-base">{incoming.name}</p>
          <p className="text-white/40 text-sm mt-0.5">
            {callType === 'video' ? 'Videollamada entrante' : 'Llamada de voz entrante'}
          </p>
        </div>

        <div className="flex items-center gap-6">
          <button
            onClick={onDecline}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{ background: 'rgba(239,68,68,0.85)' }}
          >
            <FiPhoneOff size={22} color="white" />
          </button>
          <button
            onClick={onAccept}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{ background: 'rgba(34,197,94,0.85)' }}
          >
            <FiPhone size={22} color="white" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Active call overlay ────────────────────────────────────────────────────── */
function ActiveCall({
  callType, participants, localStream, isScreenSharing, screenStream,
  isMuted, isCameraOff, profile,
  onToggleMute, onToggleCamera, onToggleScreen, onEndCall,
}) {
  const allTiles = [
    { key: 'local', stream: isScreenSharing ? screenStream : localStream, name: profile?.nombre || 'Tú', isLocal: true },
    ...participants.map(p => ({ key: p.userId, stream: p.stream, name: p.name || p.userId, isLocal: false })),
  ]

  // Grid layout
  const count = allTiles.length
  const gridCols = count <= 1 ? 'grid-cols-1' : count <= 2 ? 'grid-cols-2' : count <= 4 ? 'grid-cols-2' : 'grid-cols-3'

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col"
      style={{ background: 'rgba(6,3,4,0.97)', backdropFilter: 'blur(16px)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Video grid */}
      <div className={`flex-1 grid ${gridCols} gap-3 p-4 overflow-auto`}>
        {allTiles.map(tile => (
          <VideoTile
            key={tile.key}
            stream={tile.stream}
            name={tile.name}
            isLocal={tile.isLocal}
            isCameraOff={tile.isLocal && isCameraOff && !isScreenSharing}
            isMuted={tile.isLocal && isMuted}
          />
        ))}
        {participants.length === 0 && (
          <div className="flex items-center justify-center col-span-full">
            <div className="text-center">
              <p className="text-white/30 text-sm">Esperando que otros se unan…</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="flex items-center justify-center gap-4 py-5 px-4"
        style={{ background: 'rgba(0,0,0,0.5)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>

        {/* Mute */}
        <button
          onClick={onToggleMute}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ background: isMuted ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.1)' }}
          title={isMuted ? 'Activar micrófono' : 'Silenciar'}
        >
          {isMuted ? <FiMicOff size={18} color="#EF4444" /> : <FiMic size={18} color="rgba(255,255,255,0.85)" />}
        </button>

        {/* Camera (only if video call) */}
        {callType === 'video' && !isScreenSharing && (
          <button
            onClick={onToggleCamera}
            className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
            style={{ background: isCameraOff ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.1)' }}
            title={isCameraOff ? 'Activar cámara' : 'Apagar cámara'}
          >
            {isCameraOff ? <FiVideoOff size={18} color="#EF4444" /> : <FiVideo size={18} color="rgba(255,255,255,0.85)" />}
          </button>
        )}

        {/* Screen share */}
        <button
          onClick={onToggleScreen}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ background: isScreenSharing ? 'rgba(252,101,31,0.25)' : 'rgba(255,255,255,0.1)' }}
          title={isScreenSharing ? 'Dejar de compartir pantalla' : 'Compartir pantalla'}
        >
          <FiMonitor size={18} style={{ color: isScreenSharing ? '#FC651F' : 'rgba(255,255,255,0.85)' }} />
        </button>

        {/* End call */}
        <button
          onClick={onEndCall}
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ background: 'rgba(239,68,68,0.85)' }}
          title="Finalizar llamada"
        >
          <FiPhoneOff size={22} color="white" />
        </button>
      </div>
    </motion.div>
  )
}

/* ── CallModal — main export ────────────────────────────────────────────────── */
export default function CallModal({ callHook }) {
  const { profile } = useAuth()
  const {
    callState, callType, incoming,
    localStream, participants,
    isMuted, isCameraOff, isScreenSharing, screenStream,
    acceptCall, declineCall, endCall,
    toggleMute, toggleCamera, toggleScreenShare,
  } = callHook

  return (
    <AnimatePresence>
      {callState === 'ringing' && incoming && (
        <IncomingCall
          key="incoming"
          incoming={incoming}
          callType={incoming.type}
          onAccept={acceptCall}
          onDecline={declineCall}
        />
      )}
      {callState === 'in-call' && (
        <ActiveCall
          key="active"
          callType={callType}
          participants={participants}
          localStream={localStream}
          screenStream={screenStream}
          isScreenSharing={isScreenSharing}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          profile={profile}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
          onToggleScreen={toggleScreenShare}
          onEndCall={endCall}
        />
      )}
    </AnimatePresence>
  )
}
