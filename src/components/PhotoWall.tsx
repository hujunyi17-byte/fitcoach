import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { fileToDataUrl } from '../lib/image'
import { todayStr } from '../lib/dates'

export default function PhotoWall({ onBack }: { onBack: () => void }) {
  const photos = useLiveQuery(() => db.dailyPhotos.orderBy('dateStr').reverse().toArray(), [])
  const [note, setNote] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true)
    try {
      const dataUrl = await fileToDataUrl(file, 512, 0.5)
      await db.dailyPhotos.put({
        dateStr: todayStr(),
        photoBase64: dataUrl,
        note: note.trim() || undefined,
        timestamp: Date.now(),
      })
      setNote('')
    } catch {
      /* ignore */
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="p-5">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onBack} className="text-muted">
          ‹ 返回
        </button>
        <h1 className="text-xl font-bold">我的照片墙</h1>
      </div>

      {/* 上传 */}
      <div className="mt-4 rounded-2xl bg-surface p-4">
        <p className="text-sm font-semibold text-muted">记录今天的状态</p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="写一句备注（如：今天状态很好）"
          rows={2}
          className="mt-2 w-full rounded-lg border border-border bg-white/5 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="mt-2 w-full rounded-xl bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {uploading ? '上传中…' : '📷 上传 / 拍照'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            e.target.value = ''
            if (f) void handleFile(f)
          }}
        />
      </div>

      {/* 照片网格（日期倒序） */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        {photos?.map((p) => (
          <div key={p.dateStr} className="rounded-xl bg-surface p-1.5">
            <img src={p.photoBase64} alt={p.dateStr} className="aspect-square w-full rounded-lg object-cover" />
            <p className="mt-1 truncate text-center text-[10px] text-muted">{p.dateStr.slice(5)}</p>
            {p.note && <p className="truncate text-center text-[10px] text-muted">{p.note}</p>}
          </div>
        ))}
      </div>
      {photos && photos.length === 0 && (
        <p className="mt-6 text-center text-sm text-muted">还没有照片，上传第一张记录今天的状态吧</p>
      )}
    </div>
  )
}
