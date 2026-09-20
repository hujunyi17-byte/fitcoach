import { db } from './db'

export const HEIGHT_ID = 'height'
export const AGE_ID = 'age'
export const SEX_ID = 'sex'

export function weightId(date: string): string {
  return `weight:${date}`
}

export async function setHeight(cm: number): Promise<void> {
  await db.userMetrics.put({ id: HEIGHT_ID, kind: 'height', date: '', value: cm, updatedAt: Date.now() })
}

export async function setWeight(date: string, kg: number): Promise<void> {
  await db.userMetrics.put({ id: weightId(date), kind: 'weight', date, value: kg, updatedAt: Date.now() })
}

export async function setAge(age: number): Promise<void> {
  await db.userMetrics.put({ id: AGE_ID, kind: 'age', date: '', value: age, updatedAt: Date.now() })
}

export async function setSex(sex: 'male' | 'female'): Promise<void> {
  await db.userMetrics.put({ id: SEX_ID, kind: 'sex', date: '', value: sex === 'female' ? 1 : 0, updatedAt: Date.now() })
}
