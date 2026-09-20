import { createContext, useContext } from 'react'

export type Theme = 'light' | 'dark'

export interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  setTheme: (theme: Theme) => void
  /** 用户自定义主色调，传入 #hex，例如 setPrimaryColor('#6366f1') */
  setPrimaryColor: (color: string) => void
  /** 当前背景图（data URL），null 表示未设置 */
  backgroundImage: string | null
  /** 设置/清除全局背景图（持久化到 IndexedDB），传 null 清除 */
  setBackgroundImage: (url: string | null) => Promise<void>
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme 必须在 <ThemeProvider> 内部使用')
  }
  return ctx
}
