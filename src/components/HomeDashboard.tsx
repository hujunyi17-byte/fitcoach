import { useLiveQuery } from 'dexie-react-hooks'
import { useTheme } from '../theme/theme-context'
import { db } from '../db/db'
import { AGE_ID, HEIGHT_ID, SEX_ID } from '../db/metrics'
import { GOAL_KEY } from '../db/settings'
import { calcBMR, calcTarget, calcTDEE } from '../lib/nutrition'
import { addDays, todayStr } from '../lib/dates'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export default function HomeDashboard() {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const today = todayStr()
  const weekAgo = addDays(today, -6)

  const weights = useLiveQuery(() => db.userMetrics.where('kind').equals('weight').sortBy('date'), [])
  const height = useLiveQuery(() => db.userMetrics.get(HEIGHT_ID), [])
  const age = useLiveQuery(() => db.userMetrics.get(AGE_ID), [])
  const sex = useLiveQuery(() => db.userMetrics.get(SEX_ID), [])
  const goalRec = useLiveQuery(() => db.appSettings.get(GOAL_KEY), [])
  const todayDiet = useLiveQuery(() => db.dietLogs.where('date').equals(today).toArray(), [today])
  const weekLogs = useLiveQuery(() => db.workoutLogs.where('date').aboveOrEqual(weekAgo).toArray(), [weekAgo])

  const tick = { fill: isDark ? '#94a3b8' : '#64748b', fontSize: 11 }
  const grid = isDark ? '#334155' : '#e2e8f0'

  // 体重趋势
  const weightData = (weights ?? []).map((w) => ({ date: w.date.slice(5), value: w.value }))
  const latestWeight = weights && weights.length ? weights[weights.length - 1].value : null

  // 今日热量环形
  const eaten = (todayDiet ?? []).reduce((s, l) => s + l.calories, 0)
  const sexVal: 'male' | 'female' = sex?.value === 1 ? 'female' : 'male'
  const goal = goalRec?.value === 'cut' ? 'cut' : 'gain'
  const bmr =
    height?.value != null && latestWeight != null && age?.value != null
      ? calcBMR(latestWeight, height.value, age.value, sexVal)
      : null
  const target = bmr != null ? calcTarget(calcTDEE(bmr), goal) : null
  const ringData =
    target != null
      ? [
          { name: '已摄入', value: Math.min(eaten, target) },
          { name: '剩余', value: Math.max(0, target - eaten) },
        ]
      : []

  // 本周训练容量
  const days7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
  const volumeMap = new Map<string, number>()
  for (const l of weekLogs ?? []) {
    volumeMap.set(l.date, (volumeMap.get(l.date) ?? 0) + l.weight * l.reps)
  }
  const volumeData = days7.map((d) => ({ label: d.slice(5), volume: Math.round(volumeMap.get(d) ?? 0) }))

  return (
    <div className="space-y-3">
      {/* 体重趋势 */}
      <div className="rounded-2xl bg-surface p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-muted">体重趋势</h3>
          {latestWeight != null && <span className="text-xs text-muted">{latestWeight} kg</span>}
        </div>
        {weightData.length >= 2 ? (
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={tick} tickLine={false} axisLine={false} />
                <YAxis tick={tick} tickLine={false} axisLine={false} domain={[(min: number) => min - 1, (max: number) => max + 1]} />
                <Tooltip contentStyle={{ background: isDark ? '#1e293b' : '#fff', border: `1px solid ${grid}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: isDark ? '#94a3b8' : '#64748b' }} />
                <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={{ r: 2.5, fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-muted">记录几天体重后显示趋势</p>
        )}
      </div>

      {/* 热量环形 + 训练容量 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-surface p-4">
          <h3 className="text-sm font-semibold text-muted">今日热量</h3>
          {target != null ? (
            <div className="relative mt-2 h-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={ringData} dataKey="value" innerRadius={36} outerRadius={50} startAngle={90} endAngle={-270} stroke="none">
                    <Cell fill="#10b981" />
                    <Cell fill={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)'} />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold tabular-nums">{eaten}</span>
                <span className="text-[10px] text-muted">/ {target} 大卡</span>
              </div>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted">填写身体数据后显示</p>
          )}
        </div>

        <div className="rounded-2xl bg-surface p-4">
          <h3 className="text-sm font-semibold text-muted">本周训练容量</h3>
          <div className="mt-2 h-32">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={volumeData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={tick} tickLine={false} axisLine={false} />
                <YAxis tick={tick} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: isDark ? '#1e293b' : '#fff', border: `1px solid ${grid}`, borderRadius: 8, fontSize: 12 }} labelStyle={{ color: isDark ? '#94a3b8' : '#64748b' }} />
                <Bar dataKey="volume" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
