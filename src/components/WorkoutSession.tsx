import { useState } from 'react'
import { MUSCLE_GROUP_LABELS } from '../db/types'
import type { Exercise, UserExerciseSetting, WorkoutLog } from '../db/types'
import { todayStr } from '../lib/dates'
import RestTimer from './RestTimer'

const REST_SECONDS = 90

interface Row {
  exercise: Exercise
  setting?: UserExerciseSetting
}

interface WorkoutSessionProps {
  dayId: string
  rows: Row[]
  onFinish: (logs: WorkoutLog[]) => void
  onExit: () => void
}

interface PlannedSet {
  exerciseId: string
  setIndex: number
}

function buildSets(rows: Row[]): PlannedSet[] {
  const sets: PlannedSet[] = []
  for (const r of rows) {
    const n = r.setting?.targetSets ?? r.exercise.defaultSets ?? 4
    for (let i = 1; i <= n; i++) sets.push({ exerciseId: r.exercise.id, setIndex: i })
  }
  return sets
}

export default function WorkoutSession({ dayId, rows, onFinish, onExit }: WorkoutSessionProps) {
  const [sets] = useState<PlannedSet[]>(() => buildSets(rows))
  const [current, setCurrent] = useState(0)
  const [resting, setResting] = useState(false)
  const [restReady, setRestReady] = useState(false)
  const [logs, setLogs] = useState<WorkoutLog[]>([])

  const total = sets.length
  const planned = sets[current]
  const row = rows.find((r) => r.exercise.id === planned?.exerciseId)

  function completeSet(weight: number, reps: number) {
    if (!planned) return
    const entry: WorkoutLog = {
      exerciseId: planned.exerciseId,
      workoutDayId: dayId,
      date: todayStr(),
      setIndex: planned.setIndex,
      weight,
      reps,
      completedAt: Date.now(),
    }
    const nextLogs = [...logs, entry]
    setLogs(nextLogs)
    if (current + 1 >= total) {
      onFinish(nextLogs)
    } else {
      setCurrent(current + 1)
      setRestReady(true)
    }
  }

  function handleExit() {
    if (window.confirm('确定退出训练？本次记录将不会保存。')) onExit()
  }

  if (!planned || !row) {
    return <div className="flex flex-1 items-center justify-center p-5 text-muted">没有可训练的动作</div>
  }

  const progressPct = total ? Math.round((current / total) * 100) : 0

  return (
    <div className="flex flex-1 flex-col">
      {/* 顶栏 + 进度 */}
      <div className="p-5 pb-0">
        <div className="flex items-center justify-between">
          <button type="button" onClick={handleExit} className="text-sm text-muted">
            退出
          </button>
          <span className="text-sm font-medium text-muted">
            第 {current + 1} / {total} 组
          </span>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {resting ? (
        <div className="flex flex-1 items-center justify-center p-5">
          <RestTimer duration={REST_SECONDS} onComplete={() => setResting(false)} onSkip={() => setResting(false)} />
        </div>
      ) : restReady ? (
        <div className="flex flex-1 flex-col items-center justify-center p-5">
          <p className="text-sm text-muted">本组完成！</p>
          <button
            type="button"
            onClick={() => {
              setRestReady(false)
              setResting(true)
            }}
            className="mt-6 flex h-24 w-24 items-center justify-center rounded-full bg-primary text-base font-bold text-white active:opacity-90"
          >
            开始休息
          </button>
          <button
            type="button"
            onClick={() => setRestReady(false)}
            className="mt-4 rounded-xl border border-border px-6 py-2 text-sm text-muted active:opacity-70"
          >
            跳过休息
          </button>
        </div>
      ) : (
        <SetLogger
          key={`${current}-${planned.exerciseId}`}
          exercise={row.exercise}
          setting={row.setting}
          setNumber={planned.setIndex}
          onComplete={completeSet}
        />
      )}
    </div>
  )
}

function SetLogger({ exercise, setting, setNumber, onComplete }: {
  exercise: Exercise
  setting?: UserExerciseSetting
  setNumber: number
  onComplete: (weight: number, reps: number) => void
}) {
  const [weight, setWeight] = useState(setting?.currentWeightMax ?? 0)
  const [reps, setReps] = useState(setting?.targetRepsMax ?? 10)

  return (
    <div className="flex flex-1 flex-col p-5">
      <div className="flex-1">
        <p className="text-sm text-muted">
          {MUSCLE_GROUP_LABELS[exercise.muscleGroup]} · 第 {setNumber} 组
        </p>
        <h2 className="mt-1 text-2xl font-bold">{exercise.name}</h2>

        <div className="mt-8 grid grid-cols-2 gap-4">
          <Stepper label="重量" value={weight} step={2.5} suffix="kg" onChange={setWeight} />
          <Stepper label="次数" value={reps} step={1} suffix="次" onChange={setReps} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => onComplete(weight, reps)}
        className="mt-6 w-full rounded-xl bg-primary py-3.5 text-lg font-semibold text-white active:opacity-90"
      >
        完成本组
      </button>
    </div>
  )
}

function Stepper({ label, value, step, suffix, onChange }: {
  label: string
  value: number
  step: number
  suffix: string
  onChange: (v: number) => void
}) {
  const round = (v: number) => Math.round(v * 10) / 10
  return (
    <div className="rounded-2xl bg-surface p-4 text-center">
      <p className="text-sm text-muted">{label}</p>
      <div className="mt-2 flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onChange(round(Math.max(0, value - step)))}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-background text-xl font-semibold active:opacity-70"
        >
          −
        </button>
        <span className="w-16 text-center text-2xl font-bold tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(round(value + step))}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-background text-xl font-semibold active:opacity-70"
        >
          +
        </button>
      </div>
      <p className="mt-1.5 text-xs text-muted">{suffix}</p>
    </div>
  )
}
