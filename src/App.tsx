import { lazy, Suspense, useState } from 'react'
import BottomNav, { type TabKey } from './components/BottomNav'
import Home from './pages/Home'
import Workout from './pages/Workout'
import Diet from './pages/Diet'
import AIAssistant from './pages/AIAssistant'
import Profile from './pages/Profile'
import { useTheme } from './theme/theme-context'
import Skeleton from './components/Skeleton'

// 动作诊断页含 MediaPipe，按需加载（仅在切换到该 Tab 时下载）
const Diagnosis = lazy(() => import('./pages/Diagnosis'))

export default function App() {
  const { backgroundImage } = useTheme()
  const [activeTab, setActiveTab] = useState<TabKey>('home')
  const [workoutDayId, setWorkoutDayId] = useState<string | null>(null)

  const openWorkout = (dayId: string) => {
    setWorkoutDayId(dayId)
    setActiveTab('workout')
  }

  const handleTabChange = (tab: TabKey) => {
    if (tab === 'workout') setWorkoutDayId(null)
    setActiveTab(tab)
  }

  return (
    <div className="flex h-dvh flex-col text-foreground">
      {/* 全局背景图 + 主题遮罩 */}
      {backgroundImage && (
        <>
          <div
            className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center"
            style={{ backgroundImage: `url("${backgroundImage}")` }}
          />
          <div className="pointer-events-none fixed inset-0 z-0 bg-[var(--bg-scrim)]" />
        </>
      )}

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <main className="flex-1 overflow-y-auto">
          <div className={activeTab === 'home' ? '' : 'hidden'}>
            <Home onOpenWorkout={openWorkout} />
          </div>
          <div className={activeTab === 'workout' ? '' : 'hidden'}>
            <Workout
              dayId={workoutDayId}
              onGoHome={() => setActiveTab('home')}
              onDeferred={() => setWorkoutDayId(null)}
            />
          </div>
          <div className={activeTab === 'diet' ? '' : 'hidden'}>
            <Diet />
          </div>
          {activeTab === 'diagnosis' && (
            <Suspense
              fallback={
                <div className="space-y-3 p-5">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-40 w-full rounded-2xl" />
                </div>
              }
            >
              <Diagnosis />
            </Suspense>
          )}
          <div className={activeTab === 'ai' ? 'h-full' : 'hidden'}>
            <AIAssistant />
          </div>
          <div className={activeTab === 'profile' ? '' : 'hidden'}>
            <Profile />
          </div>
        </main>
        <BottomNav active={activeTab} onChange={handleTabChange} />
      </div>
    </div>
  )
}
