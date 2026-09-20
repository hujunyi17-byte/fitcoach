import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { AGE_ID, HEIGHT_ID, SEX_ID } from '../db/metrics'
import { getGoal, setGoal as persistGoal } from '../db/settings'
import { fileToDataUrl } from '../lib/image'
import { streamChat } from '../lib/chat'
import {
  calcBMR,
  calcTarget,
  calcTDEE,
  FOOD_IMAGE_PROMPT,
  FOOD_TEXT_PROMPT,
  parseFoodResult,
} from '../lib/nutrition'
import type { FoodItem, Goal } from '../lib/nutrition'
import { searchFoods } from '../lib/foodDatabase'
import type { FoodEntry } from '../lib/foodDatabase'
import { todayStr } from '../lib/dates'

interface ReviewItem {
  foodName: string
  weight: number // 克（可编辑）
  per100: { calories: number; protein: number; carbs: number; fat: number }
}

function toReviewItem(it: FoodItem): ReviewItem {
  const w = it.weightInGrams > 0 ? it.weightInGrams : 1
  return {
    foodName: it.foodName,
    weight: it.weightInGrams,
    per100: {
      calories: (it.calories / w) * 100,
      protein: (it.protein / w) * 100,
      carbs: (it.carbs / w) * 100,
      fat: (it.fat / w) * 100,
    },
  }
}

function computed(item: ReviewItem) {
  const w = item.weight / 100
  const r = (n: number) => Math.round(n * 10) / 10
  return {
    calories: Math.round(item.per100.calories * w),
    protein: r(item.per100.protein * w),
    carbs: r(item.per100.carbs * w),
    fat: r(item.per100.fat * w),
  }
}

export default function Diet() {
  const today = todayStr()

  const height = useLiveQuery(() => db.userMetrics.get(HEIGHT_ID), [])
  const age = useLiveQuery(() => db.userMetrics.get(AGE_ID), [])
  const sex = useLiveQuery(() => db.userMetrics.get(SEX_ID), [])
  const weights = useLiveQuery(() => db.userMetrics.where('kind').equals('weight').sortBy('date'), [])
  const todayLogs = useLiveQuery(() => db.dietLogs.where('date').equals(today).reverse().toArray(), [today])

  const [goal, setGoal] = useState<Goal>('gain')
  const [image, setImage] = useState<string | null>(null)
  const [estimating, setEstimating] = useState(false)
  const [reviewItems, setReviewItems] = useState<ReviewItem[] | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const [manualOpen, setManualOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedFood, setSelectedFood] = useState<FoodEntry | null>(null)
  const [manualWeight, setManualWeight] = useState('100')

  const [textFallbackOpen, setTextFallbackOpen] = useState(false)
  const [fallbackText, setFallbackText] = useState('')

  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getGoal().then(setGoal)
  }, [])

  const latestWeight = weights && weights.length ? weights[weights.length - 1].value : null
  const sexVal: 'male' | 'female' = sex?.value === 1 ? 'female' : 'male'

  const bmr =
    height?.value != null && latestWeight != null && age?.value != null
      ? calcBMR(latestWeight, height.value, age.value, sexVal)
      : null
  const tdee = bmr != null ? calcTDEE(bmr) : null
  const target = tdee != null ? calcTarget(tdee, goal) : null
  const eaten = todayLogs ? todayLogs.reduce((s, l) => s + l.calories, 0) : 0
  const remaining = target != null ? target - eaten : null

  async function changeGoal(g: Goal) {
    if (g === goal) return
    setGoal(g)
    await persistGoal(g)
  }

  async function handleFile(file: File) {
    if (!file) return
    setMessage(null)
    try {
      setImage(await fileToDataUrl(file, 512, 0.5))
    } catch {
      setMessage('图片处理失败，请重试')
    }
  }

  async function estimateFromImage() {
    if (!image || estimating) return
    setEstimating(true)
    setMessage(null)
    let full = ''
    try {
      await streamChat([{ role: 'user', content: FOOD_IMAGE_PROMPT }], (d) => { full += d }, image ? [image] : undefined)
      const result = parseFoodResult(full)
      if (result && result.items.length) {
        setReviewItems(result.items.map(toReviewItem))
      } else {
        setMessage('识别结果解析失败，可改用下方「手动添加食物」')
      }
    } catch {
      setMessage('图片识别失败或超时，可改用下方「手动添加食物」')
    } finally {
      setEstimating(false)
    }
  }

  async function estimateFromText() {
    const desc = fallbackText.trim()
    if (!desc || estimating) return
    setEstimating(true)
    setMessage(null)
    let full = ''
    try {
      await streamChat([{ role: 'user', content: FOOD_TEXT_PROMPT + desc }], (d) => { full += d })
      const result = parseFoodResult(full)
      if (result && result.items.length) {
        setReviewItems(result.items.map(toReviewItem))
        setFallbackText('')
        setTextFallbackOpen(false)
      } else {
        setMessage('识别结果解析失败')
      }
    } catch {
      setMessage('估算失败，请检查 AI 配置')
    } finally {
      setEstimating(false)
    }
  }

  function updateWeight(i: number, val: string) {
    const w = Number.parseFloat(val)
    if (!reviewItems) return
    setReviewItems(reviewItems.map((it, idx) => (idx === i ? { ...it, weight: Number.isFinite(w) && w > 0 ? w : 0 } : it)))
  }

  async function saveReview() {
    if (!reviewItems?.length) return
    const ts = Date.now()
    await db.dietLogs.bulkAdd(
      reviewItems.map((it) => {
        const c = computed(it)
        return {
          timestamp: ts,
          image: image ?? undefined,
          foodName: it.foodName,
          weightInGrams: it.weight,
          calories: c.calories,
          protein: c.protein,
          carbs: c.carbs,
          fat: c.fat,
          date: today,
        }
      }),
    )
    setReviewItems(null)
    setImage(null)
    setMessage('已记录 ✓')
  }

  async function addManualFood() {
    if (!selectedFood) return
    const weight = Number.parseFloat(manualWeight)
    if (!Number.isFinite(weight) || weight <= 0) return
    const w = weight / 100
    const r = (n: number) => Math.round(n * 10) / 10
    await db.dietLogs.add({
      timestamp: Date.now(),
      foodName: selectedFood.name,
      weightInGrams: weight,
      calories: Math.round(selectedFood.calories * w),
      protein: r(selectedFood.protein * w),
      carbs: r(selectedFood.carbs * w),
      fat: r(selectedFood.fat * w),
      date: today,
    })
    setSelectedFood(null)
    setManualWeight('100')
    setSearch('')
    setMessage('已记录 ✓')
  }

  const filteredFoods = searchFoods(search)
  const reviewTotal = reviewItems
    ? reviewItems.reduce(
        (acc, it) => {
          const c = computed(it)
          return {
            calories: acc.calories + c.calories,
            protein: acc.protein + c.protein,
            carbs: acc.carbs + c.carbs,
            fat: acc.fat + c.fat,
          }
        },
        { calories: 0, protein: 0, carbs: 0, fat: 0 },
      )
    : null

  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold">饮食记录</h1>

      <div className="mt-4 flex items-center justify-between">
        <span className="text-sm text-muted">目标</span>
        <div className="flex overflow-hidden rounded-lg border border-border">
          <button type="button" onClick={() => changeGoal('gain')} className={`px-3 py-1.5 text-sm ${goal === 'gain' ? 'bg-primary text-white' : 'text-muted'}`}>
            增肌
          </button>
          <button type="button" onClick={() => changeGoal('cut')} className={`px-3 py-1.5 text-sm ${goal === 'cut' ? 'bg-primary text-white' : 'text-muted'}`}>
            减脂
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <StatCard label="今日目标" value={target != null ? String(target) : '—'} unit="大卡" />
        <StatCard label="已摄入" value={String(eaten)} unit="大卡" />
        <StatCard label="剩余" value={remaining != null ? String(remaining) : '—'} unit="大卡" highlight={remaining != null && remaining < 0} />
      </div>
      {bmr == null && <p className="mt-2 text-xs text-muted">在「设置」填写身高、体重、年龄后自动计算目标摄入</p>}

      {/* 拍照 / 相册 */}
      <div className="mt-5">
        {!image ? (
          <div className="flex gap-3">
            <button type="button" onClick={() => cameraRef.current?.click()} className="flex-1 rounded-xl border border-border py-3 text-sm">📷 拍照</button>
            <button type="button" onClick={() => galleryRef.current?.click()} className="flex-1 rounded-xl border border-border py-3 text-sm">🖼️ 相册</button>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-surface p-3">
            <img src={image} alt="食物照片" className="max-h-56 w-full rounded-xl object-cover" />
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={estimateFromImage} disabled={estimating} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-50">
                {estimating ? '估算中…' : 'AI 估算热量'}
              </button>
              <button type="button" onClick={() => setImage(null)} className="rounded-xl border border-border px-4 py-2.5 text-sm">重选</button>
            </div>
          </div>
        )}
      </div>

      {/* 识别结果（可修改重量） */}
      {reviewItems && (
        <div className="mt-4 rounded-2xl bg-surface p-4">
          <p className="text-sm font-semibold">识别结果（点击重量可修改）</p>
          <div className="mt-2">
            {reviewItems.map((it, i) => {
              const c = computed(it)
              return (
                <div key={i} className="flex items-center gap-2 border-t border-border py-2 first:border-t-0">
                  <span className="min-w-0 flex-1 truncate text-sm">{it.foodName}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={it.weight}
                    onChange={(e) => updateWeight(i, e.target.value)}
                    className="w-16 shrink-0 rounded-lg border border-border bg-white/5 px-2 py-1 text-right text-sm"
                  />
                  <span className="shrink-0 text-xs text-muted">g</span>
                  <span className="w-16 shrink-0 text-right text-sm font-medium text-primary">{c.calories} 大卡</span>
                </div>
              )
            })}
          </div>
          {reviewTotal && (
            <p className="mt-2 text-xs text-muted">
              合计 {reviewTotal.calories} 大卡 · 蛋白 {Math.round(reviewTotal.protein * 10) / 10}g · 碳水 {Math.round(reviewTotal.carbs * 10) / 10}g · 脂肪 {Math.round(reviewTotal.fat * 10) / 10}g
            </p>
          )}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={saveReview} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-white active:opacity-90">
              保存记录
            </button>
            <button type="button" onClick={() => { setReviewItems(null); setImage(null) }} className="rounded-xl border border-border px-4 py-2.5 text-sm">
              取消
            </button>
          </div>
        </div>
      )}

      {/* 手动添加食物（兜底） */}
      <div className="mt-4">
        <button type="button" onClick={() => setManualOpen(!manualOpen)} className="w-full rounded-xl border border-border py-3 text-sm">
          🔍 手动搜索 / 添加食物
        </button>
        {manualOpen && (
          <div className="mt-2 rounded-2xl bg-surface p-4">
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSelectedFood(null) }}
              placeholder="搜索食物，如「鸡胸肉」「米饭」"
              className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm"
            />
            {search.trim() && (
              <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
                {filteredFoods.length ? (
                  filteredFoods.map((f) => (
                    <button
                      key={f.name}
                      type="button"
                      onClick={() => setSelectedFood(f)}
                      className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${selectedFood?.name === f.name ? 'bg-primary/15' : 'bg-white/5'}`}
                    >
                      <span>{f.name}</span>
                      <span className="text-xs text-muted">{f.calories} 大卡/100g · 蛋白 {f.protein}g</span>
                    </button>
                  ))
                ) : (
                  <p className="py-3 text-center text-sm text-muted">未找到相关食物，试试「鸡蛋」「牛肉」</p>
                )}
              </div>
            )}
            {selectedFood && (
              <div className="mt-3 flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{selectedFood.name}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={manualWeight}
                  onChange={(e) => setManualWeight(e.target.value)}
                  className="w-20 rounded-lg border border-border bg-white/5 px-2 py-1.5 text-right text-sm"
                />
                <span className="text-xs text-muted">g</span>
                <button type="button" onClick={addManualFood} className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white active:opacity-90">
                  添加
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 文字描述估算 */}
      {textFallbackOpen ? (
        <div className="mt-3 rounded-2xl border border-border bg-surface p-3">
          <p className="text-sm text-muted">描述食物（如「一碗米饭 + 100g 鸡胸肉 + 西兰花」）</p>
          <div className="mt-2 flex gap-2">
            <input value={fallbackText} onChange={(e) => setFallbackText(e.target.value)} placeholder="描述食物…" className="min-w-0 flex-1 rounded-lg border border-border bg-white/5 px-3 py-2 text-sm" />
            <button type="button" onClick={estimateFromText} disabled={estimating || !fallbackText.trim()} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {estimating ? '…' : '估算'}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setTextFallbackOpen(true)} className="mt-3 text-sm text-muted underline">
          或：用文字描述让 AI 估算
        </button>
      )}

      {message && <p className="mt-2 text-sm text-muted">{message}</p>}

      {/* 今日记录 */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-muted">今日记录</h2>
        {todayLogs && todayLogs.length ? (
          <div className="mt-2 space-y-2">
            {todayLogs.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-xl bg-surface p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {l.foodName}
                    {l.weightInGrams ? <span className="text-muted"> · {l.weightInGrams}g</span> : null}
                  </p>
                  <p className="text-xs text-muted">蛋白 {l.protein}g · 碳水 {l.carbs}g · 脂肪 {l.fat}g</p>
                </div>
                <span className="ml-3 shrink-0 text-sm font-semibold text-primary">{l.calories} 大卡</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">今天还没有记录</p>
        )}
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void handleFile(f)
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void handleFile(f)
        }}
      />
    </div>
  )
}

function StatCard({ label, value, unit, highlight }: { label: string; value: string; unit: string; highlight?: boolean }) {
  return (
    <div className="rounded-xl bg-surface p-3 text-center">
      <p className="text-xs text-muted">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${highlight ? 'text-red-500' : ''}`}>{value}</p>
      <p className="text-xs text-muted">{unit}</p>
    </div>
  )
}
