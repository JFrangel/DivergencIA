import { useState, useEffect } from 'react'

const STORAGE_KEY = 'divergencia_platform_config'

export const DEFAULT_PLATFORM_CONFIG = {
  platformName: 'ATHENIA',
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
  return getPlatformConfig().platformName || 'ATHENIA'
}

export function usePlatformConfig() {
  const [config, setConfig] = useState(getPlatformConfig)

  useEffect(() => {
    // Sync with storage events (from other tabs or PlatformConfig saves)
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) setConfig(getPlatformConfig())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return config
}
