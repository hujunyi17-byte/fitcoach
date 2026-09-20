// 数据模型定义（与 IndexedDB 表结构一一对应）

/** 肌群分类 */
export type MuscleGroup =
  | 'chest' // 胸
  | 'back' // 背
  | 'shoulders' // 肩
  | 'biceps' // 二头
  | 'triceps' // 三头
  | 'legs' // 腿
  | 'core' // 核心
  | 'other' // 其他

/** 肌群中文显示名 */
export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: '胸',
  back: '背',
  shoulders: '肩',
  biceps: '二头',
  triceps: '三头',
  legs: '腿',
  core: '核心',
  other: '其他',
}

/** 动作类型：复合动作 / 孤立动作 */
export type ExerciseCategory = 'compound' | 'isolation'

/** 动作库：预设动作 */
export interface Exercise {
  id: string // 稳定英文标识，如 'pec-deck-fly'
  name: string // 中文名，如 '蝴蝶机夹胸'
  muscleGroup: MuscleGroup
  category: ExerciseCategory
  equipment?: string // 器械名，如 '蝴蝶机'
  defaultSets?: number // 默认建议组数
  defaultRepsMin?: number // 默认建议次数下限
  defaultRepsMax?: number // 默认建议次数上限
  demoUrl?: string // 动作示范链接（为空时自动搜索抖音）
}

/** 训练日：三分化计划中的某一天 */
export interface WorkoutDay {
  id: string // 'day-1' ~ 'day-4'
  name: string // 'Day 1 · 胸 + 三头'
  focus: MuscleGroup[] // 当天训练肌群
  isRestDay: boolean
  exerciseIds: string[] // 必选动作的有序列表（引用 Exercise.id，严格顺序）
  optionalExerciseIds: string[] // 可选动作（默认不加入训练，用户可自由添加）
}

/** 用户对动作的覆盖配置（核心表，每动作一条） */
export interface UserExerciseSetting {
  exerciseId: string // 主键，等于 Exercise.id
  targetSets: number // 目标组数，如 4
  targetRepsMin: number // 目标次数下限，如 12
  targetRepsMax: number // 目标次数上限，如 17
  currentWeightMin: number // 当前重量下限（kg），如 75
  currentWeightMax: number // 当前重量上限（kg），如 85
  updatedAt: number // 最后更新时间戳
}

/** 训练记录：每组一条，用于渐进式超负荷计算 */
export interface WorkoutLog {
  id?: number // 自增主键
  exerciseId: string // 引用 Exercise.id
  workoutDayId?: string // 引用 WorkoutDay.id（哪一天的训练）
  date: string // 训练日期 'YYYY-MM-DD'
  setIndex: number // 当天该动作的第几组（从 1 开始）
  weight: number // 实际重量（kg）
  reps: number // 实际次数
  note?: string
  completedAt: number // 完成时间戳（排序用）
}

/** 日程表：日期 → 训练日（null = 休息 / 顺延后的空档） */
export interface ScheduleEntry {
  date: string // 'YYYY-MM-DD'（主键）
  workoutDayId: string | null
}

/** 身体数据：身高/年龄/性别（固定）+ 每日体重 */
export interface UserMetrics {
  id: string // 'height'、'age'、'sex'，或 'weight:2026-09-19'
  kind: 'height' | 'weight' | 'age' | 'sex'
  date: string // 体重记录日期（其余为空字符串）
  value: number // 身高(cm)、体重(kg)、年龄(岁)、性别(0=男 1=女)
  updatedAt: number
}

/** 饮食记录 */
export interface DietLog {
  id?: number // 自增主键
  timestamp: number // 记录时间戳
  image?: string // 食物图片 base64（文本降级时可为空）
  foodName: string // 食物名称
  weightInGrams: number // 食物重量（克）
  calories: number // 估算总热量（大卡）
  protein: number // 蛋白质(g)
  carbs: number // 碳水(g)
  fat: number // 脂肪(g)
  date: string // 'YYYY-MM-DD'（用于按天汇总）
}

/** 动作诊断报告 */
export interface DiagnosisReport {
  id?: number
  timestamp: number
  screenshots: string[] // 关键帧 base64（1-3 张）
  angles: string // 关节角度数据描述
  advice: string // AI 评语
  date: string // 'YYYY-MM-DD'
}

/** 用户个人资料（单条记录） */
export interface UserProfile {
  id: string // 'me'
  nickname: string
  avatar?: string // 头像 base64
  xp: number // 经验值
}

/** 每日状态照片（每天一张） */
export interface DailyPhoto {
  dateStr: string // 主键 'YYYY-MM-DD'
  photoBase64: string
  note?: string
  timestamp: number
}

/** 应用级设置（键值对，如背景图等） */
export interface AppSetting {
  key: string
  value: string
  updatedAt: number
}
