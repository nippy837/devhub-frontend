import { onUnmounted, ref } from 'vue'

export function useToolTask() {
  const busy = ref(false)
  const error = ref('')
  let worker
  let timer
  function cancel() {
    worker?.terminate()
    worker = null
    clearTimeout(timer)
    busy.value = false
  }
  function run(type, args, done) {
    cancel()
    error.value = ''
    busy.value = true
    try {
      worker = new Worker(
        new URL('../workers/developerTools.js', import.meta.url),
        { type: 'module' },
      )
      const currentWorker = worker
      worker.onmessage = ({ data }) => {
        if (worker !== currentWorker) return
        cancel()
        if (data.error) error.value = data.error
        else done(data.result)
      }
      worker.onerror = () => {
        if (worker !== currentWorker) return
        cancel()
        error.value = '处理失败，请重试'
      }
      timer = setTimeout(() => {
        if (worker !== currentWorker) return
        cancel()
        error.value = '处理超时，请减少内容后重试'
      }, 5000)
      worker.postMessage({ type, args })
    } catch {
      cancel()
      error.value = '无法启动工具，请刷新页面后重试'
    }
  }
  onUnmounted(cancel)
  return { busy, error, run, cancel }
}
