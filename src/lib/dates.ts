// 本地日期纯函数工具（统一用 'YYYY-MM-DD' 字符串，避免时区坑）

export function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayStr(): string {
  return toDateStr(new Date())
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00:00`)
  d.setDate(d.getDate() + n)
  return toDateStr(d)
}

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

export function weekdayLabel(dateStr: string): string {
  return WEEKDAYS[new Date(`${dateStr}T00:00:00`).getDay()]
}
