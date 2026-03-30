import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiX, FiSend, FiZap, FiCheck,
  FiRadio, FiAlertCircle, FiCalendar, FiClock, FiAward,
  FiBell, FiBookOpen, FiHeart, FiEdit3, FiEye,
  FiUsers, FiGlobe, FiLayers, FiMail, FiSearch,
  FiChevronDown, FiChevronUp,
} from 'react-icons/fi'
import { toast } from 'sonner'
import { generateBroadcastMessages } from '../../lib/gemini'
import { broadcastNotification } from '../../hooks/useNotifications'
import { supabase } from '../../lib/supabase'

// ─── Type definitions ──────────────────────────────────────────────────────────
const TYPES = [
  {
    value: 'admin_broadcast',
    label: 'Anuncio',
    emoji: '📢',
    icon: FiRadio,
    color: '#FC651F',
    desc: 'Comunicado oficial del semillero',
    templates: [
      'Reunión del semillero el viernes a las 3pm en el laboratorio.',
      'Nueva convocatoria abierta — compártanla con sus redes.',
      'Se actualiza el cronograma. Revisen el Roadmap en la plataforma.',
      'Recordatorio: el reporte mensual debe entregarse esta semana.',
      'Tenemos acceso a nuevos recursos de cómputo — revisen la plataforma.',
    ],
  },
  {
    value: 'evento_proximo',
    label: 'Evento',
    emoji: '📅',
    icon: FiCalendar,
    color: '#00D1FF',
    desc: 'Actividades, talleres y presentaciones',
    templates: [
      'Presentación de proyectos el próximo martes a las 2pm. ¡Todos invitados!',
      'Taller de escritura científica — inscríbanse antes del jueves.',
      'Evento de networking con empresas el sábado. Asistan con portafolio.',
      'Webinar sobre LLMs esta semana — link en el chat del semillero.',
      'Ponencia en congreso nacional: ¡apoyen a nuestros representantes!',
    ],
  },
  {
    value: 'recordatorio',
    label: 'Recordatorio',
    emoji: '⏰',
    icon: FiClock,
    color: '#F59E0B',
    desc: 'Fechas límite y tareas pendientes',
    templates: [
      'Recuerden enviar sus avances antes del viernes. ¡El tiempo vuela!',
      'Plazo de entrega de informes: mañana a las 11:59pm.',
      'Actualicen el estado de sus tareas en la plataforma hoy.',
      'Queda 1 semana para la entrega del sprint — revisen el Kanban.',
      'Deben registrar sus horas de investigación antes de cerrar el mes.',
    ],
  },
  {
    value: 'alerta',
    label: 'Alerta',
    emoji: '🚨',
    icon: FiAlertCircle,
    color: '#EF4444',
    desc: 'Avisos urgentes e importantes',
    templates: [
      'Cambio de sala para la reunión de hoy: ahora es el Lab 204.',
      'Se suspende la actividad de mañana por inconvenientes externos.',
      'El servidor de pruebas estará en mantenimiento de 10pm a 2am.',
      'Atención: el deadline se adelantó. Nueva fecha: este miércoles.',
      'Verificación de accesos necesaria — ingresen a la plataforma hoy.',
    ],
  },
  {
    value: 'sugerencia',
    label: 'Sugerencia',
    emoji: '💡',
    icon: FiBookOpen,
    color: '#8B5CF6',
    desc: 'Recursos de aprendizaje y mejoras',
    templates: [
      'Lean el paper "Attention is All You Need" — clave para sus proyectos.',
      'Revisen las nuevas ideas en el banco — ¡hay propuestas interesantes!',
      'Registren sus avances semanales: mejora la visibilidad del equipo.',
      'Exploren el módulo de Aprendizaje — hay rutas nuevas disponibles.',
      'Tip: usen ATHENIA para conectar sus ideas con literatura académica.',
    ],
  },
  {
    value: 'reconocimiento',
    label: 'Reconocimiento',
    emoji: '🏆',
    icon: FiAward,
    color: '#F59E0B',
    desc: 'Celebrar logros del equipo',
    templates: [
      '¡Felicitaciones al equipo del Proyecto Alpha por su avance esta semana!',
      '¡Destacado desempeño! Superamos la meta de avances del mes. 🎯',
      'Gracias a todos por su dedicación y compromiso con el semillero.',
      '¡Nuestro trabajo fue citado en una publicación internacional!',
      '¡Nuevo récord de actividad en la plataforma — sigamos así!',
    ],
  },
  {
    value: 'voto_recordatorio',
    label: 'Votar',
    emoji: '🗳️',
    icon: FiBell,
    color: '#8B5CF6',
    desc: 'Activar participación en ideas',
    templates: [
      'Hay ideas en votación — ¡tu voto importa! Entra al banco de ideas.',
      'Quedan 24 horas para votar en las propuestas activas. ¡No te quedes fuera!',
      'Nueva idea publicada — ¡léela y vota en el banco de ideas!',
    ],
  },
  {
    value: 'bienvenida',
    label: 'Bienvenida',
    emoji: '👋',
    icon: FiHeart,
    color: '#22c55e',
    desc: 'Recibir nuevos miembros',
    templates: [
      '¡Bienvenido/a a DivergencIA! Explora los proyectos y únete al equipo. 🚀',
      '¡Nos alegra tenerte aquí! Completa tu perfil para empezar tu aventura.',
      'Un nuevo investigador se une al semillero — ¡Dales la bienvenida!',
      'Inicia completando tu perfil y uniéndote a un proyecto activo. ¡Éxito!',
    ],
  },
]

const STEPS = ['Tipo', 'Mensaje', 'Destinatarios', 'Enviar']

// ─── Target option card ────────────────────────────────────────────────────────
function TargetCard({ icon: Icon, label, desc, color, active, onClick }) {
  return (
    <motion.button
      onClick={onClick}
      className="flex items-start gap-3 p-3 rounded-xl text-left transition-all border w-full"
      style={active
        ? { background: `${color}12`, borderColor: `${color}35`, boxShadow: `0 0 12px ${color}10` }
        : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }
      }
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: active ? `${color}20` : 'rgba(255,255,255,0.05)' }}>
        <Icon size={15} style={{ color: active ? color : 'rgba(255,255,255,0.4)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold" style={{ color: active ? color : 'rgba(255,255,255,0.65)' }}>{label}</p>
        <p className="text-[10px] text-white/30 leading-tight mt-0.5">{desc}</p>
      </div>
      {active && (
        <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-1" style={{ background: color }}>
          <FiCheck size={9} className="text-white" />
        </div>
      )}
    </motion.button>
  )
}

export default function BroadcastPanel({ onClose }) {
  const [step, setStep] = useState(0)
  const [selectedType, setSelectedType] = useState(null)
  const [message, setMessage] = useState('')
  const [aiContext, setAiContext] = useState('')
  const [aiSuggestions, setAiSuggestions] = useState([])
  const [generatingAI, setGeneratingAI] = useState(false)
  const [sending, setSending] = useState(false)

  // Target state
  const [targetType, setTargetType] = useState('todos') // 'todos' | 'nodo' | 'members'
  const [selectedNodo, setSelectedNodo] = useState(null)
  const [selectedMembers, setSelectedMembers] = useState(new Set())
  const [sendEmail, setSendEmail] = useState(true)

  // Data for selectors
  const [nodos, setNodos] = useState([])
  const [members, setMembers] = useState([])
  const [memberSearch, setMemberSearch] = useState('')
  const [loadingData, setLoadingData] = useState(false)

  const typeMeta = TYPES.find(t => t.value === selectedType)

  // Load nodos + members when reaching step 2
  useEffect(() => {
    if (step !== 2) return
    setLoadingData(true)
    Promise.all([
      supabase.from('canales').select('id, nombre, descripcion, nodo_tipo').eq('tipo', 'nodo').order('nodo_tipo, nombre'),
      supabase.from('usuarios').select('id, nombre, correo, area_investigacion, foto_url').eq('activo', true).order('nombre'),
    ]).then(([{ data: c }, { data: u }]) => {
      setNodos(c || [])
      setMembers(u || [])
      setLoadingData(false)
    })
  }, [step])

  // ── AI generation ─────────────────────────────────────────────────────────
  const handleGenerateAI = useCallback(async () => {
    if (!selectedType) return
    setGeneratingAI(true)
    setAiSuggestions([])
    try {
      const suggestions = await generateBroadcastMessages(selectedType, aiContext, 3)
      if (suggestions.length > 0) {
        setAiSuggestions(suggestions)
      } else {
        toast.error('No se pudieron generar sugerencias')
      }
    } catch {
      toast.error('Error al conectar con la IA')
    }
    setGeneratingAI(false)
  }, [selectedType, aiContext])

  // ── Build target object ───────────────────────────────────────────────────
  const buildTarget = () => {
    if (targetType === 'nodo' && selectedNodo) return { type: 'nodo', nodoId: selectedNodo }
    if (targetType === 'members' && selectedMembers.size > 0) return { type: 'members', memberIds: [...selectedMembers] }
    return { type: 'todos' }
  }

  const targetValid = () => {
    if (targetType === 'todos') return true
    if (targetType === 'nodo') return !!selectedNodo
    if (targetType === 'members') return selectedMembers.size > 0
    return false
  }

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!message.trim() || !selectedType) return
    setSending(true)
    const result = await broadcastNotification(selectedType, message.trim(), buildTarget(), sendEmail)
    setSending(false)
    if (!result?.error) onClose()
  }

  // ── Step nav ──────────────────────────────────────────────────────────────
  const canNext = step === 0 ? !!selectedType
    : step === 1 ? !!message.trim()
    : step === 2 ? targetValid()
    : true

  const filteredMembers = members.filter(m =>
    !memberSearch || m.nombre.toLowerCase().includes(memberSearch.toLowerCase())
  )

  // ── Target summary for preview ────────────────────────────────────────────
  const targetSummary = () => {
    if (targetType === 'todos') return 'todos los miembros activos'
    if (targetType === 'nodo') {
      const n = nodos.find(n => n.id === selectedNodo)
      if (!n) return 'canal seleccionado'
      if (n.nodo_tipo === 'proyecto') return `proyecto "${n.nombre}"`
      if (n.nodo_tipo === 'grupo') return `grupo "${n.nombre}"`
      return `nodo "${n.nombre}"`
    }
    return `${selectedMembers.size} miembro${selectedMembers.size !== 1 ? 's' : ''} seleccionado${selectedMembers.size !== 1 ? 's' : ''}`
  }

  return (
    <motion.div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(14,6,9,0.98)',
        border: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(24px)',
      }}
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--c-primary), var(--c-secondary))' }}
          >
            <FiRadio size={14} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Broadcast</h3>
            <p className="text-[10px] text-white/30">Solo admins y directora</p>
          </div>
        </div>
        <button onClick={onClose} className="text-white/30 hover:text-white transition-colors p-1">
          <FiX size={16} />
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 px-5 pt-4 pb-2 overflow-x-auto">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center shrink-0">
            <button
              onClick={() => i < step && setStep(i)}
              className="flex items-center gap-1.5 transition-all"
              disabled={i > step}
            >
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold transition-all"
                style={
                  i < step
                    ? { background: '#22c55e', color: 'white' }
                    : i === step
                    ? { background: typeMeta?.color || 'var(--c-primary)', color: 'white' }
                    : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)' }
                }
              >
                {i < step ? <FiCheck size={9} /> : i + 1}
              </div>
              <span
                className="text-[11px] font-medium"
                style={{ color: i === step ? 'white' : i < step ? '#22c55e' : 'rgba(255,255,255,0.25)' }}
              >
                {label}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div className="w-6 h-px mx-2" style={{ background: i < step ? '#22c55e30' : 'rgba(255,255,255,0.06)' }} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="px-5 pb-5">
        <AnimatePresence mode="wait">

          {/* ── STEP 0: Tipo ────────────────────────────────────────────── */}
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }} className="space-y-3 mt-4">
              <p className="text-[11px] text-white/40">Selecciona el tipo de notificación:</p>
              <div className="grid grid-cols-2 gap-2">
                {TYPES.map(t => {
                  const isActive = selectedType === t.value
                  return (
                    <motion.button
                      key={t.value}
                      onClick={() => setSelectedType(t.value)}
                      className="flex items-start gap-3 p-3 rounded-xl text-left transition-all border"
                      style={isActive
                        ? { background: `${t.color}15`, borderColor: `${t.color}40`, boxShadow: `0 0 16px ${t.color}15` }
                        : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }
                      }
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span className="text-xl leading-none mt-0.5">{t.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold" style={{ color: isActive ? t.color : 'rgba(255,255,255,0.7)' }}>{t.label}</p>
                        <p className="text-[10px] text-white/30 leading-tight mt-0.5">{t.desc}</p>
                      </div>
                      {isActive && (
                        <div className="w-4 h-4 rounded-full flex items-center justify-center shrink-0" style={{ background: t.color }}>
                          <FiCheck size={9} className="text-white" />
                        </div>
                      )}
                    </motion.button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* ── STEP 1: Mensaje ─────────────────────────────────────────── */}
          {step === 1 && typeMeta && (
            <motion.div key="step1" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }} className="space-y-4 mt-4">
              {/* Templates */}
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <span style={{ color: typeMeta.color }}>{typeMeta.emoji}</span>
                  Plantillas para "{typeMeta.label}"
                </p>
                <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                  {typeMeta.templates.map((tpl, i) => (
                    <motion.button
                      key={i}
                      onClick={() => setMessage(tpl)}
                      className="text-left px-3 py-2 rounded-lg text-xs border transition-all"
                      style={message === tpl
                        ? { background: `${typeMeta.color}12`, borderColor: `${typeMeta.color}30`, color: 'rgba(255,255,255,0.85)' }
                        : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }
                      }
                      whileHover={{ backgroundColor: `${typeMeta.color}08` }}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      {tpl}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* AI Generator */}
              <div className="rounded-xl p-3 space-y-2" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #8B5CF6, #00D1FF)' }}>
                    <FiZap size={10} className="text-white" />
                  </div>
                  <p className="text-[11px] font-semibold text-white/70">Generar con IA</p>
                </div>
                <input
                  value={aiContext}
                  onChange={e => setAiContext(e.target.value)}
                  placeholder="Describe el contexto (ej: reunión el viernes, nuevo recurso de NLP...)"
                  className="w-full px-3 py-2 rounded-lg text-xs text-white placeholder-white/20 bg-white/[0.04] border border-white/[0.08] outline-none focus:border-[#8B5CF6]/40 transition-colors"
                />
                <button
                  onClick={handleGenerateAI}
                  disabled={generatingAI}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #8B5CF6, #00D1FF)' }}
                >
                  {generatingAI ? (
                    <><motion.div className="w-3 h-3 border border-white/40 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />Generando...</>
                  ) : (
                    <><FiZap size={11} />{aiSuggestions.length > 0 ? 'Regenerar' : 'Generar sugerencias'}</>
                  )}
                </button>
                <AnimatePresence>
                  {aiSuggestions.length > 0 && (
                    <motion.div className="flex flex-col gap-1 mt-1" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                      {aiSuggestions.map((s, i) => (
                        <motion.button
                          key={i}
                          onClick={() => setMessage(s)}
                          className="text-left px-3 py-2 rounded-lg text-xs border transition-all"
                          style={message === s
                            ? { background: 'rgba(139,92,246,0.15)', borderColor: 'rgba(139,92,246,0.40)', color: 'rgba(255,255,255,0.9)' }
                            : { background: 'rgba(139,92,246,0.06)', borderColor: 'rgba(139,92,246,0.15)', color: 'rgba(255,255,255,0.6)' }
                          }
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.08 }}
                        >
                          <span className="text-[9px] font-bold uppercase tracking-wider mr-2" style={{ color: '#8B5CF6' }}>IA</span>
                          {s}
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Custom textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] text-white/30 uppercase tracking-wider flex items-center gap-1.5">
                    <FiEdit3 size={10} /> Editar mensaje
                  </p>
                  <span className="text-[10px]" style={{ color: message.length > 120 ? '#EF4444' : 'rgba(255,255,255,0.25)' }}>
                    {message.length}/120
                  </span>
                </div>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="Escribe o edita el mensaje aquí..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white/80 placeholder-white/20 resize-none focus:outline-none transition-colors"
                  style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${message.length > 120 ? '#EF4444' : 'rgba(255,255,255,0.08)'}` }}
                />
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: Destinatarios ────────────────────────────────────── */}
          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }} className="space-y-4 mt-4">
              <p className="text-[11px] text-white/40">¿A quiénes enviar esta notificación?</p>

              {/* Target type selector */}
              <div className="space-y-2">
                <TargetCard
                  icon={FiGlobe}
                  label="Todos los miembros"
                  desc="Todos los integrantes activos del semillero"
                  color="#FC651F"
                  active={targetType === 'todos'}
                  onClick={() => setTargetType('todos')}
                />
                <TargetCard
                  icon={FiLayers}
                  label="Nodo específico"
                  desc="Solo los miembros de un canal/proyecto concreto"
                  color="#00D1FF"
                  active={targetType === 'nodo'}
                  onClick={() => setTargetType('nodo')}
                />
                <TargetCard
                  icon={FiUsers}
                  label="Miembros específicos"
                  desc="Elige individualmente a quiénes enviar"
                  color="#8B5CF6"
                  active={targetType === 'members'}
                  onClick={() => setTargetType('members')}
                />
              </div>

              {/* Nodo selector */}
              <AnimatePresence>
                {targetType === 'nodo' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="rounded-xl border border-white/[0.08] overflow-hidden">
                      <p className="text-[10px] text-white/30 uppercase tracking-wider px-3 py-2 border-b border-white/[0.06]">Seleccionar proyecto o nodo</p>
                      {loadingData ? (
                        <div className="flex items-center justify-center py-6">
                          <div className="w-4 h-4 border border-white/10 border-t-[#00D1FF] rounded-full animate-spin" />
                        </div>
                      ) : (
                        <div className="max-h-48 overflow-y-auto">
                          {nodos.length === 0 ? (
                            <p className="text-xs text-white/20 text-center py-4">No hay canales disponibles</p>
                          ) : (() => {
                            const proyectos = nodos.filter(n => n.nodo_tipo === 'proyecto')
                            const investigacion = nodos.filter(n => n.nodo_tipo === 'investigacion')
                            const grupos = nodos.filter(n => n.nodo_tipo === 'grupo')
                            const renderItem = (n) => (
                              <button
                                key={n.id}
                                onClick={() => setSelectedNodo(n.id)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors border-b border-white/[0.04] last:border-0"
                                style={{ background: selectedNodo === n.id ? 'rgba(0,209,255,0.06)' : 'transparent' }}
                              >
                                <div className="w-6 h-6 rounded flex items-center justify-center shrink-0" style={{ background: selectedNodo === n.id ? 'rgba(0,209,255,0.15)' : 'rgba(255,255,255,0.05)' }}>
                                  <FiLayers size={11} style={{ color: selectedNodo === n.id ? '#00D1FF' : 'rgba(255,255,255,0.3)' }} />
                                </div>
                                <span className="text-xs" style={{ color: selectedNodo === n.id ? '#00D1FF' : 'rgba(255,255,255,0.55)' }}>{n.nombre}</span>
                                {selectedNodo === n.id && <FiCheck size={11} className="ml-auto shrink-0" style={{ color: '#00D1FF' }} />}
                              </button>
                            )
                            return (
                              <>
                                {proyectos.length > 0 && (
                                  <>
                                    <p className="text-[9px] text-white/20 uppercase tracking-widest px-3 pt-2 pb-1">📁 Proyectos</p>
                                    {proyectos.map(renderItem)}
                                  </>
                                )}
                                {investigacion.length > 0 && (
                                  <>
                                    <p className="text-[9px] text-white/20 uppercase tracking-widest px-3 pt-2 pb-1">🔬 Nodos de Investigación</p>
                                    {investigacion.map(renderItem)}
                                  </>
                                )}
                                {grupos.length > 0 && (
                                  <>
                                    <p className="text-[9px] text-white/20 uppercase tracking-widest px-3 pt-2 pb-1">👥 Grupos de Usuarios</p>
                                    {grupos.map(renderItem)}
                                  </>
                                )}
                              </>
                            )
                          })()}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Members selector */}
              <AnimatePresence>
                {targetType === 'members' && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="rounded-xl border border-white/[0.08] overflow-hidden">
                      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06]">
                        <FiSearch size={11} className="text-white/25 shrink-0" />
                        <input
                          value={memberSearch}
                          onChange={e => setMemberSearch(e.target.value)}
                          placeholder="Buscar miembro..."
                          className="flex-1 text-xs bg-transparent text-white/70 placeholder-white/20 outline-none"
                        />
                        {selectedMembers.size > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'rgba(139,92,246,0.2)', color: '#8B5CF6' }}>
                            {selectedMembers.size} sel.
                          </span>
                        )}
                      </div>
                      {loadingData ? (
                        <div className="flex items-center justify-center py-6">
                          <div className="w-4 h-4 border border-white/10 border-t-[#8B5CF6] rounded-full animate-spin" />
                        </div>
                      ) : (
                        <div className="max-h-44 overflow-y-auto">
                          {filteredMembers.map(m => {
                            const sel = selectedMembers.has(m.id)
                            return (
                              <button
                                key={m.id}
                                onClick={() => {
                                  setSelectedMembers(prev => {
                                    const next = new Set(prev)
                                    sel ? next.delete(m.id) : next.add(m.id)
                                    return next
                                  })
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors border-b border-white/[0.04] last:border-0"
                                style={{ background: sel ? 'rgba(139,92,246,0.06)' : 'transparent' }}
                              >
                                <div
                                  className="w-5 h-5 rounded shrink-0 flex items-center justify-center border"
                                  style={sel ? { background: '#8B5CF6', borderColor: '#8B5CF6' } : { background: 'transparent', borderColor: 'rgba(255,255,255,0.15)' }}
                                >
                                  {sel && <FiCheck size={9} className="text-white" />}
                                </div>
                                <span className="text-xs" style={{ color: sel ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.45)' }}>{m.nombre}</span>
                                {m.area_investigacion && (
                                  <span className="text-[9px] text-white/20 ml-auto">{m.area_investigacion}</span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email toggle */}
              <div
                className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer"
                style={{ background: sendEmail ? 'rgba(252,101,31,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${sendEmail ? 'rgba(252,101,31,0.2)' : 'rgba(255,255,255,0.06)'}` }}
                onClick={() => setSendEmail(v => !v)}
              >
                <div className="flex items-center gap-2.5">
                  <FiMail size={14} style={{ color: sendEmail ? 'var(--c-primary)' : 'rgba(255,255,255,0.3)' }} />
                  <div>
                    <p className="text-xs font-medium" style={{ color: sendEmail ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.45)' }}>Enviar también por email</p>
                    <p className="text-[10px] text-white/25">Notificación al correo de cada destinatario</p>
                  </div>
                </div>
                <div
                  className="w-8 h-4 rounded-full relative transition-all"
                  style={{ background: sendEmail ? 'var(--c-primary)' : 'rgba(255,255,255,0.1)' }}
                >
                  <motion.div
                    className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow"
                    animate={{ left: sendEmail ? '18px' : '2px' }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: Preview ──────────────────────────────────────────── */}
          {step === 3 && typeMeta && (
            <motion.div key="step3" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.15 }} className="space-y-4 mt-4">
              <p className="text-[11px] text-white/40 flex items-center gap-1.5">
                <FiEye size={11} /> Vista previa de lo que recibirán:
              </p>

              {/* Preview card */}
              <motion.div
                className="rounded-xl p-4"
                style={{ background: `${typeMeta.color}08`, border: `1px solid ${typeMeta.color}20` }}
                initial={{ scale: 0.96 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${typeMeta.color}20` }}>
                    <typeMeta.icon size={16} style={{ color: typeMeta.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold" style={{ color: typeMeta.color }}>
                        {typeMeta.emoji} {typeMeta.label}
                      </span>
                      <span className="text-[9px] text-white/25 px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.05)' }}>Ahora</span>
                    </div>
                    <p className="text-sm text-white/80 leading-relaxed">{message}</p>
                  </div>
                  <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: typeMeta.color }} />
                </div>
              </motion.div>

              {/* Summary */}
              <div className="space-y-2">
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-white/40"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <FiRadio size={12} className="shrink-0" style={{ color: 'var(--c-accent)' }} />
                  Se enviará a <strong className="text-white/60 mx-1">{targetSummary()}</strong>
                </div>
                {sendEmail && (
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs text-white/40"
                    style={{ background: 'rgba(252,101,31,0.06)', border: '1px solid rgba(252,101,31,0.15)' }}
                  >
                    <FiMail size={12} className="shrink-0" style={{ color: 'var(--c-primary)' }} />
                    También se enviará un <strong className="text-white/60 mx-1">email</strong> a cada destinatario
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/[0.06]">
          <button
            onClick={() => step > 0 ? setStep(s => s - 1) : onClose()}
            className="px-4 py-2 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/[0.04] transition-all"
          >
            {step === 0 ? 'Cancelar' : '← Atrás'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: typeMeta ? `linear-gradient(135deg, ${typeMeta.color}, var(--c-secondary))` : 'linear-gradient(135deg, var(--c-primary), var(--c-secondary))' }}
            >
              Siguiente →
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={sending}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-medium text-white transition-all disabled:opacity-50"
              style={{ background: typeMeta ? `linear-gradient(135deg, ${typeMeta.color}, var(--c-secondary))` : 'linear-gradient(135deg, var(--c-primary), var(--c-secondary))' }}
            >
              {sending ? (
                <><motion.div className="w-3 h-3 border border-white/40 border-t-white rounded-full" animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />Enviando...</>
              ) : (
                <><FiSend size={12} />Enviar</>
              )}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
