export const WEBSITE_TARGETS = [
  {
    id: 'douyin',
    name: '抖音',
    url: 'https://lf1-cdn-tos.bytegoofy.com/goofy/ies/douyin_web/public/favicon.ico',
  },
  { id: 'baidu', name: '百度', url: 'https://www.baidu.com/favicon.ico' },
  {
    id: 'taobao',
    name: '淘宝',
    url: 'https://gw.alicdn.com/imgextra/i4/O1CN01qOI6vB1zaqrBKbyFr_!!6000000006731-73-tps-64-64.ico',
  },
]

export const emptyWebsiteResults = () =>
  WEBSITE_TARGETS.map(({ id, name }) => ({ id, name, status: 'idle', latency: null, samples: 0 }))

let requestId = 0

export function loadWebsiteImage(url, signal, {
  createImage = () => new Image(),
  now = () => performance.now(),
  timeoutMs = 4000,
} = {}) {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve(null)
    const image = createImage()
    const startedAt = now()
    let timer
    let finished = false
    const finish = (value) => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      image.onload = image.onerror = null
      image.removeAttribute('src')
      resolve(value)
    }
    const abort = () => finish(null)
    image.onload = () => finish(Math.max(0, now() - startedAt))
    image.onerror = () => finish(null)
    image.referrerPolicy = 'no-referrer'
    signal.addEventListener('abort', abort, { once: true })
    timer = setTimeout(abort, timeoutMs)
    const target = new URL(url)
    target.searchParams.set('devhub_probe', `${Date.now()}-${++requestId}`)
    image.src = target.href
  })
}

export async function measureWebsiteLatency(signal, onResult, load = loadWebsiteImage) {
  await Promise.all(WEBSITE_TARGETS.map(async (target) => {
    const result = { id: target.id, name: target.name, status: 'running', latency: null, samples: 0 }
    if (signal.aborted) return
    onResult(result)
    const samples = []
    for (let attempt = 0; attempt < 3; attempt++) {
      if (signal.aborted) return
      let value = null
      try {
        value = await load(target.url, signal)
      } catch {
        value = null
      }
      if (signal.aborted) return
      if (typeof value === 'number' && Number.isFinite(value) && value >= 0) samples.push(value)
    }
    samples.sort((a, b) => a - b)
    const middle = Math.floor(samples.length / 2)
    const latency = samples.length
      ? samples.length % 2 ? samples[middle] : (samples[middle - 1] + samples[middle]) / 2
      : null
    onResult({ ...result, status: latency === null ? 'unavailable' : 'complete', latency, samples: samples.length })
  }))
}
