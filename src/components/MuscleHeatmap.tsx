import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { todayStr } from '../lib/dates'
import type { MuscleGroup } from '../db/types'

const GRAY = '#334155'

function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`).getTime()
  const dbTime = new Date(`${b}T00:00:00`).getTime()
  return Math.round((dbTime - da) / 86400000)
}

function heatColor(daysAgo: number | null): string {
  if (daysAgo == null || daysAgo > 3) return GRAY
  if (daysAgo <= 1) return '#ef4444'
  if (daysAgo === 2) return '#f97316'
  return '#fb923c'
}

export default function MuscleHeatmap() {
  const logs = useLiveQuery(() => db.workoutLogs.orderBy('date').reverse().toArray(), [])
  const exercises = useLiveQuery(() => db.exercises.toArray(), [])

  if (!logs || !exercises) return <div className="h-56" />

  const exMap = new Map(exercises.map((e) => [e.id, e.muscleGroup]))
  const today = todayStr()
  const trained: Partial<Record<MuscleGroup, number>> = {}

  for (const log of logs) {
    const mg = exMap.get(log.exerciseId)
    if (!mg) continue
    const ago = daysBetween(log.date, today)
    if (ago < 0 || ago > 3) continue
    if (trained[mg] == null || ago < trained[mg]!) trained[mg] = ago
  }

  const armAgo = Math.min(trained.biceps ?? Infinity, trained.triceps ?? Infinity)

  const c = {
    chest: heatColor(trained.chest ?? null),
    back: heatColor(trained.back ?? null),
    shoulders: heatColor(trained.shoulders ?? null),
    arms: heatColor(armAgo === Infinity ? null : armAgo),
    legs: heatColor(trained.legs ?? null),
    core: heatColor(trained.core ?? null),
  }

  return (
    <div>
      <svg viewBox="0 0 200 300" className="mx-auto h-56 w-auto">
        <circle cx="100" cy="26" r="18" fill={GRAY} />
        <rect x="94" y="42" width="12" height="12" rx="4" fill={GRAY} />
        <ellipse cx="71" cy="62" rx="19" ry="12" fill={c.shoulders} />
        <ellipse cx="129" cy="62" rx="19" ry="12" fill={c.shoulders} />
        <rect x="47" y="58" width="15" height="82" rx="7" fill={c.arms} />
        <rect x="138" y="58" width="15" height="82" rx="7" fill={c.arms} />
        <ellipse cx="83" cy="88" rx="16" ry="19" fill={c.chest} />
        <ellipse cx="117" cy="88" rx="16" ry="19" fill={c.chest} />
        <ellipse cx="66" cy="128" rx="12" ry="30" fill={c.back} />
        <ellipse cx="134" cy="128" rx="12" ry="30" fill={c.back} />
        <rect x="88" y="116" width="24" height="50" rx="11" fill={c.core} />
        <rect x="80" y="168" width="18" height="112" rx="9" fill={c.legs} />
        <rect x="102" y="168" width="18" height="112" rx="9" fill={c.legs} />
      </svg>

      <div className="mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted">
        <Legend color={c.chest} label="胸" />
        <Legend color={c.back} label="背" />
        <Legend color={c.shoulders} label="肩" />
        <Legend color={c.arms} label="二头/三头" />
        <Legend color={c.legs} label="腿" />
        <Legend color={c.core} label="核心" />
      </div>
    </div>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}
