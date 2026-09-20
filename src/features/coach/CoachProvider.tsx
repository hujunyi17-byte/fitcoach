import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CoachContext } from './CoachContext'
import ProactiveCoach from './ProactiveCoach'

function requestNotifyPermission() {
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  } catch {
    /* ignore */
  }
}

function systemNotify(text: string) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('FitCoach 教练提示', { body: text })
    }
  } catch {
    /* ignore */
  }
}

export function CoachProvider({ children }: { children: ReactNode }) {
  const [tip, setTip] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 首次加载请求系统通知权限
  useEffect(() => {
    requestNotifyPermission()
  }, [])

  const showTip = useCallback((text: string) => {
    setTip(text)
    systemNotify(text)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setTip(null), 5000)
  }, [])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <CoachContext.Provider value={{ showTip }}>
      {children}
      <ProactiveCoach />
      <AnimatePresence>
        {tip && (
          <motion.div
            initial={{ y: 120, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 120, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed inset-x-4 z-[60]"
            style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
          >
            <div className="flex items-start gap-3 rounded-2xl border border-white/10 bg-[#1e1b4b]/90 p-4 shadow-xl backdrop-blur-xl">
              <span className="text-xl">🏋️</span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-primary">教练提示</p>
                <p className="mt-0.5 text-sm text-foreground">{tip}</p>
              </div>
              <button type="button" onClick={() => setTip(null)} className="shrink-0 text-muted" aria-label="关闭">
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </CoachContext.Provider>
  )
}
