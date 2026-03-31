import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { toast } from 'sonner'

const STUN = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }, { urls: 'stun:stun2.l.google.com:19302' }] }

export function useCall(canalId) {
  const { user, profile } = useAuth()
  const [callState, setCallState] = useState('idle')
  const [callType, setCallType] = useState('audio')
  const [incoming, setIncoming] = useState(null)
  const [participants, setParticipants] = useState([])
  const [localStream, setLocalStream] = useState(null)
  const [screenStream, setScreenStream] = useState(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isCameraOff, setIsCameraOff] = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [selectedCamera, setSelectedCamera] = useState(null)
  const [selectedMic, setSelectedMic] = useState(null)
  const [cameras, setCameras] = useState([])
  const [mics, setMics] = useState([])
  const [callPresence, setCallPresence] = useState([])
  const [reactions, setReactions] = useState([])
  const [raisedHands, setRaisedHands] = useState(new Set())
  const [isHandRaised, setIsHandRaised] = useState(false)

  const peersRef = useRef({})
  const signalingRef = useRef(null)
  const globalCallsRef = useRef(null)
  const localStreamRef = useRef(null)
  const screenStreamRef = useRef(null)
  const callStateRef = useRef('idle')
  const channelIdRef = useRef(canalId)
  const presencePingRef = useRef(null)
  const callStartTimeRef = useRef(null)
  const callTypeRef = useRef('audio')
  const callHistoryIdRef = useRef(null)
  const reactionTimersRef = useRef({})

  useEffect(() => { channelIdRef.current = canalId }, [canalId])
  useEffect(() => { callStateRef.current = callState }, [callState])

  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      setCameras(devices.filter(d => d.kind === 'videoinput'))
      setMics(devices.filter(d => d.kind === 'audioinput'))
    } catch {}
  }, [])

  useEffect(() => { refreshDevices() }, [refreshDevices])

  // ── Global call notifications — always active regardless of which page/channel is open ──
  useEffect(() => {
    if (!user) return
    const globalCh = supabase.channel('divergencia_all_calls', { config: { broadcast: { self: false } } })
    globalCallsRef.current = globalCh

    globalCh.on('broadcast', { event: 'global-call-start' }, ({ payload }) => {
      if (callStateRef.current !== 'idle') return
      if (payload.from === user.id) return
      if (!payload.recipients?.includes(user.id)) return
      setIncoming({ from: payload.from, name: payload.name, type: payload.type, canalId: payload.canalId })
      setCallState('ringing')
      _playRingtone()
    })

    globalCh.on('broadcast', { event: 'global-call-end' }, ({ payload }) => {
      if (!payload.recipients?.includes(user.id)) return
      if (callStateRef.current === 'ringing' && payload.canalId === channelIdRef.current) {
        setIncoming(null)
        setCallState('idle')
        _stopRingtone()
        toast('Llamada perdida')
      }
    })

    globalCh.on('broadcast', { event: 'call-invite' }, ({ payload }) => {
      if (payload.to !== user.id) return
      const joinUrl = `${window.location.origin}/chat?canal=${payload.canalId}`
      toast(`📞 ${payload.fromName} te invita a la llamada`, {
        action: { label: 'Unirse', onClick: () => { window.location.href = joinUrl } },
        duration: 20000,
      })
    })

    globalCh.subscribe()
    return () => {
      supabase.removeChannel(globalCh)
      globalCallsRef.current = null
    }
  }, [user])

  useEffect(() => {
    if (!user || !canalId) return

    const ch = supabase.channel(`call_${canalId}`, { config: { broadcast: { self: false } } })

    ch.on('broadcast', { event: 'call-start' }, ({ payload }) => {
      if (callStateRef.current !== 'idle') return
      if (payload.from === user.id) return
      setIncoming({ from: payload.from, name: payload.name, type: payload.type, canalId })
      setCallState('ringing')
      _playRingtone()
    })

    ch.on('broadcast', { event: 'call-end' }, ({ payload }) => {
      if (payload.canalId !== canalId) return
      if (callStateRef.current === 'ringing') {
        setIncoming(null)
        setCallState('idle')
        _stopRingtone()
        toast('Llamada perdida')
      } else if (callStateRef.current === 'in-call') {
        _removePeer(payload.from)
      }
    })

    ch.on('broadcast', { event: 'call-join' }, ({ payload }) => {
      if (payload.from === user.id) return
      if (callStateRef.current !== 'in-call') return
      _initiateCall(payload.from, payload.name)
    })

    ch.on('broadcast', { event: 'offer' }, async ({ payload }) => {
      if (payload.to !== user.id) return
      if (callStateRef.current !== 'in-call') return
      await _handleOffer(payload.from, payload.name, payload.offer)
    })

    ch.on('broadcast', { event: 'answer' }, async ({ payload }) => {
      if (payload.to !== user.id) return
      const peer = peersRef.current[payload.from]
      if (peer?.pc) await peer.pc.setRemoteDescription(new RTCSessionDescription(payload.answer)).catch(() => {})
    })

    ch.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
      if (payload.to !== user.id) return
      const peer = peersRef.current[payload.from]
      if (peer?.pc && payload.candidate) {
        try { await peer.pc.addIceCandidate(new RTCIceCandidate(payload.candidate)) } catch {}
      }
    })

    ch.on('broadcast', { event: 'media-state' }, ({ payload }) => {
      if (payload.from === user.id) return
      setParticipants(prev => prev.map(p =>
        p.userId === payload.from
          ? { ...p, muted: payload.muted ?? p.muted, videoOff: payload.videoOff ?? p.videoOff }
          : p
      ))
    })

    ch.on('broadcast', { event: 'call-presence' }, ({ payload }) => {
      if (payload.from === user.id) return
      if (payload.active) {
        setCallPresence(prev => {
          const exists = prev.find(p => p.userId === payload.from)
          if (exists) return prev.map(p => p.userId === payload.from ? { ...p, name: payload.name } : p)
          return [...prev, { userId: payload.from, name: payload.name, joinedAt: payload.joinedAt }]
        })
      } else {
        setCallPresence(prev => prev.filter(p => p.userId !== payload.from))
      }
    })

    ch.on('broadcast', { event: 'reaction' }, ({ payload }) => {
      if (payload.from === user.id) return
      const id = `${payload.from}_${payload.ts}`
      setReactions(prev => [...prev, { id, emoji: payload.emoji, from: payload.from, name: payload.name, ts: payload.ts }])
      const timer = setTimeout(() => {
        setReactions(prev => prev.filter(r => r.id !== id))
        delete reactionTimersRef.current[id]
      }, 3500)
      reactionTimersRef.current[id] = timer
    })

    ch.on('broadcast', { event: 'raise-hand' }, ({ payload }) => {
      if (payload.from === user.id) return
      setRaisedHands(prev => {
        const next = new Set(prev)
        if (payload.raised) {
          next.add(payload.from)
          toast(`✋ ${payload.name} levantó la mano`)
        } else {
          next.delete(payload.from)
        }
        return next
      })
    })

    ch.subscribe()
    signalingRef.current = ch
    return () => {
      supabase.removeChannel(ch)
      signalingRef.current = null
      if (presencePingRef.current) clearInterval(presencePingRef.current)
      Object.values(reactionTimersRef.current).forEach(clearTimeout)
    }
  }, [user, canalId])

  const _audioCtxRef = useRef(null)
  const _ringtoneIntervalRef = useRef(null)

  function _playRingtone() {
    try {
      if (!_audioCtxRef.current) _audioCtxRef.current = new AudioContext()
      const ctx = _audioCtxRef.current
      let count = 0
      _ringtoneIntervalRef.current = setInterval(() => {
        if (count++ > 30) { _stopRingtone(); return }
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.connect(gain); gain.connect(ctx.destination)
        osc.frequency.value = 880
        osc.type = 'sine'
        gain.gain.setValueAtTime(0.15, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
        osc.start(ctx.currentTime)
        osc.stop(ctx.currentTime + 0.3)
      }, 1200)
    } catch {}
  }

  function _stopRingtone() {
    if (_ringtoneIntervalRef.current) {
      clearInterval(_ringtoneIntervalRef.current)
      _ringtoneIntervalRef.current = null
    }
  }

  function _createPeer(remoteUserId, remoteName) {
    if (peersRef.current[remoteUserId]?.pc) {
      peersRef.current[remoteUserId].pc.close()
    }

    const pc = new RTCPeerConnection(STUN)
    const remoteStream = new MediaStream()

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => {
        pc.addTrack(t, localStreamRef.current)
      })
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(t => {
        pc.addTrack(t, screenStreamRef.current)
      })
    }

    pc.onicecandidate = ({ candidate }) => {
      if (!candidate) return
      signalingRef.current?.send({
        type: 'broadcast', event: 'ice-candidate',
        payload: { to: remoteUserId, from: user.id, candidate },
      })
    }

    pc.ontrack = ({ track, streams }) => {
      const stream = streams[0] || remoteStream
      stream.addTrack(track)
      setParticipants(prev => {
        const existing = prev.find(p => p.userId === remoteUserId)
        if (existing) {
          return prev.map(p => p.userId === remoteUserId ? { ...p, stream } : p)
        }
        return [...prev, { userId: remoteUserId, name: remoteName, stream, muted: false, videoOff: false }]
      })
    }

    pc.onconnectionstatechange = () => {
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
        _removePeer(remoteUserId)
      }
    }

    peersRef.current[remoteUserId] = { pc, stream: remoteStream }
    return pc
  }

  function _removePeer(remoteUserId) {
    const peer = peersRef.current[remoteUserId]
    if (peer?.pc) { peer.pc.close() }
    delete peersRef.current[remoteUserId]
    setParticipants(prev => prev.filter(p => p.userId !== remoteUserId))
    setRaisedHands(prev => { const s = new Set(prev); s.delete(remoteUserId); return s })
  }

  async function _initiateCall(remoteUserId, remoteName) {
    const pc = _createPeer(remoteUserId, remoteName)
    try {
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
      await pc.setLocalDescription(offer)
      signalingRef.current?.send({
        type: 'broadcast', event: 'offer',
        payload: { to: remoteUserId, from: user.id, name: profile?.nombre || user?.email, offer },
      })
    } catch (e) { console.error('offer error', e) }
  }

  async function _renegotiate(remoteUserId) {
    const peer = peersRef.current[remoteUserId]
    if (!peer?.pc) return
    try {
      const offer = await peer.pc.createOffer()
      await peer.pc.setLocalDescription(offer)
      signalingRef.current?.send({
        type: 'broadcast', event: 'offer',
        payload: { to: remoteUserId, from: user.id, name: profile?.nombre || user?.email, offer },
      })
    } catch (e) { console.error('renegotiate error', e) }
  }

  async function _handleOffer(remoteUserId, remoteName, offer) {
    const pc = _createPeer(remoteUserId, remoteName)
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer))
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      signalingRef.current?.send({
        type: 'broadcast', event: 'answer',
        payload: { to: remoteUserId, from: user.id, answer },
      })
    } catch (e) { console.error('answer error', e) }
  }

  async function _getLocalStream(type, cameraId = null, micId = null) {
    const videoConstraints = type === 'video'
      ? (cameraId ? { deviceId: { exact: cameraId }, width: 1280, height: 720 } : { width: 1280, height: 720, facingMode: 'user' })
      : false
    const audioConstraints = micId ? { deviceId: { exact: micId } } : true

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: videoConstraints,
      })
      localStreamRef.current = stream
      setLocalStream(stream)
      await refreshDevices()
      return stream
    } catch (e) {
      if (type === 'video') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false })
          localStreamRef.current = stream
          setLocalStream(stream)
          toast.warning('Cámara no disponible, iniciando llamada de voz')
          return stream
        } catch {}
      }
      toast.error('No se pudo acceder al micrófono')
      return null
    }
  }

  function _broadcastMediaState(muted, videoOff) {
    signalingRef.current?.send({
      type: 'broadcast', event: 'media-state',
      payload: { from: user.id, muted, videoOff },
    })
  }

  function _broadcastPresence(active) {
    signalingRef.current?.send({
      type: 'broadcast', event: 'call-presence',
      payload: { from: user.id, name: profile?.nombre || user?.email, active, joinedAt: new Date().toISOString() },
    })
  }

  function _startPresencePing() {
    if (presencePingRef.current) clearInterval(presencePingRef.current)
    presencePingRef.current = setInterval(() => {
      if (callStateRef.current === 'in-call') _broadcastPresence(true)
    }, 15000)
  }

  function _stopPresencePing() {
    if (presencePingRef.current) { clearInterval(presencePingRef.current); presencePingRef.current = null }
  }

  async function _createCallHistory(type, canalId) {
    callStartTimeRef.current = Date.now()
    callTypeRef.current = type
    const { data } = await supabase.from('historial_llamadas').insert({
      canal_id: canalId,
      iniciador_id: user.id,
      tipo: type,
      participantes: [{ userId: user.id, nombre: profile?.nombre || user?.email, joinedAt: new Date().toISOString() }],
      iniciada_en: new Date().toISOString(),
    }).select('id').single()
    callHistoryIdRef.current = data?.id || null
  }

  async function _finalizeCallHistory() {
    if (!callHistoryIdRef.current || !callStartTimeRef.current) return
    const duracion = Math.floor((Date.now() - callStartTimeRef.current) / 1000)
    const participantes = [
      { userId: user.id, nombre: profile?.nombre || user?.email },
      ...Object.values(peersRef.current).map((_, i) => {
        const p = participants[i]
        return p ? { userId: p.userId, nombre: p.name } : null
      }).filter(Boolean),
    ]
    await supabase.from('historial_llamadas').update({
      duracion_s: duracion,
      participantes,
      finalizada_en: new Date().toISOString(),
    }).eq('id', callHistoryIdRef.current).catch(() => {})
    callHistoryIdRef.current = null
    callStartTimeRef.current = null
  }

  const startCall = useCallback(async (type = 'audio', cameraId = null, micId = null) => {
    if (!user || callStateRef.current !== 'idle') return
    const stream = await _getLocalStream(type, cameraId, micId)
    if (!stream) return

    const hasVideo = stream.getVideoTracks().length > 0
    setCallType(hasVideo ? 'video' : 'audio')
    setCallState('in-call')
    setParticipants([])
    setIsMuted(false)
    setIsCameraOff(!hasVideo)

    const callPayload = { from: user.id, name: profile?.nombre || user?.email, type: hasVideo ? 'video' : 'audio', canalId }
    signalingRef.current?.send({ type: 'broadcast', event: 'call-start', payload: callPayload })

    // Notify canal members globally so they hear the call on any page
    const { data: memberData } = await supabase
      .from('canal_miembros').select('usuario_id').eq('canal_id', canalId).neq('usuario_id', user.id)
    const recipients = memberData?.map(m => m.usuario_id) || []
    if (recipients.length > 0) {
      globalCallsRef.current?.send({
        type: 'broadcast', event: 'global-call-start',
        payload: { ...callPayload, recipients },
      })
    }

    _createCallHistory(hasVideo ? 'video' : 'audio', canalId)
    setTimeout(() => {
      signalingRef.current?.send({
        type: 'broadcast', event: 'call-join',
        payload: { from: user.id, name: profile?.nombre || user?.email, canalId },
      })
      _broadcastPresence(true)
      _startPresencePing()
    }, 600)
  }, [user, profile, canalId])

  const acceptCall = useCallback(async (cameraId = null, micId = null) => {
    if (!incoming) return
    _stopRingtone()
    const stream = await _getLocalStream(incoming.type, cameraId, micId)
    if (!stream) return

    const hasVideo = stream.getVideoTracks().length > 0
    setCallType(hasVideo ? 'video' : 'audio')
    setCallState('in-call')
    setIncoming(null)
    setParticipants([])
    setIsMuted(false)
    setIsCameraOff(!hasVideo)

    signalingRef.current?.send({
      type: 'broadcast', event: 'call-join',
      payload: { from: user.id, name: profile?.nombre || user?.email, canalId },
    })
    _broadcastPresence(true)
    _startPresencePing()
    await _initiateCall(incoming.from, incoming.name)
  }, [incoming, user, profile, canalId])

  const declineCall = useCallback(() => {
    _stopRingtone()
    setIncoming(null)
    setCallState('idle')
  }, [])

  const endCall = useCallback(() => {
    _stopRingtone()
    _stopPresencePing()
    _broadcastPresence(false)
    _finalizeCallHistory()
    setCallPresence([])
    setReactions([])
    setRaisedHands(new Set())
    setIsHandRaised(false)
    Object.values(reactionTimersRef.current).forEach(clearTimeout)
    reactionTimersRef.current = {}
    signalingRef.current?.send({
      type: 'broadcast', event: 'call-end',
      payload: { from: user.id, canalId },
    })
    // Also notify globally so ringing users on other pages stop
    globalCallsRef.current?.send({
      type: 'broadcast', event: 'global-call-end',
      payload: { from: user.id, canalId, recipients: participants.map(p => p.userId) },
    })
    localStreamRef.current?.getTracks().forEach(t => t.stop())
    screenStreamRef.current?.getTracks().forEach(t => t.stop())
    localStreamRef.current = null
    screenStreamRef.current = null
    Object.keys(peersRef.current).forEach(uid => {
      peersRef.current[uid]?.pc?.close()
      delete peersRef.current[uid]
    })
    setLocalStream(null)
    setScreenStream(null)
    setParticipants([])
    setCallState('idle')
    setCallType('audio')
    setIsMuted(false)
    setIsCameraOff(false)
    setIsScreenSharing(false)
  }, [user, canalId])

  const toggleMute = useCallback(() => {
    if (!localStreamRef.current) return
    const newMuted = !isMuted
    localStreamRef.current.getAudioTracks().forEach(t => { t.enabled = !newMuted })
    setIsMuted(newMuted)
    _broadcastMediaState(newMuted, isCameraOff)
  }, [isMuted, isCameraOff])

  const toggleCamera = useCallback(async () => {
    if (!localStreamRef.current) return
    const videoTracks = localStreamRef.current.getVideoTracks()

    if (!isCameraOff && videoTracks.length > 0) {
      // Turn off: disable existing video tracks
      videoTracks.forEach(t => { t.enabled = false })
      setIsCameraOff(true)
      _broadcastMediaState(isMuted, true)
      return
    }

    if (!isCameraOff && videoTracks.length === 0) return // nothing to turn off

    // Turn on: re-enable if tracks exist, otherwise request new camera
    if (videoTracks.length > 0) {
      videoTracks.forEach(t => { t.enabled = true })
      setIsCameraOff(false)
      _broadcastMediaState(isMuted, false)
    } else {
      // Audio call enabling camera for the first time
      try {
        const constraint = selectedCamera ? { deviceId: { exact: selectedCamera }, width: 1280, height: 720 } : { width: 1280, height: 720, facingMode: 'user' }
        const camStream = await navigator.mediaDevices.getUserMedia({ video: constraint })
        const videoTrack = camStream.getVideoTracks()[0]
        if (!videoTrack) return
        localStreamRef.current.addTrack(videoTrack)
        setLocalStream(new MediaStream([...localStreamRef.current.getTracks()]))
        // Add the new track to all existing peer connections and renegotiate
        Object.values(peersRef.current).forEach(({ pc }) => {
          pc.addTrack(videoTrack, localStreamRef.current)
        })
        await Promise.all(Object.keys(peersRef.current).map(uid => _renegotiate(uid)))
        setIsCameraOff(false)
        _broadcastMediaState(isMuted, false)
      } catch {
        toast.error('No se pudo acceder a la cámara')
      }
    }
  }, [isCameraOff, isMuted, selectedCamera])

  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach(t => t.stop())
      screenStreamRef.current = null
      setScreenStream(null)
      setIsScreenSharing(false)

      Object.values(peersRef.current).forEach(({ pc }) => {
        pc.getSenders()
          .filter(s => s.track?.label?.includes('screen') || s.track?.getSettings?.()?.displaySurface)
          .forEach(s => s.track?.stop())
      })
    } else {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: { width: 1920, height: 1080, frameRate: 30, cursor: 'always' },
          audio: { echoCancellation: false, noiseSuppression: false, sampleRate: 44100 },
        })
        screenStreamRef.current = displayStream
        setScreenStream(displayStream)
        setIsScreenSharing(true)

        const screenTrack = displayStream.getVideoTracks()[0]
        const screenAudioTracks = displayStream.getAudioTracks()
        Object.values(peersRef.current).forEach(({ pc }) => {
          pc.addTrack(screenTrack, displayStream)
          screenAudioTracks.forEach(t => pc.addTrack(t, displayStream))
        })
        // Renegotiate with all peers so they receive the new tracks
        await Promise.all(Object.keys(peersRef.current).map(uid => _renegotiate(uid)))

        screenTrack.onended = () => toggleScreenShare()
      } catch (e) {
        if (e.name !== 'NotAllowedError') toast.error('No se pudo compartir pantalla')
      }
    }
  }, [isScreenSharing])

  const switchCamera = useCallback(async (deviceId) => {
    if (!localStreamRef.current) return
    setSelectedCamera(deviceId)
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId }, width: 1280, height: 720 },
        audio: false,
      })
      const newVideoTrack = newStream.getVideoTracks()[0]
      Object.values(peersRef.current).forEach(({ pc }) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video' && !s.track?.label?.includes('screen'))
        if (sender) sender.replaceTrack(newVideoTrack)
      })
      localStreamRef.current.getVideoTracks().forEach(t => { t.stop(); localStreamRef.current.removeTrack(t) })
      localStreamRef.current.addTrack(newVideoTrack)
      setLocalStream(new MediaStream([...localStreamRef.current.getTracks()]))
    } catch { toast.error('No se pudo cambiar cámara') }
  }, [])

  const sendReaction = useCallback((emoji) => {
    const ts = Date.now()
    const id = `local_${ts}`
    setReactions(prev => [...prev, { id, emoji, from: user.id, name: profile?.nombre || 'Tú', ts, isLocal: true }])
    const timer = setTimeout(() => {
      setReactions(prev => prev.filter(r => r.id !== id))
      delete reactionTimersRef.current[id]
    }, 3500)
    reactionTimersRef.current[id] = timer
    signalingRef.current?.send({
      type: 'broadcast', event: 'reaction',
      payload: { from: user.id, name: profile?.nombre || user?.email, emoji, ts },
    })
  }, [user, profile])

  const toggleRaiseHand = useCallback(() => {
    const next = !isHandRaised
    setIsHandRaised(next)
    if (next) {
      setRaisedHands(prev => new Set([...prev, user.id]))
      toast('✋ Mano levantada — todos pueden verte')
    } else {
      setRaisedHands(prev => { const s = new Set(prev); s.delete(user.id); return s })
    }
    signalingRef.current?.send({
      type: 'broadcast', event: 'raise-hand',
      payload: { from: user.id, name: profile?.nombre || user?.email, raised: next },
    })
  }, [isHandRaised, user, profile])

  useEffect(() => {
    return () => {
      if (callStateRef.current !== 'idle') {
        localStreamRef.current?.getTracks().forEach(t => t.stop())
        screenStreamRef.current?.getTracks().forEach(t => t.stop())
        Object.values(peersRef.current).forEach(p => p?.pc?.close())
      }
      _stopRingtone()
      Object.values(reactionTimersRef.current).forEach(clearTimeout)
    }
  }, [])

  const sendCallInvite = useCallback((targetUserId) => {
    if (!user) return
    ;(globalCallsRef.current || signalingRef.current)?.send({
      type: 'broadcast',
      event: 'call-invite',
      payload: {
        to: targetUserId,
        from: user.id,
        fromName: profile?.nombre || user?.email,
        canalId,
        type: callType,
      },
    })
  }, [user, profile, canalId, callType])

  return {
    callState, callType, incoming, canalId,
    localStream, screenStream, participants,
    isMuted, isCameraOff, isScreenSharing,
    cameras, mics, selectedCamera, selectedMic,
    setSelectedMic,
    callPresence,
    reactions, raisedHands, isHandRaised,
    startCall, acceptCall, declineCall, endCall,
    toggleMute, toggleCamera, toggleScreenShare, switchCamera,
    sendReaction, toggleRaiseHand, sendCallInvite,
  }
}
