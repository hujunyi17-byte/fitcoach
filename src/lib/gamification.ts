import { db } from '../db/db'

export const PROFILE_ID = 'me'
export const XP_PER_WORKOUT = 100
export const XP_PER_LEVEL = 500 // 每 500 XP 升 1 级

/** 完成一次训练后累加经验值（写入 userProfile） */
export async function incrementWorkout(): Promise<number> {
  const p = await db.userProfile.get(PROFILE_ID)
  const xp = (p?.xp ?? 0) + XP_PER_WORKOUT
  await db.userProfile.put({
    id: PROFILE_ID,
    nickname: p?.nickname ?? '健身达人',
    avatar: p?.avatar,
    xp,
  })
  return xp
}

export function levelFromXp(xp: number): number {
  return Math.floor(xp / XP_PER_LEVEL) + 1
}

export function levelProgress(xp: number): { level: number; current: number; next: number; pct: number } {
  const level = levelFromXp(xp)
  const current = xp - (level - 1) * XP_PER_LEVEL
  return { level, current, next: XP_PER_LEVEL, pct: Math.min(1, current / XP_PER_LEVEL) }
}
