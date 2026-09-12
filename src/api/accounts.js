// 后端返回 Result<List<AccountVO>>，业务数据位于 data 字段。
async function readResult(response) {
  let result
  try {
    result = await response.json()
  } catch (error) {
    if (error.name === 'AbortError') throw error
    if (!response.ok)
      throw new Error(`请求失败（HTTP ${response.status}），请稍后重试。`)
    throw new Error('接口没有返回有效的 JSON 数据，请检查后端服务。')
  }
  if (!result || typeof result !== 'object') {
    throw new Error('账号数据格式不正确，请检查接口返回。')
  }
  if (!response.ok || result.code !== 0) {
    throw new Error(result.message || '请求失败，请稍后重试。')
  }
  return result.data
}

export async function getAccounts(signal) {
  const response = await fetch('/api/accounts', { signal })
  const data = await readResult(response)
  if (!Array.isArray(data)) {
    throw new Error('账号数据格式不正确，请检查接口返回。')
  }

  return data
}

export async function createAccount(account, signal) {
  const response = await fetch('/api/accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(account),
    signal,
  })
  return readResult(response)
}
