import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const STORAGE_KEY = 'divergencia_learning_progress'

/**
 * Manages learning progress: sections completed, quiz scores.
 * Tries Supabase table 'progreso_aprendizaje' first, falls back to localStorage.
 */
export function useLearningProgress() {
  const { user } = useAuth()
  const [progress, setProgress] = useState({})
  const [useLocal, setUseLocal] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // ── Load progress ──────────────────────────────────────────────────────
  const loadProgress = useCallback(async () => {
    if (!user?.id) {
      // Not logged in — use localStorage
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        setProgress(raw ? JSON.parse(raw) : {})
      } catch { setProgress({}) }
      setUseLocal(true)
      setLoaded(true)
      return
    }

    // Try Supabase first
    try {
      const { data, error } = await supabase
        .from('progreso_aprendizaje')
        .select('*')
        .eq('usuario_id', user.id)

      if (error) throw error

      // Convert array of rows to a map keyed by tema_id
      const map = {}
      ;(data || []).forEach(row => {
        map[row.tema_id] = {
          completedSections: row.secciones_completadas || [],
          quizScores: row.quiz_scores || {},
          completed: row.completado || false,
          lastAccessed: row.ultimo_acceso,
        }
      })
      setProgress(map)
      setUseLocal(false)
    } catch {
      // Table doesn't exist or error — fallback to localStorage
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        setProgress(raw ? JSON.parse(raw) : {})
      } catch { setProgress({}) }
      setUseLocal(true)
    }
    setLoaded(true)
  }, [user?.id])

  useEffect(() => { loadProgress() }, [loadProgress])

  // ── Persist helper ─────────────────────────────────────────────────────
  const persist = useCallback(async (topicId, entry) => {
    if (useLocal || !user?.id) {
      const next = { ...progress, [topicId]: entry }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return
    }

    try {
      await supabase
        .from('progreso_aprendizaje')
        .upsert({
          usuario_id: user.id,
          tema_id: topicId,
          secciones_completadas: entry.completedSections,
          quiz_scores: entry.quizScores,
          completado: entry.completed,
          ultimo_acceso: new Date().toISOString(),
        }, { onConflict: 'usuario_id,tema_id' })
    } catch {
      // Fallback: save to localStorage
      const next = { ...progress, [topicId]: entry }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    }
  }, [useLocal, user?.id, progress])

  // ── Mark section complete ──────────────────────────────────────────────
  const markSectionComplete = useCallback((topicId, sectionIndex, totalSections) => {
    setProgress(prev => {
      const existing = prev[topicId] || { completedSections: [], quizScores: {}, completed: false }
      const sections = new Set(existing.completedSections)
      sections.add(sectionIndex)
      const completedArr = [...sections]
      const isComplete = completedArr.length >= totalSections

      const entry = {
        ...existing,
        completedSections: completedArr,
        completed: isComplete,
        lastAccessed: new Date().toISOString(),
      }

      const next = { ...prev, [topicId]: entry }
      // persist outside setState
      setTimeout(() => persist(topicId, entry), 0)

      // Also save to localStorage as immediate backup
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}

      return next
    })
  }, [persist])

  // ── Unmark section ─────────────────────────────────────────────────────
  const unmarkSection = useCallback((topicId, sectionIndex) => {
    setProgress(prev => {
      const existing = prev[topicId] || { completedSections: [], quizScores: {}, completed: false }
      const sections = new Set(existing.completedSections)
      sections.delete(sectionIndex)
      const completedArr = [...sections]

      const entry = {
        ...existing,
        completedSections: completedArr,
        completed: false,
        lastAccessed: new Date().toISOString(),
      }

      const next = { ...prev, [topicId]: entry }
      setTimeout(() => persist(topicId, entry), 0)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}

      return next
    })
  }, [persist])

  // ── Save quiz score ────────────────────────────────────────────────────
  const saveQuizScore = useCallback((topicId, sectionIndex, correct, total) => {
    setProgress(prev => {
      const existing = prev[topicId] || { completedSections: [], quizScores: {}, completed: false }
      const quizScores = { ...existing.quizScores }
      quizScores[sectionIndex] = { correct, total, date: new Date().toISOString() }

      const entry = { ...existing, quizScores, lastAccessed: new Date().toISOString() }

      const next = { ...prev, [topicId]: entry }
      setTimeout(() => persist(topicId, entry), 0)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}

      return next
    })
  }, [persist])

  // ── Getters ────────────────────────────────────────────────────────────
  const getTopicProgress = useCallback((topicId, totalSections) => {
    const entry = progress[topicId]
    if (!entry) return { percent: 0, completedSections: [], quizScores: {}, completed: false }
    const completed = entry.completedSections?.length || 0
    const percent = totalSections > 0 ? Math.round((completed / totalSections) * 100) : 0
    return { percent, ...entry }
  }, [progress])

  return {
    progress,
    loaded,
    markSectionComplete,
    unmarkSection,
    saveQuizScore,
    getTopicProgress,
  }
}

/**
 * Hook to compute aggregate learning stats for profile display.
 */
export function useLearningStats(topics = []) {
  const { progress, loaded } = useLearningProgress()

  const stats = useMemo(() => {
    if (!loaded || !topics.length) {
      return {
        topicsStarted: 0,
        topicsCompleted: 0,
        totalSectionsCompleted: 0,
        totalQuizzesTaken: 0,
        totalQuizzesCorrect: 0,
        averageQuizScore: 0,
        byCategory: {},
        streak: 0,
      }
    }

    let topicsStarted = 0
    let topicsCompleted = 0
    let totalSectionsCompleted = 0
    let totalQuizzesTaken = 0
    let totalQuizzesCorrect = 0
    const byCategory = {}

    Object.entries(progress).forEach(([topicId, entry]) => {
      const topic = topics.find(t => t.id === topicId)
      const sectionsCount = entry.completedSections?.length || 0
      if (sectionsCount > 0) topicsStarted++
      if (entry.completed) topicsCompleted++
      totalSectionsCompleted += sectionsCount

      // Quiz scores
      Object.values(entry.quizScores || {}).forEach(q => {
        totalQuizzesTaken++
        if (q.correct) totalQuizzesCorrect += q.correct
      })

      // By category
      if (topic?.categoria) {
        if (!byCategory[topic.categoria]) byCategory[topic.categoria] = { started: 0, completed: 0 }
        if (sectionsCount > 0) byCategory[topic.categoria].started++
        if (entry.completed) byCategory[topic.categoria].completed++
      }
    })

    const averageQuizScore = totalQuizzesTaken > 0
      ? Math.round((totalQuizzesCorrect / totalQuizzesTaken) * 100)
      : 0

    return {
      topicsStarted,
      topicsCompleted,
      totalSectionsCompleted,
      totalQuizzesTaken,
      totalQuizzesCorrect,
      averageQuizScore,
      byCategory,
      streak: topicsCompleted, // simplified streak
    }
  }, [progress, topics, loaded])

  return stats
}
