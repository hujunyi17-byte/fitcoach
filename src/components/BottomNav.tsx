import type { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { Dumbbell, Home, Sparkles, User, Utensils, Video } from 'lucide-react'

export type TabKey = 'home' | 'workout' | 'diagnosis' | 'diet' | 'ai' | 'profile'

interface NavTab {
  key: TabKey
  label: string
  icon: LucideIcon
}

const TABS: NavTab[] = [
  { key: 'home', label: '首页', icon: Home },
  { key: 'workout', label: '训练', icon: Dumbbell },
  { key: 'diagnosis', label: '诊断', icon: Video },
  { key: 'diet', label: '饮食', icon: Utensils },
  { key: 'ai', label: 'AI助手', icon: Sparkles },
  { key: 'profile', label: '我的', icon: User },
]

interface BottomNavProps {
  active: TabKey
  onChange: (key: TabKey) => void
}

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-6">
        {TABS.map(({ key, label, icon: Icon }) => {
          const isActive = key === active
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              aria-current={isActive ? 'page' : undefined}
              className="relative flex flex-col items-center gap-1 py-2.5 text-xs font-medium"
            >
              {isActive && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-x-1 inset-y-0.5 rounded-xl bg-primary/15"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                />
              )}
              <Icon
                size={22}
                strokeWidth={isActive ? 2.4 : 2}
                className={`relative z-10 transition-colors ${isActive ? 'text-primary' : 'text-muted'}`}
              />
              <span className={`relative z-10 ${isActive ? 'text-primary' : 'text-muted'}`}>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
