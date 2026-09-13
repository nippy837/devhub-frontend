import test from 'node:test'
import assert from 'node:assert/strict'
import { aiRequest, conversationContext } from '../src/api/ai.js'

test('context keeps complete recent turns and omits display metadata', () => {
  const messages = Array.from({ length: 25 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: `${i}`, truncated: false }))
  const context = conversationContext(messages)
  assert.equal(context.length, 21)
  assert.deepEqual(context[0], { role: 'user', content: '4' })
  assert.equal(context.at(-1).content, '24')
  assert.equal(messages.length, 25)
})

test('context obeys total size and never splits a question/answer pair', () => {
  const messages = Array.from({ length: 11 }, (_, i) => ({ role: i % 2 ? 'assistant' : 'user', content: '字'.repeat(12000) }))
  assert.equal(conversationContext(messages).length, 5)
  messages[9].content += '字'
  assert.equal(conversationContext(messages).length, 1)
})

test('chat posts same-origin JSON with CSRF header', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, '/api/ai/chat')
    assert.equal(options.credentials, 'same-origin')
    assert.equal(options.headers['X-DevHub-Request'], '1')
    assert.deepEqual(JSON.parse(options.body), { messages: [{ role: 'user', content: '你好' }] })
    return Response.json({ code: 0, data: { content: '你好！', model: 'test-model' } })
  })
  assert.equal((await aiRequest('chat', { messages: [{ role: 'user', content: '你好' }] })).content, '你好！')
})

test('preserves session expiry and handles invalid/empty upstream replies', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ code: 401, message: '请先登录' }, { status: 401 }))
  await assert.rejects(aiRequest('chat', { messages: [] }), e => e.status === 401 && e.message === '请先登录')
  fetch.mock.mockImplementation(async () => new Response('<html>Bad gateway</html>', { status: 502 }))
  await assert.rejects(aiRequest('chat', { messages: [] }), /响应异常/)
  fetch.mock.mockImplementation(async () => Response.json({ code: 0, data: { content: '' } }))
  await assert.rejects(aiRequest('chat', { messages: [] }), /未返回文本/)
})

test('distinguishes user cancellation from timeout, including an already-aborted signal', async t => {
  t.mock.method(globalThis, 'fetch', async (_, { signal }) => new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new DOMException('Aborted', 'AbortError'))
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true })
  }))
  await assert.rejects(aiRequest('chat', { messages: [], timeoutMs: 5 }), /超时/)
  const controller = new AbortController()
  const request = aiRequest('chat', { messages: [], signal: controller.signal })
  controller.abort()
  await assert.rejects(request, { name: 'AbortError' })
  await assert.rejects(aiRequest('chat', { messages: [], signal: controller.signal }), { name: 'AbortError' })
})
