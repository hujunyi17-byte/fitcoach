import type { Exercise } from '../db/types'

/**
 * 动作示范入口：直接打开硬编码的 demoUrl。
 * 无链接时返回 null（隐藏按钮）；用原生 <a target="_blank"> 保证在手机 PWA 独立窗口里也能正常跳转。
 */
export default function DemoLink({ exercise }: { exercise: Exercise }) {
  if (!exercise.demoUrl) return null
  return (
    <a
      href={exercise.demoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm text-muted active:opacity-70"
    >
      查看示范
    </a>
  )
}
