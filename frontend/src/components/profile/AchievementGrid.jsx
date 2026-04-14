import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FiAward, FiLock, FiCheckCircle, FiSearch, FiChevronDown, FiChevronUp, FiFilter } from 'react-icons/fi'
import { useAchievements, CATEGORIES, TIERS } from '../../hooks/useAchievements'
import useSounds from '../../hooks/useSounds'
import Card from '../ui/Card'

const PAGE_SIZE = 24

/* ──────── Tier Badge ──────── */
function TierBadge({ tier }) {
  const t = TIERS.find(x => x.id === tier)
  if (!t) return null
  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-[var(--c-surface-1)] border border-[var(--c-border)] font-medium text-white/40">
      {t.badge} {t.label}
    </span>
  )
}

/* ──────── Single Achievement Card ──────── */
function AchievementCard({ achievement }) {
  const {
    icon, name, description, color, tier,
    isUnlocked, percent, currentProgress, threshold, unlockedAt,
  } = achievement

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.03, y: -2 }}
      className="relative flex flex-col items-center text-center p-3 rounded-2xl border transition-all duration-300 overflow-hidden"
      style={{
        background: isUnlocked
          ? `linear-gradient(135deg, ${color}08, ${color}04)`
          : 'var(--c-surface-1)',
        borderColor: isUnlocked ? `${color}40` : 'var(--c-border)',
        boxShadow: isUnlocked ? `0 0 20px ${color}15` : 'none',
        filter: isUnlocked ? 'none' : 'grayscale(0.7)',
      }}
    >
      {isUnlocked && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(circle at 50% 0%, ${color}12 0%, transparent 70%)` }}
        />
      )}

      <div className="relative mb-1.5">
        <span className="text-2xl block" style={{ opacity: isUnlocked ? 1 : 0.3 }}>
          {icon}
        </span>
        {!isUnlocked && (
          <div className="absolute inset-0 flex items-center justify-center">
            <FiLock size={12} className="text-white/20" />
          </div>
        )}
        {isUnlocked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center"
            style={{ background: color }}
          >
            <FiCheckCircle size={8} className="text-white" />
          </motion.div>
        )}
      </div>

      <h4
        className="text-[11px] font-semibold font-title leading-tight mb-0.5 truncate w-full"
        style={{ color: isUnlocked ? color : 'rgba(255,255,255,0.3)' }}
      >
        {name}
      </h4>

      <TierBadge tier={tier} />

      <p className="text-[9px] text-white/20 leading-snug mt-1 mb-2 line-clamp-2 min-h-[20px]">
        {description}
      </p>

      <div className="w-full h-1 rounded-full bg-[var(--c-surface-1)] overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{
            background: isUnlocked
              ? `linear-gradient(90deg, ${color}, ${color}cc)`
              : `linear-gradient(90deg, ${color}50, ${color}20)`,
          }}
        />
      </div>

      <p className="text-[8px] mt-1 font-terminal" style={{ color: isUnlocked ? `${color}99` : 'rgba(255,255,255,0.12)' }}>
        {isUnlocked ? (
          <span className="flex items-center gap-0.5">
            <FiCheckCircle size={7} />
            {unlockedAt ? new Date(unlockedAt).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) : 'OK'}
          </span>
        ) : (
          `${currentProgress}/${threshold}`
        )}
      </p>
    </motion.div>
  )
}

/* ──────── Compact Achievement (for collapsed view) ──────── */
function CompactAchievementCard({ achievement }) {
  const { icon, name, color } = achievement
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.08, y: -2 }}
      className="flex flex-col items-center gap-1 p-2 rounded-xl border border-[var(--c-border)] min-w-[72px] max-w-[72px] cursor-default transition-all duration-200"
      style={{
        background: `linear-gradient(135deg, ${color}10, ${color}05)`,
        borderColor: `${color}30`,
      }}
      title={name}
    >
      <span className="text-xl">{icon}</span>
      <span
        className="text-[9px] font-semibold font-title leading-tight truncate w-full text-center"
        style={{ color }}
      >
        {name}
      </span>
    </motion.div>
  )
}

/* ──────── Unlock Toast ──────── */
function UnlockToast({ achievement, onDismiss }) {
  if (!achievement) return null
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 24 }}
        className="fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-5 py-3.5 rounded-2xl border max-w-xs cursor-pointer backdrop-blur-2xl"
        style={{
          background: `linear-gradient(135deg, ${achievement.color}15, rgba(6,3,4,0.95))`,
          borderColor: `${achievement.color}50`,
          boxShadow: `0 8px 32px ${achievement.color}30`,
        }}
        onClick={onDismiss}
      >
        <motion.span
          className="text-3xl"
          animate={{ rotate: [0, -10, 10, -10, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6 }}
        >
          {achievement.icon}
        </motion.span>
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: achievement.color }}>
            Logro desbloqueado
          </p>
          <p className="text-sm font-semibold text-white/90 font-title">{achievement.name}</p>
          <p className="text-[10px] text-white/30">{achievement.description}</p>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

/* ──────── Main Grid ──────── */
export default function AchievementGrid({ userId }) {
  const { achievements, newlyUnlocked, dismissNewUnlock, categories } = useAchievements(userId)
  const { playSound } = useSounds()
  const [expanded, setExpanded] = useState(false)

  // Play achievement sound when a new logro is unlocked
  useEffect(() => {
    if (!newlyUnlocked) return
    const highTiers = ['platino', 'diamante', 'legendario']
    playSound(highTiers.includes(newlyUnlocked.tier) ? 'levelUp' : 'achievement')
  }, [newlyUnlocked, playSound])
  const [activeCategory, setActiveCategory] = useState('all')
  const [activeTier, setActiveTier] = useState('all')
  const [search, setSearch] = useState('')
  const [showFilter, setShowFilter] = useState(false)
  const [showOnlyUnlocked, setShowOnlyUnlocked] = useState(false)
  const [page, setPage] = useState(0)
  const contentRef = useRef(null)

  const resetPage = () => setPage(0)

  const filtered = useMemo(() => {
    let list = achievements
    if (activeCategory !== 'all') list = list.filter(a => a.category === activeCategory)
    if (activeTier !== 'all') list = list.filter(a => a.tier === activeTier)
    if (showOnlyUnlocked) list = list.filter(a => a.isUnlocked)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.subcategory?.toLowerCase().includes(q)
      )
    }
    const tierOrder = { legendario: 0, diamante: 1, platino: 2, oro: 3, plata: 4, bronce: 5 }
    list.sort((a, b) => {
      if (a.isUnlocked !== b.isUnlocked) return a.isUnlocked ? -1 : 1
      const ta = tierOrder[a.tier] ?? 6
      const tb = tierOrder[b.tier] ?? 6
      if (ta !== tb) return ta - tb
      return a.name.localeCompare(b.name)
    })
    return list
  }, [achievements, activeCategory, activeTier, search, showOnlyUnlocked])

  const subcategories = useMemo(() => {
    const map = new Map()
    const paginated = filtered.slice(0, (page + 1) * PAGE_SIZE)
    paginated.forEach(a => {
      const sub = a.subcategory || 'General'
      if (!map.has(sub)) map.set(sub, [])
      map.get(sub).push(a)
    })
    return map
  }, [filtered, page])

  const unlockedAchievements = useMemo(
    () => achievements.filter(a => a.isUnlocked),
    [achievements]
  )
  const unlockedCount = unlockedAchievements.length
  const totalCount = achievements.length
  const hasMore = filtered.length > (page + 1) * PAGE_SIZE
  const progressPercent = totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0

  return (
    <>
      <Card>
        {/* ── Summary Header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--c-accent)]/10 border border-[var(--c-accent)]/20">
              <FiAward size={16} className="text-[var(--c-accent)]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-white/80 font-title tracking-wide">
                  Logros
                </h2>
                <span className="text-xs font-terminal text-[var(--c-accent)] bg-[var(--c-accent)]/10 px-2 py-0.5 rounded-md border border-[var(--c-accent)]/20">
                  {unlockedCount.toLocaleString()}/{totalCount.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-32 h-1 rounded-full bg-[var(--c-surface-2)] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    style={{ background: 'linear-gradient(90deg, var(--c-primary), var(--c-secondary), var(--c-accent))' }}
                  />
                </div>
                <span className="text-[10px] text-white/25 font-terminal">
                  {progressPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 border border-[var(--c-border)] bg-[var(--c-surface-1)] text-white/50 hover:text-white/80 hover:bg-[var(--c-surface-2)] hover:border-[var(--c-border-2)]"
          >
            {expanded ? (
              <>
                <FiChevronUp size={13} />
                Colapsar
              </>
            ) : (
              <>
                <FiChevronDown size={13} />
                Ver todos
              </>
            )}
          </button>
        </div>

        {/* ── Collapsed View: horizontal scroll of unlocked achievements ── */}
        <AnimatePresence mode="wait">
          {!expanded && (
            <motion.div
              key="collapsed"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              {unlockedCount > 0 ? (
                <div className="mt-4 -mx-1 px-1 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent pb-2">
                  <div className="flex gap-2">
                    {unlockedAchievements.slice(0, 20).map(a => (
                      <CompactAchievementCard key={a.id} achievement={a} />
                    ))}
                    {unlockedAchievements.length > 20 && (
                      <button
                        onClick={() => setExpanded(true)}
                        className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl border border-dashed border-[var(--c-border)] min-w-[72px] max-w-[72px] text-white/30 hover:text-white/50 hover:border-[var(--c-border-2)] transition-all duration-200"
                      >
                        <span className="text-lg">+{unlockedAchievements.length - 20}</span>
                        <span className="text-[9px] font-medium">mas</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-white/20 mt-4">
                  Aun no has desbloqueado logros. Sigue participando para desbloquearlos.
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Expanded View: full grid with filters ── */}
        <AnimatePresence mode="wait">
          {expanded && (
            <motion.div
              key="expanded"
              ref={contentRef}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="pt-4 space-y-3">
                {/* Category tabs */}
                <div className="flex flex-wrap gap-1.5">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setActiveCategory(cat.id); resetPage() }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all border ${
                        activeCategory === cat.id
                          ? 'bg-[var(--c-surface-3)] text-[var(--c-primary)] border-[var(--c-border-2)]'
                          : 'text-white/30 border-transparent hover:text-white/50 hover:bg-[var(--c-surface-1)]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* Filter toggle */}
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-white/20">
                    {filtered.length.toLocaleString()} logros
                    {activeCategory !== 'all' && ` en ${categories.find(c => c.id === activeCategory)?.label}`}
                    {activeTier !== 'all' && ` · ${TIERS.find(t => t.id === activeTier)?.label}`}
                  </p>
                  <button
                    onClick={() => setShowFilter(f => !f)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      showFilter
                        ? 'bg-[var(--c-surface-3)] text-white'
                        : 'text-white/30 hover:text-white/50'
                    }`}
                  >
                    <FiFilter size={13} />
                  </button>
                </div>

                {/* Filters panel */}
                <AnimatePresence>
                  {showFilter && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="flex flex-wrap items-center gap-3 pt-2 pb-3 border-t border-[var(--c-border)]">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[180px]">
                          <FiSearch size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/20" />
                          <input
                            type="text"
                            placeholder="Buscar logro..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); resetPage() }}
                            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[var(--c-surface-1)] border border-[var(--c-border)] text-xs text-white/70 placeholder:text-white/20 outline-none focus:border-[var(--c-border-2)] transition-colors"
                          />
                        </div>

                        {/* Tier filter */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => { setActiveTier('all'); resetPage() }}
                            className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all ${
                              activeTier === 'all'
                                ? 'bg-[var(--c-surface-3)] text-white'
                                : 'text-white/25 hover:text-white/40'
                            }`}
                          >
                            Todos
                          </button>
                          {TIERS.map(t => (
                            <button
                              key={t.id}
                              onClick={() => { setActiveTier(t.id); resetPage() }}
                              className={`px-2 py-1 rounded-md text-[10px] transition-all ${
                                activeTier === t.id
                                  ? 'bg-[var(--c-surface-3)] text-white'
                                  : 'text-white/25 hover:text-white/40'
                              }`}
                              title={t.label}
                            >
                              {t.badge}
                            </button>
                          ))}
                        </div>

                        {/* Unlocked only toggle */}
                        <button
                          onClick={() => { setShowOnlyUnlocked(v => !v); resetPage() }}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                            showOnlyUnlocked
                              ? 'bg-[var(--c-primary)]/10 text-[var(--c-primary)] border-[var(--c-primary)]/30'
                              : 'text-white/30 border-[var(--c-border)] hover:text-white/50'
                          }`}
                        >
                          <FiCheckCircle size={10} /> Desbloqueados
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Grid grouped by subcategory */}
                <div className="space-y-5">
                  {Array.from(subcategories.entries()).map(([sub, items]) => (
                    <div key={sub}>
                      <h3 className="text-[10px] font-semibold text-white/25 uppercase tracking-widest mb-2 flex items-center gap-2">
                        <span className="w-3 h-px bg-white/10" />
                        {sub}
                        <span className="text-white/10">({items.length})</span>
                      </h3>
                      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                        {items.map(a => (
                          <AchievementCard key={a.id} achievement={a} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Load more */}
                {hasMore && (
                  <div className="flex justify-center mt-5">
                    <button
                      onClick={() => setPage(p => p + 1)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--c-surface-1)] border border-[var(--c-border)] text-xs text-white/40 hover:text-white/60 hover:bg-[var(--c-surface-2)] transition-all"
                    >
                      <FiChevronDown size={13} />
                      Cargar mas ({Math.min(PAGE_SIZE, filtered.length - (page + 1) * PAGE_SIZE).toLocaleString()} restantes de {filtered.length.toLocaleString()})
                    </button>
                  </div>
                )}

                {filtered.length === 0 && (
                  <p className="text-center text-xs text-white/20 py-8">
                    No hay logros que coincidan.
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      <UnlockToast achievement={newlyUnlocked} onDismiss={dismissNewUnlock} />
    </>
  )
}
