import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ThemeContext } from './theme-context'
import type { Theme } from './theme-context'
import { clearBackgroundImage, getBackgroundImage, saveBackgroundImage } from '../db/settings'

const STORAGE_KEY = 'fitcoach-theme'

function hexToRgbChannels(hex: string): string {
  const clean = hex.replace('#', '')
  const expanded = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  const value = parseInt(expanded, 16)
  const r = (value >> 16) & 0xff
  const g = (value >> 8) & 0xff
  const b = value & 0xff
  return `${r} ${g} ${b}`
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored === 'light' || stored === 'dark') return stored
    } catch {
      // localStorage 不可用（如隐私模式）时忽略
    }
    return 'dark' // 默认暗黑模式
  })

  const [backgroundImage, setBackgroundImageState] = useState<string | null>(null)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')

    // 让浏览器状态栏颜色跟随主题
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0f172a' : '#f8fafc')

    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // ignore
    }
  }, [theme])

  // 启动时从 IndexedDB 恢复背景图
  useEffect(() => {
    getBackgroundImage()
      .then((url) => {
        if (url) setBackgroundImageState(url)
      })
      .catch(() => {})
  }, [])

  const setTheme = (next: Theme) => setThemeState(next)
  const toggleTheme = () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'))

  const setPrimaryColor = (color: string) => {
    document.documentElement.style.setProperty('--color-primary', hexToRgbChannels(color))
  }

  const setBackgroundImage = useCallback(async (url: string | null) => {
    setBackgroundImageState(url)
    try {
      if (url) await saveBackgroundImage(url)
      else await clearBackgroundImage()
    } catch (err) {
      console.error('背景图持久化失败：', err)
    }
  }, [])

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, setTheme, setPrimaryColor, backgroundImage, setBackgroundImage }}
    >
      {children}
    </ThemeContext.Provider>
  )
}
