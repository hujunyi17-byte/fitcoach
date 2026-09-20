import { db } from '../db/db'
import { MUSCLE_GROUP_LABELS } from '../db/types'
import { addDays, todayStr } from '../lib/dates'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface PlanExercise {
  name: string
  sets: number
  reps: string
  weight?: string
  rest?: string
}

export interface PlanDay {
  day: string
  focus: string
  exercises: PlanExercise[]
}

export interface Plan {
  title: string
  days: PlanDay[]
}

/** 从本地数据库汇总训练上下文，随请求传给后端（AI 据此个性化回答） */
export async function buildTrainingContext(): Promise<string> {
  const today = todayStr()
  const threeDaysAgo = addDays(today, -2) // 含今天共 3 天

  const [days, exercises, logs, weights, height, todayDiet] = await Promise.all([
    db.workoutDays.toArray(),
    db.exercises.toArray(),
    db.workoutLogs.where('date').aboveOrEqual(threeDaysAgo).sortBy('date'),
    db.userMetrics.where('kind').equals('weight').sortBy('date'),
    db.userMetrics.get('height'),
    db.dietLogs.where('date').equals(today).toArray(),
  ])
  const exMap = new Map(exercises.map((e) => [e.id, e.name]))

  const latestWeight = weights.length ? weights[weights.length - 1] : null

  const plan = days
    .map((d) => {
      if (d.isRestDay) return `${d.name}：休息`
      const focus = d.focus.map((g) => MUSCLE_GROUP_LABELS[g]).join('+')
      const names = d.exerciseIds.map((id) => exMap.get(id) ?? id).join('、')
      return `${d.name}（${focus}）：${names}`
    })
    .join('\n')

  const recent = logs
    .map((l) => `${l.date} ${exMap.get(l.exerciseId) ?? l.exerciseId} ${l.weight}kg × ${l.reps}次`)
    .join('\n')

  const diet = todayDiet.reduce(
    (acc, d) => ({
      calories: acc.calories + d.calories,
      protein: acc.protein + d.protein,
      carbs: acc.carbs + d.carbs,
      fat: acc.fat + d.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )

  return [
    `身高：${height?.value ? `${height.value}cm` : '未知'}`,
    `最新体重：${latestWeight ? `${latestWeight.date} ${latestWeight.value}kg` : '暂无记录'}`,
    '',
    '【近3天训练日志】',
    recent || '（暂无）',
    '',
    `【今日饮食】总热量 ${diet.calories} 大卡 · 蛋白 ${diet.protein}g · 碳水 ${diet.carbs}g · 脂肪 ${diet.fat}g`,
    '',
    '【当前训练计划】',
    plan || '（无）',
  ].join('\n')
}

function isPlan(obj: unknown): obj is Plan {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as Plan).title === 'string' &&
    Array.isArray((obj as Plan).days)
  )
}

/** 尝试把 AI 输出解析成结构化训练计划（容忍 markdown 围栏、前后杂质） */
export function parsePlan(text: string): Plan | null {
  let candidate = text.trim()
  const fence = candidate.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) candidate = fence[1].trim()

  try {
    const obj = JSON.parse(candidate)
    if (isPlan(obj)) return obj
  } catch {
    /* ignore */
  }

  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try {
      const obj = JSON.parse(candidate.slice(start, end + 1))
      if (isPlan(obj)) return obj
    } catch {
      /* ignore */
    }
  }
  return null
}

/** 流式请求后端代理，逐段回调 delta（打字机效果） */
const MAX_IMAGE_CHARS = 5 * 1024 * 1024 // 约 5MB

export async function streamChat(
  messages: ChatMessage[],
  onDelta: (delta: string) => void,
  images?: string[],
): Promise<void> {
  if (images?.some((img) => img.length > MAX_IMAGE_CHARS)) {
    throw new Error('图片体积过大，请裁剪后重新上传')
  }
  const context = await buildTrainingContext()
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context, messages, images }),
  })

  if (!res.ok || !res.body) {
    let msg = `请求失败（${res.status}）`
    try {
      const err = await res.json()
      if (err?.error) msg = err.error
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() ?? ''
    for (const event of events) {
      for (const line of event.split('\n')) {
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (payload === '[DONE]') return
        let json: { delta?: string; error?: string }
        try {
          json = JSON.parse(payload)
        } catch {
          continue
        }
        if (json?.error) throw new Error(json.error)
        if (typeof json?.delta === 'string') onDelta(json.delta)
      }
    }
  }
}
