import { createContext, useContext, useState, useEffect } from 'react'

const THEMES_MAP = {
  default: {
    id: 'default',
    label: 'ATHENIA',
    primary: '#FC651F',
    secondary: '#8B5CF6',
    accent: '#00D1FF',
    bg: '#060304',
    colors: { '--c-primary': '#FC651F', '--c-secondary': '#8B5CF6', '--c-accent': '#00D1FF' },
  },
  ocean: {
    id: 'ocean',
    label: 'Océano',
    primary: '#0EA5E9',
    secondary: '#6366F1',
    accent: '#22D3EE',
    bg: '#030712',
    colors: { '--c-primary': '#0EA5E9', '--c-secondary': '#6366F1', '--c-accent': '#22D3EE' },
  },
  forest: {
    id: 'forest',
    label: 'Bosque',
    primary: '#22C55E',
    secondary: '#10B981',
    accent: '#84CC16',
    bg: '#020D04',
    colors: { '--c-primary': '#22C55E', '--c-secondary': '#10B981', '--c-accent': '#84CC16' },
  },
  sunset: {
    id: 'sunset',
    label: 'Atardecer',
    primary: '#F43F5E',
    secondary: '#EC4899',
    accent: '#FB923C',
    bg: '#0C0204',
    colors: { '--c-primary': '#F43F5E', '--c-secondary': '#EC4899', '--c-accent': '#FB923C' },
  },
  cyber: {
    id: 'cyber',
    label: 'Cyber',
    primary: '#A855F7',
    secondary: '#D946EF',
    accent: '#00FFA3',
    bg: '#05020D',
    colors: { '--c-primary': '#A855F7', '--c-secondary': '#D946EF', '--c-accent': '#00FFA3' },
  },
}

// Export as both map and array
const THEMES = Object.values(THEMES_MAP)

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => {
    return localStorage.getItem('divergencia-theme') || 'ocean'
  })

  const theme = THEMES_MAP[themeId] || THEMES_MAP.default

  useEffect(() => {
    localStorage.setItem('divergencia-theme', themeId)

    // Apply CSS custom properties to root
    const root = document.documentElement
    root.style.setProperty('--c-primary', theme.primary)
    root.style.setProperty('--c-secondary', theme.secondary)
    root.style.setProperty('--c-accent', theme.accent)
    root.style.setProperty('--c-bg', theme.bg)

    // Update shadow vars
    const hexToRgba = (hex, a) => {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      return `rgba(${r},${g},${b},${a})`
    }
    root.style.setProperty('--shadow-primary', `0 0 24px ${hexToRgba(theme.primary, 0.25)}`)
    root.style.setProperty('--shadow-secondary', `0 0 24px ${hexToRgba(theme.secondary, 0.25)}`)
    root.style.setProperty('--shadow-accent', `0 0 24px ${hexToRgba(theme.accent, 0.25)}`)

    // Update body bg
    document.body.style.backgroundColor = theme.bg
  }, [themeId, theme])

  const setTheme = (id) => {
    if (THEMES_MAP[id]) setThemeId(id)
  }

  return (
    <ThemeContext.Provider value={{ theme, themeId, setTheme, themes: THEMES_MAP }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

export { THEMES }
