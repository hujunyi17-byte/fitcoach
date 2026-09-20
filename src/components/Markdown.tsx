import type { ReactNode } from 'react'

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**')) return <strong key={i}>{p.slice(2, -2)}</strong>
    if (p.startsWith('`') && p.endsWith('`')) {
      return (
        <code key={i} className="rounded bg-background px-1 py-0.5 text-xs">
          {p.slice(1, -1)}
        </code>
      )
    }
    return <span key={i}>{p}</span>
  })
}

/** 极简 Markdown 渲染：加粗 / 行内代码 / 标题 / 列表 / 代码块 */
export default function Markdown({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/)

  return (
    <div className="space-y-2 whitespace-pre-wrap break-words">
      {blocks.map((block, i) => {
        const lines = block.split('\n')
        const first = lines[0] ?? ''

        if (first.trim().startsWith('```')) {
          const code = lines.slice(1).join('\n').replace(/```$/, '')
          return (
            <pre key={i} className="overflow-x-auto rounded-lg bg-background p-3 text-xs">
              {code}
            </pre>
          )
        }

        if (/^#{1,3}\s/.test(first.trim())) {
          const level = (first.trim().match(/^#+/) ?? [''])[0].length
          const content = first.trim().replace(/^#+\s*/, '')
          if (level === 1) return <h3 key={i} className="text-base font-bold">{renderInline(content)}</h3>
          if (level === 2) return <h4 key={i} className="text-sm font-bold">{renderInline(content)}</h4>
          return <h5 key={i} className="text-sm font-semibold">{renderInline(content)}</h5>
        }

        if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.replace(/^\s*[-*•]\s+/, ''))}</li>
              ))}
            </ul>
          )
        }

        if (lines.every((l) => /^\s*\d+[.、]\s+/.test(l))) {
          return (
            <ol key={i} className="list-decimal space-y-1 pl-5">
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.replace(/^\s*\d+[.、]\s+/, ''))}</li>
              ))}
            </ol>
          )
        }

        return <p key={i}>{renderInline(block)}</p>
      })}
    </div>
  )
}
