import Dexie, { type EntityTable } from 'dexie'
import type { AppSetting, DailyPhoto, DiagnosisReport, DietLog, Exercise, ScheduleEntry, UserExerciseSetting, UserMetrics, UserProfile, WorkoutDay, WorkoutLog } from './types'

export class FitCoachDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  workoutDays!: EntityTable<WorkoutDay, 'id'>
  userExerciseSettings!: EntityTable<UserExerciseSetting, 'exerciseId'>
  workoutLogs!: EntityTable<WorkoutLog, 'id'>
  schedule!: EntityTable<ScheduleEntry, 'date'>
  userMetrics!: EntityTable<UserMetrics, 'id'>
  appSettings!: EntityTable<AppSetting, 'key'>
  dietLogs!: EntityTable<DietLog, 'id'>
  diagnosisReports!: EntityTable<DiagnosisReport, 'id'>
  userProfile!: EntityTable<UserProfile, 'id'>
  dailyPhotos!: EntityTable<DailyPhoto, 'dateStr'>

  constructor() {
    super('fitcoach-db')
    this.version(1).stores({
      // 冒号前为主键，其余为索引；复合索引用于按「动作 + 日期」查询渐进式超负荷
      exercises: 'id, name, muscleGroup',
      workoutDays: 'id, isRestDay',
      userExerciseSettings: 'exerciseId',
      workoutLogs: '++id, exerciseId, date, workoutDayId, completedAt, [exerciseId+date]',
    })
    // v2：新增日程表（日期 → 训练日）
    this.version(2).stores({
      schedule: 'date',
    })
    // v3：新增身体数据表（身高 + 每日体重）
    this.version(3).stores({
      userMetrics: 'id, kind, date',
    })
    // v4：应用级设置（背景图等键值对）
    this.version(4).stores({
      appSettings: 'key',
    })
    // v5：饮食记录
    this.version(5).stores({
      dietLogs: '++id, date, timestamp',
    })
    // v6：动作诊断报告
    this.version(6).stores({
      diagnosisReports: '++id, date, timestamp',
    })
    // v7：用户个人资料（昵称 + 头像 + 经验值）
    this.version(7).stores({
      userProfile: 'id',
    })
    // v8：每日状态照片
    this.version(8).stores({
      dailyPhotos: 'dateStr, timestamp',
    })
  }
}

export const db = new FitCoachDB()
