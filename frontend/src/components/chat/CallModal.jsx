import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff, FiPhone,
  FiMonitor, FiSettings, FiMinimize2, FiGrid, FiUser,
  FiUsers, FiX, FiLink, FiSmile,
} from 'react-icons/fi'
import { MdPushPin } from 'react-icons/md'
import { BsHandIndex } from 'react-icons/bs'
import { useAuth } from '../../context/AuthContext'
import { toast } from 'sonner'

/* ── Utilities ───────────────────────────────────────────────────────────────── */
function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

const AVATAR_COLORS = [
  ['#FC651F', '#FF8C42'],
  ['#8B5CF6', '#A78BFA'],
  ['#00D1FF', '#38BDF8'],
  ['#22c55e', '#4ADE80'],
  ['#F59E0B', '#FCD34D'],
  ['#EC4899', '#F472B6'],
]
function avatarGradient(name, idx = 0) {
  const hash = [...(name || 'X')].reduce((a, c) => a + c.charCodeAt(0), 0)
  const [from, to] = AVATAR_COLORS[(hash + idx) % AVATAR_COLORS.length]
  return `linear-gradient(135deg, ${from}, ${to})`
}
function avatarColor(name, idx = 0) {
  const hash = [...(name || 'X')].reduce((a, c) => a + c.charCodeAt(0), 0)
  return AVATAR_COLORS[(hash + idx) % AVATAR_COLORS.length][0]
}

/* ── Speaking detector (Web Audio API) ──────────────────────────────────────── */
function useSpeaking(stream, muted) {
  const [level, setLevel] = useState(0)
  useEffect(() => {
    if (!stream || muted) { setLevel(0); return }
    let ctx, raf
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)()
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 128
      // source → analyser only, never to destination — no echo/feedback
      source.connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      const tick = () => {
        analyser.getByteFrequencyData(data)
        const avg = data.slice(0, 20).reduce((a, b) => a + b, 0) / 20
        setLevel(Math.min(avg / 55, 1))
        raf = requestAnimationFrame(tick)
      }
      tick()
    } catch { /* no audio permission */ }
    return () => {
      if (raf) cancelAnimationFrame(raf)
      if (ctx) ctx.close().catch(() => {})
    }
  }, [stream, muted])
  return level
}

/* ── Audio level bars ────────────────────────────────────────────────────────── */
function AudioBars({ level, color }) {
  const bars = [0.4, 0.7, 1.0, 0.7, 0.4]
  return (
    <div className="flex items-end gap-[2px]" style={{ height: 10 }}>
      {bars.map((factor, i) => (
        <motion.div
          key={i}
          className="w-[2px] rounded-full"
          style={{ background: color || '#22c55e' }}
          animate={{ height: level > 0.12 ? Math.max(2, level * factor * 10) : 2 }}
          transition={{ duration: 0.08, ease: 'easeOut' }}
        />
      ))}
    </div>
  )
}

/* ── Video tile ──────────────────────────────────────────────────────────────── */
function VideoTile({
  stream, name, avatarIdx = 0,
  isLocal = false, isCameraOff = false, isMuted = false,
  isScreen = false, isPinned = false, isHandRaised = false,
  className = '', style = {}, onClick,
  size = 'normal',
}) {
  const videoRef = useRef(null)
  const speaking = useSpeaking(stream, isMuted)
  const isSpeaking = !isMuted && speaking > 0.12

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream
  }, [stream])

  const showVideo = stream && !isCameraOff && !isScreen ? true : stream && isScreen
  const avatarSize = size === 'small' ? 32 : size === 'large' ? 72 : 52

  // Pull both gradient colors for this user
  const hash = [...(name || 'X')].reduce((a, c) => a + c.charCodeAt(0), 0)
  const [c1, c2] = AVATAR_COLORS[(hash + avatarIdx) % AVATAR_COLORS.length]
  const color = c1

  // Gradient border speaking ring — wraps the tile
  const borderSize = isSpeaking ? 2.5 : isPinned ? 2 : 1
  const borderGradient = isSpeaking
    ? `linear-gradient(135deg, ${c1}, ${c2}, ${c1})`
    : isPinned
    ? 'linear-gradient(135deg, rgba(252,101,31,0.7), rgba(255,140,66,0.5))'
    : 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.04))'

  return (
    /* Gradient border wrapper */
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: 0.2, type: 'spring', damping: 20, stiffness: 300 }}
      className={`relative rounded-2xl ${onClick ? 'cursor-pointer' : ''} ${className}`}
      style={{
        background: borderGradient,
        padding: `${borderSize}px`,
        boxShadow: isSpeaking
          ? `0 0 0 3px ${c1}22, 0 0 32px 6px ${c1}28, 0 0 60px 12px ${c2}12`
          : isPinned
          ? '0 0 0 2px rgba(252,101,31,0.12), 0 0 20px 4px rgba(252,101,31,0.08)'
          : 'none',
        transition: 'box-shadow 0.15s ease, background 0.15s ease',
        ...style,
      }}
      onClick={onClick}
    >
    <div
      className="relative w-full h-full rounded-[calc(1rem-2px)] overflow-hidden flex items-center justify-center group select-none"
      style={{ background: isScreen ? '#000' : 'rgba(12,5,9,0.97)' }}
    >
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full ${isScreen ? 'object-contain' : 'object-cover'}`}
          style={isScreen ? { background: '#000' } : {}}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <motion.div
            className="rounded-full flex items-center justify-center font-bold text-white shrink-0 shadow-lg"
            style={{
              width: avatarSize, height: avatarSize,
              fontSize: avatarSize * 0.36,
              background: isScreen ? 'rgba(255,255,255,0.1)' : avatarGradient(name, avatarIdx),
            }}
            animate={isSpeaking ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={{ duration: 0.4, repeat: isSpeaking ? Infinity : 0 }}
          >
            {isScreen ? '🖥' : initials(name)}
          </motion.div>
          {!isScreen && size !== 'small' && (
            <p className="text-xs text-white/40 truncate max-w-[80%] text-center">{name}</p>
          )}
          {/* Audio bars under avatar */}
          {!isScreen && !isMuted && (
            <AudioBars level={speaking} color={color} />
          )}
        </div>
      )}

      {/* Bottom gradient overlay */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-end justify-between px-2 py-1.5"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' }}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {isSpeaking && !isMuted && (
            <AudioBars level={speaking} color={color} />
          )}
          <span className="text-[10px] font-medium text-white/80 truncate">
            {isScreen ? '🖥 Pantalla' : isLocal ? `${name} (tú)` : name}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {isHandRaised && (
            <span className="text-sm leading-none">✋</span>
          )}
          {isMuted && (
            <span
              className="w-4 h-4 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.9)' }}
            >
              <FiMicOff size={8} color="white" />
            </span>
          )}
          {isPinned && <MdPushPin size={10} style={{ color: '#FC651F' }} />}
        </div>
      </div>

      {/* Pin hint on hover */}
      {onClick && !isPinned && size !== 'small' && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div
            className="px-1.5 py-0.5 rounded-lg text-[9px] text-white/60 flex items-center gap-1"
            style={{ background: 'rgba(0,0,0,0.75)' }}
          >
            <MdPushPin size={8} /> Fijar
          </div>
        </div>
      )}
    </div>
    </motion.div>
  )
}

/* ── Grid layout calculator ──────────────────────────────────────────────────── */
function useGridLayout(count) {
  return useMemo(() => {
    if (count <= 1) return { cols: 1, spanLast: false }
    if (count === 2) return { cols: 2, spanLast: false }
    if (count === 3) return { cols: 2, spanLast: true }
    if (count === 4) return { cols: 2, spanLast: false }
    if (count <= 6) return { cols: 3, spanLast: count % 3 === 1 }
    if (count <= 9) return { cols: 3, spanLast: count % 3 === 1 }
    return { cols: 4, spanLast: count % 4 === 1 }
  }, [count])
}

/* ── Device picker ───────────────────────────────────────────────────────────── */
function DevicePicker({ cameras, mics, selectedCamera, selectedMic, onSelectCamera, onSelectMic }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (cameras.length === 0 && mics.length === 0) return null

  return (
    <div className="relative" ref={ref}>
      <Tooltip label="Dispositivos">
        <CtrlBtn
          icon={<FiSettings size={16} />}
          active={open}
          onClick={() => setOpen(p => !p)}
        />
      </Tooltip>

      <AnimatePresence>
        {open && (
          <motion.div
            className="absolute bottom-full mb-3 right-0 w-64 rounded-2xl shadow-2xl z-10 p-3 space-y-3"
            style={{ background: 'rgba(10,5,8,0.99)', border: '1px solid rgba(255,255,255,0.1)' }}
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.12 }}
          >
            {cameras.length > 0 && (
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 font-semibold flex items-center gap-1">
                  <FiVideo size={9} /> Cámara
                </p>
                {cameras.map((cam, i) => (
                  <button
                    key={cam.deviceId}
                    onClick={() => { onSelectCamera(cam.deviceId); setOpen(false) }}
                    className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition-colors truncate"
                    style={{
                      background: selectedCamera === cam.deviceId ? 'rgba(252,101,31,0.15)' : 'transparent',
                      color: selectedCamera === cam.deviceId ? '#FC651F' : 'rgba(255,255,255,0.55)',
                    }}
                  >
                    {cam.label || `Cámara ${i + 1}`}
                  </button>
                ))}
              </div>
            )}
            {mics.length > 0 && (
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5 font-semibold flex items-center gap-1">
                  <FiMic size={9} /> Micrófono
                </p>
                {mics.map((mic, i) => (
                  <button
                    key={mic.deviceId}
                    onClick={() => { onSelectMic(mic.deviceId); setOpen(false) }}
                    className="w-full text-left text-xs px-2.5 py-1.5 rounded-lg transition-colors truncate"
                    style={{
                      background: selectedMic === mic.deviceId ? 'rgba(252,101,31,0.15)' : 'transparent',
                      color: selectedMic === mic.deviceId ? '#FC651F' : 'rgba(255,255,255,0.55)',
                    }}
                  >
                    {mic.label || `Micrófono ${i + 1}`}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Tooltip wrapper ─────────────────────────────────────────────────────────── */
function Tooltip({ label, children }) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative flex flex-col items-center" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            className="absolute bottom-full mb-2 px-2 py-1 rounded-lg text-[10px] text-white/80 whitespace-nowrap pointer-events-none z-50"
            style={{ background: 'rgba(0,0,0,0.9)', border: '1px solid rgba(255,255,255,0.1)' }}
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 2 }}
            transition={{ duration: 0.1 }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ── Minimal icon-only control button ────────────────────────────────────────── */
function CtrlBtn({ icon, onClick, active = true, danger = false, accent = false, pulse = false, badge = false }) {
  let bg, color
  if (danger) { bg = 'rgba(239,68,68,0.18)'; color = '#EF4444' }
  else if (accent) { bg = 'rgba(252,101,31,0.22)'; color = '#FC651F' }
  else if (active) { bg = 'rgba(255,255,255,0.1)'; color = 'rgba(255,255,255,0.88)' }
  else { bg = 'rgba(255,255,255,0.05)'; color = 'rgba(255,255,255,0.35)' }

  return (
    <motion.button
      onClick={onClick}
      className="relative w-11 h-11 rounded-2xl flex items-center justify-center overflow-hidden"
      style={{ background: bg, color }}
      whileHover={{ scale: 1.08, background: danger ? 'rgba(239,68,68,0.28)' : accent ? 'rgba(252,101,31,0.32)' : 'rgba(255,255,255,0.15)' }}
      whileTap={{ scale: 0.92 }}
      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
    >
      {pulse && (
        <motion.div
          className="absolute inset-0 rounded-2xl"
          style={{ background: bg }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      <span className="relative z-10">{icon}</span>
      {badge && (
        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FC651F] ring-2 ring-[#060304]" />
      )}
    </motion.button>
  )
}

/* ── Emoji reactions picker + floating bubbles ───────────────────────────────── */
const EMOJIS = ['👍', '❤️', '😂', '😮', '👏', '🔥', '🎉', '💯']

function ReactionsLayer({ reactions, onSend }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <>
      {/* Floating reaction bubbles */}
      <div className="absolute bottom-20 left-4 flex flex-col-reverse gap-2 pointer-events-none z-20">
        <AnimatePresence>
          {reactions.map(r => (
            <motion.div
              key={r.id}
              className="flex items-center gap-2 px-3 py-1.5 rounded-2xl text-sm shadow-lg"
              style={{
                background: 'rgba(10,5,8,0.92)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(12px)',
              }}
              initial={{ opacity: 0, x: -20, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            >
              <span className="text-xl leading-none">{r.emoji}</span>
              <span className="text-white/60 text-xs">{r.name}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Emoji picker button */}
      <div className="relative" ref={ref}>
        <Tooltip label="Reaccionar">
          <CtrlBtn
            icon={<FiSmile size={16} />}
            active={open}
            onClick={() => setOpen(p => !p)}
          />
        </Tooltip>
        <AnimatePresence>
          {open && (
            <motion.div
              className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 flex gap-1.5 p-2 rounded-2xl shadow-2xl z-30"
              style={{ background: 'rgba(10,5,8,0.99)', border: '1px solid rgba(255,255,255,0.1)' }}
              initial={{ opacity: 0, y: 8, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.9 }}
              transition={{ type: 'spring', damping: 22, stiffness: 350 }}
            >
              {EMOJIS.map(emoji => (
                <motion.button
                  key={emoji}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-xl hover:bg-white/10 transition-colors"
                  whileHover={{ scale: 1.25 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { onSend(emoji); setOpen(false) }}
                >
                  {emoji}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

/* ── Participant panel ───────────────────────────────────────────────────────── */
function ParticipantPanel({ tiles, raisedHands, onClose }) {
  return (
    <motion.div
      className="absolute right-0 top-0 bottom-0 w-64 flex flex-col z-20"
      style={{ background: 'rgba(6,3,5,0.98)', borderLeft: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)' }}
      initial={{ x: 280 }}
      animate={{ x: 0 }}
      exit={{ x: 280 }}
      transition={{ type: 'spring', damping: 26, stiffness: 300 }}
    >
      <div className="flex items-center justify-between px-4 py-3.5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <span className="text-sm font-semibold text-white/70 flex items-center gap-2">
          <FiUsers size={14} className="text-[#FC651F]" />
          Participantes
          <span className="text-[11px] font-normal text-white/30 bg-white/[0.07] px-1.5 py-0.5 rounded-md">{tiles.length}</span>
        </span>
        <button onClick={onClose} className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-white/[0.08] transition-colors text-white/40 hover:text-white/70">
          <FiX size={14} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {tiles.map((tile) => (
          <div
            key={tile.key}
            className="flex items-center gap-2.5 py-2 px-2.5 rounded-xl hover:bg-white/[0.04] transition-colors group"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow"
              style={{ background: avatarGradient(tile.name, tile.avatarIdx) }}
            >
              {initials(tile.name)}
            </div>
            <span className="flex-1 text-[13px] text-white/80 truncate">
              {tile.isLocal ? `${tile.name} (tú)` : tile.name}
            </span>
            <div className="flex items-center gap-1 shrink-0">
              {raisedHands.has(tile.key) && (
                <motion.span
                  className="text-sm leading-none"
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 1 }}
                >✋</motion.span>
              )}
              {tile.isMuted && <FiMicOff size={11} color="#EF4444" />}
              {tile.isCameraOff && <FiVideoOff size={11} color="#ef4444" />}
              {!tile.isMuted && !tile.isCameraOff && <span className="w-1.5 h-1.5 rounded-full bg-green-400 opacity-60" />}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  )
}

/* ── Incoming call notification ──────────────────────────────────────────────── */
function IncomingCall({ incoming, onAccept, onDecline }) {
  return createPortal(
    <AnimatePresence>
      <motion.div
        className="fixed bottom-6 right-6 z-[300]"
        initial={{ opacity: 0, x: 60, scale: 0.85 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 40, scale: 0.9 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
      >
        <div
          className="w-80 rounded-2xl p-4 flex items-center gap-3.5 shadow-2xl"
          style={{
            background: 'rgba(8,4,6,0.99)',
            border: '1px solid rgba(34,197,94,0.3)',
            boxShadow: '0 0 0 1px rgba(34,197,94,0.08), 0 24px 64px rgba(0,0,0,0.85)',
          }}
        >
          {/* Pulsing avatar */}
          <div className="relative shrink-0">
            <motion.div
              className="absolute -inset-2.5 rounded-full"
              style={{ background: 'rgba(34,197,94,0.2)' }}
              animate={{ scale: [1, 1.4, 1], opacity: [0.5, 0.2, 0.5] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-sm relative z-10 shadow-lg"
              style={{ background: avatarGradient(incoming.name, 1) }}
            >
              {initials(incoming.name)}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-white text-sm truncate">{incoming.name}</p>
            <p className="text-white/40 text-[11px] mt-0.5 flex items-center gap-1">
              {incoming.type === 'video' ? '📹 Videollamada entrante' : '🎙 Llamada de voz'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }}
              onClick={onDecline}
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: 'rgba(239,68,68,0.9)' }}
              title="Rechazar"
            >
              <FiPhoneOff size={15} color="white" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.88 }}
              onClick={onAccept}
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-lg"
              style={{ background: 'rgba(34,197,94,0.9)' }}
              title="Contestar"
            >
              <FiPhone size={15} color="white" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  )
}

/* ── Mini call bar (minimized) ───────────────────────────────────────────────── */
function MiniCallBar({ callType, participants, isMuted, isCameraOff, onToggleMute, onToggleCamera, onEndCall, onExpand }) {
  return createPortal(
    <motion.div
      className="fixed bottom-5 left-1/2 z-[250] flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-2xl"
      style={{
        background: 'rgba(8,4,6,0.98)',
        border: '1px solid rgba(34,197,94,0.25)',
        boxShadow: '0 0 0 1px rgba(34,197,94,0.08), 0 16px 48px rgba(0,0,0,0.7)',
        transform: 'translateX(-50%)',
      }}
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={{ type: 'spring', damping: 22, stiffness: 300 }}
    >
      <button onClick={onExpand} className="flex items-center gap-2.5 pr-1">
        <motion.div
          className="w-2 h-2 rounded-full bg-green-400"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <span className="text-xs text-white/70 font-medium">
          {callType === 'video' ? '📹' : '🎙'} En llamada
        </span>
        {participants.length > 0 && (
          <span className="text-[10px] text-white/35">· {participants.length + 1}</span>
        )}
      </button>

      <div className="w-px h-5 bg-white/10" />

      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={onToggleMute}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ background: isMuted ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)' }}
        >
          {isMuted ? <FiMicOff size={13} color="#EF4444" /> : <FiMic size={13} color="rgba(255,255,255,0.7)" />}
        </motion.button>
        {callType === 'video' && (
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onToggleCamera}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: isCameraOff ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)' }}
          >
            {isCameraOff ? <FiVideoOff size={13} color="#EF4444" /> : <FiVideo size={13} color="rgba(255,255,255,0.7)" />}
          </motion.button>
        )}
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={onEndCall}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(239,68,68,0.88)' }}
        >
          <FiPhoneOff size={12} color="white" />
        </motion.button>
      </div>
    </motion.div>,
    document.body,
  )
}

/* ── Active call fullscreen ──────────────────────────────────────────────────── */
function ActiveCall({
  callType, participants, localStream, isScreenSharing, screenStream,
  isMuted, isCameraOff, profile,
  cameras, mics, selectedCamera, selectedMic, onSelectCamera, onSelectMic,
  onToggleMute, onToggleCamera, onToggleScreen, onEndCall, onMinimize,
  reactions, raisedHands, isHandRaised, onSendReaction, onToggleRaiseHand,
}) {
  const [layoutMode, setLayoutMode] = useState('focus')
  const [pinnedKey, setPinnedKey] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [showParticipants, setShowParticipants] = useState(false)
  const startRef = useRef(Date.now())

  // Timer
  useEffect(() => {
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    return () => clearInterval(t)
  }, [])

  const fmt = s => {
    const h = Math.floor(s / 3600)
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
    const ss = String(s % 60).padStart(2, '0')
    return h > 0 ? `${h}:${m}:${ss}` : `${m}:${ss}`
  }

  // Build tiles
  const allTiles = [
    { key: 'local-cam', stream: localStream, name: profile?.nombre || 'Tú', isLocal: true, isCameraOff, isMuted, isScreen: false, avatarIdx: 0 },
    ...(isScreenSharing && screenStream
      ? [{ key: 'local-screen', stream: screenStream, name: 'Pantalla', isLocal: true, isCameraOff: false, isMuted: false, isScreen: true, avatarIdx: 0 }]
      : []),
    ...participants.map((p, i) => ({
      key: p.userId, stream: p.stream, name: p.name || p.userId,
      isLocal: false, isCameraOff: p.videoOff, isMuted: p.muted, isScreen: false, avatarIdx: i + 1,
    })),
  ]

  // Auto-pin first tile when entering focus
  useEffect(() => {
    if (layoutMode === 'focus' && !pinnedKey && allTiles.length > 0) {
      setPinnedKey(allTiles[0].key)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layoutMode])

  // Auto-switch to focus on screen share
  useEffect(() => {
    if (isScreenSharing) { setLayoutMode('focus'); setPinnedKey('local-screen') }
  }, [isScreenSharing])

  useEffect(() => {
    if (!isScreenSharing && pinnedKey === 'local-screen') {
      const firstCam = allTiles.find(t => !t.isScreen)
      setPinnedKey(firstCam?.key || null)
      setLayoutMode('focus')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScreenSharing])

  const { cols, spanLast } = useGridLayout(allTiles.length)
  const pinnedTile = pinnedKey ? allTiles.find(t => t.key === pinnedKey) : null
  const otherTiles = allTiles.filter(t => t.key !== pinnedKey)
  const isWaiting = participants.length === 0 && !isScreenSharing

  const handleTileClick = useCallback((key) => {
    if (pinnedKey === key) { setPinnedKey(null); setLayoutMode('grid') }
    else { setPinnedKey(key); setLayoutMode('focus') }
  }, [pinnedKey])

  const copyCallLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast.success('Enlace copiado — compártelo para invitar')
    })
  }, [])

  const handsCount = raisedHands.size

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[260] flex flex-col overflow-hidden"
      style={{ background: 'radial-gradient(ellipse at 40% 30%, #110809 0%, #060304 70%)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* ── Top bar ── */}
      <div
        className="flex items-center justify-between px-4 py-2.5 shrink-0 z-10"
        style={{ background: 'rgba(0,0,0,0.5)', borderBottom: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(16px)' }}
      >
        <div className="flex items-center gap-3">
          {/* Live indicator + timer */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-xl" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-green-400"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <span className="text-[11px] text-green-400 font-mono font-semibold tabular-nums">{fmt(elapsed)}</span>
          </div>

          {/* Participant avatars */}
          <div className="flex items-center -space-x-2">
            {allTiles.slice(0, 5).map((t, i) => (
              <div
                key={t.key}
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-[#060304] shadow"
                style={{ background: avatarGradient(t.name, t.avatarIdx), zIndex: allTiles.length - i }}
                title={t.name}
              >
                {t.isScreen ? '🖥' : initials(t.name)}
              </div>
            ))}
            {allTiles.length > 5 && (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white/50 ring-2 ring-[#060304]"
                style={{ background: 'rgba(255,255,255,0.1)' }}>
                +{allTiles.length - 5}
              </div>
            )}
          </div>
          <span className="text-[11px] text-white/30 hidden sm:block">
            {allTiles.length} {allTiles.length === 1 ? 'participante' : 'participantes'}
          </span>

          {handsCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] text-amber-400" style={{ background: 'rgba(245,158,11,0.12)' }}>
              ✋ {handsCount}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Layout toggle — 2+ tiles */}
          {allTiles.length >= 2 && (
            <div
              className="flex items-center rounded-xl overflow-hidden p-0.5 gap-0.5"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <button
                onClick={() => { setLayoutMode('grid'); setPinnedKey(null) }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                style={layoutMode === 'grid'
                  ? { background: 'rgba(252,101,31,0.22)', color: '#FC651F' }
                  : { color: 'rgba(255,255,255,0.35)' }}
                title="Vista cuadrícula"
              >
                <FiGrid size={11} />
                <span className="hidden md:inline">Cuadrícula</span>
              </button>
              <button
                onClick={() => { setLayoutMode('focus'); if (!pinnedKey) setPinnedKey(allTiles[0]?.key) }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all"
                style={layoutMode === 'focus'
                  ? { background: 'rgba(252,101,31,0.22)', color: '#FC651F' }
                  : { color: 'rgba(255,255,255,0.35)' }}
                title="Vista enfoque"
              >
                <FiUser size={11} />
                <span className="hidden md:inline">Enfoque</span>
              </button>
            </div>
          )}

          {/* Participants panel toggle */}
          <Tooltip label="Participantes">
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowParticipants(p => !p)}
              className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] transition-colors"
              style={{
                background: showParticipants ? 'rgba(252,101,31,0.18)' : 'rgba(255,255,255,0.06)',
                color: showParticipants ? '#FC651F' : 'rgba(255,255,255,0.5)',
              }}
            >
              <FiUsers size={13} />
              <span className="hidden sm:inline">{allTiles.length}</span>
              {handsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-[9px] font-bold text-zinc-900 flex items-center justify-center">
                  {handsCount}
                </span>
              )}
            </motion.button>
          </Tooltip>

          <Tooltip label="Minimizar">
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={onMinimize}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] text-white/40 hover:text-white/70 transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <FiMinimize2 size={13} />
            </motion.button>
          </Tooltip>
        </div>
      </div>

      {/* ── Main area (video + optional sidebar) ── */}
      <div className="flex-1 flex min-h-0 relative overflow-hidden">
        {/* Video area */}
        <div className="flex-1 overflow-hidden p-3 min-h-0 relative">
          <AnimatePresence mode="wait">
            {isWaiting ? (
              /* ─ Waiting solo ─ */
              <motion.div
                key="waiting"
                className="h-full flex flex-col items-center justify-center gap-6"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                <div className="w-full max-w-sm mx-auto">
                  <VideoTile
                    stream={localStream}
                    name={profile?.nombre || 'Tú'}
                    avatarIdx={0}
                    isLocal
                    isCameraOff={isCameraOff}
                    isMuted={isMuted}
                    isHandRaised={isHandRaised}
                    size="large"
                    className="aspect-video w-full"
                  />
                </div>
                <div className="flex flex-col items-center gap-3">
                  <motion.p
                    className="text-white/30 text-sm"
                    animate={{ opacity: [0.4, 0.8, 0.4] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                  >
                    Esperando que otros se unan…
                  </motion.p>
                  <motion.button
                    onClick={copyCallLink}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-white/60 hover:text-white/90 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                  >
                    <FiLink size={12} />
                    Copiar enlace de invitación
                  </motion.button>
                </div>
              </motion.div>
            ) : layoutMode === 'grid' ? (
              /* ─ Grid layout ─ */
              <motion.div
                key="grid"
                className="h-full"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                <div
                  className="h-full grid gap-2"
                  style={{
                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                    gridAutoRows: '1fr',
                  }}
                >
                  <AnimatePresence>
                    {allTiles.map((tile, i) => {
                      const isOrphan = spanLast && i === allTiles.length - 1
                      return (
                        <VideoTile
                          key={tile.key}
                          stream={tile.stream}
                          name={tile.name}
                          avatarIdx={tile.avatarIdx}
                          isLocal={tile.isLocal}
                          isCameraOff={tile.isCameraOff}
                          isMuted={tile.isMuted}
                          isScreen={tile.isScreen}
                          isHandRaised={raisedHands.has(tile.key)}
                          className="w-full h-full min-h-0"
                          style={isOrphan ? { gridColumn: `1 / -1`, maxWidth: `calc(${100 / cols}% - 4px)`, margin: '0 auto', width: '100%' } : {}}
                          onClick={() => handleTileClick(tile.key)}
                        />
                      )
                    })}
                  </AnimatePresence>
                </div>
              </motion.div>
            ) : (
              /* ─ Focus layout — Discord-style ─ */
              <motion.div
                key="focus"
                className="h-full flex flex-col gap-2 min-h-0"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              >
                {/* Featured tile */}
                <div className="flex-1 min-h-0 min-w-0">
                  {(pinnedTile || allTiles[0]) && (() => {
                    const t = pinnedTile || allTiles[0]
                    return (
                      <VideoTile
                        key={`featured-${t.key}`}
                        stream={t.stream}
                        name={t.name}
                        avatarIdx={t.avatarIdx}
                        isLocal={t.isLocal}
                        isCameraOff={t.isCameraOff}
                        isMuted={t.isMuted}
                        isScreen={t.isScreen}
                        isHandRaised={raisedHands.has(t.key)}
                        isPinned
                        size="large"
                        className="h-full w-full"
                        onClick={() => handleTileClick(t.key)}
                      />
                    )
                  })()}
                </div>

                {/* Bottom thumbnail strip */}
                {otherTiles.length > 0 && (
                  <div
                    className="flex gap-2 overflow-x-auto shrink-0"
                    style={{ scrollbarWidth: 'none', height: 110 }}
                  >
                    <AnimatePresence>
                      {otherTiles.map(tile => (
                        <div key={tile.key} className="shrink-0 h-full" style={{ width: 168 }}>
                          <VideoTile
                            stream={tile.stream}
                            name={tile.name}
                            avatarIdx={tile.avatarIdx}
                            isLocal={tile.isLocal}
                            isCameraOff={tile.isCameraOff}
                            isMuted={tile.isMuted}
                            isScreen={tile.isScreen}
                            isHandRaised={raisedHands.has(tile.key)}
                            size="small"
                            className="w-full h-full"
                            onClick={() => handleTileClick(tile.key)}
                          />
                        </div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Reactions floating layer */}
          <ReactionsLayer reactions={reactions} onSend={onSendReaction} />
        </div>

        {/* Participant panel */}
        <AnimatePresence>
          {showParticipants && (
            <ParticipantPanel
              tiles={allTiles}
              raisedHands={raisedHands}
              onClose={() => setShowParticipants(false)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* ── Controls bar ── */}
      <div
        className="flex items-center justify-center gap-2 py-3.5 px-4 shrink-0"
        style={{
          background: 'rgba(0,0,0,0.75)',
          borderTop: '1px solid rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Left group — media */}
        <div className="flex items-center gap-1.5">
          <Tooltip label={isMuted ? 'Activar micrófono' : 'Silenciar'}>
            <CtrlBtn
              icon={isMuted ? <FiMicOff size={17} /> : <FiMic size={17} />}
              danger={isMuted}
              onClick={onToggleMute}
            />
          </Tooltip>
          {callType === 'video' && (
            <Tooltip label={isCameraOff ? 'Activar cámara' : 'Apagar cámara'}>
              <CtrlBtn
                icon={isCameraOff ? <FiVideoOff size={17} /> : <FiVideo size={17} />}
                danger={isCameraOff}
                onClick={onToggleCamera}
              />
            </Tooltip>
          )}
          <Tooltip label={isScreenSharing ? 'Dejar de compartir' : 'Compartir pantalla'}>
            <CtrlBtn
              icon={<FiMonitor size={17} />}
              accent={isScreenSharing}
              pulse={isScreenSharing}
              onClick={onToggleScreen}
            />
          </Tooltip>
          <DevicePicker
            cameras={cameras}
            mics={mics}
            selectedCamera={selectedCamera}
            selectedMic={selectedMic}
            onSelectCamera={onSelectCamera}
            onSelectMic={onSelectMic}
          />
        </div>

        <div className="w-px h-8 bg-white/10 mx-1" />

        {/* Center group — engagement */}
        <div className="flex items-center gap-1.5">
          <Tooltip label={isHandRaised ? 'Bajar mano' : 'Levantar mano'}>
            <CtrlBtn
              icon={<BsHandIndex size={17} />}
              accent={isHandRaised}
              onClick={onToggleRaiseHand}
              badge={isHandRaised}
            />
          </Tooltip>
          {/* Reactions button is part of ReactionsLayer but we expose it here too */}
        </div>

        <div className="w-px h-8 bg-white/10 mx-1" />

        {/* End call */}
        <motion.button
          onClick={onEndCall}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-semibold text-[13px] shadow-lg text-white"
          style={{ background: 'linear-gradient(135deg, #EF4444, #DC2626)' }}
          whileHover={{ scale: 1.05, boxShadow: '0 0 20px rgba(239,68,68,0.4)' }}
          whileTap={{ scale: 0.95 }}
        >
          <FiPhoneOff size={17} />
          <span className="hidden sm:inline">Colgar</span>
        </motion.button>
      </div>
    </motion.div>,
    document.body,
  )
}

/* ── CallModal — main export ─────────────────────────────────────────────────── */
export default function CallModal({ callHook }) {
  const { profile } = useAuth()
  const [expanded, setExpanded] = useState(true)

  const {
    callState, callType, incoming,
    localStream, screenStream, participants,
    isMuted, isCameraOff, isScreenSharing,
    cameras, mics, selectedCamera, selectedMic,
    setSelectedMic, switchCamera,
    reactions, raisedHands, isHandRaised,
    acceptCall, declineCall, endCall,
    toggleMute, toggleCamera, toggleScreenShare,
    sendReaction, toggleRaiseHand,
  } = callHook

  useEffect(() => { if (callState === 'in-call') setExpanded(true) }, [callState])
  useEffect(() => { if (callState === 'idle') setExpanded(true) }, [callState])

  const showMiniBar = callState === 'in-call' && !expanded
  const showFullscreen = callState === 'in-call' && expanded

  return (
    <AnimatePresence>
      {callState === 'ringing' && incoming && (
        <IncomingCall
          key="incoming"
          incoming={incoming}
          onAccept={() => acceptCall(selectedCamera, selectedMic)}
          onDecline={declineCall}
        />
      )}
      {showFullscreen && (
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
          cameras={cameras}
          mics={mics}
          selectedCamera={selectedCamera}
          selectedMic={selectedMic}
          onSelectCamera={switchCamera}
          onSelectMic={setSelectedMic}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
          onToggleScreen={toggleScreenShare}
          onEndCall={endCall}
          onMinimize={() => setExpanded(false)}
          reactions={reactions}
          raisedHands={raisedHands}
          isHandRaised={isHandRaised}
          onSendReaction={sendReaction}
          onToggleRaiseHand={toggleRaiseHand}
        />
      )}
      {showMiniBar && (
        <MiniCallBar
          key="mini"
          callType={callType}
          participants={participants}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          onToggleMute={toggleMute}
          onToggleCamera={toggleCamera}
          onEndCall={endCall}
          onExpand={() => setExpanded(true)}
        />
      )}
    </AnimatePresence>
  )
}
