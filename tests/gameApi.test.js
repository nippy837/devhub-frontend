import test from 'node:test'
import assert from 'node:assert/strict'
import { gameRequest, startRankedGame, finishRankedGame, getLeaderboard } from '../src/api/game.js'

test('ranked requests send session cookies and a replay without a client-supplied score', async (t) => {
  const calls = []
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options })
    return new Response(JSON.stringify({ code: 0, data: { score: 40 } }))
  })
  await startRankedGame('hard')
  await finishRankedGame('round/1', 'RRDDLL')
  await getLeaderboard()
  assert.equal(calls[0].url, '/api/snake/games')
  assert.deepEqual(JSON.parse(calls[0].options.body), { difficulty: 'hard' })
  assert.equal(calls[1].url, '/api/snake/games/round%2F1/finish')
  assert.deepEqual(JSON.parse(calls[1].options.body), { moves: 'RRDDLL' })
  assert.equal(calls[1].options.headers['X-DevHub-Request'], '1')
  assert.equal(calls[1].options.credentials, 'same-origin')
  assert.equal(calls[2].url, '/api/snake/leaderboard')
  assert.equal(calls[2].options.method, 'GET')
})

test('expired sessions, duplicate users and service errors remain actionable', async (t) => {
  for (const status of [401, 409, 429, 500]) {
    const mock = t.mock.method(globalThis, 'fetch', async () => new Response(
      JSON.stringify({ code: status, message: '请重试' }), { status },
    ))
    await assert.rejects(gameRequest('/auth/me'), (error) => error.status === status && error.message === '请重试')
    mock.mock.restore()
  }
})

test('non-JSON proxy errors do not appear as successful saves', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>Bad gateway</html>', { status: 502 }))
  await assert.rejects(finishRankedGame('round', 'R'), /服务暂时不可用/)
})
