import { useEffect, useRef, useState } from 'react'
import { speak } from '../lib/speech'

interface RestTimerProps {
  duration: number // 初始秒数
  onComplete: () => void
  onSkip: () => void
}

function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // 部分浏览器（如 iOS Safari）不支持震动
  }
}

export default function RestTimer({ duration, onComplete, onSkip }: RestTimerProps) {
  const [remaining, setRemaining] = useState(duration)
  const [total, setTotal] = useState(duration)
  const [paused, setPaused] = useState(false)
  const completeRef = useRef(onComplete)
  completeRef.current = onComplete

  // 每秒递减（暂停时停止）
  useEffect(() => {
    if (paused || remaining <= 0) return
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000)
    return () => clearTimeout(id)
  }, [paused, remaining])

  // 归零：震动 + 语音播报 + 回调
  useEffect(() => {
    if (remaining === 0) {
      vibrate([300, 120, 300])
      speak('休息结束，开始下一组')
      completeRef.current()
    }
  }, [remaining])

  function addSeconds(n: number) {
    setRemaining((r) => Math.max(0, r + n))
    setTotal((t) => Math.max(1, t + n))
  }

  const progress = total > 0 ? Math.min(1, remaining / total) : 0
  const danger = remaining <= 10
  const warning = remaining <= 30
  const color = danger ? '#ef4444' : warning ? '#f59e0b' : '#10b981'

  const R = 80
  const C = 2 * Math.PI * R
  const offset = C * (1 - progress)

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg viewBox="0 0 200 200" className="h-52 w-52">
          <circle cx="100" cy="100" r={R} fill="none" stroke="currentColor" strokeOpacity="0.12" strokeWidth="10" />
          <circle
            cx="100"
            cy="100"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
            transform="rotate(-90 100 100)"
            style={{ transition: 'stroke-dashoffset 0.2s linear, stroke 0.3s' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-5xl font-bold tabular-nums ${danger ? 'text-red-500' : 'text-foreground'}`}>
            {remaining}
          </span>
          <span className="text-sm text-muted">秒</span>
        </div>
      </div>

      <p className="mt-4 text-sm font-medium text-muted">组间休息</p>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={() => addSeconds(-30)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-sm font-semibold active:opacity-70"
        >
          −30
        </button>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-base font-semibold text-white active:opacity-90"
        >
          {paused ? '继续' : '暂停'}
        </button>
        <button
          type="button"
          onClick={() => addSeconds(30)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-sm font-semibold active:opacity-70"
        >
          +30
        </button>
      </div>

      <button
        type="button"
        onClick={onSkip}
        className="mt-4 rounded-xl border border-border px-8 py-2.5 font-medium text-muted active:opacity-70"
      >
        跳过休息
      </button>
    </div>
  )
}
