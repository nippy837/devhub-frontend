import { randomBytes } from 'node:crypto'

export const MAX_BYTES = 20_000_000
const chunk = randomBytes(64 * 1024)

export function createSpeedHandler(nodeName = '本地开发节点') {
  return (req, res, next) => {
    const url = new URL(req.url, 'http://localhost')
    if (!url.pathname.startsWith('/speed/')) return next ? next() : res.writeHead(404).end()
    const finish = (status) => res.writeHead(status, { 'Content-Length': '0' }).end()
    res.setHeader('Cache-Control', 'no-store, no-transform')
    res.setHeader('X-DevHub-Speed', '1')
    res.setHeader('X-DevHub-Node', encodeURIComponent(nodeName))
    const down = url.pathname === '/speed/__down'
    const up = url.pathname === '/speed/__up'
    if (!down && !up) return finish(404)
    if (req.method !== (down ? 'GET' : 'POST')) return finish(405)
    const rawBytes = url.searchParams.get('bytes')
    const bytes = Number(rawBytes)
    if (rawBytes === null || !/^\d+$/.test(rawBytes) || !Number.isSafeInteger(bytes) || bytes > MAX_BYTES) return finish(400)
    req.on('error', () => res.destroy())
    req.setTimeout(20_000, () => req.destroy())
    res.setTimeout(20_000, () => res.destroy())
    if (down) {
      res.writeHead(200, { 'Content-Type': 'application/octet-stream', 'Content-Length': bytes })
      let remaining = bytes
      const send = () => {
        while (remaining > 0 && !res.destroyed) {
          const size = Math.min(remaining, chunk.length)
          remaining -= size
          if (!res.write(chunk.subarray(0, size))) {
            res.once('drain', send)
            return
          }
        }
        if (!res.destroyed) res.end()
      }
      send()
      return
    }
    const declared = req.headers['content-length']
    if (declared !== undefined && Number(declared) !== bytes) return finish(400)
    let received = 0
    req.on('data', (data) => {
      received += data.length
      if (received > bytes) {
        finish(413)
        req.destroy()
      }
    })
    req.on('end', () => {
      if (!res.writableEnded) finish(received === bytes ? 200 : 400)
    })
  }
}
