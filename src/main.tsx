import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './theme/ThemeProvider'
import { CoachProvider } from './features/coach/CoachProvider'
import DailySummary from './features/summary/DailySummary'
import { seedDatabase } from './db/seedData'
import { ensureSchedule } from './db/schedule'

// 首次启动：填充默认计划 + 生成日程表（均幂等）
async function initDb() {
  await seedDatabase()
  await ensureSchedule()
}
initDb().catch((err) => console.error('初始化数据失败：', err))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <CoachProvider>
        <App />
      </CoachProvider>
      <DailySummary />
    </ThemeProvider>
  </StrictMode>,
)
