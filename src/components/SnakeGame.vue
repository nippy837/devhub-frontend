<script setup>
import { computed, nextTick, onActivated, onDeactivated, onUnmounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import { BOARD_SIZE, DIRECTION_CODES, MAX_TICKS, TICK_MS, canTurn, createGame, seededRandom, stepGame } from '../utils/snakeGame.js'
import { startRankedGame, finishRankedGame } from '../api/game.js'
import { auth, openAuth } from '../composables/useAuth.js'
import SnakeLeaderboard from './SnakeLeaderboard.vue'

const game = ref(createGame())
const board = ref(null)
const bestKey = 'devhub.snake.best.normal.v3'
const guestBest = ref(readBest())
const memberBest = ref(0)
const best = computed(() => auth.user ? memberBest.value : guestBest.value)
const leaderboard = ref(null)
const starting = ref(false)
const saving = ref(false)
const saveError = ref('')
const startError = ref('')
const saveMessage = ref('')
const pending = ref(null)
let random = Math.random
let gameId = null
let moves = ''
let generation = 0
let active = true
let timer = null
let turns = []
const running = computed(() => game.value.status === 'running')
const statusText = computed(() => ({ ready: '准备开始', running: '游戏进行中', paused: '已暂停', over: '游戏结束', won: '恭喜通关！' })[game.value.status])
const actionText = computed(() => ({ ready: '开始游戏', running: '暂停', paused: '继续游戏', over: '再玩一次', won: '再玩一次' })[game.value.status])
const overlayDescription = computed(() => ({ paused: '休息一下，准备好后继续。', over: `本局获得 ${game.value.score} 分，再挑战一次吧。`, won: '你已经填满了整个棋盘！' })[game.value.status])
const directionButtons = [
  { direction: 'up', label: '向上', symbol: '↑' },
  { direction: 'left', label: '向左', symbol: '←' },
  { direction: 'down', label: '向下', symbol: '↓' },
  { direction: 'right', label: '向右', symbol: '→' },
]

function readBest() {
  try {
    const value = Number(localStorage.getItem(bestKey))
    return Number.isSafeInteger(value) && value >= 0 ? value : 0
  } catch { return 0 }
}

function stopTimer() {
  clearInterval(timer)
  timer = null
}

function pause() {
  stopTimer()
  if (running.value) game.value = { ...game.value, status: 'paused' }
}

function tick() {
  const direction = turns.shift() || game.value.direction
  moves += DIRECTION_CODES[direction]
  game.value = stepGame(game.value, direction, random)
  if (!auth.user && game.value.score > guestBest.value) {
    guestBest.value = game.value.score
    try { localStorage.setItem(bestKey, String(guestBest.value)) } catch { /* Storage is optional. */ }
  }
  if (!running.value || moves.length >= MAX_TICKS) endRound()
}

async function saveScore() {
  if (!pending.value || saving.value) return
  const submission = pending.value
  saving.value = true
  saveError.value = ''
  try {
    const result = await finishRankedGame(submission.id, submission.moves)
    if (pending.value !== submission) return
    memberBest.value = Math.max(memberBest.value, result.score)
    saveMessage.value = `本局 ${result.score} 分已保存`
    pending.value = null
    leaderboard.value?.refresh()
  } catch (error) {
    if (pending.value === submission) saveError.value = error.message
  } finally { saving.value = false }
}

async function endRound() {
  stopTimer()
  if (['running', 'paused'].includes(game.value.status)) game.value = { ...game.value, status: 'over' }
  if (gameId && !pending.value) {
    pending.value = { id: gameId, moves }
    gameId = null
    await saveScore()
  }
}

async function start() {
  if (starting.value || saving.value || !auth.ready) return
  if (pending.value) { saveError.value = '请先重试保存，或放弃本局成绩后再开始。'; return }
  stopTimer()
  startError.value = ''
  const currentGeneration = generation
  if (['ready', 'over', 'won'].includes(game.value.status)) {
    starting.value = true
    try {
      if (auth.user) {
        const round = await startRankedGame()
        if (currentGeneration !== generation || !active) return
        gameId = round.id
        random = seededRandom(round.seed)
      } else {
        gameId = null
        random = Math.random
      }
      game.value = createGame(random)
      moves = ''
      turns = []
      saveMessage.value = ''
    } catch (error) { startError.value = error.message; return }
    finally { starting.value = false }
  }
  if (!active || auth.dialog || document.hidden) { game.value = { ...game.value, status: 'paused' }; return }
  game.value = { ...game.value, status: 'running' }
  timer = setInterval(tick, TICK_MS)
  nextTick(() => board.value?.focus({ preventScroll: true }))
}

function toggle() {
  if (running.value) pause()
  else start()
}

async function restart() {
  if (starting.value || saving.value) return
  if (['running', 'paused'].includes(game.value.status)) await endRound()
  if (pending.value) return
  game.value = createGame()
  start()
}

function discardScore() {
  if (saving.value) return
  pending.value = null
  saveError.value = ''
  saveMessage.value = ''
}

watch(() => auth.dialog, (open) => { if (open) pause() })
watch(() => auth.user?.id, () => {
  generation++
  stopTimer()
  game.value = createGame()
  turns = []
  gameId = null
  pending.value = null
  saveError.value = ''
  saveMessage.value = ''
  startError.value = ''
  memberBest.value = 0
})

function turn(direction) {
  if (!running.value || turns.length >= 2) return
  const previous = turns.at(-1) || game.value.direction
  if (previous !== direction && canTurn(previous, direction)) turns.push(direction)
}

function onKeydown(event) {
  if (event.ctrlKey || event.metaKey || event.altKey) return
  const target = event.target
  if (target instanceof HTMLElement && (target.closest('button, input, select, textarea, a') || target.isContentEditable)) return
  const direction = { ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down', ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right' }[event.key.length === 1 ? event.key.toLowerCase() : event.key]
  if (direction) {
    event.preventDefault()
    if (!event.repeat) turn(direction)
  } else if (event.code === 'Space') {
    event.preventDefault()
    if (!event.repeat) toggle()
  } else if (event.key === 'Escape') pause()
}

function onVisibilityChange() {
  if (document.hidden) pause()
}

function cleanup() {
  active = false
  generation++
  pause()
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('blur', pause)
  document.removeEventListener('visibilitychange', onVisibilityChange)
}

onActivated(() => {
  active = true
  leaderboard.value?.refresh()
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('blur', pause)
  document.addEventListener('visibilitychange', onVisibilityChange)
})
onDeactivated(cleanup)
onUnmounted(cleanup)
</script>

<template>
  <main class="snake-page">
    <div class="page-heading">
      <div>
        <p class="snake-eyebrow">小游戏 / SNAKE</p>
        <h1>贪吃蛇</h1>
      </div>
      <span class="snake-tag"><AppIcon name="game" :size="18" /> 经典街机</span>
    </div>

    <div class="snake-layout">
      <section class="snake-arena" aria-label="贪吃蛇游戏">
        <div class="snake-scorebar">
          <div><span>本局得分</span><strong>{{ game.score.toString().padStart(2, '0') }}</strong></div>
          <div><span>{{ auth.user ? '我的最高分' : '游客纪录' }}</span><strong>{{ best.toString().padStart(2, '0') }}</strong></div>
          <span class="snake-status" role="status"><i :class="{ running }"></i>{{ statusText }}</span>
        </div>
        <div ref="board" class="snake-board" tabindex="0" role="group" aria-label="贪吃蛇棋盘，方向键或 WASD 控制方向，空格开始或暂停" aria-describedby="snake-instructions">
          <svg :viewBox="`0 0 ${BOARD_SIZE * 20} ${BOARD_SIZE * 20}`" role="img" aria-label="绿色小蛇和橙色果实的游戏棋盘">
            <defs>
              <pattern id="snake-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M20 0H0V20" fill="none" stroke="#dce9df" stroke-width="0.65" />
              </pattern>
            </defs>
            <rect width="400" height="400" fill="#f0f6ef" />
            <rect width="400" height="400" fill="url(#snake-grid)" />
            <g v-for="food in game.foods" :key="`${food.x},${food.y}`">
              <circle :cx="food.x * 20 + 10" :cy="food.y * 20 + 11" r="7" fill="#e69b48" />
              <path :d="`M${food.x * 20 + 10} ${food.y * 20 + 5}q0-5 5-5`" fill="none" stroke="#648459" stroke-width="2" />
            </g>
            <rect v-for="(cell, index) in game.snake" :key="`${cell.x},${cell.y}`" :x="cell.x * 20 + 1" :y="cell.y * 20 + 1" width="18" height="18" :rx="index === 0 ? 6 : 4" :fill="index === 0 ? '#164f3d' : '#4b9470'" />
            <g :transform="`translate(${game.snake[0].x * 20 + 10} ${game.snake[0].y * 20 + 10}) rotate(${{ right: 0, down: 90, left: 180, up: 270 }[game.direction]})`" fill="white">
              <circle cx="4" cy="-4" r="1.7" /><circle cx="4" cy="4" r="1.7" />
            </g>
          </svg>
          <div v-if="!running" class="snake-overlay">
            <div class="snake-overlay-card">
              <span class="snake-emblem"><AppIcon name="snake" :size="30" /></span>
              <h2>{{ statusText }}</h2>
              <p v-if="overlayDescription">{{ overlayDescription }}</p>
              <button type="button" class="button button-primary" :disabled="starting || saving || !auth.ready || !!pending" @click="start">{{ starting ? '正在开始…' : actionText }} <span aria-hidden="true">→</span></button>
            </div>
          </div>
        </div>
        <div class="snake-toolbar">
          <span>8 颗果实 · 每颗 +20 分</span>
          <div>
            <button type="button" class="button button-outline" :disabled="starting || saving || !auth.ready || !!pending" @click="toggle">{{ actionText }}</button>
            <button type="button" class="button button-outline" :disabled="starting || saving || !auth.ready || !!pending" @click="restart"><AppIcon name="refresh" :size="16" />重新开始</button>
          </div>
        </div>
        <div class="snake-savebar">
          <button v-if="auth.user && ['running', 'paused'].includes(game.status)" type="button" class="button button-outline" :disabled="saving" @click="endRound">结束并记分</button>
          <span v-if="saving" role="status">正在保存成绩…</span>
          <span v-else-if="saveMessage" role="status">{{ saveMessage }}</span>
          <span v-else-if="!auth.user"><button type="button" @click="openAuth()">登录</button> 后新开的对局可计入排行榜</span>
          <p v-if="startError" class="snake-request-error" role="alert">{{ startError }} <button type="button" @click="openAuth()">登录</button></p>
          <div v-if="saveError" class="snake-request-error" role="alert">
            {{ saveError }}
            <button type="button" :disabled="saving" @click="saveScore">重试保存</button>
            <button type="button" :disabled="saving" @click="openAuth()">重新登录</button>
            <button type="button" :disabled="saving" @click="discardScore">放弃本局成绩</button>
          </div>
        </div>
        <div class="snake-mobile-controls">
          <div class="snake-dpad" aria-label="方向控制">
            <button v-for="control in directionButtons" :key="control.direction" type="button" :class="`direction-${control.direction}`" :aria-label="control.label" :disabled="!running" @click="turn(control.direction); board?.focus({ preventScroll: true })">{{ control.symbol }}</button>
          </div>
          <small class="snake-touch-hint">点击方向按钮操作</small>
        </div>
      </section>

      <aside class="snake-guide" aria-label="游戏设置和玩法">
        <SnakeLeaderboard ref="leaderboard" @best="memberBest = $event" />
        <section id="snake-instructions" class="snake-guide-card">
          <h2>怎么玩</h2>
          <p>用方向键或 WASD 转向，吃到果实后小蛇会变长。左右、上下边界均可穿越，撞到自身结束游戏，占满棋盘即可获胜。</p>
          <div class="snake-key-hint"><kbd>Space</kbd><span>开始 / 暂停 / 继续</span></div>
          <div class="snake-key-hint"><kbd>Esc</kbd><span>暂停游戏</span></div>
          <div class="snake-dpad snake-desktop-controls" aria-label="方向控制">
            <button v-for="control in directionButtons" :key="control.direction" type="button" :class="`direction-${control.direction}`" :aria-label="control.label" :disabled="!running" @click="turn(control.direction); board?.focus({ preventScroll: true })">{{ control.symbol }}</button>
          </div>
          <small class="snake-touch-hint snake-desktop-controls">也可以点击方向按钮操作</small>
        </section>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.snake-eyebrow { color: #6d8575; font-size: 12px; letter-spacing: 2px; margin-bottom: 10px; }
.snake-tag { display: inline-flex; align-items: center; gap: 8px; padding: 8px 13px; border: 1px solid #dce7de; border-radius: 20px; color: #5d7b65; background: #eef5ee; }
.snake-layout { display: grid; grid-template-columns: minmax(0, 680px) minmax(240px, 300px); gap: 24px; align-items: start; }
.snake-arena, .snake-guide-card { background: #fff; border: 1px solid var(--border); border-radius: 12px; }
.snake-arena { padding: 24px; }
.snake-scorebar { display: flex; align-items: center; gap: 36px; margin-bottom: 22px; }
.snake-scorebar div { display: grid; gap: 4px; }
.snake-scorebar div > span { color: #748178; font-size: 12px; }
.snake-scorebar strong { font-size: 30px; font-weight: 650; font-variant-numeric: tabular-nums; line-height: 1.2; }
.snake-status { margin-left: auto; display: flex; align-items: center; gap: 7px; font-size: 12px; color: #718378; }
.snake-status i { width: 6px; height: 6px; background: #a4b2a7; border-radius: 50%; }
.snake-status i.running { background: var(--green); }
.snake-board { position: relative; border: 1px solid #d7e3d8; border-radius: 10px; overflow: hidden; }
.snake-board:focus-visible { outline: 3px solid #84bda7; outline-offset: 4px; }
.snake-board > svg { display: block; width: 100%; aspect-ratio: 1; }
.snake-overlay { position: absolute; inset: 0; display: grid; place-items: center; background: #f0f6ef9c; backdrop-filter: blur(3px); padding: 16px; }
.snake-overlay-card { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; }
.snake-emblem { display: grid; place-items: center; width: 62px; height: 62px; background: #fff; color: var(--green); border: 1px solid #dfebdf; border-radius: 18px; margin-bottom: 6px; }
.snake-overlay-card h2 { font-size: 24px; }
.snake-overlay-card p { color: #64796a; }
.snake-overlay-card .button { margin-top: 8px; gap: 24px; }
.snake-toolbar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 14px; margin-top: 20px; }
.snake-toolbar > span { color: #7b887f; font-size: 12px; }
.snake-toolbar > div { display: flex; gap: 8px; }
.snake-toolbar .button { padding: 8px 12px; }
.snake-guide { display: grid; gap: 18px; }
.snake-guide-card { padding: 24px; }
.snake-guide-card h2 { font-size: 16px; }
.snake-guide-card p { color: #748178; line-height: 1.9; margin-top: 10px; }
.snake-guide-card small { font-size: 12px; color: #7b887f; line-height: 1.8; }
.snake-key-hint { display: flex; align-items: center; gap: 12px; color: #748178; font-size: 12px; margin-top: 15px; }
kbd { min-width: 52px; text-align: center; border: 1px solid #dce5df; border-bottom-width: 3px; border-radius: 5px; padding: 3px 6px; font: inherit; color: #426150; background: #f8faf8; }
.snake-dpad { display: grid; grid-template-columns: repeat(3, 44px); grid-template-rows: repeat(2, 44px); justify-content: center; gap: 6px; margin: 24px 0 12px; }
.snake-dpad button { background: #f0f5f1; border: 1px solid #dce5df; border-radius: 8px; color: #426150; font-size: 22px; }
.snake-dpad button:active:not(:disabled) { background: #cfe5d7; }
.snake-dpad button:disabled { cursor: default; }
.direction-up { grid-column: 2; }
.direction-left { grid-column: 1; grid-row: 2; }
.direction-down { grid-column: 2; grid-row: 2; }
.direction-right { grid-column: 3; grid-row: 2; }
.snake-touch-hint { display: block; text-align: center; }
.snake-savebar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 14px; font-size: 12px; color: #748178; }
.snake-savebar button:not(.button) { border: 0; background: none; color: var(--green); padding: 3px 5px; }
.snake-request-error { flex-basis: 100%; color: #a73b2b; }
.snake-mobile-controls { display: none; color: #7b887f; }
@media (max-width: 1100px) {
  .snake-layout { grid-template-columns: minmax(0, 1fr); max-width: 680px; }
  .snake-guide { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .snake-mobile-controls { display: block; }
  .snake-mobile-controls .snake-dpad {
    grid-template-columns: repeat(3, 60px);
    grid-template-rows: repeat(2, 60px);
    gap: 24px;
  }
  .snake-mobile-controls .snake-dpad button { font-size: 28px; border-radius: 12px; }
  .snake-desktop-controls { display: none; }
}
@media (max-width: 500px) {
  .snake-arena { padding: 14px; }
  .snake-scorebar { gap: 24px; margin-bottom: 16px; }
  .snake-scorebar strong { font-size: 26px; }
  .snake-guide { grid-template-columns: minmax(0, 1fr); }
  .snake-guide-card { padding: 20px; }
  .snake-tag { display: none; }
  .snake-overlay-card { gap: 8px; }
  .snake-emblem { width: 44px; height: 44px; margin: 0; }
  .snake-overlay-card h2 { font-size: 21px; }
}
</style>
