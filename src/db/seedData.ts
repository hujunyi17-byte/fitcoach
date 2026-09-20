// 首次启动时填充的三分化初始计划
import { db } from './db'
import type { Exercise, WorkoutDay } from './types'

// 种子数据版本：修改本文件后递增此值，App 下次启动会自动清空并重新填充动作数据
const SEED_VERSION = '3'
const SEED_VERSION_KEY = 'seedVersion'

export const EXERCISES: Exercise[] = [
  // —— 胸 ——
  { id: 'pec-deck-fly', name: '蝴蝶机夹胸', muscleGroup: 'chest', category: 'isolation', equipment: '蝴蝶机', defaultSets: 4, defaultRepsMin: 12, defaultRepsMax: 15, demoUrl: 'https://v.douyin.com/mwHMDEbmVxE/' },
  { id: 'barbell-bench-press', name: '杠铃卧推', muscleGroup: 'chest', category: 'compound', equipment: '杠铃', defaultSets: 4, defaultRepsMin: 6, defaultRepsMax: 10, demoUrl: 'https://v.douyin.com/mDdfJ3Ogkbk/' },
  { id: 'incline-barbell-press', name: '杠铃上斜卧推', muscleGroup: 'chest', category: 'compound', equipment: '杠铃', defaultSets: 4, defaultRepsMin: 8, defaultRepsMax: 12, demoUrl: 'https://v.douyin.com/fT0MG-t9IME/' },
  { id: 'flat-dumbbell-press', name: '哑铃平板卧推', muscleGroup: 'chest', category: 'compound', equipment: '哑铃', defaultSets: 4, defaultRepsMin: 8, defaultRepsMax: 12, demoUrl: 'https://v.douyin.com/RfJBzhPuHvI/' },
  { id: 'dips', name: '双杠臂屈伸', muscleGroup: 'chest', category: 'compound', equipment: '双杠', defaultSets: 3, defaultRepsMin: 8, defaultRepsMax: 12, demoUrl: 'https://v.douyin.com/y9rvU3X98Zs/' },
  { id: 'machine-chest-press', name: '器械推胸', muscleGroup: 'chest', category: 'compound', equipment: '推胸机', defaultSets: 4, defaultRepsMin: 8, defaultRepsMax: 12, demoUrl: 'https://v.douyin.com/1_tJ9jxmOS0/' },
  { id: 'side-lateral-pec-deck', name: '侧平举蝴蝶机夹胸', muscleGroup: 'chest', category: 'isolation', equipment: '蝴蝶机', defaultSets: 3, defaultRepsMin: 12, defaultRepsMax: 15, demoUrl: 'https://v.douyin.com/WrbzDgjH5OE/' },
  // —— 三头 ——
  { id: 'rope-overhead-extension', name: '绳索臂屈伸', muscleGroup: 'triceps', category: 'isolation', equipment: '绳索', defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 12, demoUrl: 'https://v.douyin.com/GTLRgrioGks/' },
  { id: 'cable-pushdown', name: '绳索下压', muscleGroup: 'triceps', category: 'isolation', equipment: '龙门架', defaultSets: 4, defaultRepsMin: 12, defaultRepsMax: 15, demoUrl: 'https://v.douyin.com/bBjuiVICz8I/' },
  { id: 'triceps-pushdown', name: '肱三头肌下压', muscleGroup: 'triceps', category: 'isolation', equipment: '下压机', defaultSets: 3, defaultRepsMin: 12, defaultRepsMax: 15, demoUrl: 'https://v.douyin.com/kMGT0JF1sJI/' },
  // —— 背 ——
  { id: 'pull-up', name: '引体向上', muscleGroup: 'back', category: 'compound', equipment: '自重', defaultSets: 4, defaultRepsMin: 6, defaultRepsMax: 10, demoUrl: 'https://v.douyin.com/A6xwunPsFVY/' },
  { id: 'straight-arm-pulldown', name: '直臂下压', muscleGroup: 'back', category: 'isolation', equipment: '龙门架', defaultSets: 3, defaultRepsMin: 12, defaultRepsMax: 15, demoUrl: 'https://v.douyin.com/Wd3fN4ui6YE/' },
  { id: 'seated-cable-row', name: '坐姿划船', muscleGroup: 'back', category: 'compound', equipment: '坐姿划船机', defaultSets: 4, defaultRepsMin: 10, defaultRepsMax: 12, demoUrl: 'https://v.douyin.com/FdSYfHhTQxc/' },
  { id: 'lat-pulldown', name: '高位下拉', muscleGroup: 'back', category: 'compound', equipment: '高位下拉机', defaultSets: 4, defaultRepsMin: 10, defaultRepsMax: 12, demoUrl: 'https://v.douyin.com/p9858qnNetE/' },
  { id: 't-bar-row', name: 'T杠划船', muscleGroup: 'back', category: 'compound', equipment: 'T杠', defaultSets: 4, defaultRepsMin: 8, defaultRepsMax: 12, demoUrl: 'https://v.douyin.com/Gbyj5bA8jck/' },
  { id: 'high-row', name: '高位划船', muscleGroup: 'back', category: 'compound', equipment: '高位划船机', defaultSets: 3, defaultRepsMin: 10, defaultRepsMax: 12, demoUrl: 'https://v.douyin.com/9JR8jJigxko/' },
  // —— 二头 ——
  { id: 'seated-curl', name: '蹲坐姿臂弯举', muscleGroup: 'biceps', category: 'isolation', equipment: '哑铃', defaultSets: 4, defaultRepsMin: 10, defaultRepsMax: 12, demoUrl: 'https://v.douyin.com/BJDQpZJz8jw/' },
  // —— 肩 ——
  { id: 'reverse-pec-deck', name: '反向蝴蝶机', muscleGroup: 'shoulders', category: 'isolation', equipment: '蝴蝶机', defaultSets: 3, defaultRepsMin: 12, defaultRepsMax: 15, demoUrl: 'https://v.douyin.com/BEKnptDo52w/' },
  { id: 'dumbbell-shoulder-press', name: '哑铃推举', muscleGroup: 'shoulders', category: 'compound', equipment: '哑铃', defaultSets: 4, defaultRepsMin: 8, defaultRepsMax: 12, demoUrl: 'https://v.douyin.com/I_1zOi_GHRM/' },
  { id: 'dumbbell-fly', name: '飞鸟', muscleGroup: 'shoulders', category: 'isolation', equipment: '哑铃', defaultSets: 3, defaultRepsMin: 12, defaultRepsMax: 15, demoUrl: 'https://v.douyin.com/cbPUeEjeabE/' },
  { id: 'cable-lateral-raise', name: '绳索侧平举', muscleGroup: 'shoulders', category: 'isolation', equipment: '龙门架', defaultSets: 4, defaultRepsMin: 12, defaultRepsMax: 15, demoUrl: 'https://v.douyin.com/pkermq1C-Kg/' },
  { id: 'cable-face-pull', name: '绳索面拉', muscleGroup: 'shoulders', category: 'isolation', equipment: '龙门架', defaultSets: 3, defaultRepsMin: 15, defaultRepsMax: 20, demoUrl: 'https://v.douyin.com/S-dPRLzyQyQ/' },
  // —— 腿 ——
  { id: 'leg-extension', name: '腿屈伸', muscleGroup: 'legs', category: 'isolation', equipment: '腿屈伸机', defaultSets: 3, defaultRepsMin: 12, defaultRepsMax: 15, demoUrl: 'https://v.douyin.com/GAdnjxVnyNI/' },
  { id: 'seated-hip-adduction', name: '坐姿髋内收', muscleGroup: 'legs', category: 'isolation', equipment: '髋内收机', defaultSets: 3, defaultRepsMin: 12, defaultRepsMax: 15, demoUrl: 'https://v.douyin.com/I-kYivGm9M0/' },
  { id: 'seated-hip-abduction', name: '坐姿髋外展', muscleGroup: 'legs', category: 'isolation', equipment: '髋外展机', defaultSets: 3, defaultRepsMin: 12, defaultRepsMax: 15, demoUrl: 'https://v.douyin.com/lHvCk966l0Y/' },
  { id: 'leg-press', name: '倒蹬', muscleGroup: 'legs', category: 'compound', equipment: '倒蹬机', defaultSets: 4, defaultRepsMin: 10, defaultRepsMax: 12, demoUrl: 'https://v.douyin.com/MPIc3y9W79E/' },
  { id: 'hack-squat', name: '哈克深蹲', muscleGroup: 'legs', category: 'compound', equipment: '哈克深蹲机', defaultSets: 4, defaultRepsMin: 8, defaultRepsMax: 12, demoUrl: 'https://v.douyin.com/c49mS2kiBCo/' },
]

export const WORKOUT_DAYS: WorkoutDay[] = [
  {
    id: 'day-1',
    name: 'Day 1 · 胸 + 三头',
    focus: ['chest', 'triceps'],
    isRestDay: false,
    exerciseIds: [
      'pec-deck-fly',
      'barbell-bench-press',
      'incline-barbell-press',
      'flat-dumbbell-press',
      'dips',
      'rope-overhead-extension',
      'cable-pushdown',
      'triceps-pushdown',
    ],
    optionalExerciseIds: ['machine-chest-press', 'side-lateral-pec-deck'],
  },
  {
    id: 'day-2',
    name: 'Day 2 · 背 + 二头',
    focus: ['back', 'biceps'],
    isRestDay: false,
    exerciseIds: [
      'pull-up',
      'straight-arm-pulldown',
      'seated-cable-row',
      'lat-pulldown',
      't-bar-row',
      'high-row',
      'seated-curl',
    ],
    optionalExerciseIds: [],
  },
  {
    id: 'day-3',
    name: 'Day 3 · 肩 + 腿',
    focus: ['shoulders', 'legs'],
    isRestDay: false,
    exerciseIds: [
      'reverse-pec-deck',
      'dumbbell-shoulder-press',
      'dumbbell-fly',
      'cable-lateral-raise',
      'cable-face-pull',
      'leg-extension',
      'seated-hip-adduction',
      'seated-hip-abduction',
      'leg-press',
      'hack-squat',
    ],
    optionalExerciseIds: [],
  },
  {
    id: 'day-4',
    name: 'Day 4 · 休息',
    focus: [],
    isRestDay: true,
    exerciseIds: [],
    optionalExerciseIds: [],
  },
]

/**
 * 填充默认计划。幂等 + 版本化：仅当动作库为空或种子版本变化时执行；
 * 版本变化时会先清空旧的动作数据（exercises / workoutDays / userExerciseSettings）再重新填充。
 */
export async function seedDatabase(): Promise<void> {
  const storedVersion = (await db.appSettings.get(SEED_VERSION_KEY))?.value
  if (storedVersion === SEED_VERSION && (await db.exercises.count()) > 0) return

  await db.transaction('rw', db.exercises, db.workoutDays, db.userExerciseSettings, db.appSettings, async () => {
    await db.exercises.clear()
    await db.workoutDays.clear()
    await db.userExerciseSettings.clear()
    await db.exercises.bulkAdd(EXERCISES)
    await db.workoutDays.bulkAdd(WORKOUT_DAYS)
    await db.appSettings.put({ key: SEED_VERSION_KEY, value: SEED_VERSION, updatedAt: Date.now() })
  })
}
