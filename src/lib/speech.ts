// Web Speech API 语音播报封装（不支持时静默跳过）
export function speak(text: string): void {
  try {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'zh-CN'
    window.speechSynthesis.speak(u)
  } catch {
    /* ignore */
  }
}
