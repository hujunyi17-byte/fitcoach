import { createContext, useContext } from 'react'

export interface CoachContextValue {
  showTip: (text: string) => void
}

export const CoachContext = createContext<CoachContextValue | undefined>(undefined)

export function useCoach(): CoachContextValue {
  const ctx = useContext(CoachContext)
  if (!ctx) {
    throw new Error('useCoach 必须在 <CoachProvider> 内部使用')
  }
  return ctx
}
