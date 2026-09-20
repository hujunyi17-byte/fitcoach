import { db } from './db'

export const BACKGROUND_IMAGE_KEY = 'backgroundImage'
export const GOAL_KEY = 'goal'

export async function getBackgroundImage(): Promise<string | null> {
  const s = await db.appSettings.get(BACKGROUND_IMAGE_KEY)
  return s?.value ?? null
}

export async function saveBackgroundImage(dataUrl: string): Promise<void> {
  await db.appSettings.put({ key: BACKGROUND_IMAGE_KEY, value: dataUrl, updatedAt: Date.now() })
}

export async function clearBackgroundImage(): Promise<void> {
  await db.appSettings.delete(BACKGROUND_IMAGE_KEY)
}

export async function getGoal(): Promise<'gain' | 'cut'> {
  const s = await db.appSettings.get(GOAL_KEY)
  return s?.value === 'cut' ? 'cut' : 'gain'
}

export async function setGoal(goal: 'gain' | 'cut'): Promise<void> {
  await db.appSettings.put({ key: GOAL_KEY, value: goal, updatedAt: Date.now() })
}
