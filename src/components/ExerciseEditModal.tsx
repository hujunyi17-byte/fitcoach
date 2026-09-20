import { useState } from 'react'
import type { ReactNode } from 'react'
import { db } from '../db/db'
import { MUSCLE_GROUP_LABELS } from '../db/types'
import type { Exercise, UserExerciseSetting } from '../db/types'
import Modal from './Modal'

const inputCls = 'rounded-lg border border-border bg-background px-3 py-2 text-right text-sm'

function parseNum(v: string): number {
  const n = Number.parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

interface Props {
  exercise: Exercise
  setting?: UserExerciseSetting
  onClose: () => void
}

export default function ExerciseEditModal({ exercise, setting, onClose }: Props) {
  const [sets, setSets] = useState(setting?.targetSets ?? exercise.defaultSets ?? 4)
  const [repsMin, setRepsMin] = useState(setting?.targetRepsMin ?? exercise.defaultRepsMin ?? 10)
  const [repsMax, setRepsMax] = useState(setting?.targetRepsMax ?? exercise.defaultRepsMax ?? 12)
  const [weightMin, setWeightMin] = useState(setting?.currentWeightMin ?? 0)
  const [weightMax, setWeightMax] = useState(setting?.currentWeightMax ?? 0)

  async function handleSave() {
    await db.userExerciseSettings.put({
      exerciseId: exercise.id,
      targetSets: sets,
      targetRepsMin: Math.min(repsMin, repsMax),
      targetRepsMax: Math.max(repsMin, repsMax),
      currentWeightMin: Math.min(weightMin, weightMax),
      currentWeightMax: Math.max(weightMin, weightMax),
      updatedAt: Date.now(),
    })
    onClose()
  }

  return (
    <Modal title={exercise.name} onClose={onClose}>
      <p className="-mt-2 mb-4 text-sm text-muted">
        {MUSCLE_GROUP_LABELS[exercise.muscleGroup]} · {exercise.equipment ?? '自由重量'}
      </p>

      <div className="space-y-5">
        <Field label="目标组数" suffix="组">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={20}
            value={sets}
            onChange={(e) => setSets(parseNum(e.target.value))}
            className={`${inputCls} w-24`}
          />
        </Field>

        <Field label="目标次数" suffix="次">
          <RangeInput a={repsMin} b={repsMax} onA={setRepsMin} onB={setRepsMax} min={1} max={50} />
        </Field>

        <Field label="当前重量" suffix="kg">
          <RangeInput a={weightMin} b={weightMax} onA={setWeightMin} onB={setWeightMax} min={0} max={500} step={2.5} />
        </Field>
      </div>

      <div className="mt-6 flex gap-3">
        <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-3 font-medium text-foreground">
          取消
        </button>
        <button type="button" onClick={handleSave} className="flex-1 rounded-xl bg-primary py-3 font-medium text-white active:opacity-90">
          保存
        </button>
      </div>
    </Modal>
  )
}

function Field({ label, suffix, children }: { label: string; suffix: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-sm text-muted">{label}</p>
      <div className="flex items-center gap-2">
        {children}
        <span className="shrink-0 text-xs text-muted">{suffix}</span>
      </div>
    </div>
  )
}

function RangeInput({ a, b, onA, onB, min, max, step = 1 }: {
  a: number
  b: number
  onA: (v: number) => void
  onB: (v: number) => void
  min: number
  max: number
  step?: number
}) {
  return (
    <div className="flex flex-1 items-center gap-2">
      <input type="number" inputMode="decimal" min={min} max={max} step={step} value={a} onChange={(e) => onA(parseNum(e.target.value))} className={`${inputCls} flex-1`} />
      <span className="text-muted">~</span>
      <input type="number" inputMode="decimal" min={min} max={max} step={step} value={b} onChange={(e) => onB(parseNum(e.target.value))} className={`${inputCls} flex-1`} />
    </div>
  )
}
