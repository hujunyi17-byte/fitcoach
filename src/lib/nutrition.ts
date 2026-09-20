export type Goal = 'gain' | 'cut'

export interface FoodItem {
  foodName: string
  weightInGrams: number
  calories: number
  protein: number
  carbs: number
  fat: number
}

export interface FoodResult {
  items: FoodItem[]
}

export const FOOD_IMAGE_PROMPT =
  '请按以下步骤分析这张食物图片：第一步，识别图片中有哪些食材；第二步，估算每种食材的重量（克）；第三步，计算每种食材的蛋白质、碳水、脂肪和总热量（大卡）。严格以 JSON 格式返回，不要输出任何其他文字，不要用 Markdown 代码块，格式如下：{"items":[{"foodName":"食材名","weightInGrams":重量克数,"calories":总热量大卡,"protein":蛋白质克数,"carbs":碳水克数,"fat":脂肪克数}]}'

export const FOOD_TEXT_PROMPT =
  '请按以下步骤分析这段食物描述：第一步，识别有哪些食材；第二步，估算每种食材的重量（克）；第三步，计算每种食材的蛋白质、碳水、脂肪和总热量（大卡）。严格以 JSON 格式返回，不要输出任何其他文字，不要用 Markdown 代码块，格式如下：{"items":[{"foodName":"食材名","weightInGrams":重量克数,"calories":总热量大卡,"protein":蛋白质克数,"carbs":碳水克数,"fat":脂肪克数}]}。食物描述：'

function isFoodResult(obj: unknown): obj is FoodResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    Array.isArray((obj as FoodResult).items) &&
    (obj as FoodResult).items.every(
      (it) =>
        typeof it.foodName === 'string' &&
        typeof it.weightInGrams === 'number' &&
        typeof it.calories === 'number',
    )
  )
}

/** 从 AI 输出里解析食物估算结果（容忍 markdown 围栏和前后杂质） */
export function parseFoodResult(text: string): FoodResult | null {
  let candidate = text.trim()
  const fence = candidate.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) candidate = fence[1].trim()
  try {
    const obj = JSON.parse(candidate)
    if (isFoodResult(obj)) return obj
  } catch {
    /* ignore */
  }
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try {
      const obj = JSON.parse(candidate.slice(start, end + 1))
      if (isFoodResult(obj)) return obj
    } catch {
      /* ignore */
    }
  }
  return null
}

/** Mifflin-St Jeor 公式计算 BMR（基础代谢率） */
export function calcBMR(weightKg: number, heightCm: number, age: number, sex: 'male' | 'female'): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return Math.round(sex === 'male' ? base + 5 : base - 161)
}

/** TDEE = BMR × 活动系数（默认 1.375 轻度活动） */
export function calcTDEE(bmr: number, activityFactor = 1.375): number {
  return Math.round(bmr * activityFactor)
}

/** 目标摄入：增肌 +300 大卡，减脂 -500 大卡 */
export function calcTarget(tdee: number, goal: Goal): number {
  return goal === 'gain' ? tdee + 300 : tdee - 500
}
