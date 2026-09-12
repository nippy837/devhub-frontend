import { measureWebsiteLatency } from './websiteLatency.js'
import {
  createSpeedTestConfig,
  emptySpeedState,
  readSpeedResults,
  SPEED_TEST_TIMEOUT_MS,
  SPEED_TEST_URL,
} from '../utils/speedMetrics.js'

export async function probeSpeedNode(signal) {
  const response = await fetch(
    `${SPEED_TEST_URL}/__up?bytes=0&devhub=${Date.now()}`,
    {
      method: 'POST',
      body: '',
      signal,
      cache: 'no-store',
      credentials: 'omit',
    },
  )
  if (!response.ok) throw new Error('测速节点暂时不可用，请稍后重试。')
  await response.arrayBuffer()
  return response.headers.get('cf-meta-colo') || ''
}

export function createSpeedTestSession({
  onUpdate,
  loadEngine = () =>
    import('@cloudflare/speedtest').then((module) => module.default),
  probe = probeSpeedNode,
  measureSites = measureWebsiteLatency,
  now = () => performance.now(),
  timeoutMs = SPEED_TEST_TIMEOUT_MS,
}) {
  let state = emptySpeedState()
  let engine
  let controller
  let deadline
  let clock
  let generation = 0
  let startedAt = 0
  const publish = (patch) => {
    state = { ...state, ...patch }
    onUpdate(state)
  }
  function cleanup() {
    generation++
    clearTimeout(deadline)
    clearInterval(clock)
    controller?.abort()
    controller = null
    state = {
      ...state,
      websites: state.websites.map((site) =>
        site.status === 'running' ? { ...site, status: 'stopped' } : site,
      ),
    }
    if (engine) {
      engine.onPhaseChange =
        engine.onResultsChange =
        engine.onFinish =
        engine.onError =
          () => {}
      engine.pause()
      engine = null
    }
  }
  function fail(message) {
    cleanup()
    publish({ status: 'error', error: message, elapsed: now() - startedAt })
  }
  async function start() {
    cleanup()
    const current = generation
    startedAt = now()
    publish({ ...emptySpeedState(), status: 'running' })
    controller = new AbortController()
    deadline = setTimeout(() => {
      if (generation === current)
        fail('测速超时，结果未完成。可以稍后重试，或换个网络再试。')
    }, timeoutMs)
    clock = setInterval(() => {
      if (generation === current) publish({ elapsed: now() - startedAt })
    }, 500)
    try {
      await measureSites(controller.signal, (result) => {
        if (generation === current)
          publish({
            websites: state.websites.map((site) =>
              site.id === result.id ? result : site,
            ),
          })
      })
      if (generation !== current) return
      publish({ phase: 'connection' })
      const [Engine, node] = await Promise.all([
        loadEngine(),
        probe(controller.signal),
      ])
      if (generation !== current) return
      publish({ node })
      const currentEngine = (engine = new Engine(createSpeedTestConfig()))
      const updateResults = () => {
        if (generation === current)
          publish(readSpeedResults(currentEngine.results))
      }
      currentEngine.onPhaseChange = ({ measurement }) => {
        if (generation === current) publish({ phase: measurement.type })
      }
      currentEngine.onResultsChange = updateResults
      currentEngine.onError = (message, status) => {
        if (generation !== current) return
        fail(
          status === 429
            ? '测速节点请求较多，请稍后再试。'
            : message.includes('aborted')
              ? '本次请求耗时过长，测速已停止。请稍后重试。'
              : '无法继续连接测速节点，请检查网络后重试。',
        )
      }
      currentEngine.onFinish = () => {
        if (generation !== current) return
        updateResults()
        const complete =
          state.download !== null &&
          state.upload !== null &&
          state.latency !== null
        cleanup()
        publish({
          status: complete ? 'complete' : 'partial',
          elapsed: now() - startedAt,
        })
      }
      currentEngine.play()
    } catch (error) {
      if (generation === current)
        fail(
          error instanceof Error &&
            error.message === '测速节点暂时不可用，请稍后重试。'
            ? error.message
            : '连接测速节点失败，请检查网络或稍后重试。',
        )
    }
  }
  function stop() {
    if (state.status !== 'running') return
    cleanup()
    publish({ status: 'stopped', elapsed: now() - startedAt })
  }
  return { start, stop, dispose: cleanup }
}
