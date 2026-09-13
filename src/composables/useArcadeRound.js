import { computed, onActivated, onDeactivated, onUnmounted, ref, watch } from 'vue'
import { auth } from './useAuth.js'
import { startArcadeGame, finishArcadeGame } from '../api/game.js'
import { applyArcade, createArcade, MAX_ACTIONS } from '../utils/arcadeGames.js'

export function useArcadeRound(kind, variant, onSaved) {
  const game = ref(null)
  const phase = ref('ready')
  const starting = ref(false), saving = ref(false)
  const error = ref(''), message = ref(''), pending = ref(null)
  const elapsed = ref(0), lastRound = ref(null)
  let random, gameId = null, actions = [], startedAt = 0, version = 0, active = true, clock = null
  const locked = computed(() => starting.value || saving.value || Boolean(pending.value))

  function reset() {
    version++
    const seed = crypto.getRandomValues(new Uint32Array(1))[0] || 1
    const initial = createArcade(kind, variant.value, seed)
    game.value = initial.game
    random = initial.random
    gameId = null
    actions = []
    pending.value = null
    phase.value = 'ready'
    error.value = ''
    message.value = ''
    elapsed.value = 0
    startedAt = 0
  }
  reset()

  async function start() {
    if (locked.value || !auth.ready) return
    if (phase.value === 'paused') { phase.value = 'running'; return }
    reset()
    const generation = version
    starting.value = true
    try {
      if (auth.user) {
        const round = await startArcadeGame(kind, variant.value)
        if (generation !== version) return
        const initial = createArcade(kind, variant.value, round.seed)
        game.value = initial.game
        random = initial.random
        gameId = round.id
      }
      startedAt = Date.now()
      phase.value = active && !document.hidden && !auth.dialog ? 'running' : 'paused'
    } catch (failure) { if (generation === version) error.value = failure.message }
    finally { starting.value = false }
  }

  function pause() { if (phase.value === 'running') phase.value = 'paused' }
  function updateClock() { if (startedAt && ['running', 'paused'].includes(phase.value)) elapsed.value = Date.now() - startedAt }

  async function save() {
    if (!pending.value || saving.value) return
    const submission = pending.value
    const generation = version
    saving.value = true
    error.value = ''
    try {
      const result = await finishArcadeGame(kind, submission.id, submission.actions)
      if (pending.value !== submission) return
      pending.value = null
      const ranked = kind === '2048' ? result.score > 0 : result.outcome === 'won'
      if (kind === 'mines') {
        elapsed.value = result.elapsedMs ?? (result.outcome === 'won' ? result.score : elapsed.value)
        lastRound.value = { variant: variant.value, elapsedMs: elapsed.value, outcome: result.outcome }
      }
      message.value = ranked ? '成绩已保存' : kind === '2048' ? '本局已结束，未产生排行成绩' : '本局已结束，未通关不参与排名'
      const refreshed = await onSaved()
      if (refreshed && generation === version && kind === 'mines') lastRound.value = null
    } catch (failure) { if (pending.value === submission) error.value = failure.message }
    finally { saving.value = false }
  }

  async function finish() {
    if (!['running', 'paused'].includes(phase.value) || locked.value) return
    updateClock()
    phase.value = game.value.status === 'won' ? 'won' : 'over'
    if (kind === 'mines') lastRound.value = {
      variant: variant.value, elapsedMs: elapsed.value,
      outcome: game.value.status === 'running' ? 'ended' : game.value.status,
    }
    if (gameId && !pending.value) {
      pending.value = { id: gameId, actions: [...actions] }
      gameId = null
      await save()
    }
  }

  function act(action) {
    if (phase.value !== 'running' || locked.value || auth.dialog || !active) return false
    const next = applyArcade(kind, game.value, action, random)
    if (next === game.value) return false
    game.value = next
    actions.push(action)
    if (next.status !== 'running' || actions.length >= MAX_ACTIONS) finish()
    return true
  }

  async function restart() {
    if (locked.value) return
    if (['running', 'paused'].includes(phase.value)) await finish()
    if (!pending.value) await start()
  }

  function discard() { if (!saving.value) { pending.value = null; error.value = ''; message.value = '' } }
  watch(variant, reset)
  watch(() => auth.user?.id, () => { lastRound.value = null; reset() })
  watch(() => auth.dialog, (open) => { if (open) pause() })
  function hidden() { if (document.hidden) pause() }
  function cleanup() {
    active = false
    pause()
    clearInterval(clock)
    window.removeEventListener('blur', pause)
    document.removeEventListener('visibilitychange', hidden)
  }
  onActivated(() => {
    active = true
    updateClock()
    clock = setInterval(updateClock, 250)
    window.addEventListener('blur', pause)
    document.addEventListener('visibilitychange', hidden)
  })
  onDeactivated(cleanup)
  onUnmounted(() => { cleanup(); version++ })
  return { game, phase, elapsed, lastRound, starting, saving, error, message, pending, locked, start, restart, pause, finish, act, save, discard }
}
