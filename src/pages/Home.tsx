import { lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { MUSCLE_GROUP_LABELS } from '../db/types'
import { todayStr, weekdayLabel } from '../lib/dates'
import MuscleHeatmap from '../components/MuscleHeatmap'
import Skeleton from '../components/Skeleton'

// 按需加载数据看板（recharts 较大，拆成独立 chunk）
const HomeDashboard = lazy(() => import('../components/HomeDashboard'))

interface HomeProps {
  onOpenWorkout: (dayId: string) => void
}

export default function Home({ onOpenWorkout }: HomeProps) {
  const today = todayStr()
  const days = useLiveQuery(() => db.workoutDays.orderBy('id').toArray(), [])
  const todayEntry = useLiveQuery(() => db.schedule.get(today), [today])

  if (!days) {
    return (
      <div className="space-y-3 p-5">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    )
  }

  const todayWorkoutId = todayEntry?.workoutDayId

  return (
    <div className="p-5">
      {/* 数据看板 */}
      <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-white/10" />}>
        <HomeDashboard />
      </Suspense>

      {/* 肌肉热力图 */}
      <div className="mt-4 rounded-2xl bg-surface p-4">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">肌肉热力图</h2>
          <span className="text-xs text-muted">近 3 天</span>
        </div>
        <MuscleHeatmap />
      </div>

      <header className="mb-4 mt-4">
        <h1 className="text-2xl font-bold">训练计划</h1>
        <p className="mt-1 text-sm text-muted">{weekdayLabel(today)} · 三分化循环（练 3 休 1）</p>
      </header>

      {!todayWorkoutId && (
        <div className="mb-3 rounded-xl bg-surface px-4 py-3 text-sm text-muted">
          今天休息，从明天继续 💪
        </div>
      )}

      <div className="space-y-3">
        {days.map((day) => {
          const isToday = day.id === todayWorkoutId
          return (
            <motion.button
              key={day.id}
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => onOpenWorkout(day.id)}
              className={`w-full rounded-2xl border p-4 text-left transition-colors active:opacity-80 ${
                isToday ? 'border-primary bg-primary/10' : 'border-border bg-surface'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{day.name}</span>
                {isToday && (
                  <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-white">
                    今天
                  </span>
                )}
              </div>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {day.isRestDay ? (
                  <span className="text-sm text-muted">放松恢复</span>
                ) : (
                  day.focus.map((g) => (
                    <span
                      key={g}
                      className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-muted ring-1 ring-white/10"
                    >
                      {MUSCLE_GROUP_LABELS[g]}
                    </span>
                  ))
                )}
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
