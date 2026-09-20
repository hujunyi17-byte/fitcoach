import { useRef, useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { motion } from 'framer-motion'
import { db } from '../db/db'
import { AGE_ID, HEIGHT_ID, SEX_ID, setAge, setHeight, setSex, setWeight } from '../db/metrics'
import { GOAL_KEY, setGoal as persistGoal } from '../db/settings'
import { PROFILE_ID, levelProgress } from '../lib/gamification'
import { fileToDataUrl } from '../lib/image'
import { addDays, todayStr } from '../lib/dates'
import { useTheme } from '../theme/theme-context'
import Modal from '../components/Modal'
import PhotoWall from '../components/PhotoWall'
import type { Exercise } from '../db/types'
import type { Goal } from '../lib/nutrition'

const inputCls = 'rounded-lg border border-border bg-white/5 px-3 py-2 text-sm'

type ModalKind = 'body' | 'goal' | 'appearance' | 'videos' | 'nickname' | null

export default function Profile() {
  const today = todayStr()
  const weekAgo = addDays(today, -6)

  const profile = useLiveQuery(() => db.userProfile.get(PROFILE_ID), [])
  const height = useLiveQuery(() => db.userMetrics.get(HEIGHT_ID), [])
  const weights = useLiveQuery(() => db.userMetrics.where('kind').equals('weight').sortBy('date'), [])
  const age = useLiveQuery(() => db.userMetrics.get(AGE_ID), [])
  const sex = useLiveQuery(() => db.userMetrics.get(SEX_ID), [])
  const goalRec = useLiveQuery(() => db.appSettings.get(GOAL_KEY), [])
  const weekLogs = useLiveQuery(() => db.workoutLogs.where('date').aboveOrEqual(weekAgo).toArray(), [weekAgo])
  const exercises = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [])

  const [modal, setModal] = useState<ModalKind>(null)
  const [view, setView] = useState<'main' | 'photos'>('main')
  const avatarRef = useRef<HTMLInputElement>(null)

  const nickname = profile?.nickname ?? '健身达人'
  const xp = profile?.xp ?? 0
  const { level, current, next, pct } = levelProgress(xp)
  const latestWeight = weights && weights.length ? weights[weights.length - 1].value : null
  const goal: Goal = goalRec?.value === 'cut' ? 'cut' : 'gain'

  const weekDays = new Set((weekLogs ?? []).map((l) => l.date)).size
  const weekSets = (weekLogs ?? []).length
  const weekVolume = Math.round((weekLogs ?? []).reduce((s, l) => s + l.weight * l.reps, 0))

  async function saveProfile(patch: { nickname?: string; avatar?: string }) {
    await db.userProfile.put({
      id: PROFILE_ID,
      nickname: patch.nickname ?? profile?.nickname ?? '健身达人',
      avatar: patch.avatar !== undefined ? patch.avatar : profile?.avatar,
      xp: profile?.xp ?? 0,
    })
  }

  async function handleAvatar(file: File) {
    try {
      const dataUrl = await fileToDataUrl(file, 256)
      await saveProfile({ avatar: dataUrl })
    } catch {
      /* ignore */
    }
  }

  if (view === 'photos') {
    return <PhotoWall onBack={() => setView('main')} />
  }

  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold">个人中心</h1>

      {/* 头部卡片 */}
      <section className="mt-6 rounded-2xl bg-surface p-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => avatarRef.current?.click()}
            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10"
          >
            {profile?.avatar ? (
              <img src={profile.avatar} alt="头像" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-2xl">👤</span>
            )}
          </button>
          <div className="min-w-0 flex-1">
            <button type="button" onClick={() => setModal('nickname')} className="text-lg font-bold">
              {nickname}
            </button>
            <p className="mt-0.5 text-sm text-muted">LV. {level} 健身达人</p>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={false}
                animate={{ width: `${pct * 100}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20 }}
              />
            </div>
            <p className="mt-1 text-xs text-muted">
              {current} / {next} XP
            </p>
          </div>
        </div>
        <input
          ref={avatarRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) void handleAvatar(f)
          }}
        />
      </section>

      {/* 身体数据卡片 */}
      <section className="mt-3 cursor-pointer rounded-2xl bg-surface p-4" onClick={() => setModal('body')}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted">身体数据</h2>
          <span className="text-muted">›</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-white/5 p-3 text-center">
            <p className="text-lg font-bold">
              {height?.value ?? '—'}
              <span className="text-xs font-normal text-muted"> cm</span>
            </p>
            <p className="text-xs text-muted">身高</p>
          </div>
          <div className="rounded-xl bg-white/5 p-3 text-center">
            <p className="text-lg font-bold">
              {latestWeight ?? '—'}
              <span className="text-xs font-normal text-muted"> kg</span>
            </p>
            <p className="text-xs text-muted">体重</p>
          </div>
        </div>
      </section>

      {/* 数据概况卡片 */}
      <section className="mt-3 rounded-2xl bg-surface p-4">
        <h2 className="text-sm font-semibold text-muted">本周数据概况</h2>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <Stat label="训练天数" value={String(weekDays)} />
          <Stat label="总组数" value={String(weekSets)} />
          <Stat label="总容量" value={String(weekVolume)} />
        </div>
      </section>

      {/* 功能菜单 */}
      <section className="mt-3 overflow-hidden rounded-2xl bg-surface">
        <MenuItem label="我的照片墙" onClick={() => setView('photos')} />
        <MenuItem label="首页看板配置" onClick={() => setModal('goal')} />
        <MenuItem label="主题与背景设置" onClick={() => setModal('appearance')} />
        <MenuItem label="动作视频配置" desc="开发者选项" onClick={() => setModal('videos')} />
      </section>

      {/* 弹窗 */}
      {modal === 'body' && (
        <BodyModal
          height={height?.value ?? null}
          weight={latestWeight}
          age={age?.value ?? null}
          sex={sex?.value === 1 ? 'female' : 'male'}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'goal' && <GoalModal goal={goal} onClose={() => setModal(null)} />}
      {modal === 'appearance' && <AppearanceModal onClose={() => setModal(null)} />}
      {modal === 'videos' && exercises && <VideoModal exercises={exercises} onClose={() => setModal(null)} />}
      {modal === 'nickname' && (
        <NicknameModal
          value={nickname}
          onClose={() => setModal(null)}
          onSave={async (name) => {
            await saveProfile({ nickname: name })
            setModal(null)
          }}
        />
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/5 p-3 text-center">
      <p className="text-lg font-bold tabular-nums">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  )
}

function MenuItem({ label, desc, onClick }: { label: string; desc?: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between border-b border-border px-4 py-3.5 text-left last:border-b-0"
    >
      <span className="text-sm">
        {label}
        {desc ? <span className="ml-1 text-xs text-muted">· {desc}</span> : null}
      </span>
      <span className="text-muted">›</span>
    </button>
  )
}

function Field({ label, unit, children }: { label: string; unit: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-sm text-muted">
        {label}（{unit}）
      </p>
      {children}
    </div>
  )
}

function BodyModal({ height, weight, age, sex, onClose }: {
  height: number | null
  weight: number | null
  age: number | null
  sex: 'male' | 'female'
  onClose: () => void
}) {
  const [h, setH] = useState(height != null ? String(height) : '')
  const [w, setW] = useState(weight != null ? String(weight) : '')
  const [a, setA] = useState(age != null ? String(age) : '')
  const [s, setS] = useState<'male' | 'female'>(sex)

  async function save() {
    const hv = Number.parseFloat(h)
    if (Number.isFinite(hv) && hv > 0) await setHeight(hv)
    const wv = Number.parseFloat(w)
    if (Number.isFinite(wv) && wv > 0) await setWeight(todayStr(), wv)
    const av = Number.parseFloat(a)
    if (Number.isFinite(av) && av > 0) await setAge(av)
    await setSex(s)
    onClose()
  }

  return (
    <Modal title="身体数据" onClose={onClose}>
      <div className="space-y-4">
        <Field label="身高" unit="cm">
          <input type="number" inputMode="decimal" value={h} onChange={(e) => setH(e.target.value)} className={`${inputCls} w-full`} />
        </Field>
        <Field label="体重" unit="kg">
          <input type="number" inputMode="decimal" step="0.1" value={w} onChange={(e) => setW(e.target.value)} className={`${inputCls} w-full`} />
        </Field>
        <Field label="年龄" unit="岁">
          <input type="number" inputMode="numeric" value={a} onChange={(e) => setA(e.target.value)} className={`${inputCls} w-full`} />
        </Field>
        <div>
          <p className="mb-1.5 text-sm text-muted">性别</p>
          <div className="flex overflow-hidden rounded-lg border border-border">
            <button type="button" onClick={() => setS('male')} className={`flex-1 py-2 text-sm ${s === 'male' ? 'bg-primary text-white' : 'text-muted'}`}>
              男
            </button>
            <button type="button" onClick={() => setS('female')} className={`flex-1 py-2 text-sm ${s === 'female' ? 'bg-primary text-white' : 'text-muted'}`}>
              女
            </button>
          </div>
        </div>
      </div>
      <button type="button" onClick={save} className="mt-5 w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-white">
        保存
      </button>
    </Modal>
  )
}

function GoalModal({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const [g, setG] = useState<Goal>(goal)
  return (
    <Modal title="首页看板配置" onClose={onClose}>
      <p className="text-sm text-muted">选择你的目标，影响首页热量看板的推荐摄入</p>
      <div className="mt-3 flex overflow-hidden rounded-lg border border-border">
        <button type="button" onClick={() => setG('gain')} className={`flex-1 py-2.5 text-sm ${g === 'gain' ? 'bg-primary text-white' : 'text-muted'}`}>
          增肌
        </button>
        <button type="button" onClick={() => setG('cut')} className={`flex-1 py-2.5 text-sm ${g === 'cut' ? 'bg-primary text-white' : 'text-muted'}`}>
          减脂
        </button>
      </div>
      <button
        type="button"
        onClick={async () => {
          await persistGoal(g)
          onClose()
        }}
        className="mt-4 w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-white"
      >
        保存
      </button>
    </Modal>
  )
}

function AppearanceModal({ onClose }: { onClose: () => void }) {
  const { theme, toggleTheme, backgroundImage, setBackgroundImage } = useTheme()
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      await setBackgroundImage(await fileToDataUrl(f))
    } catch {
      /* ignore */
    }
  }

  return (
    <Modal title="主题与背景设置" onClose={onClose}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">外观主题</p>
          <p className="text-sm text-muted">当前：{theme === 'dark' ? '暗黑' : '明亮'}</p>
        </div>
        <button type="button" onClick={toggleTheme} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white">
          切换主题
        </button>
      </div>
      <div className="mt-4 border-t border-border pt-4">
        <p className="font-medium">背景图</p>
        <div className="mt-2 flex items-center gap-3">
          <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg border border-border px-4 py-2 text-sm text-foreground">
            {backgroundImage ? '更换背景图' : '上传背景图'}
          </button>
          {backgroundImage && (
            <button type="button" onClick={() => void setBackgroundImage(null)} className="rounded-lg border border-border px-4 py-2 text-sm text-red-500">
              移除
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </Modal>
  )
}

function VideoModal({ exercises, onClose }: { exercises: Exercise[]; onClose: () => void }) {
  async function saveDemo(id: string, url: string) {
    const ex = exercises.find((e) => e.id === id)
    if (!ex) return
    await db.exercises.put({ ...ex, demoUrl: url.trim() || undefined })
  }

  return (
    <Modal title="动作视频配置" onClose={onClose}>
      <p className="text-xs text-muted">开发者选项：直接修改每个动作的示范视频链接（留空则隐藏「查看示范」按钮）</p>
      <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
        {exercises.map((ex) => (
          <div key={ex.id} className="flex items-center gap-2">
            <span className="w-28 shrink-0 truncate text-sm">{ex.name}</span>
            <input
              defaultValue={ex.demoUrl ?? ''}
              onBlur={(e) => void saveDemo(ex.id, e.target.value)}
              placeholder="https://v.douyin.com/..."
              className="min-w-0 flex-1 rounded-lg border border-border bg-white/5 px-2 py-1.5 text-xs"
            />
          </div>
        ))}
      </div>
    </Modal>
  )
}

function NicknameModal({ value, onClose, onSave }: { value: string; onClose: () => void; onSave: (name: string) => void }) {
  const [name, setName] = useState(value)
  return (
    <Modal title="修改昵称" onClose={onClose}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="输入昵称" className="w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm" />
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-border py-2.5 text-sm">
          取消
        </button>
        <button
          type="button"
          onClick={() => {
            const n = name.trim()
            if (n) onSave(n)
          }}
          className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-medium text-white"
        >
          保存
        </button>
      </div>
    </Modal>
  )
}
