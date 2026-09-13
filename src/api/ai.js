export function conversationContext(messages) {
  const latest = messages.at(-1)
  if (!latest || latest.role !== 'user') throw new Error('请输入问题。')
  const result = [{ role: 'user', content: latest.content }]
  let length = latest.content.length
  for (let i = messages.length - 3; i >= 0 && result.length < 21; i -= 2) {
    const pair = messages.slice(i, i + 2)
    const size = pair.reduce((sum, message) => sum + message.content.length, 0)
    if (pair.some(message => message.content.length > 12000) || length + size > 60000) break
    result.unshift(...pair.map(({ role, content }) => ({ role, content })))
    length += size
  }
  return result
}

export async function aiRequest(path, { messages, signal, timeoutMs = 70000 } = {}) {
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (signal?.aborted) abort()
  signal?.addEventListener('abort', abort, { once: true })
  const timeout = setTimeout(abort, timeoutMs)
  try {
    const response = await fetch(`/api/ai/${path}`, {
      method: messages ? 'POST' : 'GET',
      credentials: 'same-origin',
      signal: controller.signal,
      headers: messages ? { 'Content-Type': 'application/json', 'X-DevHub-Request': '1' } : {},
      body: messages ? JSON.stringify({ messages }) : undefined,
    })
    let result
    try { result = await response.json() } catch (error) {
      if (error.name === 'AbortError') throw error
      throw new Error('AI 服务响应异常，请稍后重试。')
    }
    if (!response.ok || result?.code !== 0) {
      const error = new Error(result?.message || 'AI 请求失败，请稍后重试。')
      error.status = response.status
      throw error
    }
    if (messages && (typeof result.data?.content !== 'string' || !result.data.content.trim())) {
      throw new Error('AI 未返回文本，请重试。')
    }
    return result.data
  } catch (error) {
    if (error.name === 'AbortError' && !signal?.aborted) throw new Error('AI 回答超时，请稍后重试。')
    if (error instanceof TypeError) throw new Error('无法连接 AI 服务，请检查网络后重试。')
    throw error
  } finally {
    clearTimeout(timeout)
    signal?.removeEventListener('abort', abort)
  }
}
