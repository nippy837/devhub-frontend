import test from 'node:test'
import assert from 'node:assert/strict'
import { websiteQuality } from '../src/utils/websiteQuality.js'

test('website latency colors use exact boundaries and cap only the visual marker', () => {
  for (const [latency, tone] of [[0, 'green'], [200, 'green'], [200.1, 'yellow'], [500, 'yellow'], [500.1, 'red'], [1500, 'red']]) {
    const quality = websiteQuality({ status: 'complete', latency })
    assert.equal(quality.tone, tone)
    assert.equal(quality.position, Math.min(100, latency / 10))
  }
  for (const latency of [null, undefined, NaN, Infinity, -1, '10']) {
    assert.equal(websiteQuality({ status: 'complete', latency }).tone, 'neutral')
  }
  for (const status of ['idle', 'running', 'stopped', 'unavailable']) {
    assert.equal(websiteQuality({ status, latency: 10 }).position, null)
  }
})
