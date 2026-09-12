// 后端返回 Result<List<AccountVO>>，业务数据位于 data 字段。
export async function getAccounts(signal) {
  const response = await fetch('/api/accounts', { signal })

  if (!response.ok) {
    throw new Error(`账号加载失败（HTTP ${response.status}），请稍后重试。`)
  }

  let result
  try {
    result = await response.json()
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('接口没有返回有效的 JSON 数据，请检查后端服务。')
  }
  if (!result || typeof result !== 'object') {
    throw new Error('账号数据格式不正确，请检查接口返回。')
  }
  if (result.code !== 0) {
    throw new Error(result.message || '账号加载失败，请稍后重试。')
  }
  if (!Array.isArray(result.data)) {
    throw new Error('账号数据格式不正确，请检查接口返回。')
  }

  return result.data
}
