import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { toast } from 'sonner'

const STUN = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] }

// ─── useCall — WebRTC calls via Supabase Realtime signaling ──────────────────
export function useCall(canalId) {
  const { user, profile } = useAuth()
  const [callState, setCallState] = useState('idle')  // idle | ringing | in-call
  const [callType, setCallType] = useState('audio')   // audio | video
  const [incoming, setIncoming] = useState(null)      // { from, name, type, canalId }
  const [participants, setParticipants] = useState([]) // [{ userId, stream, muted, name }]
  const [localStream, setLocalStream] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [screenStream, setScreenStream] = useState(null)

  const peersRef = useRef({})           // userId -> RTCPeerConnection
  const signalingRef = useRef(null)     // Supabase realtime channel for signaling
  const localStreamRef = useRef(null)
  const screenStreamRef = useRef(null)
  const callStateRef = useRef('idle')
  const channelIdRef = useRef(canalId)

  useEffect(() => { channelIdRef.current = canalId }, [canalId])
  useEffect(() => { callStateRef.current = callState }, [callState])

  // ── Subscribe to signaling channel ────────────────────────────────────────
  useEffect(() => {
    if (!user || !canalId) return

    const ch = supabase.channel(`call_${canalId}`, { config: { broadcast: { self: false } } })

    ch.on('broadcast', { event: 'call-start' }, ({ payload }) => {
      if (callStateRef.current !== 'idle') return
      if (payload.from === user.id) return
      setIncoming({ from: payload.from, name: payload.name, type: payload.type, canalId })
      setCallState('ringing')
    })

    ch.on('broadcast', { event: 'call-end' }, ({ payload }) => {
      if (payload.canalId !== canalId) return
      if (callStateRef.current === 'ringing') {
        setIncoming(null)
        setCallState('idle')
        toast('Llamada perdida')
      } else if (callStateRef.current === 'in-call') {
        _removePeer(payload.from)
      }
    })

    ch.on('broadcast', { event: 'call-join' }, ({ payload }) => {
      if (payload.from === user.id) return
      if (callStateRef.current !== 'in-call') return
      // Initiate connection to this new peer
      _initiateCall(payload.from, payload.name, false)
    })

    ch.on('broadcast', { event: 'offer' }, async ({ payload }) => {
      if (payload.to !== user.id) return
      if (callStateRef.current !== 'in-call') return
      await _handleOffer(payload.from, payload.name, payload.offer)
    })

    ch.on('broadcast', { event: 'answer' }, async ({ payload }) => {
      if (payload.to !== user.id) return
      const pc = peersRef.current[payload.from]
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(payload.answer))
    })

    ch.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
      if (payload.to !== user.id) return
      const pc = peersRef.current[payload.from]
      if (pc && payload.candidate) {
        try { await pc.addIceCandidate(new RTCIceCandidate(payload.candidate)) } catch {}
      }
    })

    ch.subscribe()
    signalingRef.current = ch

    return () => {
      supabase.removeChannel(ch)
      signalingRef.current = null
    }
  }, [user, canalId])

  // ── Create peer connection ─────────────────────────────────────────────────
  function _createPeer(remoteUserId, remoteName) {
    const pc = new RTCPeerConnection(STUN)

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current))
    }

    // ICE candidates
    pc.onicecandidate = ({ candidate }) => {
      if (!candidate) return
      signalingRef.current?.send({
        type: 'broadcast',
        event: 'ice-candidate',
        payload: { to: remoteUserId, from: user.id, candidate },
      })
    }

    // Remote stream
    const remoteStream = new MediaStream()
    pc.ontrack = ({ track }) => {
      remoteStream.addTrack(track)
      setParticipants(prev => {
        const existing = prev.find(p => p.userId === remoteUserId)
        if (existing) return prev.map(p => p.userId === remoteUserId ? { ...p, stream: remoteStream } : p)
        return [...prev, { userId: remoteUserId, name: remoteName, stream: remoteStream, muted: false }]
      })
    }

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        _removePeer(remoteUserId)
      }
    }

    peersRef.current[remoteUserId] = pc
    return pc
  }

  function _removePeer(remoteUserId) {
    const pc = peersRef.current[remoteUserId]
    if (pc) { pc.close(); delete peersRef.current[remoteUserId] }
    setParticipants(prev => {
      const next = prev.filter(p => p.userId !== remoteUserId)
      // If no participants remain (just us left), end call
      if (next.length === 0 && callStateRef.current === 'in-call') {
        // let UI decide — but clean up
      }
      return next
    })
  }

  async function _initiateCall(remoteUserId, remoteName) {
    const pc = _createPeer(remoteUserId, remoteName)
    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
    await pc.setLocalDescription(offer)
    signalingRef.current?.send({
      type: 'broadcast',
      event: 'offer',
      payload: { to: remoteUserId, from: user.id, name: profile?.nombre || user.email, offer },
    })
  }

  async function _handleOffer(remoteUserId, remoteName, offer) {
    const pc = _createPeer(remoteUserId, remoteName)
    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    signalingRef.current?.send({
      type: 'broadcast',
      event: 'answer',
      payload: { to: remoteUserId, from: user.id, answer },
    })
  }

  // ── Get local media ────────────────────────────────────────────────────────
  async function _getLocalStream(type) {
    const constraints = type === 'video'
      ? { audio: true, video: { width: 1280, height: 720, facingMode: 'user' } }
      : { audio: true, video: false }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      localStreamRef.current = stream
      setLocalStream(stream)
      return stream
    } catch (e) {
      toast.error(type === 'video' ? 'No se pudo acceder a la cámara/micrófono' : 'No se pudo acceder al micrófono')
      return null
    }
  }

  // ── Start a call ───────────────────────────────────────────────────────────
  const startCall = useCallback(async (type = 'audio') => {
    if (!user || callStateRef.current !== 'idle') return
    const stream = await _getLocalStream(type)
    if (!stream) return

    setCallType(type)
    setCallState('in-call')
    setParticipants([])

    // Announce to channel
    signalingRef.current?.send({
      type: 'broadcast',
      event: 'call-start',
      payload: { from: user.id, name: profile?.nombre || user.email, type, canalId },
    })

    // After brief delay, announce join for anyone already in the call
    setTimeout(() => {
      signalingRef.current?.send({
        type: 'broadcast',
        event: 'call-join',
        payload: { from: user.id, name: profile?.nombre || user.email, canalId },
      })
    }, 500)
  }, [user, profile, canalId])

  // ── Accept incoming call ───────────────────────────────────────────────────
  const acceptCall = useCallback(async () => {
    if (!incoming) return
    const stream = await _getLocalStream(incoming.type)
    if (!stream) return

    setCallType(incoming.type)
    setCallState('in-call')
    setIncoming(null)
    setParticipants([])

    // Announce we joined
    signalingRef.current?.send({
      type: 'broadcast',
      event: 'call-join',
      payload: { from: user.id, name: profile?.nombre || user.email, canalId },
    })

    // Also send offer to the person who called us
    await _initiateCall(incoming.from, incoming.name)
  }, [incoming, user, profile, canalId])

  // ── Decline incoming call ──────────────────────────────────────────────────
  const declineCall = useCallback(() => {
    setIncoming(null)
    setCallState('idle')
  }, [])

  // ── End call ───────────────────────────────────────────────────────────────
  const endCall = useCallback(() => {
    // Notify others
    signalingRef.current?.send({
      type: 'broadcast',
      event: 'call-end',
      payload: { from: user.id, canalId },
    })

    // Stop all tracks
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    screenStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    screenStreamRef.current = null

    // Close all peer connections
    Object.values(peersRef.current).forEach(pc => pc.close())
    peersRef.current = {}

    setLocalStream(null)
    setScreenStream(null)
    setParticipants([])
    setCallState('idle')
    setCallType('audio')
    setIsMuted(false)
    setIsCameraOff(false)
    setIsScreenSharing(false)
  }, [user, canalId])

  // ── Toggle mute ────────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return
    const audioTracks = localStreamRef.current.getAudioTracks()
    const newMuted = !isMuted
    audioTracks.forEach(t => { t.enabled = !newMuted })
    setIsMuted(newMuted)
  }, [isMuted])

  // ── Toggle camera ──────────────────────────────────────────────────────────
  const toggleCamera = useCallback(() => {
    if (!localStreamRef.current) return
    const videoTracks = localStreamRef.current.getVideoTracks()
    const newOff = !isCameraOff
    videoTracks.forEach(t => { t.enabled = !newOff })
    setIsCameraOff(newOff)
  }, [isCameraOff])

  // ── Toggle screen share ────────────────────────────────────────────────────
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      // Stop screen share, restore camera
      screenStreamRef.current?.getTracks().forEach(t => t.stop())
      screenStreamRef.current = null
      setScreenStream(null)
      setIsScreenSharing(false)

      // Restore camera track in all peer connections
      const videoTrack = localStreamRef.current?.getVideoTracks()[0]
      if (videoTrack) {
        Object.values(peersRef.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video')
          if (sender) sender.replaceTrack(videoTrack)
        })
      }
    } else {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false,
        })
        screenStreamRef.current = displayStream
        setScreenStream(displayStream)
        setIsScreenSharing(true)

        const screenTrack = displayStream.getVideoTracks()[0]
        // Replace video track in all peer connections
        Object.values(peersRef.current).forEach(pc => {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video')
          if (sender) sender.replaceTrack(screenTrack)
        })

        // Handle user stopping screen share via browser UI
        screenTrack.onended = () => toggleScreenShare()
      } catch (e) {
        if (e.name !== 'NotAllowedError') toast.error('No se pudo compartir pantalla')
      }
    }
  }, [isScreenSharing])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (callStateRef.current !== 'idle') {
        localStreamRef.current?.getTracks().forEach(t => t.stop())
        screenStreamRef.current?.getTracks().forEach(t => t.stop())
        Object.values(peersRef.current).forEach(pc => pc.close())
      }
    }
  }, [])

  return {
    callState, callType, incoming,
    localStream, participants,
    isMuted, isCameraOff, isScreenSharing, screenStream,
    startCall, acceptCall, declineCall, endCall,
    toggleMute, toggleCamera, toggleScreenShare,
  }
}
