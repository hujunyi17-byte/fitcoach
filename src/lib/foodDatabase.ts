// 本地常见健身食物热量库（每 100g 的营养素）
export interface FoodEntry {
  name: string
  calories: number // 大卡 / 100g
  protein: number // 克 / 100g
  carbs: number
  fat: number
}

export const FOOD_DATABASE: FoodEntry[] = [
  { name: '鸡胸肉', calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  { name: '鸡腿肉', calories: 209, protein: 26, carbs: 0, fat: 11 },
  { name: '瘦牛肉', calories: 250, protein: 26, carbs: 0, fat: 15 },
  { name: '瘦猪肉', calories: 143, protein: 21, carbs: 0, fat: 6 },
  { name: '三文鱼', calories: 208, protein: 20, carbs: 0, fat: 13 },
  { name: '金枪鱼', calories: 132, protein: 28, carbs: 0, fat: 1.3 },
  { name: '虾', calories: 99, protein: 24, carbs: 0.2, fat: 0.3 },
  { name: '鸡蛋', calories: 155, protein: 13, carbs: 1.1, fat: 11 },
  { name: '鸡蛋白', calories: 52, protein: 11, carbs: 0.7, fat: 0.2 },
  { name: '牛奶', calories: 61, protein: 3.2, carbs: 4.8, fat: 3.3 },
  { name: '希腊酸奶', calories: 59, protein: 10, carbs: 3.6, fat: 0.4 },
  { name: '豆腐', calories: 76, protein: 8, carbs: 1.9, fat: 4.8 },
  { name: '米饭（熟）', calories: 116, protein: 2.6, carbs: 25.9, fat: 0.3 },
  { name: '燕麦', calories: 389, protein: 16.9, carbs: 66.3, fat: 6.9 },
  { name: '全麦面包', calories: 247, protein: 13, carbs: 41, fat: 3.4 },
  { name: '红薯', calories: 86, protein: 1.6, carbs: 20.1, fat: 0.1 },
  { name: '土豆', calories: 77, protein: 2, carbs: 17, fat: 0.1 },
  { name: '玉米', calories: 112, protein: 4, carbs: 22, fat: 1.5 },
  { name: '意大利面（熟）', calories: 158, protein: 5.8, carbs: 31, fat: 0.9 },
  { name: '藜麦（熟）', calories: 120, protein: 4.4, carbs: 21.3, fat: 1.9 },
  { name: '西兰花', calories: 34, protein: 2.8, carbs: 6.6, fat: 0.4 },
  { name: '菠菜', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  { name: '生菜', calories: 15, protein: 1.4, carbs: 2.9, fat: 0.2 },
  { name: '番茄', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
  { name: '黄瓜', calories: 15, protein: 0.7, carbs: 3.6, fat: 0.1 },
  { name: '胡萝卜', calories: 41, protein: 0.9, carbs: 9.6, fat: 0.2 },
  { name: '香蕉', calories: 89, protein: 1.1, carbs: 22.8, fat: 0.3 },
  { name: '苹果', calories: 52, protein: 0.3, carbs: 13.8, fat: 0.2 },
  { name: '橙子', calories: 47, protein: 0.9, carbs: 11.8, fat: 0.1 },
  { name: '蓝莓', calories: 57, protein: 0.7, carbs: 14.5, fat: 0.3 },
  { name: '牛油果', calories: 160, protein: 2, carbs: 8.5, fat: 14.7 },
  { name: '花生', calories: 567, protein: 25.8, carbs: 16.1, fat: 49.2 },
  { name: '杏仁', calories: 579, protein: 21.2, carbs: 21.6, fat: 49.9 },
  { name: '核桃', calories: 654, protein: 15.2, carbs: 13.7, fat: 65.2 },
  { name: '橄榄油', calories: 884, protein: 0, carbs: 0, fat: 100 },
  { name: '蛋白粉', calories: 400, protein: 80, carbs: 8, fat: 6 },
  { name: '豆浆', calories: 31, protein: 3, carbs: 1.2, fat: 1.6 },
  { name: '鹰嘴豆', calories: 364, protein: 19, carbs: 61, fat: 6 },
  { name: '芝士', calories: 402, protein: 25, carbs: 1.3, fat: 33 },
  { name: '鸡胸肉肠', calories: 120, protein: 15, carbs: 2, fat: 5 },
]

export function searchFoods(query: string): FoodEntry[] {
  const q = query.trim()
  if (!q) return []
  return FOOD_DATABASE.filter((f) => f.name.includes(q))
}
