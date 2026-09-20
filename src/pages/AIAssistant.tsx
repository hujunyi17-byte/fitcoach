import { useEffect, useRef, useState } from 'react'
import { parsePlan, streamChat } from '../lib/chat'
import type { ChatMessage, Plan } from '../lib/chat'
import Markdown from '../components/Markdown'
import PlanTable from '../components/PlanTable'

interface UiMessage {
  role: 'user' | 'assistant'
  content: string
  plan?: Plan | null
}

const QUICK_PROMPTS = [
  '帮我制定一份增肌三分化计划',
  '根据我的训练记录，饮食上要注意什么？',
  '今天有点累，要不要顺延训练？',
]

export default function AIAssistant() {
  const [messages, setMessages] = useState<UiMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  async function send(text: string) {
    if (streaming) return
    const content = text.trim()
    if (!content) return

    setInput('')
    const history: ChatMessage[] = messages.map((m) => ({ role: m.role, content: m.content }))
    setMessages([...messages, { role: 'user', content }, { role: 'assistant', content: '' }])
    setStreaming(true)

    let full = ''
    try {
      await streamChat([...history, { role: 'user', content }], (delta) => {
        full += delta
        setMessages((prev) => {
          const arr = [...prev]
          arr[arr.length - 1] = { role: 'assistant', content: full }
          return arr
        })
      })
      setMessages((prev) => {
        const arr = [...prev]
        arr[arr.length - 1] = { role: 'assistant', content: full, plan: parsePlan(full) }
        return arr
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : '出错了，请稍后再试'
      setMessages((prev) => {
        const arr = [...prev]
        arr[arr.length - 1] = { role: 'assistant', content: `⚠️ ${msg}` }
        return arr
      })
    } finally {
      setStreaming(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-border p-4">
        <h1 className="text-lg font-semibold">AI 健身助手</h1>
        <p className="mt-0.5 text-xs text-muted">NSCA 认证教练 · 基于你的训练数据回答</p>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col justify-center">
            <p className="text-center text-sm text-muted">有什么可以帮你？</p>
            <div className="mt-4 space-y-2">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="w-full rounded-xl border border-border bg-surface px-4 py-2.5 text-left text-sm text-muted active:opacity-70"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === 'user' ? 'bg-primary text-white' : 'bg-surface text-foreground'
                  }`}
                >
                  {m.plan ? (
                    <PlanTable plan={m.plan} />
                  ) : m.content ? (
                    <Markdown text={m.content} />
                  ) : streaming ? (
                    <span className="text-muted">正在思考…</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <form
        className="shrink-0 border-t border-border p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
        onSubmit={(e) => {
          e.preventDefault()
          void send(input)
        }}
      >
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="向教练提问…"
            className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="shrink-0 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            发送
          </button>
        </div>
      </form>
    </div>
  )
}
