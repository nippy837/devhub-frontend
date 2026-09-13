import { onActivated, onDeactivated, onMounted, onUnmounted, ref, watch } from 'vue'
import { getLeaderboard, getArcadeLeaderboard } from '../api/game.js'
import { auth } from './useAuth.js'

export function useLeaderboard(kind, variant, onBest = () => {}) {
  const entries = ref([]), myBest = ref(null), myLast = ref(null)
  const loading = ref(false), error = ref('')
  let version = 0, active = false, timer

  async function refresh() {
    const requestVersion = ++version
    loading.value = true
    error.value = ''
    try {
      const result = await (kind() === 'snake' ? getLeaderboard() : getArcadeLeaderboard(kind(), variant()))
      if (requestVersion !== version) return false
      entries.value = result.entries
      myBest.value = result.myBest
      myLast.value = result.myLast ?? null
      onBest(result.myBest)
      return true
    } catch (failure) {
      if (requestVersion === version) error.value = failure.message
      return false
    } finally { if (requestVersion === version) loading.value = false }
  }

  watch(() => [auth.user?.id, kind(), kind() === 'sokoban' ? null : variant()], () => {
    version++
    entries.value = []
    myBest.value = myLast.value = null
    loading.value = false
    if (active) refresh()
  }, { flush: 'sync' })

  function refreshVisible() {
    if (active && !document.hidden && !loading.value) refresh()
  }
  function activate() {
    if (active) return
    active = true
    refresh()
    timer = setInterval(refreshVisible, 30000)
    window.addEventListener('focus', refreshVisible)
    document.addEventListener('visibilitychange', refreshVisible)
  }
  function cleanup() {
    active = false
    version++
    loading.value = false
    clearInterval(timer)
    window.removeEventListener('focus', refreshVisible)
    document.removeEventListener('visibilitychange', refreshVisible)
  }
  onMounted(activate)
  onActivated(activate)
  onDeactivated(cleanup)
  onUnmounted(cleanup)
  return { entries, myBest, myLast, loading, error, refresh }
}
