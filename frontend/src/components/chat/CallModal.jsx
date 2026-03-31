import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiMic, FiMicOff, FiVideo, FiVideoOff, FiPhoneOff, FiPhone,
  FiMonitor, FiSettings, FiMinimize2, FiGrid, FiUser,
  FiUsers, FiX, FiLink, FiSmile, FiMessageCircle, FiUserPlus, FiSend,
} from 'react-icons/fi'
import { MdPushPin } from 'react-icons/md'
import { BsHandIndex } from 'react-icons/bs'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
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
      {/* Video always in DOM — hide with CSS so srcObject stays set across camera toggles */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={`w-full h-full ${isScreen ? 'object-contain' : 'object-cover'}`}
        style={{ display: showVideo ? 'block' : 'none', ...(isScreen ? { background: '#000' } : {}) }}
      />

      {/* Avatar overlay — shown when camera is off */}
      {!showVideo && (
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
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={onToggleCamera}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ background: isCameraOff ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)' }}
        >
          {isCameraOff ? <FiVideoOff size={13} color="#EF4444" /> : <FiVideo size={13} color="rgba(255,255,255,0.7)" />}
        </motion.button>
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

/* ── In-call chat hook ───────────────────────────────────────────────────────── */
function useInCallChat(canalId) {
  const { user, profile } = useAuth()
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const MSG_SELECT = '*, autor:usuarios(id, nombre, foto_url)'

  useEffect(() => {
    if (!canalId || !user) return
    supabase
      .from('mensajes')
      .select(MSG_SELECT)
      .eq('canal_id', canalId)
      .order('created_at', { ascending: false })
      .limit(40)
      .then(({ data }) => { if (data) setMessages(data.reverse()) })
    const ch = supabase
      .channel(`incall_chat_${canalId}_${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `canal_id=eq.${canalId}` },
        async ({ new: row }) => {
          const { data } = await supabase.from('mensajes').select(MSG_SELECT).eq('id', row.id).single()
          if (data) setMessages(prev => prev.some(m => m.id === data.id) ? prev : [...prev, data])
        })
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [canalId, user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useCallback(async () => {
    if (!text.trim() || !user || !canalId) return
    setSending(true)
    const content = text.trim()
    const optimistic = {
      id: `temp-${Date.now()}`, canal_id: canalId, autor_id: user.id,
      contenido: content, tipo: 'texto', created_at: new Date().toISOString(),
      autor: { nombre: profile?.nombre || 'Tú', foto_url: profile?.foto_url },
    }
    setMessages(prev => [...prev, optimistic])
    setText('')
    await supabase.from('mensajes').insert({ canal_id: canalId, autor_id: user.id, contenido: content, tipo: 'texto' })
    setSending(false)
  }, [text, user, canalId, profile])

  return { messages, text, setText, send, sending, bottomRef }
}

/* ── In-call chat panel ──────────────────────────────────────────────────────── */
function InCallChatPanel({ canalId, onClose }) {
  const { user } = useAuth()
  const chat = useInCallChat(canalId)

  return (
    <motion.div
      className="w-64 flex flex-col border-l border-white/[0.06] shrink-0"
      style={{ background: 'rgba(6,3,4,0.97)' }}
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06] shrink-0">
        <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider">Chat</span>
        <button onClick={onClose} className="text-white/25 hover:text-white/60 transition-colors">
          <FiX size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
        {chat.messages.length === 0 && (
          <p className="text-[11px] text-white/20 text-center py-6 italic">Sin mensajes aún</p>
        )}
        {chat.messages.map(msg => {
          const isMe = msg.autor_id === user?.id
          return (
            <div key={msg.id} className={`flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
              {!isMe && (
                <span className="text-[9px] text-white/25 px-1">{msg.autor?.nombre || '?'}</span>
              )}
              <div
                className="px-2.5 py-1.5 text-xs text-white/85 max-w-[90%] break-words"
                style={isMe
                  ? { background: 'rgba(252,101,31,0.22)', borderRadius: '10px 10px 3px 10px' }
                  : { background: 'rgba(255,255,255,0.07)', borderRadius: '10px 10px 10px 3px' }
                }
              >
                {msg.contenido}
              </div>
            </div>
          )
        })}
        <div ref={chat.bottomRef} />
      </div>

      <div className="flex items-center gap-1.5 px-2.5 py-2.5 border-t border-white/[0.06] shrink-0">
        <input
          value={chat.text}
          onChange={e => chat.setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chat.send() } }}
          placeholder="Mensaje..."
          className="flex-1 bg-white/[0.06] rounded-xl px-3 py-2 text-xs text-white outline-none placeholder:text-white/25 border border-white/[0.08] focus:border-white/20"
        />
        <button
          onClick={chat.send}
          disabled={!chat.text.trim() || chat.sending}
          className="w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0"
          style={{ background: chat.text.trim() ? '#FC651F' : 'rgba(255,255,255,0.06)' }}
        >
          <FiSend size={12} color={chat.text.trim() ? 'white' : 'rgba(255,255,255,0.3)'} />
        </button>
      </div>
    </motion.div>
  )
}

/* ── Invite members modal ────────────────────────────────────────────────────── */
function InviteModal({ canalId, onInvite, onClose }) {
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [invited, setInvited] = useState(new Set())

  useEffect(() => {
    supabase
      .from('usuarios')
      .select('id, nombre, foto_url, area_investigacion')
      .eq('activo', true)
      .order('nombre')
      .limit(80)
      .then(({ data }) => setMembers(data || []))
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return members
    const q = search.toLowerCase()
    return members.filter(m => m.nombre?.toLowerCase().includes(q) || m.area_investigacion?.toLowerCase().includes(q))
  }, [members, search])

  const handleInvite = (m) => {
    onInvite(m.id)
    setInvited(prev => new Set([...prev, m.id]))
    toast.success(`Invitación enviada a ${m.nombre}`)
  }

  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/chat?canal=${canalId}`)
      .then(() => toast.success('Enlace de llamada copiado'))
  }

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[280] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-sm rounded-2xl overflow-hidden flex flex-col"
        style={{ background: '#0c0508', border: '1px solid rgba(252,101,31,0.2)', maxHeight: '80vh' }}
        initial={{ scale: 0.92, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 12 }}
        transition={{ type: 'spring', damping: 22, stiffness: 320 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06] shrink-0">
          <div>
            <p className="text-sm font-semibold text-white/85">Invitar a la llamada</p>
            <p className="text-[10px] text-white/30 mt-0.5">Envía una notificación para que se unan</p>
          </div>
          <button onClick={onClose} className="text-white/25 hover:text-white/60 transition-colors p-1">
            <FiX size={14} />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pt-3 pb-2 shrink-0">
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar miembro..."
            autoFocus
            className="w-full bg-white/[0.05] rounded-xl px-3 py-2 text-xs text-white outline-none placeholder:text-white/25 border border-white/[0.08] focus:border-white/20"
          />
        </div>

        {/* Member list */}
        <div className="flex-1 overflow-y-auto px-3 pb-2 space-y-0.5 min-h-0">
          {filtered.map(m => {
            const sent = invited.has(m.id)
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.04] transition-colors"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: avatarGradient(m.nombre, 0) }}
                >
                  {initials(m.nombre)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/80 truncate">{m.nombre}</p>
                  {m.area_investigacion && (
                    <p className="text-[10px] text-white/30 truncate">{m.area_investigacion}</p>
                  )}
                </div>
                <button
                  onClick={() => !sent && handleInvite(m)}
                  disabled={sent}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0"
                  style={sent
                    ? { background: 'rgba(34,197,94,0.15)', color: '#22c55e' }
                    : { background: 'rgba(252,101,31,0.15)', color: '#FC651F', cursor: 'pointer' }
                  }
                >
                  {sent ? '✓ Enviada' : 'Invitar'}
                </button>
              </div>
            )
          })}
          {filtered.length === 0 && (
            <p className="text-[11px] text-white/25 text-center py-6">Sin resultados</p>
          )}
        </div>

        {/* Copy link footer */}
        <div className="px-3 py-3 border-t border-white/[0.06] shrink-0">
          <p className="text-[10px] text-white/30 mb-1.5">O comparte el enlace directo</p>
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.08]" style={{ background: 'rgba(255,255,255,0.02)' }}>
            <span className="text-[10px] text-white/25 flex-1 truncate font-mono">/chat?canal={canalId?.slice(0, 8)}…</span>
            <button
              onClick={copyLink}
              className="flex items-center gap-1 text-[11px] font-medium shrink-0 transition-colors"
              style={{ color: '#FC651F' }}
            >
              <FiLink size={11} /> Copiar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}

/* ── Pre-call setup screen ───────────────────────────────────────────────────── */
function PreCallSetup({ pendingCall, onConfirm, onCancel, cameras: availableCameras, mics: availableMics }) {
  const { profile } = useAuth()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [camOff, setCamOff] = useState(false)
  const [micOff, setMicOff] = useState(false)
  const [selectedCamera, setSelectedCamera] = useState(availableCameras[0]?.deviceId || null)
  const [selectedMic, setSelectedMic] = useState(availableMics[0]?.deviceId || null)
  const [devices, setDevices] = useState({ cameras: availableCameras, mics: availableMics })
  const [loadingCam, setLoadingCam] = useState(pendingCall?.type === 'video')
  const isVideo = pendingCall?.type === 'video'

  // Get preview stream for video calls
  useEffect(() => {
    if (!isVideo) return
    let active = true
    setLoadingCam(true)
    navigator.mediaDevices.getUserMedia({
      video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
      audio: false,
    }).then(s => {
      if (!active) { s.getTracks().forEach(t => t.stop()); return }
      streamRef.current = s
      if (videoRef.current) videoRef.current.srcObject = s
      setLoadingCam(false)
      navigator.mediaDevices.enumerateDevices().then(devs => {
        const cams = devs.filter(d => d.kind === 'videoinput')
        const micsArr = devs.filter(d => d.kind === 'audioinput')
        setDevices({ cameras: cams, mics: micsArr })
        if (!selectedCamera && cams[0]) setSelectedCamera(cams[0].deviceId)
        if (!selectedMic && micsArr[0]) setSelectedMic(micsArr[0].deviceId)
      })
    }).catch(() => { if (active) setLoadingCam(false) })
    return () => {
      active = false
      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [isVideo])

  // Switch camera device in preview
  useEffect(() => {
    if (!isVideo || !selectedCamera || !streamRef.current) return
    navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: selectedCamera } }, audio: false })
      .then(s => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = s
        if (videoRef.current) videoRef.current.srcObject = s
      }).catch(() => {})
  }, [selectedCamera, isVideo])

  const handleConfirm = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    onConfirm(isVideo && !camOff ? selectedCamera : null, selectedMic)
  }

  const handleCancel = () => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    onCancel()
  }

  const avatarGrad = avatarGradient(profile?.nombre, 0)
  const avatarInitials = initials(profile?.nombre)

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[270] flex items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at 30% 20%, rgba(252,101,31,0.08) 0%, transparent 55%), radial-gradient(ellipse at 75% 80%, rgba(139,92,246,0.06) 0%, transparent 50%), #080305' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      {/* Ambient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.06]" style={{ background: 'radial-gradient(circle, #FC651F, transparent 70%)' }} />
        <div className="absolute bottom-[-15%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.04]" style={{ background: 'radial-gradient(circle, #8B5CF6, transparent 70%)' }} />
      </div>

      <motion.div
        className="relative w-full flex flex-col overflow-hidden"
        style={{
          maxWidth: isVideo ? 820 : 440,
          background: 'rgba(12,5,8,0.95)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 40px 120px rgba(0,0,0,0.9), inset 0 1px 0 rgba(255,255,255,0.05)',
          borderRadius: 28,
          margin: '0 16px',
        }}
        initial={{ scale: 0.92, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 24 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(252,101,31,0.15)' }}>
              {isVideo ? <FiVideo size={14} color="#FC651F" /> : <FiMic size={14} color="#FC651F" />}
            </div>
            <div>
              <p className="text-sm font-semibold text-white/90 leading-none">
                {isVideo ? 'Videollamada' : 'Llamada de voz'}
              </p>
              {pendingCall?.channelName && (
                <p className="text-[11px] text-white/35 mt-0.5">#{pendingCall.channelName}</p>
              )}
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="w-7 h-7 rounded-xl flex items-center justify-center transition-colors hover:bg-white/10"
          >
            <FiX size={14} color="rgba(255,255,255,0.4)" />
          </button>
        </div>

        {/* Main content: two-column for video, single for audio */}
        <div className={`flex ${isVideo ? 'flex-row' : 'flex-col'} gap-0`}>

          {/* ── Left: preview ── */}
          {isVideo ? (
            <div className="flex-1 px-5 pb-5 min-w-0">
              {/* Video preview */}
              <div className="relative rounded-2xl overflow-hidden" style={{ aspectRatio: '4/3', background: '#060304' }}>
                {/* Loading */}
                {loadingCam && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 z-10">
                    <div className="w-6 h-6 border-2 border-white/15 border-t-white/50 rounded-full animate-spin" />
                    <span className="text-[11px] text-white/30">Iniciando cámara…</span>
                  </div>
                )}
                {/* Avatar when cam off */}
                {camOff && !loadingCam && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10">
                    <motion.div
                      className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-2xl"
                      style={{ background: avatarGrad }}
                      initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', damping: 20 }}
                    >
                      {avatarInitials}
                    </motion.div>
                    <p className="text-[11px] text-white/30 font-medium">Cámara desactivada</p>
                  </div>
                )}
                <video
                  ref={videoRef}
                  autoPlay playsInline muted
                  className="w-full h-full object-cover"
                  style={{ display: camOff || loadingCam ? 'none' : 'block' }}
                />
                {/* Subtle vignette + name */}
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 35%)' }} />
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <span className="text-xs font-medium text-white/80">{profile?.nombre || 'Tú'}</span>
                </div>
                {/* Camera off badge */}
                {camOff && (
                  <div className="absolute top-3 right-3">
                    <div className="px-2 py-0.5 rounded-lg text-[10px] font-medium" style={{ background: 'rgba(239,68,68,0.25)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)' }}>
                      Sin cámara
                    </div>
                  </div>
                )}
              </div>

              {/* Quick toggles under preview */}
              <div className="flex items-center justify-center gap-3 mt-3">
                <PreToggleBtn
                  active={!micOff}
                  onIcon={<FiMic size={16} />}
                  offIcon={<FiMicOff size={16} />}
                  label={micOff ? 'Mic apagado' : 'Mic activo'}
                  onClick={() => setMicOff(p => !p)}
                />
                <PreToggleBtn
                  active={!camOff}
                  onIcon={<FiVideo size={16} />}
                  offIcon={<FiVideoOff size={16} />}
                  label={camOff ? 'Sin cámara' : 'Cámara activa'}
                  onClick={() => setCamOff(p => !p)}
                />
              </div>
            </div>
          ) : (
            /* Audio-only: centered avatar */
            <div className="flex flex-col items-center gap-4 pt-2 pb-2 px-6">
              <div className="relative">
                <motion.div
                  className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-2xl"
                  style={{ background: avatarGrad }}
                >
                  {avatarInitials}
                </motion.div>
                {/* Ring pulse */}
                {!micOff && (
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ border: '2px solid rgba(34,197,94,0.4)' }}
                    animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white/85">{profile?.nombre || 'Tú'}</p>
                <p className="text-[11px] text-white/35 mt-0.5">Listo para unirte</p>
              </div>
              {/* Audio bars */}
              <div className="flex items-end gap-1" style={{ height: 20 }}>
                {[0.4, 0.6, 1, 0.8, 0.6, 1, 0.4].map((h, i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 rounded-full"
                    style={{ background: micOff ? 'rgba(255,255,255,0.12)' : '#22c55e' }}
                    animate={!micOff
                      ? { height: ['3px', `${h * 18}px`, '3px'] }
                      : { height: '3px' }}
                    transition={{ duration: 0.7 + i * 0.05, repeat: Infinity, delay: i * 0.08 }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Right: settings panel ── */}
          <div
            className={`flex flex-col gap-0 ${isVideo ? 'w-[200px] shrink-0 border-l' : 'border-t'}`}
            style={{ borderColor: 'rgba(255,255,255,0.06)' }}
          >
            {isVideo ? (
              /* Video: compact vertical settings */
              <div className="flex flex-col gap-3 p-4 h-full">
                <p className="text-[10px] uppercase tracking-widest text-white/25 font-semibold">Dispositivos</p>

                {/* Camera selector */}
                <DeviceSelector
                  icon={<FiVideo size={12} />}
                  label="Cámara"
                  value={selectedCamera || ''}
                  options={devices.cameras.map((c, i) => ({ value: c.deviceId, label: c.label || `Cámara ${i + 1}` }))}
                  onChange={setSelectedCamera}
                  disabled={camOff}
                />

                {/* Mic selector */}
                <DeviceSelector
                  icon={<FiMic size={12} />}
                  label="Micrófono"
                  value={selectedMic || ''}
                  options={devices.mics.map((m, i) => ({ value: m.deviceId, label: m.label || `Micrófono ${i + 1}` }))}
                  onChange={setSelectedMic}
                />

                {/* Status chips */}
                <div className="mt-auto space-y-1.5">
                  <StatusChip active={!micOff} label={micOff ? 'Micrófono apagado' : 'Micrófono activo'} />
                  <StatusChip active={!camOff} label={camOff ? 'Cámara apagada' : 'Cámara activa'} />
                </div>
              </div>
            ) : (
              /* Audio: toggles + device pickers */
              <div className="flex flex-col gap-4 p-5">
                <div className="flex items-center justify-center gap-4">
                  <PreToggleBtn
                    active={!micOff}
                    onIcon={<FiMic size={18} />}
                    offIcon={<FiMicOff size={18} />}
                    label={micOff ? 'Mic apagado' : 'Mic activo'}
                    size="lg"
                    onClick={() => setMicOff(p => !p)}
                  />
                </div>

                {devices.mics.length > 1 && (
                  <DeviceSelector
                    icon={<FiMic size={12} />}
                    label="Micrófono"
                    value={selectedMic || ''}
                    options={devices.mics.map((m, i) => ({ value: m.deviceId, label: m.label || `Micrófono ${i + 1}` }))}
                    onChange={setSelectedMic}
                  />
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col gap-2 p-4 mt-auto">
              <motion.button
                onClick={handleConfirm}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #FC651F 0%, #FF8C42 100%)', boxShadow: '0 4px 24px rgba(252,101,31,0.3)' }}
                whileHover={{ scale: 1.02, boxShadow: '0 6px 30px rgba(252,101,31,0.45)' }}
                whileTap={{ scale: 0.97 }}
              >
                {isVideo ? <FiVideo size={14} /> : <FiPhone size={14} />}
                Unirse
              </motion.button>
              <button
                onClick={handleCancel}
                className="w-full py-2.5 rounded-2xl text-xs font-medium transition-colors hover:bg-white/[0.06]"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}

/* ── PreCallSetup sub-components ─────────────────────────────────────────────── */
function PreToggleBtn({ active, onIcon, offIcon, label, onClick, size = 'md' }) {
  const sz = size === 'lg' ? 'w-14 h-14' : 'w-10 h-10'
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 group">
      <motion.div
        className={`${sz} rounded-2xl flex items-center justify-center transition-colors relative`}
        style={{
          background: active ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.18)',
          border: `1px solid ${active ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.3)'}`,
        }}
        whileTap={{ scale: 0.9 }}
      >
        <span style={{ color: active ? 'rgba(255,255,255,0.8)' : '#F87171' }}>
          {active ? onIcon : offIcon}
        </span>
        {!active && (
          <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
        )}
      </motion.div>
      <span className="text-[10px] font-medium" style={{ color: active ? 'rgba(255,255,255,0.4)' : 'rgba(248,113,113,0.7)' }}>
        {label}
      </span>
    </button>
  )
}

function DeviceSelector({ icon, label, value, options, onChange, disabled }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span style={{ color: 'rgba(255,255,255,0.25)' }}>{icon}</span>
        <span className="text-[10px] text-white/30 font-medium">{label}</span>
      </div>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled || options.length <= 1}
          className="w-full rounded-xl text-[11px] font-medium outline-none appearance-none cursor-pointer pr-6 pl-2.5 py-2 transition-colors"
          style={{
            background: disabled ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: disabled ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.7)',
            colorScheme: 'dark',
          }}
        >
          {options.length === 0
            ? <option>Sin dispositivos</option>
            : options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)
          }
        </select>
        <FiSettings size={10} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'rgba(255,255,255,0.2)' }} />
      </div>
    </div>
  )
}

function StatusChip({ active, label }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl"
      style={{
        background: active ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
        border: `1px solid ${active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
      }}
    >
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: active ? '#22c55e' : '#ef4444' }} />
      <span className="text-[10px] font-medium" style={{ color: active ? 'rgba(34,197,94,0.8)' : 'rgba(239,68,68,0.7)' }}>{label}</span>
    </div>
  )
}

/* ── Active call fullscreen ──────────────────────────────────────────────────── */
function ActiveCall({
  callType, participants, localStream, isScreenSharing, screenStream,
  isMuted, isCameraOff, profile, canalId,
  cameras, mics, selectedCamera, selectedMic, onSelectCamera, onSelectMic,
  onToggleMute, onToggleCamera, onToggleScreen, onEndCall, onMinimize,
  reactions, raisedHands, isHandRaised, onSendReaction, onToggleRaiseHand,
  onInvite,
}) {
  const [layoutMode, setLayoutMode] = useState('focus')
  const [pinnedKey, setPinnedKey] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [showParticipants, setShowParticipants] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
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
    const url = `${window.location.origin}/chat?canal=${canalId}`
    navigator.clipboard.writeText(url).then(() => {
      toast.success('Enlace copiado — compártelo para invitar')
    })
  }, [canalId])

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
              onClick={() => { setShowParticipants(p => !p); setShowChat(false) }}
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

          {/* Chat toggle */}
          <Tooltip label="Chat de llamada">
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => { setShowChat(p => !p); setShowParticipants(false) }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] transition-colors"
              style={{
                background: showChat ? 'rgba(252,101,31,0.18)' : 'rgba(255,255,255,0.06)',
                color: showChat ? '#FC651F' : 'rgba(255,255,255,0.5)',
              }}
            >
              <FiMessageCircle size={13} />
            </motion.button>
          </Tooltip>

          {/* Invite */}
          <Tooltip label="Invitar personas">
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] transition-colors"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
            >
              <FiUserPlus size={13} />
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

        {/* In-call chat panel */}
        <AnimatePresence>
          {showChat && canalId && (
            <InCallChatPanel
              canalId={canalId}
              onClose={() => setShowChat(false)}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Invite modal */}
      <AnimatePresence>
        {showInvite && (
          <InviteModal
            canalId={canalId}
            onInvite={onInvite}
            onClose={() => setShowInvite(false)}
          />
        )}
      </AnimatePresence>

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
          <Tooltip label={isCameraOff ? 'Activar cámara' : 'Apagar cámara'}>
            <CtrlBtn
              icon={isCameraOff ? <FiVideoOff size={17} /> : <FiVideo size={17} />}
              danger={isCameraOff}
              onClick={onToggleCamera}
            />
          </Tooltip>
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
export default function CallModal({ callHook, canalId, pendingCall, onConfirmCall, onCancelCall }) {
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
    sendReaction, toggleRaiseHand, sendCallInvite,
  } = callHook

  useEffect(() => { if (callState === 'in-call') setExpanded(true) }, [callState])
  useEffect(() => { if (callState === 'idle') setExpanded(true) }, [callState])

  const showMiniBar = callState === 'in-call' && !expanded
  const showFullscreen = callState === 'in-call' && expanded

  return (
    <AnimatePresence>
      {/* Pre-call setup screen */}
      {pendingCall && callState === 'idle' && (
        <PreCallSetup
          key="pre-setup"
          pendingCall={pendingCall}
          onConfirm={onConfirmCall}
          onCancel={onCancelCall}
          cameras={cameras}
          mics={mics}
        />
      )}

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
          canalId={canalId}
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
          onInvite={sendCallInvite}
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
