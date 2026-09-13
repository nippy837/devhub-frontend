export async function gameRequest(path, { method = 'GET', body } = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)
  try {
    const response = await fetch(`/api${path}`, {
      method,
      signal: controller.signal,
      credentials: 'same-origin',
      headers: method === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-DevHub-Request': '1' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    let result
    try { result = await response.json() } catch (error) {
      if (error.name === 'AbortError') throw error
      throw new Error('服务暂时不可用，请稍后重试。')
    }
    if (!response.ok || result?.code !== 0) {
      const error = new Error(result?.message || '请求失败，请稍后重试。')
      error.status = response.status
      throw error
    }
    return result.data
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('请求超时，请重试。')
    throw error
  } finally { clearTimeout(timeout) }
}

export const startRankedGame = (difficulty) => gameRequest('/snake/games', { method: 'POST', body: { difficulty } })
export const finishRankedGame = (id, moves) => gameRequest(`/snake/games/${encodeURIComponent(id)}/finish`, { method: 'POST', body: { moves } })
export const getLeaderboard = () => gameRequest('/snake/leaderboard')
