import test from 'node:test'
import assert from 'node:assert/strict'
import { createAccount, deleteAccount, getAccounts, updateAccount } from '../src/api/accounts.js'

function respond(context, handler) {
  // 用虚构响应替代 fetch，测试不连接后端或数据库；mock 在每项测试结束后自动恢复。
  context.mock.method(globalThis, 'fetch', handler)
}

test('CRUD requests preserve the agreed routes, methods, payload and cancellation signal', async (context) => {
  const signal = new AbortController().signal
  const account = { systemName: '测试系统', environment: 'test', username: 'learner', password: '  fictional password  ', loginUrl: '', remark: '' }
  const requests = []
  respond(context, async (url, options) => {
    requests.push({ url, ...options })
    return Response.json({ code: 0, message: 'success', data: options.method === 'POST' ? 7 : null })
  })
  assert.equal(await createAccount(account, signal), 7)
  assert.equal(await updateAccount(7, account, signal), null)
  assert.equal(await deleteAccount(7, signal), null)
  assert.deepEqual(requests.map(({ url, method }) => [url, method]), [
    ['/api/accounts', 'POST'], ['/api/accounts/7', 'PUT'], ['/api/accounts/7', 'DELETE'],
  ])
  for (const request of requests) assert.equal(request.signal, signal)
  for (const request of requests.slice(0, 2)) {
    assert.deepEqual(JSON.parse(request.body), account)
    assert.equal(request.headers['Content-Type'], 'application/json')
  }
  assert.equal(requests[2].body, undefined)
})

test('list requests validate Result data before exposing it to the UI', async (context) => {
  respond(context, async () => Response.json({ code: 0, data: [{ id: 7 }] }))
  assert.deepEqual(await getAccounts(), [{ id: 7 }])
  globalThis.fetch.mock.mockImplementation(async () => Response.json({ code: 0, data: null }))
  await assert.rejects(getAccounts(), /账号数据格式不正确/)
})

test('a missing account or validation error is not treated as a successful mutation', async (context) => {
  respond(context, async () => Response.json({ code: 404, message: '账号不存在', data: null }, { status: 404 }))
  await assert.rejects(deleteAccount(7), /账号不存在/)
  globalThis.fetch.mock.mockImplementation(async () => Response.json({ code: 400, message: '环境不合法', data: null }, { status: 400 }))
  await assert.rejects(updateAccount(7, {}), /环境不合法/)
  globalThis.fetch.mock.mockImplementation(async () => Response.json({ code: 500, message: '保存失败', data: null }))
  await assert.rejects(updateAccount(7, {}), /保存失败/)
})

test('an unimplemented endpoint returning HTML reports the HTTP error', async (context) => {
  respond(context, async () => new Response('<html>Not Found</html>', { status: 404 }))
  await assert.rejects(updateAccount(7, {}), /HTTP 404/)
})

test('network failure and cancellation propagate without silently retrying a mutation', async (context) => {
  respond(context, async () => { throw new TypeError('Failed to fetch') })
  await assert.rejects(deleteAccount(7), TypeError)
  assert.equal(globalThis.fetch.mock.callCount(), 1)
  const abort = new DOMException('Aborted', 'AbortError')
  globalThis.fetch.mock.mockImplementation(async () => { throw abort })
  await assert.rejects(updateAccount(7, {}), (error) => error === abort)
  assert.equal(globalThis.fetch.mock.callCount(), 2)
})
