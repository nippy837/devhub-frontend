<script setup>
import { computed, nextTick, onActivated, onDeactivated, onUnmounted, ref } from 'vue'
import { auth, openAuth } from '../composables/useAuth.js'
import { useArcadeRound } from '../composables/useArcadeRound.js'
import { levels, MINE_MODES } from '../utils/arcadeGames.js'
import SnakeLeaderboard from './SnakeLeaderboard.vue'
import AppIcon from './AppIcon.vue'
import GameSprite from './GameSprite.vue'

const props = defineProps({ kind: { type: String, required: true } })
const metadata = {
  '2048': { title: '2048', tag: '数字合并', icon: 'grid', instructions: '方向键、WASD 或滑动棋盘，让相同数字相遇。每次合并的数字计入得分，合成 2048 即获胜。' },
  sokoban: { title: '推箱子', tag: '仓库挑战', icon: 'box', instructions: '方向键、WASD 或下方按钮移动，将所有箱子推到圆点目标上。箱子只能推，不能拉；卡住后可以重玩本关。' },
  mines: { title: '扫雷', tag: '排雷挑战', icon: 'mine', instructions: '翻开所有非雷格即可通关。数字表示周围八格的地雷数，首次翻开及周围格子安全。电脑右键插旗，手机可切换插旗模式。' },
}
const info = metadata[props.kind]
const variant = ref(props.kind === 'sokoban' ? '1' : props.kind === 'mines' ? 'easy' : 'classic')
const leaderboard = ref(null), board = ref(null), flagMode = ref(false)
const { game, phase, elapsed, starting, saving, error, message, pending, locked, start, restart, pause, finish, act, save, discard } = useArcadeRound(props.kind, variant, () => leaderboard.value?.refresh())
const playing = computed(() => phase.value === 'running')
const statusText = computed(() => ({ ready: '准备开始', running: '进行中', paused: '已暂停', won: '挑战成功', over: '本局结束' })[phase.value])
const primaryLabel = computed(() => starting.value ? '正在开始…' : phase.value === 'ready' ? '开始游戏' : phase.value === 'paused' ? '继续游戏' : '再玩一次')
const variantsDisabled = computed(() => locked.value || ['running', 'paused'].includes(phase.value))
const controls = [{ code: 'U', label: '向上', symbol: '↑' }, { code: 'L', label: '向左', symbol: '←' }, { code: 'D', label: '向下', symbol: '↓' }, { code: 'R', label: '向右', symbol: '→' }]
const completedBoxes = computed(() => props.kind === 'sokoban' ? game.value.boxes.filter((cell) => game.value.goals.includes(cell)).length : 0)
const mineCells = computed(() => props.kind === 'mines' ? Array.from({ length: game.value.size ** 2 }, (_, i) => i) : [])
let touchStart = null
let active = false

async function begin() {
  await start()
  await nextTick()
  if (phase.value === 'running') board.value?.focus({ preventScroll: true })
}
function move(code) { act(code); board.value?.focus({ preventScroll: true }) }
function keyboard(event) {
  if (!active || auth.dialog || event.ctrlKey || event.altKey || event.metaKey) return
  if (event.target instanceof HTMLElement && (event.target.closest('input, select, textarea, button, a') || event.target.isContentEditable)) return
  if (props.kind !== 'mines') {
    const code = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R', w: 'U', s: 'D', a: 'L', d: 'R' }[event.key.length === 1 ? event.key.toLowerCase() : event.key]
    if (code) { event.preventDefault(); if (!event.repeat) move(code) }
  }
  if (event.code === 'Space') { event.preventDefault(); if (!event.repeat) playing.value ? pause() : begin() }
  if (event.key === 'Escape') pause()
}
function pointerDown(event) {
  if (props.kind === '2048' && playing.value && event.isPrimary && event.button === 0) {
    touchStart = { x: event.clientX, y: event.clientY, id: event.pointerId }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
}
function pointerUp(event) {
  if (!touchStart || touchStart.id !== event.pointerId) return
  const dx = event.clientX - touchStart.x, dy = event.clientY - touchStart.y
  touchStart = null
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
  move(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'R' : 'L' : dy > 0 ? 'D' : 'U')
}
function mineLabel(cell) {
  const location = `第 ${Math.floor(cell / game.value.size) + 1} 行第 ${cell % game.value.size + 1} 列`
  if (game.value.exploded === cell) return `${location}，踩中地雷`
  if (phase.value === 'over' && game.value.mines.includes(cell)) return `${location}，地雷`
  if (game.value.revealed.includes(cell)) return `${location}，周围 ${game.value.counts[cell]} 颗地雷`
  if (game.value.flags.includes(cell)) return `${location}，已插旗`
  return `${location}，未翻开`
}
function cleanup() { active = false; touchStart = null; window.removeEventListener('keydown', keyboard) }
onActivated(() => { active = true; window.addEventListener('keydown', keyboard); leaderboard.value?.refresh() })
onDeactivated(cleanup)
onUnmounted(cleanup)
</script>

<template>
  <main class="arcade-page">
    <div class="page-heading">
      <div><p class="arcade-eyebrow">小游戏 / {{ kind === 'sokoban' ? 'SOKOBAN' : kind === 'mines' ? 'MINESWEEPER' : '2048' }}</p><h1>{{ info.title }}</h1></div>
      <span class="arcade-tag"><AppIcon :name="info.icon" :size="18" />{{ info.tag }}</span>
    </div>
    <div class="arcade-layout">
      <section class="arcade-panel" :aria-label="`${info.title}游戏`">
        <div class="arcade-scorebar">
          <template v-if="kind === '2048'">
            <div><span>本局得分</span><strong>{{ game.score }}</strong></div>
            <div><span>最大数字</span><strong>{{ Math.max(...game.cells) }}</strong></div>
          </template>
          <template v-else-if="kind === 'sokoban'">
            <div><span>移动步数</span><strong>{{ game.steps }}</strong></div>
            <div><span>箱子归位</span><strong>{{ completedBoxes }}<small> / {{ game.boxes.length }}</small></strong></div>
          </template>
          <template v-else>
            <div><span>剩余旗帜</span><strong>{{ game.mineCount - game.flags.length }}</strong></div>
            <div><span>用时（秒）</span><strong>{{ (elapsed / 1000).toFixed(1) }}</strong></div>
          </template>
          <span class="arcade-status" role="status">{{ statusText }}</span>
        </div>

        <div v-if="kind === 'mines'" class="mine-mode" role="group" aria-label="扫雷操作模式">
          <button type="button" :class="{ selected: !flagMode }" :aria-pressed="!flagMode" @click="flagMode = false">翻开格子</button>
          <button type="button" :class="{ selected: flagMode }" :aria-pressed="flagMode" @click="flagMode = true"><GameSprite name="flag" />插旗 / 取消</button>
        </div>
        <div ref="board" class="arcade-board" :class="[`board-${kind}`, { 'board-paused': phase === 'paused' }]" tabindex="0" :aria-label="`${info.title}棋盘`" @pointerdown="pointerDown" @pointerup="pointerUp" @pointercancel="touchStart = null">
          <div v-if="kind === '2048'" class="tiles-2048" role="grid" aria-label="2048 数字方格">
            <div v-for="(value, index) in game.cells" :key="index" class="number-tile" :class="`tile-${value}`" role="gridcell" :aria-label="`第 ${Math.floor(index / 4) + 1} 行第 ${index % 4 + 1} 列，${value || '空'}`">{{ value || '' }}</div>
          </div>
          <div v-else-if="kind === 'sokoban'" class="sokoban-grid" :style="{ '--columns': game.width }" role="img" :aria-label="`推箱子棋盘，已归位 ${completedBoxes} 个箱子，共 ${game.boxes.length} 个`">
            <div v-for="(_, cell) in game.width * game.height" :key="cell" class="warehouse-cell" :class="{ wall: game.walls.includes(cell), goal: game.goals.includes(cell) }">
              <span v-if="game.player === cell" class="warehouse-player" aria-hidden="true"><GameSprite name="worker" /></span>
              <span v-else-if="game.boxes.includes(cell)" class="warehouse-box" :class="{ 'on-goal': game.goals.includes(cell) }" aria-hidden="true"><GameSprite name="crate" :complete="game.goals.includes(cell)" /></span>
              <span v-else-if="game.goals.includes(cell)" class="warehouse-goal" aria-hidden="true"></span>
            </div>
          </div>
          <div v-else class="mine-scroll">
            <div class="mine-grid" :style="{ '--columns': game.size }" role="group" aria-label="扫雷方格">
              <button v-for="cell in mineCells" :key="cell" type="button" class="mine-cell" :class="[{ revealed: game.revealed.includes(cell), flagged: game.flags.includes(cell), exploded: game.exploded === cell }, `near-${game.counts[cell] || 0}`]" :disabled="!playing" :aria-label="mineLabel(cell)" @click="act(`${flagMode ? 'F' : 'O'}${cell}`)" @contextmenu.prevent="act(`F${cell}`)">
                <GameSprite v-if="phase === 'over' && game.mines.includes(cell)" name="mine" />
                <GameSprite v-else-if="game.flags.includes(cell)" name="flag" />
                <span v-else>{{ game.revealed.includes(cell) ? game.counts[cell] || '' : '' }}</span>
              </button>
            </div>
          </div>
          <div v-if="['ready', 'paused'].includes(phase)" class="arcade-overlay">
            <div class="arcade-overlay-card"><AppIcon :name="info.icon" :size="32" /><h2>{{ statusText }}</h2><button type="button" class="button button-primary" :disabled="locked || !auth.ready" @click="begin">{{ primaryLabel }}</button></div>
          </div>
        </div>

        <div v-if="phase === 'won' || phase === 'over'" class="arcade-result" role="status">
          <strong>{{ phase === 'won' ? kind === '2048' ? '合成 2048，挑战成功！' : '恭喜通关！' : kind === 'mines' && game.exploded >= 0 ? '踩到地雷了，再试一次吧。' : '本局结束' }}</strong>
          <span>{{ kind === '2048' ? `本局 ${game.score} 分` : kind === 'sokoban' ? `移动 ${game.steps} 步` : `用时 ${(elapsed / 1000).toFixed(2)} 秒` }}</span>
        </div>
        <div class="arcade-actions">
          <button v-if="playing" type="button" class="button button-outline" @click="pause">暂停</button>
          <button v-else type="button" class="button button-primary" :disabled="locked || !auth.ready" @click="begin">{{ primaryLabel }}</button>
          <button type="button" class="button button-outline" :disabled="locked || !auth.ready" @click="restart"><AppIcon name="refresh" :size="16" />{{ kind === 'sokoban' ? '重玩本关' : '重新开始' }}</button>
          <button v-if="['running', 'paused'].includes(phase)" type="button" class="button button-outline" :disabled="locked" @click="finish">{{ kind === '2048' ? '结束并记分' : '结束本局' }}</button>
        </div>
        <div class="arcade-feedback">
          <span v-if="saving" role="status">正在保存成绩…</span>
          <span v-else-if="message" role="status">{{ message }}</span>
          <span v-else-if="!auth.user"><button type="button" @click="openAuth()">登录</button>后新开的对局可参与排行</span>
          <p v-if="error" class="arcade-error" role="alert">{{ error }} <button v-if="pending" type="button" :disabled="saving" @click="save">重试保存</button><button type="button" @click="openAuth()">登录</button><button v-if="pending" type="button" :disabled="saving" @click="discard">放弃成绩</button></p>
        </div>
        <div v-if="kind !== 'mines'" class="arcade-dpad" aria-label="方向控制">
          <button v-for="control in controls" :key="control.code" type="button" :class="`move-${control.code}`" :aria-label="control.label" :disabled="!playing || locked" @click="move(control.code)">{{ control.symbol }}</button>
        </div>
      </section>
      <aside class="arcade-aside">
        <SnakeLeaderboard ref="leaderboard" :kind="kind" :variant="variant" :title="info.title" />
        <section v-if="kind !== '2048'" class="arcade-guide">
          <h2>{{ kind === 'sokoban' ? '选择关卡' : '选择难度' }}</h2>
          <label class="sr-only" :for="`${kind}-variant`">{{ kind === 'sokoban' ? '关卡' : '难度' }}</label>
          <select :id="`${kind}-variant`" v-model="variant" :disabled="variantsDisabled">
            <template v-if="kind === 'sokoban'"><option v-for="level in levels" :key="level.id" :value="level.id">第 {{ level.id }} 关 · {{ level.name }}</option></template>
            <template v-else><option v-for="(mode, key) in MINE_MODES" :key="key" :value="key">{{ mode.label }} · {{ mode.mines }} 雷</option></template>
          </select>
          <p>{{ kind === 'sokoban' ? '所有关卡共用排行榜，累计通关数量越多越靠前。' : '各难度独立排行，通关用时越短越好。' }}</p>
        </section>
        <section class="arcade-guide"><h2>怎么玩</h2><p>{{ info.instructions }}</p><p v-if="kind === 'mines'">从点击开始到通关持续计时，暂停或切换页面也计时。大棋盘可左右滑动查看。</p><p v-else>空格键开始或暂停，Esc 暂停。</p></section>
      </aside>
    </div>
  </main>
</template>

<style scoped>
.arcade-eyebrow { color: #6d8575; font-size: 12px; letter-spacing: 2px; margin-bottom: 10px; }
.arcade-tag { display: inline-flex; align-items: center; gap: 8px; padding: 8px 13px; border: 1px solid #dce7de; border-radius: 20px; color: #5d7b65; background: #eef5ee; }
.arcade-layout { display: grid; grid-template-columns: minmax(0, 680px) minmax(260px, 320px); gap: 24px; align-items: start; }
.arcade-panel, .arcade-guide { padding: 24px; border: 1px solid var(--border); border-radius: 12px; background: white; min-width: 0; }
.arcade-scorebar { display: flex; align-items: center; gap: 32px; margin-bottom: 22px; }
.arcade-scorebar > div { display: grid; gap: 4px; }
.arcade-scorebar span { color: #748178; font-size: 12px; }
.arcade-scorebar strong { font-size: 30px; line-height: 1.3; font-variant-numeric: tabular-nums; }
.arcade-scorebar small { font-size: 16px; color: #849089; }
.arcade-status { margin-left: auto; white-space: nowrap; }
.arcade-board { position: relative; border-radius: 12px; }
.arcade-board:focus-visible { outline: 3px solid #84bda7; outline-offset: 4px; }
.board-2048 { touch-action: none; user-select: none; }
.tiles-2048 { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; padding: 10px; border-radius: 12px; background: #bac8b8; }
.number-tile { aspect-ratio: 1; display: grid; place-items: center; border-radius: 8px; background: #d4ddd0; color: #52644d; font-size: clamp(24px, 4vw, 44px); font-weight: 700; }
.tile-2 { background: #f1f3e9; }.tile-4 { background: #e9edcf; }.tile-8 { background: #edd79d; }.tile-16 { background: #edc181; }.tile-32 { background: #e6a16c; color: #fff; }.tile-64 { background: #d48052; color: #fff; }.tile-128 { background: #a2ba77; color: #fff; }.tile-256 { background: #7fa464; color: #fff; }.tile-512 { background: #578651; color: #fff; }.tile-1024 { background: #356d4f; color: #fff; font-size: clamp(20px, 3vw, 34px); }.tile-2048 { background: #176b51; color: #fff; font-size: clamp(20px, 3vw, 34px); }
.sokoban-grid { display: grid; grid-template-columns: repeat(var(--columns), minmax(0, 1fr)); gap: 3px; padding: 8px; border-radius: 12px; background: #e4ede2; }
.warehouse-cell { aspect-ratio: 1; display: grid; place-items: center; border-radius: 4px; background: #f4f7ef; }
.warehouse-cell.wall { background: linear-gradient(135deg, #819783, #647d69); border: 1px solid #617a66; box-shadow: inset 0 2px #9aac98, inset 0 -4px #506b56; }
.warehouse-player { width: 94%; height: 94%; }
.warehouse-box { width: 96%; height: 96%; }
.warehouse-cell:has(.warehouse-box.on-goal) { background: #e4efdd; }
.warehouse-goal { width: 28%; height: 28%; border-radius: 50%; background: #b7cf88; box-shadow: 0 0 0 5px #e3edcc; }
.mine-mode { display: flex; gap: 10px; margin-bottom: 16px; }
.mine-mode button { display: flex; align-items: center; justify-content: center; gap: 8px; flex: 1; padding: 10px; border: 1px solid #dce5df; border-radius: 7px; background: #fff; color: #617568; }
.mine-mode .game-sprite { width: 25px; height: 25px; flex-shrink: 0; }
.mine-mode button.selected { background: #edf5ee; border-color: #84bda7; color: #176b51; }
.mine-scroll { overflow-x: auto; border-radius: 10px; background: #e5eee5; padding: 6px; }
.mine-grid { display: grid; grid-template-columns: repeat(var(--columns), minmax(30px, 1fr)); gap: 3px; min-width: calc(var(--columns) * 33px - 3px); }
.mine-cell { display: grid; place-items: center; min-width: 0; aspect-ratio: 1; padding: 0; border: 1px solid #b8cbbb; border-bottom-width: 3px; border-radius: 4px; color: #3c7051; background: #d3e3d1; font-weight: 700; font-size: clamp(13px, 2vw, 19px); }
.mine-cell.revealed { background: #f5f8f2; border: 1px solid #e1e9de; }
.mine-cell:disabled { cursor: default; opacity: 1; }
.mine-cell .game-sprite { width: 86%; height: 86%; max-width: 44px; max-height: 44px; }
.mine-cell.flagged { background: #f3e9d6; border-color: #d6c19c; }
.mine-cell.exploded { background: #f2c5b8; border-color: #cb8371; }
.mine-cell.near-1 { color: #3262a1; }.mine-cell.near-2 { color: #277349; }.mine-cell.near-3 { color: #b04e42; }.mine-cell.near-4 { color: #74549a; }
.arcade-overlay { position: absolute; inset: 0; display: grid; place-items: center; border-radius: 12px; background: #f0f6efb8; backdrop-filter: blur(3px); }
.arcade-overlay-card { display: flex; flex-direction: column; align-items: center; gap: 18px; color: #176b51; }
.arcade-overlay-card h2 { font-size: 24px; }
.arcade-actions { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 22px; }
.arcade-actions .button { padding: 9px 13px; }
.arcade-feedback { margin-top: 14px; font-size: 12px; color: #748178; }
.arcade-feedback button { border: 0; background: transparent; color: var(--green); padding: 4px; }
.arcade-error { color: #a73b2b; }
.arcade-result { display: flex; flex-wrap: wrap; gap: 8px 18px; align-items: center; padding: 14px 16px; background: #edf5ee; border-radius: 8px; margin-top: 18px; color: #176b51; }
.arcade-result span { font-size: 13px; }
.arcade-aside { display: grid; gap: 20px; min-width: 0; }
.arcade-guide h2 { font-size: 16px; }
.arcade-guide p { margin-top: 12px; color: #748178; line-height: 1.9; }
.arcade-guide select { display: block; width: 100%; margin-top: 18px; border: 1px solid #dce5df; border-radius: 7px; padding: 11px; color: #426150; background: #f8faf8; }
.arcade-dpad { display: grid; grid-template-columns: repeat(3, 60px); grid-template-rows: repeat(2, 60px); gap: 24px; justify-content: center; margin-top: 26px; }
.arcade-dpad button { background: #f0f5f1; border: 1px solid #dce5df; border-radius: 12px; color: #426150; font-size: 28px; }
.arcade-dpad button:disabled { cursor: default; }.arcade-dpad button:active:not(:disabled) { background: #cfe5d7; }
.move-U { grid-column: 2; }.move-L { grid-column: 1; grid-row: 2; }.move-D { grid-column: 2; grid-row: 2; }.move-R { grid-column: 3; grid-row: 2; }
@media (max-width: 1100px) { .arcade-layout { grid-template-columns: minmax(0, 1fr); max-width: 680px; }.arcade-aside { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 500px) { .arcade-panel, .arcade-guide { padding: 14px; }.arcade-scorebar { gap: 22px; }.arcade-scorebar strong { font-size: 26px; }.arcade-tag { display: none; }.arcade-aside { grid-template-columns: minmax(0, 1fr); }.tiles-2048 { padding: 7px; gap: 7px; } }
</style>
