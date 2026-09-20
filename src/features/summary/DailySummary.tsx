import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { db } from '../../db/db'
import { streamChat } from '../../lib/chat'
import { addDays, todayStr } from '../../lib/dates'
import Markdown from '../../components/Markdown'

const LAST_SUMMARY_KEY = 'fitcoach-last-summary-date'

const SUMMARY_PROMPT =
  '你是一个顶级的私人健身教练和营养师。这是一份用户的昨日数据总结：附上他的照片、训练记录和饮食记录。请结合照片体型的变化、训练完成度、饮食热量摄入，给出一段150字以内的简短、专业、充满鼓励性质的每日总结，并给出一条具体的合理化建议（比如：饮食哪里需要调整，训练强度是否需要改变）。严禁套话！'

export default function DailySummary() {
  const [summary, setSummary] = useState<string | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    void run()
  }, [])

  async function run() {
    try {
      const today = todayStr()
      if (localStorage.getItem(LAST_SUMMARY_KEY) === today) return

      const yesterday = addDays(today, -1)
      const hasData = await checkYesterdayData(yesterday)
      if (!hasData) {
        localStorage.setItem(LAST_SUMMARY_KEY, today)
        return
      }

      const ctx = await buildYesterdayContext(yesterday)
      let text = ''
      await streamChat(
        [{ role: 'user', content: `${SUMMARY_PROMPT}\n\n【昨日数据】\n${ctx.text}` }],
        (d) => {
          text += d
        },
        ctx.images,
      )
      const s = text.trim()
      if (s) setSummary(s)
    } catch (err) {
      console.error('每日总结生成失败：', err)
    }
  }

  function acknowledge() {
    localStorage.setItem(LAST_SUMMARY_KEY, todayStr())
    setSummary(null)
  }

  return (
    <AnimatePresence>
      {summary && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed inset-x-4 z-[70]"
          style={{ top: 'calc(1.5rem + env(safe-area-inset-top))' }}
        >
          <div className="rounded-2xl border border-white/10 bg-[#1e1b4b]/95 p-4 shadow-xl backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-primary">📋 每日复盘</p>
              <span className="text-xs text-muted">{addDays(todayStr(), -1).slice(5)}</span>
            </div>
            <div className="mt-2 max-h-60 overflow-y-auto text-sm">
              <Markdown text={summary} />
            </div>
            <button type="button" onClick={acknowledge} className="mt-3 w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-white">
              知道了
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

async function checkYesterdayData(dateStr: string): Promise<boolean> {
  const [photo, logCount, dietCount] = await Promise.all([
    db.dailyPhotos.get(dateStr),
    db.workoutLogs.where('date').equals(dateStr).count(),
    db.dietLogs.where('date').equals(dateStr).count(),
  ])
  return !!(photo || logCount > 0 || dietCount > 0)
}

async function buildYesterdayContext(dateStr: string): Promise<{ text: string; images?: string[] }> {
  const [photo, logs, diets, exercises] = await Promise.all([
    db.dailyPhotos.get(dateStr),
    db.workoutLogs.where('date').equals(dateStr).toArray(),
    db.dietLogs.where('date').equals(dateStr).toArray(),
    db.exercises.toArray(),
  ])
  const exMap = new Map(exercises.map((e) => [e.id, e.name]))

  const parts: string[] = []

  if (logs.length) {
    const ids = [...new Set(logs.map((l) => l.exerciseId))]
    const names = ids.map((id) => exMap.get(id) ?? id).join('、')
    const volume = Math.round(logs.reduce((s, l) => s + l.weight * l.reps, 0))
    const times = logs.map((l) => l.completedAt).sort((a, b) => a - b)
    const minutes = times.length > 1 ? Math.round((times[times.length - 1] - times[0]) / 60000) : 0
    parts.push(`训练：${names}；共 ${logs.length} 组；总容量 ${volume}kg；约 ${minutes} 分钟`)
  } else {
    parts.push('训练：无')
  }

  if (diets.length) {
    const total = diets.reduce(
      (a, d) => ({ calories: a.calories + d.calories, protein: a.protein + d.protein, carbs: a.carbs + d.carbs, fat: a.fat + d.fat }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    )
    const foods = diets.map((d) => d.foodName).join('、')
    parts.push(`饮食：${foods}；总热量 ${total.calories} 大卡，蛋白 ${total.protein}g，碳水 ${total.carbs}g，脂肪 ${total.fat}g`)
  } else {
    parts.push('饮食：无')
  }

  if (photo?.note) parts.push(`照片备注：${photo.note}`)

  return { text: parts.join('\n'), images: photo ? [photo.photoBase64] : undefined }
}
