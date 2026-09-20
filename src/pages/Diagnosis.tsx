import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { runVideoDiagnosis } from '../lib/diagnosis'
import { streamChat } from '../lib/chat'
import { todayStr } from '../lib/dates'
import Markdown from '../components/Markdown'

const DIAGNOSIS_PROMPT =
  '你是一位 NSCA 认证的健身教练。以下是用户做深蹲/卧推等动作时的关键帧画面和关节角度数据。请指出用户动作不标准的点（如膝盖内扣、背部弯曲、深度不足等），并给出具体的改进建议。回答要简短、专业、亲和。'

interface Report {
  screenshots: string[]
  angles: string
  advice: string
}

export default function Diagnosis() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [diagnosing, setDiagnosing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<Report | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const reports = useLiveQuery(() => db.diagnosisReports.orderBy('timestamp').reverse().toArray(), [])

  function handleFile(file: File | undefined) {
    if (!file) return
    setError(null)
    setReport(null)
    if (videoUrl) URL.revokeObjectURL(videoUrl)
    setVideoUrl(URL.createObjectURL(file))
  }

  async function diagnose() {
    const video = videoRef.current
    if (!video || !videoUrl || diagnosing) return
    setDiagnosing(true)
    setError(null)
    setProgress(0)
    try {
      if (video.readyState < 1) {
        await new Promise((res) => video.addEventListener('loadedmetadata', res, { once: true }))
      }
      video.pause()

      const result = await runVideoDiagnosis(video, setProgress)
      if (!result.screenshots.length) {
        setError('未能提取到有效关键帧，请换一段画面更清晰的视频')
        return
      }

      let advice = ''
      await streamChat(
        [{ role: 'user', content: `${DIAGNOSIS_PROMPT}\n\n【关节角度数据】\n${result.anglesSummary}` }],
        (d) => {
          advice += d
        },
        result.screenshots,
      )

      const newReport: Report = { screenshots: result.screenshots, angles: result.anglesSummary, advice: advice.trim() }
      await db.diagnosisReports.add({ ...newReport, timestamp: Date.now(), date: todayStr() })
      setReport(newReport)
    } catch (err) {
      setError(err instanceof Error ? err.message : '诊断失败，请重试')
    } finally {
      setDiagnosing(false)
    }
  }

  return (
    <div className="p-5">
      <h1 className="text-2xl font-bold">动作诊断</h1>
      <p className="mt-1 text-sm text-muted">上传已拍好的训练视频，AI 自动分析动作是否标准</p>

      {!videoUrl ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="mt-4 w-full rounded-2xl border border-dashed border-border bg-surface py-12 text-sm text-muted active:opacity-80"
        >
          📹 上传训练视频
        </button>
      ) : (
        <div className="mt-4">
          <video ref={videoRef} src={videoUrl} controls muted playsInline className="max-h-72 w-full rounded-2xl bg-black" />
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={diagnose}
              disabled={diagnosing}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-50"
            >
              {diagnosing ? (progress < 100 ? `分析中 ${progress}%` : 'AI 诊断中…') : '开始 AI 诊断'}
            </button>
            <button type="button" onClick={() => { setVideoUrl(null); setReport(null) }} className="rounded-xl border border-border px-4 py-3 text-sm">
              重选
            </button>
          </div>
        </div>
      )}

      {diagnosing && (
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-500">⚠️ {error}</p>}

      {/* 诊断报告 */}
      {report && (
        <div className="mt-4 rounded-2xl bg-surface p-4">
          <p className="text-sm font-semibold">诊断报告</p>
          <p className="mt-1 text-xs text-muted">{report.angles}</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {report.screenshots.map((s, i) => (
              <img key={i} src={s} alt={`关键帧 ${i + 1}`} className="h-24 w-full rounded-lg object-cover" />
            ))}
          </div>
          <div className="mt-3 rounded-xl bg-white/5 p-3 text-sm">
            <Markdown text={report.advice} />
          </div>
        </div>
      )}

      {/* 历史记录 */}
      {reports && reports.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-muted">历史记录</h2>
          <div className="mt-2 space-y-2">
            {reports.map((r) => (
              <div key={r.id} className="flex items-start gap-3 rounded-xl bg-surface p-3">
                {r.screenshots[0] && <img src={r.screenshots[0]} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />}
                <div className="min-w-0">
                  <p className="text-xs text-muted">{r.date} · {r.angles}</p>
                  <p className="mt-1 line-clamp-3 text-sm">{r.advice}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          handleFile(f)
        }}
      />
    </div>
  )
}
