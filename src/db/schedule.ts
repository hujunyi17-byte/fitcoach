import { db } from './db'
import { addDays, todayStr } from '../lib/dates'
import type { ScheduleEntry } from './types'

// 三分化循环：练 3 休 1（day-4 为休息日）
const CYCLE = ['day-1', 'day-2', 'day-3', 'day-4']
// 提前生成的日程窗口长度（天）
const WINDOW_DAYS = 30

function nextInCycle(id: string | null): string {
  if (!id) return CYCLE[0]
  const idx = CYCLE.indexOf(id)
  return idx < 0 ? CYCLE[0] : CYCLE[(idx + 1) % CYCLE.length]
}

/** 确保从今天起未来 WINDOW_DAYS 天都有日程（缺哪补哪，按循环相位延续） */
export async function ensureSchedule(): Promise<void> {
  const today = todayStr()
  const end = addDays(today, WINDOW_DAYS - 1)

  const entries = await db.schedule.where('date').between(today, end).toArray()
  const byDate = new Map(entries.map((e) => [e.date, e.workoutDayId]))

  // 锚点：昨天的日程（用于延续循环相位）
  const yesterday = await db.schedule.get(addDays(today, -1))
  let prev = yesterday?.workoutDayId ?? null

  const toWrite: ScheduleEntry[] = []
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const date = addDays(today, i)
    if (byDate.has(date)) {
      prev = byDate.get(date) ?? null
    } else {
      prev = nextInCycle(prev)
      toWrite.push({ date, workoutDayId: prev })
    }
  }

  if (toWrite.length) await db.schedule.bulkPut(toWrite)
}

/** 顺延计划：把今天的训练推迟到明天，后续日程整体后移一天 */
export async function deferToday(): Promise<void> {
  const today = todayStr()
  const current = await db.schedule.get(today)
  if (!current?.workoutDayId) return // 今天本来就是休息，无需顺延

  await db.transaction('rw', db.schedule, async () => {
    const future = await db.schedule.where('date').aboveOrEqual(today).toArray() // 升序
    // 从最远往最近挪，避免覆盖
    for (let i = future.length - 1; i >= 0; i--) {
      const e = future[i]
      await db.schedule.put({ date: addDays(e.date, 1), workoutDayId: e.workoutDayId })
    }
    // 今天变为休息
    await db.schedule.put({ date: today, workoutDayId: null })
  })
}
