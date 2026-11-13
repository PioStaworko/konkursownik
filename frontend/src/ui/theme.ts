import { useCallback, useState } from 'react'

export type Theme = 'dark' | 'light'

export const THEME_KEY = 'theme'

// Keep in sync with the inline <script id="theme-init"> in index.html (a test checks both agree).
export function readTheme(storage: Storage | null): Theme {
  try {
    return storage?.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement) {
  root.classList.toggle('dark', theme === 'dark')
}

function safeStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => readTheme(safeStorage()))
  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    try {
      safeStorage()?.setItem(THEME_KEY, next)
    } catch {
      // storage unavailable: the theme still applies for this session
    }
    setTheme(next)
  }, [theme])
  return { theme, toggle }
}
