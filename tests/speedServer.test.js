import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer, request } from 'node:http'
import { setTimeout as delay } from 'node:timers/promises'
import { createSpeedHandler } from '../server/speed-handler.mjs'

async function fixture(context) {
  const server = createServer(createSpeedHandler('北京 · DevHub'))
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  context.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections() }))
  return `http://127.0.0.1:${server.address().port}`
}

test('domestic endpoint returns exact uncached bytes and verifies node identity', async (context) => {
  const url = await fixture(context)
  for (const size of [0, 1, 65537]) {
    const response = await fetch(`${url}/speed/__down?bytes=${size}`)
    assert.equal(response.status, 200)
    assert.equal(response.headers.get('content-length'), String(size))
    assert.equal((await response.arrayBuffer()).byteLength, size)
    assert.match(response.headers.get('cache-control'), /no-store/)
    assert.equal(response.headers.get('x-devhub-speed'), '1')
    assert.equal(decodeURIComponent(response.headers.get('x-devhub-node')), '北京 · DevHub')
  }
})

test('upload acknowledges only after consuming the entire body and stores nothing', async (context) => {
  const url = await fixture(context)
  let responded = false
  const req = request(`${url}/speed/__up?bytes=4`, { method: 'POST', headers: { 'Content-Length': '4' } })
  const response = new Promise((resolve, reject) => {
    req.on('response', (res) => { responded = true; res.resume(); resolve(res.statusCode) })
    req.on('error', reject)
  })
  req.write('ab')
  await delay(25)
  assert.equal(responded, false)
  req.end('cd')
  assert.equal(await response, 200)
  const empty = await fetch(`${url}/speed/__up?bytes=0`, { method: 'POST', body: '' })
  assert.equal(empty.status, 200)
})

test('invalid sizes, routes, methods and mismatched uploads are rejected', async (context) => {
  const url = await fixture(context)
  for (const query of ['', '?bytes=-1', '?bytes=1.5', '?bytes=20000001', '?bytes=NaN']) {
    assert.equal((await fetch(`${url}/speed/__down${query}`)).status, 400)
  }
  assert.equal((await fetch(`${url}/speed/unknown?bytes=0`)).status, 404)
  assert.equal((await fetch(`${url}/speed/__up?bytes=0`)).status, 405)
  assert.equal((await fetch(`${url}/speed/__up?bytes=5`, { method: 'POST', body: 'ab' })).status, 400)
})
