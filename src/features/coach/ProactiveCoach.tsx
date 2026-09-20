import { useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import { AGE_ID, HEIGHT_ID, SEX_ID } from '../../db/metrics'
import { GOAL_KEY } from '../../db/settings'
import { calcBMR, calcTarget, calcTDEE } from '../../lib/nutrition'
import { streamChat } from '../../lib/chat'
import { todayStr } from '../../lib/dates'
import { useCoach } from './CoachContext'

const MIN_INTERVAL = 60_000 // 两次提醒最小间隔 60 秒

async function getTip(context: string): Promise<string> {
  let full = ''
  await streamChat(
    [
      {
        role: 'user',
        content: `请根据以下用户今日饮食情况，给出一句30字以内的精简建议（直接输出建议文字，不要任何前缀、引号或解释）：${context}`,
      },
    ],
    (d) => {
      full += d
    },
  )
  return full.trim().replace(/^[“”"']+|[“”"']+$/g, '').slice(0, 60)
}

export default function ProactiveCoach() {
  const { showTip } = useCoach()
  const today = todayStr()

  const height = useLiveQuery(() => db.userMetrics.get(HEIGHT_ID), [])
  const age = useLiveQuery(() => db.userMetrics.get(AGE_ID), [])
  const sex = useLiveQuery(() => db.userMetrics.get(SEX_ID), [])
  const weights = useLiveQuery(() => db.userMetrics.where('kind').equals('weight').sortBy('date'), [])
  const goalRec = useLiveQuery(() => db.appSettings.get(GOAL_KEY), [])
  const todayLogs = useLiveQuery(() => db.dietLogs.where('date').equals(today).toArray(), [today])

  const prevIds = useRef<Set<number>>(new Set())
  const initialized = useRef(false)
  const lastTrigger = useRef(0)
  const busy = useRef(false)

  useEffect(() => {
    if (!todayLogs) return

    const ids = new Set(todayLogs.map((l) => l.id).filter((id): id is number => id != null))

    if (!initialized.current) {
      initialized.current = true
      prevIds.current = ids
      return
    }

    const newLogs = todayLogs.filter((l) => l.id != null && !prevIds.current.has(l.id))
    prevIds.current = ids

    if (!newLogs.length || busy.current) return
    if (Date.now() - lastTrigger.current < MIN_INTERVAL) return

    const latestWeight = weights && weights.length ? weights[weights.length - 1].value : null
    const sexVal: 'male' | 'female' = sex?.value === 1 ? 'female' : 'male'
    const goal = goalRec?.value === 'cut' ? 'cut' : 'gain'
    const bmr =
      height?.value != null && latestWeight != null && age?.value != null
        ? calcBMR(latestWeight, height.value, age.value, sexVal)
        : null
    const target = bmr != null ? calcTarget(calcTDEE(bmr), goal) : null

    const totalEaten = todayLogs.reduce((s, l) => s + l.calories, 0)
    const newCalories = newLogs.reduce((s, l) => s + l.calories, 0)
    const eatenBefore = totalEaten - newCalories
    const remaining = target != null ? target - eatenBefore : null

    // 触发规则：单次摄入超过剩余额度 60%，或高碳水+高脂肪
    const exceeds60 = remaining != null && remaining > 0 && newCalories > remaining * 0.6
    const highCarbFat = newLogs.some((l) => l.carbs > 40 && l.fat > 20)
    if (!exceeds60 && !highCarbFat) return

    busy.current = true
    lastTrigger.current = Date.now()

    const remainingNum = remaining ?? 0
    const context = `今日已摄入 ${totalEaten} 大卡${target != null ? `（目标 ${target} 大卡，剩余 ${Math.max(0, remainingNum)} 大卡）` : ''}，目标为${goal === 'gain' ? '增肌' : '减脂'}。`

    getTip(context)
      .then((tip) => {
        if (tip) showTip(tip)
      })
      .catch(() => {})
      .finally(() => {
        busy.current = false
      })
  }, [todayLogs, weights, height, age, sex, goalRec, showTip])

  return null
}
