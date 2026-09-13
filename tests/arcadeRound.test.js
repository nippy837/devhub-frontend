import test from 'node:test'
import assert from 'node:assert/strict'
import { ref, nextTick } from 'vue'
import { useArcadeRound } from '../src/composables/useArcadeRound.js'
import { auth } from '../src/composables/useAuth.js'
import { mountComposable, flush, response } from './helpers/vueHarness.js'

for (const outcome of ['won', 'over']) {
  test(`Mines ${outcome}: freezes local time, retains it after failed save, retries and refreshes`, async (t) => {
    auth.user = { id: 1 }; auth.ready = true; auth.dialog = false
    let now = 1000, saves = 0, refreshes = 0
    t.mock.method(Date, 'now', () => now)
    t.mock.method(globalThis, 'fetch', async (url) => {
      if (!url.endsWith('/finish')) return response({ id: 'round', seed: 12345 })
      if (++saves === 1) throw new Error('保存失败')
      return response({ score: outcome === 'won' ? 2345 : 0, outcome, elapsedMs: 2345 })
    })
    const { value: round } = mountComposable(t, () => useArcadeRound('mines', ref('easy'), async () => { refreshes++; return false }))
    await round.start()
    now = 3000
    round.act('O0')
    if (outcome === 'over') round.act('O' + round.game.value.mines[0])
    else for (let i = 0; i < 81; i++) if (!round.game.value.mines.includes(i)) round.act('O' + i)
    await flush()
    assert.equal(round.phase.value, outcome)
    assert.equal(round.lastRound.value.elapsedMs, 2000)
    assert.equal(round.lastRound.value.outcome, outcome)
    assert.equal(round.error.value, '保存失败')
    assert.ok(round.pending.value)
    now = 9999
    await round.finish()
    assert.equal(round.elapsed.value, 2000)
    await round.save()
    assert.equal(round.elapsed.value, 2345)
    assert.equal(round.lastRound.value.elapsedMs, 2345)
    assert.equal(round.pending.value, null)
    assert.equal(refreshes, 1)
    assert.equal(round.message.value.includes('排行榜已更新'), false)
  })
}

test('guest loss shows a time without a request; changing account clears private recent result', async (t) => {
  auth.user = null; auth.ready = true; auth.dialog = false
  let now = 1000
  t.mock.method(Date, 'now', () => now)
  t.mock.method(globalThis, 'fetch', () => assert.fail('guest must not save'))
  const { value: round } = mountComposable(t, () => useArcadeRound('mines', ref('easy'), () => {}))
  await round.start()
  round.act('O0'); now = 6500; round.act('O' + round.game.value.mines[0])
  assert.equal(round.lastRound.value.elapsedMs, 5500)
  auth.user = { id: 2 }; await nextTick()
  assert.equal(round.lastRound.value, null)
})

test('Sokoban next level starts a fresh board after previous score is saved', async (t) => {
  auth.user = { id: 1 }; auth.ready = true; auth.dialog = false
  const variant = ref('1'), starts = []
  let releaseSave
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (url.endsWith('/finish')) return new Promise((resolve) => { releaseSave = () => resolve(response({ score: 1, outcome: 'won' })) })
    starts.push(JSON.parse(options.body).variant)
    return response({ id: 'level-' + variant.value, seed: 12345 })
  })
  const { value: round } = mountComposable(t, () => useArcadeRound('sokoban', variant, async () => true))
  await round.start(); round.act('U')
  assert.equal(round.phase.value, 'won')
  assert.equal(round.locked.value, true)
  releaseSave(); await flush()
  assert.equal(round.locked.value, false)
  variant.value = '2'; await nextTick(); await round.start()
  assert.equal(round.phase.value, 'running')
  assert.equal(round.game.value.steps, 0)
  assert.deepEqual(starts, ['1', '2'])
})
