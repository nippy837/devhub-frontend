import { onDeactivated, onMounted, onUnmounted, shallowRef } from 'vue'
import { createSpeedTestSession } from '../services/speedTest'
import { emptySpeedState } from '../utils/speedMetrics'

export function useSpeedTest() {
  const state = shallowRef(emptySpeedState())
  const session = createSpeedTestSession({
    onUpdate: (value) => {
      state.value = value
    },
  })
  const stopIfHidden = () => {
    if (document.hidden) session.stop()
  }
  onMounted(() => {
    window.addEventListener('offline', session.stop)
    window.addEventListener('pagehide', session.stop)
    document.addEventListener('visibilitychange', stopIfHidden)
  })
  onDeactivated(session.stop)
  onUnmounted(() => {
    session.dispose()
    window.removeEventListener('offline', session.stop)
    window.removeEventListener('pagehide', session.stop)
    document.removeEventListener('visibilitychange', stopIfHidden)
  })
  return { state, start: session.start, stop: session.stop }
}
