import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiCpu, FiDatabase, FiEye, FiMessageSquare, FiCode, FiChevronDown } from 'react-icons/fi'

// Map learning topic categories to skill tree category ids
const LEARNING_TO_SKILL_MAP = {
  'Machine Learning': 'ml',
  'ML': 'ml',
  'NLP': 'nlp',
  'Procesamiento de Lenguaje': 'nlp',
  'Computer Vision': 'vision',
  'Vision': 'vision',
  'Datos': 'data',
  'Datos & Analytics': 'data',
  'Desarrollo': 'dev',
  'General': 'dev',
}

const CATEGORIES = [
  {
    id: 'ml',
    label: 'Machine Learning',
    icon: FiCpu,
    color: '#FC651F',
    skills: ['Regresión', 'Clasificación', 'Clustering', 'Redes Neuronales', 'Ensemble Methods', 'Feature Engineering', 'Hyperparameter Tuning'],
  },
  {
    id: 'nlp',
    label: 'NLP',
    icon: FiMessageSquare,
    color: '#8B5CF6',
    skills: ['Tokenización', 'Embeddings', 'Transformers', 'Sentiment Analysis', 'NER', 'Text Generation', 'RAG'],
  },
  {
    id: 'vision',
    label: 'Computer Vision',
    icon: FiEye,
    color: '#00D1FF',
    skills: ['CNNs', 'Object Detection', 'Segmentación', 'GANs', 'Image Classification', 'Data Augmentation'],
  },
  {
    id: 'data',
    label: 'Datos & Analytics',
    icon: FiDatabase,
    color: '#22c55e',
    skills: ['SQL', 'ETL', 'Visualización', 'Estadística', 'A/B Testing', 'Data Pipelines', 'Big Data'],
  },
  {
    id: 'dev',
    label: 'Desarrollo',
    icon: FiCode,
    color: '#F59E0B',
    skills: ['Python', 'JavaScript', 'React', 'APIs REST', 'Docker', 'Git', 'Cloud (AWS/GCP)'],
  },
]

function SkillBranch({ category, userSkills, expanded, onToggle, level = 0 }) {
  const Icon = category.icon
  const matchCount = category.skills.filter(s => userSkills.includes(s)).length
  const basePct = category.skills.length ? Math.round((matchCount / category.skills.length) * 100) : 0
  // Boost percentage based on calculated level (each level adds up to ~5%)
  const levelBoost = Math.min(level * 5, 100 - basePct)
  const pct = Math.min(100, basePct + levelBoost)
  // Scale icon size based on level
  const iconSize = Math.min(22, 16 + level)

  return (
    <div className="group">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all hover:bg-white/[0.03]"
      >
        <div
          className="rounded-lg flex items-center justify-center shrink-0 transition-all duration-300"
          style={{
            width: Math.min(42, 36 + level),
            height: Math.min(42, 36 + level),
            background: level > 0 ? `color-mix(in srgb, ${category.color} ${Math.min(20, 8 + level * 3)}%, transparent)` : `${category.color}12`,
            border: `1px solid ${category.color}${level > 2 ? '50' : '25'}`,
            boxShadow: level > 3 ? `0 0 12px ${category.color}20` : 'none',
          }}
        >
          <Icon size={iconSize} style={{ color: category.color }} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-white/80">{category.label}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: category.color }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <span className="text-[10px] text-white/30 w-8 text-right">{pct}%</span>
          </div>
        </div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <FiChevronDown size={14} className="text-white/20" />
        </motion.div>
      </button>

      {/* Skills grid */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1.5 px-4 pb-3 pt-1">
              {category.skills.map((skill, i) => {
                const active = userSkills.includes(skill)
                return (
                  <motion.span
                    key={skill}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="text-[11px] px-2.5 py-1 rounded-lg font-medium transition-all"
                    style={active ? {
                      background: `${category.color}15`,
                      color: `${category.color}dd`,
                      border: `1px solid ${category.color}30`,
                      boxShadow: `0 0 8px ${category.color}15`,
                    } : {
                      background: 'rgba(255,255,255,0.02)',
                      color: 'rgba(255,255,255,0.2)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    {active && '✦ '}{skill}
                  </motion.span>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function SkillTree({ habilidades = [], learningProgress, projects }) {
  const [expanded, setExpanded] = useState(null)
  const userSkills = habilidades.map(h => h.trim())

  // Calculate levels per category based on learning data and projects
  const categoryLevels = useMemo(() => {
    const levels = {}
    CATEGORIES.forEach(c => { levels[c.id] = 0 })

    if (learningProgress && typeof learningProgress === 'object') {
      Object.entries(learningProgress).forEach(([, entry]) => {
        // Each completed topic in a category = +1 level
        if (entry.completed) {
          // Try to map by the category stored in the entry, or distribute generally
          const catId = entry.categoria ? (LEARNING_TO_SKILL_MAP[entry.categoria] || null) : null
          if (catId && levels[catId] !== undefined) {
            levels[catId] += 1
          }
        }
        // Each started topic gives a partial boost
        if (entry.completedSections?.length > 0 && !entry.completed) {
          const catId = entry.categoria ? (LEARNING_TO_SKILL_MAP[entry.categoria] || null) : null
          if (catId && levels[catId] !== undefined) {
            levels[catId] += 0.5
          }
        }
      })
    }

    // Projects contributed to = +2 levels to 'dev' category
    if (Array.isArray(projects) && projects.length > 0) {
      levels.dev = (levels.dev || 0) + projects.length * 2
    }

    // Round levels
    Object.keys(levels).forEach(k => { levels[k] = Math.round(levels[k]) })

    return levels
  }, [learningProgress, projects])

  const totalSkills = CATEGORIES.reduce((acc, c) => acc + c.skills.length, 0)
  const totalMatch = CATEGORIES.reduce((acc, c) => acc + c.skills.filter(s => userSkills.includes(s)).length, 0)
  const totalLevels = Object.values(categoryLevels).reduce((a, b) => a + b, 0)
  const globalPct = totalSkills ? Math.min(100, Math.round(((totalMatch + totalLevels) / totalSkills) * 100)) : 0

  return (
    <div className="space-y-1">
      {/* Global progress */}
      <div className="flex items-center justify-between px-4 pb-3 mb-1 border-b border-white/[0.06]">
        <div>
          <p className="text-sm font-semibold text-white/60 uppercase tracking-wider">Arbol de Habilidades</p>
          <p className="text-[11px] text-white/25 mt-0.5">{totalMatch} de {totalSkills} habilidades desbloqueadas</p>
        </div>
        <div className="text-right">
          <span className="text-lg font-bold font-title" style={{
            background: 'linear-gradient(135deg, #FC651F, #8B5CF6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>{globalPct}%</span>
        </div>
      </div>

      {/* Branches */}
      {CATEGORIES.map(cat => (
        <SkillBranch
          key={cat.id}
          category={cat}
          userSkills={userSkills}
          expanded={expanded === cat.id}
          onToggle={() => setExpanded(e => e === cat.id ? null : cat.id)}
          level={categoryLevels[cat.id] || 0}
        />
      ))}
    </div>
  )
}
