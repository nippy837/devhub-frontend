import test from 'node:test'
import assert from 'node:assert/strict'
import { loadWebsiteImage, measureWebsiteLatency } from '../src/services/websiteLatency.js'

function fakeImage() {
  return { removeAttribute(name) { delete this[name] } }
}

test('image load measures elapsed time, bypasses local cache and cleans handlers', async () => {
  const controller = new AbortController()
  const first = fakeImage()
  const second = fakeImage()
  let time = 10
  const options = { createImage: () => first, now: () => time }
  const pending = loadWebsiteImage('https://example.com/favicon.ico', controller.signal, options)
  const firstUrl = first.src
  assert.equal(first.referrerPolicy, 'no-referrer')
  time = 110
  first.onload()
  assert.equal(await pending, 100)
  assert.equal(first.onload, null)
  assert.equal(first.src, undefined)
  const other = loadWebsiteImage('https://example.com/favicon.ico', controller.signal, { createImage: () => second })
  assert.notEqual(firstUrl, second.src)
  second.onerror()
  assert.equal(await other, null)
})

test('timeout and abort return unknown; an aborted run starts no image request', async () => {
  const controller = new AbortController()
  const image = fakeImage()
  const timed = loadWebsiteImage('https://example.com/a.ico', controller.signal, { createImage: () => image, timeoutMs: 1 })
  assert.equal(await timed, null)
  assert.equal(image.onload, null)
  const pending = loadWebsiteImage('https://example.com/a.ico', controller.signal, { createImage: () => image })
  controller.abort()
  assert.equal(await pending, null)
  assert.equal(image.src, undefined)
  assert.equal(await loadWebsiteImage('https://example.com/a.ico', controller.signal, {
    createImage: () => { throw new Error('must not create image') },
  }), null)
})

test('each website takes three samples and excludes failures from its median', async () => {
  const counts = new Map()
  const results = []
  await measureWebsiteLatency(new AbortController().signal, (result) => results.push(result), async (url) => {
    const attempt = counts.get(url) || 0
    counts.set(url, attempt + 1)
    if (url.includes('baidu')) return null
    if (url.includes('alicdn') && attempt === 1) throw new Error('blocked')
    return [100, 900, 200][attempt]
  })
  assert.deepEqual([...counts.values()], [3, 3, 3])
  const final = results.filter((site) => site.status !== 'running')
  assert.equal(final.find((site) => site.id === 'douyin').latency, 200)
  assert.equal(final.find((site) => site.id === 'taobao').latency, 150)
  assert.equal(final.find((site) => site.id === 'taobao').samples, 2)
  assert.equal(final.find((site) => site.id === 'baidu').status, 'unavailable')
  assert.equal(final.find((site) => site.id === 'baidu').latency, null)
})

test('abort prevents later samples and late results', async () => {
  const controller = new AbortController()
  const results = []
  let calls = 0
  await measureWebsiteLatency(controller.signal, (result) => results.push(result), async () => {
    calls++
    controller.abort()
    return 12
  })
  assert.equal(calls, 1)
  assert.equal(results.filter((site) => site.status === 'complete').length, 0)
})
