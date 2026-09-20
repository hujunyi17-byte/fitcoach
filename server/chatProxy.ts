import type { Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

export interface ChatProxyOptions {
  apiKey: string
  baseUrl: string
  model: string
}

type ChatContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } }

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | ChatContentPart[]
}

interface ChatRequestBody {
  context?: string
  messages?: ChatMessage[]
  images?: string[] // 可选：多张图片 data URL（多模态，食物识别/动作诊断）
}

interface DeltaChunk {
  choices?: { delta?: { content?: string } }[]
}

// NSCA + ACE 双认证教练 + 注册营养师人设：专业、严谨、结构化
const SYSTEM_PROMPT = `你是一位拥有 NSCA（美国国家体能协会）与 ACE（美国运动委员会）双重认证的顶级私人教练，同时是注册营养师（RD）。你的回答必须极度专业、严谨、有条理。

【专业知识】
- 精通渐进式超负荷与周期化训练，能制定并调整增肌/减脂方案。
- 精通 BMR 与 TDEE 的精准计算（含活动系数），能给出合理的热量目标与增减配速。
- 精通宏量营养素分配（蛋白质/碳水/脂肪）与进食时机。

【严格红线（必须遵守）】
- 严禁推荐任何药物、激素、SARMs 等违禁手段。
- 严禁极端节食（热量低于基础代谢、长期断食、极低脂/极低碳等）。
- 严禁补剂推销或夸大作用；补剂仅在有充分证据时客观提及。
- 涉及伤痛、疾病、疑似进食障碍时，必须先提醒用户咨询医生或注册营养师。
- 默认用中文回答。

【上下文要求】
下方「用户最新数据」提供了该用户的最新体重与最近训练记录，你的所有建议必须结合这些真实数据，禁止空泛套话。

【回复格式】
- 禁止长篇大论和废话，开门见山给结论。
- 结构化、分点说明（可用小标题 + 无序列表），每条给出可立即执行的建议。
- 涉及训练计划时，必须给出具体动作、组数、次数、组间休息，以及「重量区间」（如 12RM 的 75%–85%，或具体 kg 区间）。

【训练计划输出】
当用户要求「制定训练计划 / 训练方案 / 计划」时，只返回一个 JSON 对象（不要输出任何解释文字，不要用 Markdown 代码块包裹），结构如下：
{"title":"计划标题","days":[{"day":"Day 1","focus":"胸 + 三头","exercises":[{"name":"动作名","sets":4,"reps":"8-12","weight":"75-85kg","rest":"90秒"}]}]}

【用户最新数据】
`

function buildSystemPrompt(context: string): string {
  return SYSTEM_PROMPT + (context || '（暂无）')
}

/** 图片 Base64 预处理：去掉换行/空格，缺失时补 data: 前缀 */
function cleanImageUrl(url: string): string {
  let clean = url.replace(/\s+/g, '')
  if (!clean.startsWith('data:')) {
    clean = `data:image/jpeg;base64,${clean}`
  }
  return clean
}

/** 组装最终消息：系统提示 + 用户消息（带图时把最后一条用户消息转成多模态） */
function buildMessages(body: ChatRequestBody): ChatMessage[] {
  const msgs: ChatMessage[] = [...(body.messages ?? [])]
  const images = body.images?.length ? body.images : []
  if (images.length && msgs.length) {
    const last = msgs[msgs.length - 1]
    if (last.role === 'user' && typeof last.content === 'string') {
      msgs[msgs.length - 1] = {
        role: 'user',
        content: [
          { type: 'text', text: last.content },
          ...images.map<ChatContentPart>((url) => ({ type: 'image_url', image_url: { url: cleanImageUrl(url) } })),
        ],
      }
    }
  }
  return [{ role: 'system', content: buildSystemPrompt(body.context ?? '') }, ...msgs]
}

function readJsonBody(req: IncomingMessage): Promise<ChatRequestBody> {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk: Buffer) => {
      raw += chunk.toString()
    })
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'))
      } catch (err) {
        reject(err instanceof Error ? err : new Error('请求体不是有效的 JSON'))
      }
    })
    req.on('error', reject)
  })
}

/** 转发到大模型并解析上游 SSE，逐段回调 delta */
async function streamFromLLM(
  opts: ChatProxyOptions,
  body: ChatRequestBody,
  onDelta: (delta: string) => void,
): Promise<void> {
  const messages = buildMessages(body)

  // 日志：打印模型与消息结构（图片 base64 截断，避免刷屏）
  const preview = messages.map((m) => ({
    role: m.role,
    content:
      typeof m.content === 'string'
        ? m.content
        : m.content.map((c) =>
            c.type === 'image_url'
              ? { type: 'image_url', image_url: { url: `${c.image_url.url.slice(0, 50)}…(${Math.round(c.image_url.url.length / 1024)}KB)` } }
              : c,
          ),
  }))
  console.log('[chatProxy] model =', opts.model)
  console.log('[chatProxy] messages =', JSON.stringify(preview, null, 2))

  const upstream = await fetch(`${opts.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model,
      messages,
      stream: true,
      temperature: 0.4,
    }),
  })

  if (!upstream.ok) {
    const errText = await upstream.text().catch(() => '')
    throw new Error(`上游 API 返回 ${upstream.status}：${errText.slice(0, 200)}`)
  }
  if (!upstream.body) throw new Error('上游 API 未返回响应体')

  const reader = upstream.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const payload = trimmed.slice(5).trim()
      if (payload === '[DONE]') return
      let json: DeltaChunk
      try {
        json = JSON.parse(payload) as DeltaChunk
      } catch {
        continue
      }
      const delta = json?.choices?.[0]?.delta?.content
      if (typeof delta === 'string' && delta) onDelta(delta)
    }
  }
}

export function chatProxyPlugin(opts: ChatProxyOptions): Plugin {
  return {
    name: 'fitcoach-chat-proxy',
    configureServer(server) {
      server.middlewares.use('/api/chat', async (req: IncomingMessage, res: ServerResponse) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('Method Not Allowed')
          return
        }

        let body: ChatRequestBody
        try {
          body = await readJsonBody(req)
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ error: '请求体不是有效的 JSON' }))
          return
        }

        if (!opts.apiKey) {
          res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' })
          res.end(JSON.stringify({ error: '服务端未配置 AI_API_KEY，请复制 .env.example 为 .env 并填入密钥' }))
          return
        }

        res.writeHead(200, {
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
          'X-Accel-Buffering': 'no',
        })

        try {
          await streamFromLLM(opts, body, (delta) => {
            res.write(`data: ${JSON.stringify({ delta })}\n\n`)
          })
          res.write('data: [DONE]\n\n')
        } catch (err) {
          const msg = err instanceof Error ? err.message : '未知错误'
          res.write(`data: ${JSON.stringify({ error: msg })}\n\n`)
          res.write('data: [DONE]\n\n')
        }
        res.end()
      })
    },
  }
}
