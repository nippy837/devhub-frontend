// 统一解析后端的 Result<T>：HTTP 状态和业务 code 都成功，才把 data 交给页面。
// 列表的 data 是账号数组；新增是 ID；修改、删除允许为 null。
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

// PUT 提交完整表单，账号 ID 放在路径中；空密码表示清空，不能当作“保留原密码”。
export async function updateAccount(id, account, signal) {
  const response = await fetch(`/api/accounts/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(account),
    signal,
  })
  return readResult(response)
}

export async function deleteAccount(id, signal) {
  // 删除接口仍返回 Result<Void> JSON（HTTP 200），不是 204 空响应。
  const response = await fetch(`/api/accounts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    signal,
  })
  return readResult(response)
}
