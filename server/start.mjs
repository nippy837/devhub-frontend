import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { createSpeedHandler } from './speed-handler.mjs'

const server = createServer({ requestTimeout: 25_000, headersTimeout: 10_000 }, createSpeedHandler('北京 · DevHub'))
let nginx
let shuttingDown = false
function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  nginx?.kill('SIGQUIT')
  server.close()
  server.closeAllConnections()
  const deadline = setTimeout(() => process.exit(code), 3000)
  deadline.unref()
  process.exitCode = code
}
server.on('error', (error) => { console.error(error.message); shutdown(1) })
server.listen(9020, '127.0.0.1', () => {
  nginx = spawn('nginx', ['-g', 'daemon off;'], { stdio: 'inherit' })
  nginx.on('error', (error) => { console.error(error.message); shutdown(1) })
  nginx.on('exit', (code) => shutdown(code ?? 1))
})
process.on('SIGTERM', () => shutdown())
process.on('SIGINT', () => shutdown())
