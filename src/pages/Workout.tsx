import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Exercise, UserExerciseSetting, WorkoutLog } from '../db/types'
import { todayStr, weekdayLabel } from '../lib/dates'
import { deferToday } from '../db/schedule'
import ExerciseEditModal from '../components/ExerciseEditModal'
import WorkoutSession from '../components/WorkoutSession'
import DemoLink from '../components/DemoLink'
import Skeleton from '../components/Skeleton'
import { incrementWorkout } from '../lib/gamification'

interface WorkoutProps {
  dayId: string | null
  onGoHome: () => void
  onDeferred: () => void
}

interface Row {
  exercise: Exercise
  setting?: UserExerciseSetting
}

function eff(row: Row) {
  const sets = row.setting?.targetSets ?? row.exercise.defaultSets ?? 4
  const repsMin = row.setting?.targetRepsMin ?? row.exercise.defaultRepsMin ?? 10
  const repsMax = row.setting?.targetRepsMax ?? row.exercise.defaultRepsMax ?? 12
  return {
    sets,
    repsMin,
    repsMax,
    weightMin: row.setting?.currentWeightMin,
    weightMax: row.setting?.currentWeightMax,
  }
}

function ExerciseCard({ row, onEdit }: { row: Row; onEdit: (row: Row) => void }) {
  const e = eff(row)
  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="truncate font-medium">{row.exercise.name}</p>
          <p className="mt-1 text-sm text-muted">
            {e.sets} 组 × {e.repsMin}–{e.repsMax} 次
            {e.weightMin != null && e.weightMax != null ? ` · ${e.weightMin}–${e.weightMax} kg` : ''}
          </p>
        </div>
        <div className="ml-3 flex shrink-0 items-center gap-2">
          <DemoLink exercise={row.exercise} />
          <button
            type="button"
            onClick={() => onEdit(row)}
            className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm text-muted active:opacity-70"
          >
            编辑
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Workout({ dayId, onGoHome, onDeferred }: WorkoutProps) {
  const today = todayStr()
  const todayEntry = useLiveQuery(() => db.schedule.get(today), [today])
  const effectiveDayId = dayId ?? todayEntry?.workoutDayId ?? null

  const data = useLiveQuery(async () => {
    if (!effectiveDayId) return null
    const day = await db.workoutDays.get(effectiveDayId)
    if (!day) return null

    const requiredIds = day.exerciseIds
    const optionalIds = day.optionalExerciseIds ?? []

    const buildRows = async (ids: string[]) => {
      const [exArr, setArr] = await Promise.all([
        db.exercises.bulkGet(ids),
        db.userExerciseSettings.bulkGet(ids),
      ])
      const rows: Row[] = []
      ids.forEach((_id, i) => {
        const exercise = exArr[i]
        if (exercise) rows.push({ exercise, setting: setArr[i] })
      })
      return rows
    }

    const [rows, optionalRows] = await Promise.all([buildRows(requiredIds), buildRows(optionalIds)])
    return { day, rows, optionalRows }
  }, [effectiveDayId])

  const [editing, setEditing] = useState<Row | null>(null)
  const [sessionActive, setSessionActive] = useState(false)
  const [doneCount, setDoneCount] = useState(0)
  const [deferred, setDeferred] = useState(false)

  const isTodayWorkout = effectiveDayId != null && effectiveDayId === todayEntry?.workoutDayId

  async function handleDefer() {
    await deferToday()
    setDeferred(true)
    onDeferred()
  }

  async function finishSession(logs: WorkoutLog[]) {
    try {
      if (logs.length) {
        await db.workoutLogs.bulkAdd(logs)
        await incrementWorkout()
      }
    } catch (err) {
      console.error('保存训练记录失败：', err)
    }
    setDoneCount(logs.length)
    setSessionActive(false)
  }

  if (sessionActive) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background pt-[env(safe-area-inset-top)]">
        <WorkoutSession
          dayId={effectiveDayId ?? 'unknown'}
          rows={data?.rows ?? []}
          onFinish={finishSession}
          onExit={() => setSessionActive(false)}
        />
      </div>
    )
  }

  if (!effectiveDayId) {
    return <RestView deferred={deferred} onGoHome={onGoHome} />
  }

  if (!data) {
    return (
      <div className="space-y-3 p-5">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    )
  }

  if (data.day.isRestDay || data.rows.length === 0) {
    return <RestView deferred={deferred} onGoHome={onGoHome} />
  }

  return (
    <div>
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{data.day.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {weekdayLabel(today)} · {data.rows.length} 个动作
            </p>
          </div>
          {isTodayWorkout && (
            <button
              type="button"
              onClick={handleDefer}
              className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm text-muted active:opacity-70"
            >
              顺延计划
            </button>
          )}
        </div>

        {doneCount > 0 && (
          <div className="mt-4 rounded-xl bg-primary/10 px-4 py-3 text-sm font-medium text-primary">
            已记录 {doneCount} 组，干得漂亮！💪
          </div>
        )}

        <div className="mt-4 space-y-3">
          {data.rows.map((row) => (
            <ExerciseCard key={row.exercise.id} row={row} onEdit={setEditing} />
          ))}
        </div>

        {data.optionalRows.length > 0 && (
          <>
            <p className="mt-5 mb-2 text-sm font-semibold text-muted">可选动作（自由添加）</p>
            <div className="space-y-3">
              {data.optionalRows.map((row) => (
                <ExerciseCard key={row.exercise.id} row={row} onEdit={setEditing} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="sticky bottom-0 border-t border-border bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={() => setSessionActive(true)}
          className="w-full rounded-xl bg-primary py-3.5 text-lg font-semibold text-white active:opacity-90"
        >
          开始训练
        </button>
      </div>

      {editing && (
        <ExerciseEditModal
          exercise={editing.exercise}
          setting={editing.setting}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function RestView({ deferred, onGoHome }: { deferred: boolean; onGoHome: () => void }) {
  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold">训练</h1>
      <div className="mt-6 flex flex-col items-center rounded-2xl bg-surface p-8 text-center">
        <span className="text-5xl" role="img" aria-label="休息">
          🧘
        </span>
        <p className="mt-4 text-lg font-semibold">{deferred ? '已顺延，今天好好休息' : '今天是休息日'}</p>
        <p className="mt-1 text-sm text-muted">
          {deferred ? '今天的训练已推迟到明天' : '恢复是为了下一次更好地变强'}
        </p>
        <button
          type="button"
          onClick={onGoHome}
          className="mt-6 rounded-xl bg-primary px-6 py-2.5 font-medium text-white active:opacity-90"
        >
          返回计划
        </button>
      </div>
    </div>
  )
}
