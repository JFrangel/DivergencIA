import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const STORAGE_KEY = 'divergencia_platform_config'

export const DEFAULT_PLATFORM_CONFIG = {
  platformName: 'DivergencIA',
  logoUrl: '',
  allowPublicRegistration: true,
  requireApproval: false,
  enableAthenia: true,
  enableZenMode: false,
  showPublicRoadmap: false,
  maxUploadSizeMB: '50',
  contactEmail: '',
}

export function getPlatformConfig() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_PLATFORM_CONFIG
    return { ...DEFAULT_PLATFORM_CONFIG, ...JSON.parse(stored) }
  } catch {
    return DEFAULT_PLATFORM_CONFIG
  }
}

export function getPlatformName() {
  return getPlatformConfig().platformName || 'DivergencIA'
}

// Maps Supabase DB row to the frontend config shape
function dbRowToConfig(row) {
  return {
    platformName:            row.nombre_plataforma    ?? DEFAULT_PLATFORM_CONFIG.platformName,
    logoUrl:                 row.logo_url             ?? '',
    allowPublicRegistration: row.registro_publico     ?? DEFAULT_PLATFORM_CONFIG.allowPublicRegistration,
    requireApproval:         row.requiere_aprobacion  ?? DEFAULT_PLATFORM_CONFIG.requireApproval,
    enableAthenia:           row.athenia_activo       ?? DEFAULT_PLATFORM_CONFIG.enableAthenia,
    enableZenMode:           row.zen_mode_activo      ?? DEFAULT_PLATFORM_CONFIG.enableZenMode,
    showPublicRoadmap:       row.roadmap_publico      ?? DEFAULT_PLATFORM_CONFIG.showPublicRoadmap,
    maxUploadSizeMB:         String(row.max_upload_mb ?? DEFAULT_PLATFORM_CONFIG.maxUploadSizeMB),
    contactEmail:            row.email_contacto       ?? '',
  }
}

export function usePlatformConfig() {
  // Start from localStorage for instant render (no flash)
  const [config, setConfig] = useState(getPlatformConfig)

  useEffect(() => {
    // Load authoritative values from Supabase on mount
    supabase
      .from('configuracion_plataforma')
      .select('*')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (!data) return
        const fresh = dbRowToConfig(data)
        setConfig(fresh)
        // Keep localStorage in sync so subsequent page loads are instant
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
      })
      .catch(() => { /* fall back silently to localStorage */ })

    // Also react to explicit saves from PlatformConfig (same tab)
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setConfig(getPlatformConfig())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return config
}
