/// <reference types="node" />

// Vercel Serverless Function：/api/chat
// 环境变量在 Vercel 后台配置（不要加 VITE_ 前缀）：AI_API_KEY、AI_BASE_URL、AI_MODEL

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
  images?: string[]
}

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

function cleanImageUrl(url: string): string {
  let clean = url.replace(/\s+/g, '')
  if (!clean.startsWith('data:')) clean = `data:image/jpeg;base64,${clean}`
  return clean
}

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

async function streamFromLLM(body: ChatRequestBody, onDelta: (delta: string) => void): Promise<void> {
  const apiKey = process.env.AI_API_KEY ?? ''
  const baseUrl = process.env.AI_BASE_URL ?? 'https://open.bigmodel.cn/api/paas/v4'
  const model = process.env.AI_MODEL ?? 'glm-4-flash'
  if (!apiKey) throw new Error('服务端未配置 AI_API_KEY')

  const messages = buildMessages(body)

  const upstream = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, stream: true, temperature: 0.4 }),
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
      let json: { choices?: { delta?: { content?: string } }[] }
      try {
        json = JSON.parse(payload)
      } catch {
        continue
      }
      const delta = json?.choices?.[0]?.delta?.content
      if (typeof delta === 'string' && delta) onDelta(delta)
    }
  }
}

export default async function handler(request: Request): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  // CORS 预检
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  let body: ChatRequestBody
  try {
    body = await request.json()
  } catch {
    return new Response(JSON.stringify({ error: '请求体不是有效的 JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!process.env.AI_API_KEY) {
    return new Response(JSON.stringify({ error: '服务端未配置 AI_API_KEY' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // SSE 流式响应
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const send = (data: string) => controller.enqueue(encoder.encode(data))
      try {
        await streamFromLLM(body, (delta) => send(`data: ${JSON.stringify({ delta })}\n\n`))
        send('data: [DONE]\n\n')
      } catch (err) {
        const msg = err instanceof Error ? err.message : '未知错误'
        send(`data: ${JSON.stringify({ error: msg })}\n\n`)
        send('data: [DONE]\n\n')
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
