import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision'

interface Pt {
  x: number
  y: number
  visibility?: number
}

function angleAt(a: Pt, b: Pt, c: Pt): number {
  const ab = { x: a.x - b.x, y: a.y - b.y }
  const cb = { x: c.x - b.x, y: c.y - b.y }
  const dot = ab.x * cb.x + ab.y * cb.y
  const mag = Math.hypot(ab.x, ab.y) * Math.hypot(cb.x, cb.y)
  if (mag === 0) return 180
  const cos = Math.max(-1, Math.min(1, dot / mag))
  return (Math.acos(cos) * 180) / Math.PI
}

function visible(p?: Pt): boolean {
  return !!p && (p.visibility ?? 1) >= 0.4
}

// 膝角（髋-膝-踝）
function kneeAngle(lm: Pt[]): number | null {
  if (!visible(lm[23]) || !visible(lm[25]) || !visible(lm[27])) return null
  return angleAt(lm[23], lm[25], lm[27])
}
function kneeAngleRight(lm: Pt[]): number | null {
  if (!visible(lm[24]) || !visible(lm[26]) || !visible(lm[28])) return null
  return angleAt(lm[24], lm[26], lm[28])
}
// 髋角（肩-髋-膝）
function hipAngle(lm: Pt[]): number | null {
  if (!visible(lm[11]) || !visible(lm[23]) || !visible(lm[25])) return null
  return angleAt(lm[11], lm[23], lm[25])
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked)
      resolve()
    }
    video.addEventListener('seeked', onSeeked)
    video.currentTime = time
  })
}

export interface DiagnosisResult {
  screenshots: string[] // 1-3 张关键帧 base64
  minKneeAngle: number
  anglesSummary: string
}

/** 逐帧提取视频画面 → MediaPipe 姿态识别 → 记录膝/髋角度 → 找出角度最极端的关键帧 */
export async function runVideoDiagnosis(
  video: HTMLVideoElement,
  onProgress: (p: number) => void,
): Promise<DiagnosisResult> {
  const vision = await FilesetResolver.forVisionTasks('/wasm')
  const landmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: '/models/pose_landmarker_lite.task', delegate: 'CPU' },
    runningMode: 'VIDEO',
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
  })

  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth || 640
  canvas.height = video.videoHeight || 480
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法创建画布')

  const interval = 0.5
  const duration = video.duration
  const timestamps: number[] = []
  for (let t = 0; t <= duration; t += interval) timestamps.push(t)

  let minKnee = Infinity
  let maxKnee = -Infinity
  let minKneeFrame: string | null = null
  let maxKneeFrame: string | null = null
  let minKneeHip: number | null = null
  const midIndex = Math.floor(timestamps.length / 2)
  let midFrame: string | null = null

  for (let i = 0; i < timestamps.length; i++) {
    const t = timestamps[i]
    await seekTo(video, t)
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    const result = landmarker.detectForVideo(canvas, Math.round(t * 1000))
    const lm = result.landmarks?.[0]

    let knee: number | null = null
    let hip: number | null = null
    if (lm) {
      const l = kneeAngle(lm)
      const r = kneeAngleRight(lm)
      if (l != null && r != null) knee = (l + r) / 2
      else knee = l ?? r
      hip = hipAngle(lm)
    }

    if (i === midIndex) midFrame = canvas.toDataURL('image/jpeg', 0.8)

    if (knee != null && knee < minKnee) {
      minKnee = knee
      minKneeFrame = canvas.toDataURL('image/jpeg', 0.8)
      minKneeHip = hip
    }
    if (knee != null && knee > maxKnee) {
      maxKnee = knee
      maxKneeFrame = canvas.toDataURL('image/jpeg', 0.8)
    }

    onProgress(Math.round(((i + 1) / timestamps.length) * 100))
    // 让出主线程，避免 UI 卡死
    await new Promise((r) => setTimeout(r, 0))
  }

  if (minKnee === Infinity || maxKnee === -Infinity) {
    throw new Error('未能从视频中识别到有效动作，请确保人物全身可见、光线充足')
  }

  const screenshots = [maxKneeFrame, minKneeFrame, midFrame].filter((f): f is string => f != null)
  const unique = [...new Set(screenshots)].slice(0, 3)

  const hipText = minKneeHip != null ? `底部时髋角约 ${Math.round(minKneeHip)}°` : ''
  const anglesSummary = `膝角范围：${Math.round(maxKnee)}°（最直/站姿）→ ${Math.round(minKnee)}°（最屈/底部）。${hipText}`.trim()

  return { screenshots: unique, minKneeAngle: Math.round(minKnee), anglesSummary }
}
