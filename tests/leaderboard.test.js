import test from 'node:test'
import assert from 'node:assert/strict'
import { ref, nextTick } from 'vue'
import { useLeaderboard } from '../src/composables/useLeaderboard.js'
import { auth } from '../src/composables/useAuth.js'
import { mountComposable, flush, response } from './helpers/vueHarness.js'

for (const kind of ['snake', '2048', 'sokoban', 'mines']) {
  test(`${kind}: refresh after save, focus, interval and reactivation; no duplicate initial request`, async (t) => {
    auth.user = { id: 1 }
    let requests = 0, interval
    t.mock.method(globalThis, 'setInterval', (callback) => { interval = callback; return 1 })
    t.mock.method(globalThis, 'clearInterval', () => {})
    t.mock.method(globalThis, 'fetch', async () => response({ entries: [], myBest: ++requests }))
    const { value: board, visible } = mountComposable(t, () => useLeaderboard(() => kind, () => 'easy'))
    await flush()
    assert.equal(requests, 1)
    assert.equal(await board.refresh(), true)
    assert.equal(board.myBest.value, 2)
    window.dispatchEvent(new Event('focus')); await flush()
    assert.equal(board.myBest.value, 3)
    interval(); await flush()
    assert.equal(board.myBest.value, 4)
    visible.value = false; await nextTick()
    window.dispatchEvent(new Event('focus')); interval(); await flush()
    assert.equal(requests, 4)
    visible.value = true; await flush()
    assert.equal(board.myBest.value, 5)
    auth.user = null; await flush()
    assert.equal(requests, 6)
  })
}

test('difficulty and account changes invalidate late responses; refresh failure supports retry', async (t) => {
  auth.user = { id: 1 }
  const requests = [], variant = ref('easy')
  t.mock.method(globalThis, 'fetch', (url) => new Promise((resolve, reject) => requests.push({ url, resolve, reject })))
  const { value: board } = mountComposable(t, () => useLeaderboard(() => 'mines', () => variant.value))
  variant.value = 'medium'
  variant.value = 'hard'
  assert.match(requests[2].url, /variant=hard/)
  requests[2].resolve(response({ entries: [], myBest: 9000, myLast: { elapsedMs: 12000, outcome: 'over' } }))
  await flush()
  requests[0].resolve(response({ entries: [], myBest: 999 }))
  requests[1].resolve(response({ entries: [], myBest: 500 }))
  await flush()
  assert.equal(board.myBest.value, 9000)
  assert.equal(board.myLast.value.outcome, 'over')
  const failing = board.refresh()
  requests[3].reject(new Error('network failed'))
  assert.equal(await failing, false)
  assert.equal(board.error.value, 'network failed')
  const retry = board.refresh()
  auth.user = { id: 2 }
  requests[4].resolve(response({ entries: [], myBest: 1 }))
  assert.equal(await retry, false)
  assert.equal(board.myBest.value, null)
  requests[5].resolve(response({ entries: [], myBest: 20000 }))
  await flush()
  assert.equal(board.myBest.value, 20000)
  assert.equal(board.myLast.value, null)
})
