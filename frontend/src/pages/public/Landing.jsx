import { lazy, Suspense, useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import {
  FiZap, FiArrowRight, FiUsers, FiFolder, FiStar, FiCheck,
  FiBook, FiTerminal, FiGlobe, FiCpu, FiGitBranch, FiLayers,
  FiAward, FiTrendingUp, FiCode, FiMessageSquare, FiMail,
  FiChevronRight, FiDatabase, FiActivity,
} from 'react-icons/fi'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import NeonDivider from '../../components/ui/NeonDivider'

const ImmersiveBackground = lazy(() => import('../../components/visuals/ImmersiveBackground'))

/* ──────── Features ──────── */
const FEATURES = [
  {
    icon: FiFolder, color: '#FC651F', num: '01',
    title: 'Proyectos & Kanban',
    desc: 'Crea, gestiona y avanza investigaciones con tableros Kanban, registro de avances y seguimiento de tareas en tiempo real.',
    tags: ['Kanban', 'Sprints', 'Avances'],
  },
  {
    icon: FiStar, color: '#8B5CF6', num: '02',
    title: 'Banco de Ideas',
    desc: 'Propón líneas de investigación, vota las mejores ideas y conecta conceptos similares. Democracia científica.',
    tags: ['Votación', 'Fusión', 'Ranking'],
  },
  {
    icon: FiTerminal, color: '#00D1FF', num: '03',
    title: 'A.T.H.E.N.I.A — IA Terminal',
    desc: 'Terminal inteligente con Gemini 1.5 Pro. Analiza pizarrones, genera roadmaps y conecta conceptos semánticos.',
    tags: ['Gemini Pro', 'Multimodal', 'Memoria'],
  },
  {
    icon: FiGlobe, color: '#22c55e', num: '04',
    title: 'Universo de Conexiones',
    desc: 'Grafo interactivo vivo de miembros, proyectos e ideas. Descubre quién trabaja en qué y con quién colaborar.',
    tags: ['Grafo', 'D3-Force', 'React Flow'],
  },
  {
    icon: FiBook, color: '#F59E0B', num: '05',
    title: 'Biblioteca Digital',
    desc: 'Repositorio centralizado de papers, datasets, código fuente y presentaciones. Todo el conocimiento del semillero.',
    tags: ['Papers', 'Datasets', 'Código'],
  },
  {
    icon: FiAward, color: '#EC4899', num: '06',
    title: 'Perfiles & Logros',
    desc: 'Skill trees animados, badges gamificados y calendarios de actividad. Tu trayectoria visible para la comunidad.',
    tags: ['Skill Tree', 'Badges', 'Heatmap'],
  },
]

/* ──────── How it works ──────── */
const STEPS = [
  {
    icon: FiUsers, color: '#FC651F',
    step: '1',
    title: 'Solicita tu acceso',
    desc: 'Envía tu solicitud de ingreso. El equipo fundador revisa tu perfil y te incorpora al semillero.',
  },
  {
    icon: FiGitBranch, color: '#8B5CF6',
    step: '2',
    title: 'Únete a proyectos',
    desc: 'Explora proyectos activos, propón ideas nuevas y colabora con investigadores de diferentes áreas.',
  },
  {
    icon: FiTrendingUp, color: '#00D1FF',
    step: '3',
    title: 'Publica y crece',
    desc: 'Registra avances, sube papers, acumula logros y deja tu huella en el universo de conocimiento del semillero.',
  },
]

/* ──────── Marquee items ──────── */
const MARQUEE = [
  'Machine Learning', 'Deep Learning', 'NLP', 'Computer Vision',
  'Reinforcement Learning', 'Generative AI', 'Data Science', 'Neural Networks',
  'LLMs', 'Transfer Learning', 'Embeddings', 'RAG Systems',
]

/* ──────── Research areas ──────── */
const AREAS = [
  { label: 'Machine Learning', color: '#FC651F', icon: FiCpu },
  { label: 'NLP', color: '#8B5CF6', icon: FiMessageSquare },
  { label: 'Computer Vision', color: '#00D1FF', icon: FiLayers },
  { label: 'Data Analytics', color: '#22c55e', icon: FiDatabase },
]

/* ──────── Counter ──────── */
function Counter({ to, duration = 1.8, suffix = '' }) {
  const [val, setVal] = useState(0)
  const [started, setStarted] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true) }, { threshold: 0.5 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!started || !to) return
    let v = 0
    const step = to / (duration * 60)
    const id = setInterval(() => {
      v += step
      if (v >= to) { setVal(to); clearInterval(id) }
      else setVal(Math.floor(v))
    }, 1000 / 60)
    return () => clearInterval(id)
  }, [started, to, duration])

  return <span ref={ref}>{val}{suffix}</span>
}

/* ──────── Floating badge ──────── */
function FloatingBadge({ text, color, icon: Icon, className = '' }) {
  return (
    <motion.div
      className={`absolute hidden lg:flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold backdrop-blur-md ${className}`}
      style={{ background: `${color}12`, border: `1px solid ${color}25`, color }}
      animate={{ y: [0, -10, 0] }}
      transition={{ repeat: Infinity, duration: 3.5 + Math.random() * 2, ease: 'easeInOut' }}
    >
      {Icon && <Icon size={12} />}
      {text}
    </motion.div>
  )
}

/* ──────── Marquee Strip ──────── */
function MarqueeStrip() {
  const items = [...MARQUEE, ...MARQUEE]
  return (
    <div className="overflow-hidden py-6 border-y border-white/[0.05]" aria-hidden>
      <motion.div
        className="flex gap-12 whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ repeat: Infinity, duration: 28, ease: 'linear' }}
      >
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-3 text-sm text-white/25 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FC651F]/60 shrink-0" />
            {item}
          </span>
        ))}
      </motion.div>
    </div>
  )
}

/* ──────── Section header ──────── */
function SectionHeader({ badge, badgeVariant = 'secondary', title, subtitle, titleHighlight }) {
  return (
    <motion.div
      className="text-center mb-16"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <Badge variant={badgeVariant} className="mb-5">{badge}</Badge>
      <h2 className="text-4xl md:text-5xl font-bold font-title text-white mb-4 leading-tight">
        {title}
        {titleHighlight && (
          <>
            {' '}
            <span className="bg-gradient-to-r from-[#FC651F] to-[#8B5CF6] bg-clip-text text-transparent">
              {titleHighlight}
            </span>
          </>
        )}
      </h2>
      {subtitle && <p className="text-white/40 max-w-lg mx-auto text-lg leading-relaxed">{subtitle}</p>}
    </motion.div>
  )
}

/* ──────── Expandable Feature Card ──────── */
const FEATURE_DETAILS = {
  'Proyectos & Kanban': {
    bullets: [
      'Tablero Kanban con arrastrar y soltar entre columnas',
      'Registro de avances con métricas y próximos pasos',
      'Gestión de tareas con prioridades y fechas límite',
      'Historial completo de actividad del proyecto',
    ],
    cta: 'Ver proyectos',
    href: '/projects',
  },
  'Banco de Ideas': {
    bullets: [
      'Propón líneas de investigación con descripción y área',
      'Vota a favor o en contra de ideas de otros miembros',
      'Sistema de reputación basado en votos acumulados',
      'Fusión de ideas similares por el equipo fundador',
    ],
    cta: 'Ver ideas',
    href: '/ideas',
  },
  'A.T.H.E.N.I.A — IA Terminal': {
    bullets: [
      'Terminal tipo hacker con comandos /cmd especiales',
      'Análisis multimodal: sube foto de pizarrón → mapa conceptual',
      'Memoria persistente de conversaciones por usuario',
      'Integración con Gemini 1.5 Pro con contexto del semillero',
    ],
    cta: 'Abrir terminal',
    href: '/athenia',
  },
  'Universo de Conexiones': {
    bullets: [
      'Grafo interactivo con nodos de personas, proyectos e ideas',
      'Layout automático con D3-force para detectar clusters',
      'Filtros por área de investigación y estado',
      'Panel lateral con detalle al hacer clic en cualquier nodo',
    ],
    cta: 'Explorar universo',
    href: '/universo',
  },
  'Biblioteca Digital': {
    bullets: [
      'Sube papers, datasets, código y presentaciones',
      'Categorización por tipo y etiquetas personalizadas',
      'Contador de descargas y versionado de archivos',
      'Búsqueda por nombre, tipo o etiqueta',
    ],
    cta: 'Ver biblioteca',
    href: '/library',
  },
  'Perfiles & Logros': {
    bullets: [
      'Skill tree animado con 5 categorías de habilidades',
      'Badges de logros: Investigador Elite, Idea MVP, Conector…',
      'Calendario de actividad estilo GitHub (heatmap)',
      'Estadísticas de proyectos, avances e ideas del miembro',
    ],
    cta: 'Ver miembros',
    href: '/members',
  },
}

function ExpandableFeatureCard({ f, i, isSelected, onSelect, onClose }) {
  return (
    <motion.div
      layoutId={`feature-card-${f.num}`}
      className="glass rounded-2xl p-7 group relative overflow-hidden cursor-pointer"
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: i * 0.09, duration: 0.5 }}
      whileHover={!isSelected ? { y: -6, scale: 1.01 } : {}}
      onClick={() => !isSelected && onSelect()}
      style={{ border: `1px solid ${f.color}${isSelected ? '35' : '10'}` }}
    >
      {/* Hover/selected glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-2xl"
        style={{ background: `radial-gradient(ellipse 80% 60% at 50% 0%, ${f.color}08 0%, transparent 70%)` }}
      />
      <p className="text-[11px] font-bold tracking-widest mb-5 font-title" style={{ color: `${f.color}50` }}>{f.num}</p>
      <motion.div
        layoutId={`feature-icon-${f.num}`}
        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: `${f.color}15`, color: f.color }}
      >
        <f.icon size={22} />
      </motion.div>
      <motion.h3 layoutId={`feature-title-${f.num}`} className="font-bold text-white mb-2 font-title text-lg">{f.title}</motion.h3>
      <p className="text-sm text-white/40 leading-relaxed mb-5">{f.desc}</p>
      <div className="flex flex-wrap gap-1.5">
        {f.tags.map(t => (
          <span key={t} className="text-[10px] px-2 py-0.5 rounded-md font-medium" style={{ background: `${f.color}10`, color: `${f.color}80`, border: `1px solid ${f.color}15` }}>{t}</span>
        ))}
      </div>
      {/* Hint */}
      <motion.p className="text-[10px] text-white/20 mt-4 flex items-center gap-1" animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }}>
        <FiChevronRight size={10} /> Clic para expandir
      </motion.p>
      <div className="absolute bottom-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-b-2xl" style={{ background: `linear-gradient(90deg, transparent, ${f.color}, transparent)` }} />
    </motion.div>
  )
}

function FeatureModal({ f, onClose }) {
  const detail = FEATURE_DETAILS[f.title] || { bullets: [], cta: 'Explorar', href: '/dashboard' }
  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* Backdrop */}
      <motion.div className="absolute inset-0 bg-black/70 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />

      <motion.div
        layoutId={`feature-card-${f.num}`}
        className="relative glass rounded-3xl p-8 max-w-lg w-full z-10 overflow-hidden"
        style={{ border: `1px solid ${f.color}30` }}
        onClick={e => e.stopPropagation()}
      >
        {/* BG glow */}
        <div className="absolute inset-0 pointer-events-none rounded-3xl" style={{ background: `radial-gradient(ellipse 100% 70% at 50% 0%, ${f.color}10 0%, transparent 60%)` }} />

        {/* Close */}
        <button
          className="absolute top-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all"
          onClick={onClose}
        >
          ✕
        </button>

        {/* Icon + title */}
        <div className="flex items-start gap-4 mb-6">
          <motion.div layoutId={`feature-icon-${f.num}`} className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${f.color}15`, color: f.color }}>
            <f.icon size={26} />
          </motion.div>
          <div>
            <p className="text-[11px] font-bold tracking-widest font-title mb-1" style={{ color: `${f.color}60` }}>{f.num}</p>
            <motion.h3 layoutId={`feature-title-${f.num}`} className="font-bold text-white font-title text-xl">{f.title}</motion.h3>
          </div>
        </div>

        <p className="text-white/50 text-sm leading-relaxed mb-6">{f.desc}</p>

        {/* Feature bullets */}
        <ul className="space-y-3 mb-7">
          {detail.bullets.map((b, i) => (
            <motion.li
              key={b}
              className="flex items-start gap-3 text-sm text-white/60"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.07 }}
            >
              <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${f.color}20`, color: f.color }}>
                <FiCheck size={11} />
              </span>
              {b}
            </motion.li>
          ))}
        </ul>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-7">
          {f.tags.map(t => (
            <span key={t} className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: `${f.color}12`, color: f.color, border: `1px solid ${f.color}25` }}>{t}</span>
          ))}
        </div>

        <Link to={detail.href} onClick={onClose}>
          <Button variant="solid" size="sm" className="gap-2 w-full justify-center">
            {detail.cta} <FiArrowRight size={14} />
          </Button>
        </Link>
      </motion.div>
    </motion.div>
  )
}

/* ──────── Contact Form ──────── */
function ContactForm() {
  const [form, setForm] = useState({ nombre: '', correo: '', mensaje: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre || !form.correo || !form.mensaje) return
    setSending(true)

    // Store in Supabase (best effort — table may not exist yet)
    try {
      await supabase.from('contacto').insert({
        nombre: form.nombre,
        correo: form.correo,
        mensaje: form.mensaje,
      })
    } catch (_) { /* silent */ }

    setSending(false)
    setSent(true)
    setForm({ nombre: '', correo: '', mensaje: '' })
  }

  if (sent) {
    return (
      <motion.div
        className="glass rounded-2xl p-10 text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <motion.div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5 bg-[#22c55e]/15 text-[#22c55e]"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        >
          <FiCheck size={28} />
        </motion.div>
        <h3 className="text-xl font-bold text-white font-title mb-2">¡Mensaje enviado!</h3>
        <p className="text-white/40 text-sm">Te responderemos lo antes posible. Gracias por tu interés.</p>
        <button
          className="mt-6 text-sm text-[#FC651F] hover:text-[#FC651F]/80 transition-colors"
          onClick={() => setSent(false)}
        >
          Enviar otro mensaje
        </button>
      </motion.div>
    )
  }

  return (
    <motion.form
      className="glass rounded-2xl p-8 space-y-5"
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      style={{ border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-[11px] text-white/35 uppercase tracking-wider font-semibold block mb-2">Nombre</label>
          <input
            type="text"
            value={form.nombre}
            onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
            placeholder="Tu nombre"
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none focus:border-[#FC651F]/40 transition-colors"
            required
          />
        </div>
        <div>
          <label className="text-[11px] text-white/35 uppercase tracking-wider font-semibold block mb-2">Correo</label>
          <input
            type="email"
            value={form.correo}
            onChange={e => setForm(f => ({ ...f, correo: e.target.value }))}
            placeholder="tu@correo.com"
            className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none focus:border-[#FC651F]/40 transition-colors"
            required
          />
        </div>
      </div>
      <div>
        <label className="text-[11px] text-white/35 uppercase tracking-wider font-semibold block mb-2">Mensaje</label>
        <textarea
          value={form.mensaje}
          onChange={e => setForm(f => ({ ...f, mensaje: e.target.value }))}
          placeholder="¿En qué podemos ayudarte?"
          rows={4}
          className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/20 outline-none focus:border-[#FC651F]/40 transition-colors resize-none"
          required
        />
      </div>
      <div className="flex justify-end">
        <Button variant="solid" size="sm" className="gap-2" disabled={sending}>
          {sending ? 'Enviando...' : <>Enviar mensaje <FiMail size={14} /></>}
        </Button>
      </div>
    </motion.form>
  )
}

/* ──────── Landing ──────── */
export default function Landing() {
  const [stats, setStats] = useState({ miembros: 0, proyectos: 0, ideas: 0, avances: 0 })
  const [selectedFeature, setSelectedFeature] = useState(null)
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '28%'])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.75], [1, 0])

  useEffect(() => {
    Promise.all([
      supabase.from('usuarios').select('*', { count: 'exact', head: true }),
      supabase.from('proyectos').select('*', { count: 'exact', head: true }),
      supabase.from('ideas').select('*', { count: 'exact', head: true }),
      supabase.from('avances').select('*', { count: 'exact', head: true }),
    ]).then(([{ count: m }, { count: p }, { count: i }, { count: a }]) => {
      setStats({ miembros: m || 0, proyectos: p || 0, ideas: i || 0, avances: a || 0 })
    })
  }, [])

  return (
    <div className="bg-[#060304] overflow-x-hidden">

      {/* ══════════════════════════════════
           HERO
      ══════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        <Suspense fallback={null}>
          <ImmersiveBackground intensity={1} />
        </Suspense>

        {/* Radial vignette */}
        <div className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_75%_65%_at_50%_45%,transparent_0%,rgba(6,3,4,0.7)_55%,rgba(6,3,4,0.97)_100%)]" />

        {/* Grid overlay — subtle */}
        <div
          className="absolute inset-0 z-[1] opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }}
        />

        {/* Floating research area pills */}
        <FloatingBadge text="Machine Learning" color="#FC651F" icon={FiCpu} className="top-[28%] left-[7%]" />
        <FloatingBadge text="Computer Vision" color="#00D1FF" icon={FiLayers} className="top-[38%] right-[6%]" />
        <FloatingBadge text="NLP Research" color="#8B5CF6" icon={FiMessageSquare} className="bottom-[32%] left-[5%]" />
        <FloatingBadge text="Data Science" color="#22c55e" icon={FiDatabase} className="bottom-[24%] right-[8%]" />

        <motion.div
          className="relative z-10 text-center px-4 max-w-5xl mx-auto"
          style={{ y: heroY, opacity: heroOpacity }}
        >
          {/* Eyebrow pill */}
          <motion.div
            className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full text-xs font-semibold mb-10 bg-[#FC651F]/10 border border-[#FC651F]/25 text-[#FC651F]"
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <span className="pulse-dot" />
            Semillero Universitario de Investigación en IA
            <span className="w-px h-3 bg-[#FC651F]/30" />
            <span className="text-[#FC651F]/60">Activo</span>
          </motion.div>

          {/* Main title */}
          <div className="mb-7 overflow-hidden">
            <motion.h1
              className="text-[4.5rem] md:text-[8rem] font-bold font-title leading-[0.9] tracking-tight"
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="text-white">Divergenc</span>
              <span className="relative inline-block bg-gradient-to-r from-[#FC651F] via-[#FF8A50] to-[#8B5CF6] bg-clip-text text-transparent">
                IA
                {/* Bloom glow */}
                <motion.span
                  className="absolute inset-0 blur-3xl bg-gradient-to-r from-[#FC651F] to-[#8B5CF6] opacity-30 pointer-events-none"
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ repeat: Infinity, duration: 3 }}
                  aria-hidden
                />
              </span>
            </motion.h1>

            <motion.p
              className="text-2xl md:text-3xl font-light mt-4 tracking-wide font-title"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.48, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="text-white/40">Donde la </span>
              <motion.span
                className="text-white font-semibold"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
              >
                inteligencia
              </motion.span>
              <span className="text-white/40"> converge</span>
            </motion.p>
          </div>

          {/* Subtitle */}
          <motion.p
            className="text-lg text-white/40 max-w-2xl mx-auto mb-12 leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.65, duration: 0.7 }}
          >
            El laboratorio digital del semillero. Centraliza proyectos de investigación, conecta investigadores,
            lanza ideas y potencia el conocimiento colectivo con IA.
          </motion.p>

          {/* CTA */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-4 mb-14"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <Link to="/register">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
                <Button variant="solid" size="xl" className="gap-3 shadow-2xl shadow-[#FC651F]/25">
                  Unirme al semillero <FiArrowRight size={18} />
                </Button>
              </motion.div>
            </Link>
            <Link to="/login">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Button variant="ghost" size="xl" className="gap-2">
                  Ya soy miembro
                </Button>
              </motion.div>
            </Link>
          </motion.div>

          {/* Tech badges */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
          >
            {[
              { label: 'Gemini 1.5 Pro', color: '#22c55e' },
              { label: 'React Flow', color: '#00D1FF' },
              { label: 'Supabase Realtime', color: '#8B5CF6' },
              { label: 'Three.js', color: '#FC651F' },
            ].map(({ label, color }) => (
              <span
                key={label}
                className="text-[11px] px-3 py-1 rounded-full font-medium"
                style={{ background: `${color}12`, border: `1px solid ${color}20`, color: `${color}99` }}
              >
                {label}
              </span>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll arrow */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <span className="text-[10px] text-white/20 tracking-widest uppercase">Scroll</span>
          <motion.div
            className="w-px h-12 bg-gradient-to-b from-white/25 to-transparent"
            animate={{ scaleY: [0, 1, 0], originY: '0%' }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
          />
        </motion.div>
      </section>

      {/* ══════════════════════════════════
           MARQUEE
      ══════════════════════════════════ */}
      <MarqueeStrip />

      {/* ══════════════════════════════════
           STATS
      ══════════════════════════════════ */}
      <section className="py-24 px-4 max-w-5xl mx-auto">
        <motion.p
          className="text-center text-white/20 text-[11px] uppercase tracking-[0.3em] mb-14"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Semillero en números — actualizado en tiempo real
        </motion.p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Investigadores', value: stats.miembros, icon: FiUsers, color: '#FC651F', suffix: '+' },
            { label: 'Proyectos activos', value: stats.proyectos, icon: FiFolder, color: '#8B5CF6', suffix: '' },
            { label: 'Ideas en votación', value: stats.ideas, icon: FiStar, color: '#00D1FF', suffix: '' },
            { label: 'Avances registrados', value: stats.avances, icon: FiActivity, color: '#22c55e', suffix: '' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              className="glass rounded-2xl p-6 text-center group relative overflow-hidden"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              whileHover={{ y: -4 }}
              style={{ border: `1px solid ${s.color}18` }}
            >
              {/* BG accent */}
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full blur-3xl opacity-20 pointer-events-none" style={{ background: s.color }} />
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-4"
                style={{ background: `${s.color}15`, color: s.color }}
              >
                <s.icon size={20} />
              </div>
              <p className="text-3xl font-bold font-title" style={{ color: s.color }}>
                <Counter to={s.value} suffix={s.suffix} />
              </p>
              <p className="text-xs text-white/35 mt-1.5 font-medium">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <NeonDivider className="max-w-4xl mx-auto px-4" />

      {/* ══════════════════════════════════
           HOW IT WORKS
      ══════════════════════════════════ */}
      <section className="py-24 px-4 max-w-5xl mx-auto">
        <SectionHeader
          badge="Proceso"
          badgeVariant="secondary"
          title="Investigar en el semillero es"
          titleHighlight="así de simple"
          subtitle="Desde tu solicitud hasta publicar resultados. Un flujo diseñado para investigadores, no para burocratas."
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connector line */}
          <div className="absolute top-14 left-[16%] right-[16%] h-px bg-gradient-to-r from-[#FC651F]/30 via-[#8B5CF6]/30 to-[#00D1FF]/30 hidden md:block" />

          {STEPS.map((s, i) => (
            <motion.div
              key={s.step}
              className="relative flex flex-col items-center text-center p-8 glass rounded-2xl group"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              whileHover={{ y: -5 }}
              style={{ border: `1px solid ${s.color}15` }}
            >
              {/* Step number */}
              <div
                className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-title border-2"
                style={{ background: '#060304', borderColor: s.color, color: s.color }}
              >
                {s.step}
              </div>

              <motion.div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 mt-4"
                style={{ background: `${s.color}15`, color: s.color }}
                whileHover={{ scale: 1.1, rotate: 8 }}
                transition={{ type: 'spring', stiffness: 350 }}
              >
                <s.icon size={24} />
              </motion.div>
              <h3 className="font-bold text-white font-title text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <NeonDivider className="max-w-4xl mx-auto px-4" />

      {/* ══════════════════════════════════
           MANIFESTO
      ══════════════════════════════════ */}
      <section className="py-28 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(139,92,246,0.08)_0%,transparent_70%)] pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <p className="text-[11px] text-white/25 uppercase tracking-[0.3em] mb-8">Nuestra filosofía</p>
            <blockquote className="text-3xl md:text-5xl font-bold font-title text-white leading-tight mb-8">
              "No somos un grupo de estudio.{' '}
              <span className="bg-gradient-to-r from-[#FC651F] to-[#8B5CF6] bg-clip-text text-transparent">
                Somos un ecosistema
              </span>
              {' '}de investigación que diverge para converger."
            </blockquote>
            <p className="text-white/35 text-lg max-w-2xl mx-auto leading-relaxed">
              En ATHENIA creemos que las mejores ideas nacen en la intersección de disciplinas.
              Cada miembro aporta una perspectiva única: juntos construimos investigación que trasciende.
            </p>

            {/* Area chips */}
            <div className="flex flex-wrap justify-center gap-3 mt-10">
              {AREAS.map(a => (
                <motion.div
                  key={a.label}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
                  style={{ background: `${a.color}12`, border: `1px solid ${a.color}25`, color: a.color }}
                  whileHover={{ scale: 1.05, y: -2 }}
                >
                  <a.icon size={14} />
                  {a.label}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════
           FEATURES
      ══════════════════════════════════ */}
      <section id="features" className="py-24 px-4 max-w-6xl mx-auto">
        <SectionHeader
          badge="Plataforma"
          title="Todo lo que necesita"
          titleHighlight="tu investigación"
          subtitle="Módulos integrados diseñados para el flujo de trabajo real del semillero universitario."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => (
            <ExpandableFeatureCard
              key={f.title}
              f={f}
              i={i}
              isSelected={selectedFeature?.title === f.title}
              onSelect={() => setSelectedFeature(f)}
              onClose={() => setSelectedFeature(null)}
            />
          ))}
        </div>

        {/* Feature modal */}
        <AnimatePresence>
          {selectedFeature && (
            <FeatureModal f={selectedFeature} onClose={() => setSelectedFeature(null)} />
          )}
        </AnimatePresence>
      </section>

      <NeonDivider className="max-w-4xl mx-auto px-4" />

      {/* ══════════════════════════════════
           TEAM
      ══════════════════════════════════ */}
      <section id="team" className="py-24 px-4 max-w-5xl mx-auto">
        <SectionHeader
          badge="Fundadores"
          badgeVariant="accent"
          title="Los que empezaron"
          titleHighlight="todo"
          subtitle="Investigadores que apostaron por construir una plataforma que el semillero merece."
        />

        <div className="flex flex-wrap justify-center gap-5">
          {[
            { nombre: 'Fundador IA', rol: 'Director & ML Lead', area: 'ML', inicial: 'F', color: '#F59E0B', contrib: '10+ proyectos' },
            { nombre: 'Líder NLP', rol: 'Investigador Senior', area: 'NLP', inicial: 'L', color: '#8B5CF6', contrib: '8 papers' },
            { nombre: 'Vision Engineer', rol: 'Computer Vision Lead', area: 'Vision', inicial: 'V', color: '#00D1FF', contrib: '5 datasets' },
            { nombre: 'Data Analyst', rol: 'Analytics & BI', area: 'Datos', inicial: 'D', color: '#22c55e', contrib: '12 avances' },
          ].map((m, i) => (
            <motion.div
              key={m.nombre}
              className="glass rounded-2xl p-7 text-center w-56 group relative overflow-hidden"
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              whileInView={{ opacity: 1, scale: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.13, type: 'spring', stiffness: 180, damping: 18 }}
              whileHover={{ y: -10, scale: 1.04 }}
              style={{ border: `1px solid ${m.color}20` }}
            >
              {/* Glow */}
              <div className="absolute top-0 inset-x-0 h-24 opacity-20 pointer-events-none" style={{ background: `linear-gradient(180deg, ${m.color}30, transparent)` }} />

              {/* Avatar */}
              <motion.div
                className="relative w-[76px] h-[76px] rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold font-title"
                style={{
                  background: `linear-gradient(135deg, ${m.color}25, ${m.color}08)`,
                  border: `2px solid ${m.color}35`,
                  color: m.color,
                }}
                whileHover={{ rotate: [0, -8, 8, 0] }}
                transition={{ duration: 0.5 }}
              >
                {m.inicial}
                {/* Founder dot */}
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full border-2 border-[#060304] bg-[#F59E0B] flex items-center justify-center">
                  <FiZap size={8} className="text-[#060304]" />
                </span>
              </motion.div>

              <p className="font-semibold text-white text-sm">{m.nombre}</p>
              <p className="text-xs text-white/35 mt-0.5 mb-3">{m.rol}</p>
              <Badge area={m.area} size="xs" />

              {/* Stat */}
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <p className="text-[11px] text-white/25 flex items-center justify-center gap-1">
                  <FiTrendingUp size={10} />
                  {m.contrib}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════
           CONTACT FORM
      ══════════════════════════════════ */}
      <section id="contact" className="py-24 px-4 max-w-3xl mx-auto">
        <SectionHeader
          badge="Contacto"
          badgeVariant="accent"
          title="¿Tienes preguntas?"
          titleHighlight="Escríbenos"
          subtitle="Consultas sobre el semillero, colaboraciones, o cualquier duda. Te respondemos pronto."
        />
        <ContactForm />
      </section>

      <NeonDivider className="max-w-4xl mx-auto px-4" />

      {/* ══════════════════════════════════
           CTA FINAL
      ══════════════════════════════════ */}
      <section className="py-32 px-4 text-center relative overflow-hidden">
        {/* BG effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_50%_50%,rgba(252,101,31,0.1)_0%,transparent_65%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_50%_50%,rgba(139,92,246,0.07)_0%,transparent_60%)] pointer-events-none" />

        {/* Animated rings */}
        {[500, 700, 900].map((size, i) => (
          <motion.div
            key={size}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.04] pointer-events-none"
            style={{ width: size, height: size }}
            animate={{ scale: [1, 1.06, 1], opacity: [0.4, 0.1, 0.4] }}
            transition={{ repeat: Infinity, duration: 4 + i * 1.2, delay: i * 0.8 }}
          />
        ))}

        <div className="relative z-10 max-w-2xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            {/* Logo icon */}
            <motion.div
              className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-10 bg-gradient-to-br from-[#FC651F] to-[#8B5CF6]"
              whileHover={{ rotate: 180, scale: 1.1 }}
              animate={{ boxShadow: ['0 0 20px rgba(252,101,31,0.3)', '0 0 40px rgba(139,92,246,0.4)', '0 0 20px rgba(252,101,31,0.3)'] }}
              transition={{ boxShadow: { repeat: Infinity, duration: 3 }, hover: { duration: 0.5 } }}
            >
              <FiZap size={42} className="text-white" />
            </motion.div>

            <h2 className="text-5xl md:text-6xl font-bold font-title mb-5 leading-tight">
              <span className="text-white">¿Listo para </span>
              <span className="bg-gradient-to-r from-[#FC651F] to-[#8B5CF6] bg-clip-text text-transparent">divergir</span>
              <span className="text-white">?</span>
            </h2>
            <p className="text-white/40 text-lg mb-12 leading-relaxed">
              Únete a los investigadores que están construyendo el futuro de la IA desde la universidad.
              Tu próximo breakthrough empieza aquí.
            </p>

            {/* Benefits */}
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3 mb-12 text-sm text-white/50">
              {['Acceso total a proyectos', 'Terminal A.T.H.E.N.I.A', 'Red de investigadores', 'Logros gamificados'].map(b => (
                <span key={b} className="flex items-center gap-2">
                  <FiCheck size={13} className="text-[#22c55e] shrink-0" />
                  {b}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link to="/register">
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}>
                  <Button variant="neon" size="xl" className="gap-3">
                    Solicitar acceso al semillero <FiArrowRight size={18} />
                  </Button>
                </motion.div>
              </Link>
              <Link to="/members">
                <Button variant="ghost" size="xl" className="gap-2">
                  <FiUsers size={16} />
                  Ver investigadores
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ══════════════════════════════════
           FOOTER
      ══════════════════════════════════ */}
      <footer className="border-t border-white/[0.06] bg-white/[0.01]">
        {/* Main footer grid */}
        <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-10">

          {/* Brand column */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#FC651F] to-[#8B5CF6]">
                <FiZap size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold text-white font-title tracking-tight">
                Divergenc<span className="text-[#FC651F]">IA</span>
              </span>
            </div>
            <p className="text-white/35 text-sm leading-relaxed max-w-xs mb-6">
              El ecosistema digital del semillero universitario de investigación en inteligencia artificial.
              Donde la curiosidad se convierte en conocimiento.
            </p>
            {/* Area tags */}
            <div className="flex flex-wrap gap-2">
              {AREAS.map(a => (
                <span
                  key={a.label}
                  className="text-[10px] px-2.5 py-1 rounded-lg font-medium"
                  style={{ background: `${a.color}10`, color: `${a.color}70`, border: `1px solid ${a.color}15` }}
                >
                  {a.label}
                </span>
              ))}
            </div>
          </div>

          {/* Platform links */}
          <div>
            <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-5">Plataforma</h4>
            <ul className="space-y-3">
              {[
                { label: 'Dashboard', href: '/dashboard' },
                { label: 'Proyectos', href: '/projects' },
                { label: 'Banco de Ideas', href: '/ideas' },
                { label: 'Biblioteca', href: '/library' },
                { label: 'Universo', href: '/universo' },
                { label: 'A.T.H.E.N.I.A', href: '/athenia' },
              ].map(l => (
                <li key={l.label}>
                  <Link
                    to={l.href}
                    className="text-sm text-white/35 hover:text-[#FC651F] transition-colors flex items-center gap-1.5 group"
                  >
                    <FiChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity -ml-1" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Semillero info */}
          <div>
            <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-5">Semillero</h4>
            <ul className="space-y-3">
              {[
                { label: 'Investigadores', href: '/members' },
                { label: 'Iniciar sesión', href: '/login' },
                { label: 'Solicitar acceso', href: '/register' },
              ].map(l => (
                <li key={l.label}>
                  <Link
                    to={l.href}
                    className="text-sm text-white/35 hover:text-[#FC651F] transition-colors flex items-center gap-1.5 group"
                  >
                    <FiChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity -ml-1" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Contact */}
            <div className="mt-8">
              <h4 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Contacto</h4>
              <a
                href="mailto:semillero@universidad.edu"
                className="flex items-center gap-2 text-sm text-white/30 hover:text-[#00D1FF] transition-colors"
              >
                <FiMail size={13} />
                semillero@universidad.edu
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.05] px-6 py-5 max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-white/20">
            © 2026 ATHENIA · Semillero Universitario de Investigación en IA
          </p>
          <div className="flex items-center gap-2">
            <span className="pulse-dot" />
            <span className="text-[11px] text-white/25">Sistema operativo</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
