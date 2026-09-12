import test from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import {
  createSpeedTestSession,
  probeSpeedNode,
} from '../src/services/speedTest.js'

function harness(options = {}) {
  const states = []
  const engines = []
  let probeSignal
  class FakeEngine {
    constructor(config) {
      this.config = config
      this.summary = {}
      this.points = []
      this.paused = false
      this.results = {
        getSummary: () => this.summary,
        getUnloadedLatencyPoints: () => this.points,
      }
      engines.push(this)
    }
    play() {
      this.played = true
    }
    pause() {
      this.paused = true
    }
  }
  const session = createSpeedTestSession({
    onUpdate: (state) => states.push(state),
    loadEngine: async () => FakeEngine,
    probe: async (signal) => {
      probeSignal = signal
      return 'TEST'
    },
    ...options,
  })
  return {
    session,
    engines,
    states,
    get state() {
      return states.at(-1)
    },
    get signal() {
      return probeSignal
    },
  }
}

test('does not connect until start, reports phases and final real values', async () => {
  const h = harness()
  assert.equal(h.engines.length, 0)
  await h.session.start()
  const engine = h.engines[0]
  assert.equal(h.state.node, 'TEST')
  assert.equal(h.state.status, 'running')
  engine.onPhaseChange({ measurement: { type: 'download' } })
  assert.equal(h.state.phase, 'download')
  engine.summary = { download: 100e6, upload: 20e6, latency: 30, jitter: 5 }
  engine.points = Array(12).fill(30)
  engine.onResultsChange()
  assert.equal(h.state.download, 100)
  engine.onFinish()
  assert.equal(h.state.status, 'complete')
  assert.equal(engine.paused, true)
  assert.equal(h.signal.aborted, true)
})
test('stopping aborts work and ignores callbacks already queued by the old run', async () => {
  const h = harness()
  await h.session.start()
  const old = h.engines[0]
  const queuedFinish = old.onFinish
  const queuedError = old.onError
  h.session.stop()
  assert.equal(old.paused, true)
  assert.equal(h.signal.aborted, true)
  assert.equal(h.state.status, 'stopped')
  await h.session.start()
  queuedFinish()
  queuedError('late error')
  assert.equal(h.state.status, 'running')
  assert.equal(h.state.download, null)
  h.session.dispose()
})
test('stopping while connecting prevents the engine from starting later', async () => {
  let resolveProbe
  const h = harness({
    probe: () =>
      new Promise((resolve) => {
        resolveProbe = resolve
      }),
  })
  const pending = h.session.start()
  h.session.stop()
  resolveProbe('TEST')
  await pending
  assert.equal(h.engines.length, 0)
  assert.equal(h.state.status, 'stopped')
})
test('a connection error stays an error instead of a completed or stable result', async () => {
  const h = harness()
  await h.session.start()
  h.engines[0].onError('unreachable')
  assert.equal(h.state.status, 'error')
  assert.equal(h.state.jitter, null)
  assert.equal(h.engines[0].paused, true)
  assert.match(h.state.error, /测速节点/)
})
test('rate limits and missing measurements get distinct outcomes', async () => {
  const h = harness()
  await h.session.start()
  h.engines[0].onError('too many requests', 429)
  assert.match(h.state.error, /请求较多/)
  await h.session.start()
  h.engines[1].summary = { latency: 10 }
  h.engines[1].onFinish()
  assert.equal(h.state.status, 'partial')
  assert.equal(h.state.upload, null)
})
test('overall timeout stops a hanging connection', async () => {
  const h = harness({ timeoutMs: 5, probe: () => new Promise(() => {}) })
  h.session.start()
  await delay(15)
  assert.equal(h.state.status, 'error')
  assert.match(h.state.error, /超时/)
  h.session.dispose()
})
test('a failed probe is surfaced without starting measurements', async () => {
  const h = harness({
    probe: async () => {
      throw new Error('network failure')
    },
  })
  await h.session.start()
  assert.equal(h.engines.length, 0)
  assert.equal(h.state.status, 'error')
})
test('node probe reads only the node label and propagates abort to fetch', async (context) => {
  const controller = new AbortController()
  context.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(new URL(url).hostname, 'speed.cloudflare.com')
    assert.equal(new URL(url).searchParams.get('bytes'), '0')
    assert.equal(new URL(url).pathname, '/__up')
    assert.equal(options.method, 'POST')
    assert.equal(options.body, '')
    assert.equal(options.signal, controller.signal)
    assert.equal(options.credentials, 'omit')
    return new Response('', { headers: { 'cf-meta-colo': 'TEST' } })
  })
  assert.equal(await probeSpeedNode(controller.signal), 'TEST')
})
