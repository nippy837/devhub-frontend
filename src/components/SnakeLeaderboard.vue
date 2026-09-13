<script setup>
import { computed, ref, watch } from 'vue'
import { useLeaderboard } from '../composables/useLeaderboard.js'
import { auth, openAuth } from '../composables/useAuth.js'
import AppIcon from './AppIcon.vue'

const props = defineProps({
  kind: { type: String, default: 'snake' },
  variant: { type: String, default: 'classic' },
  title: { type: String, default: '贪吃蛇' },
  lastRound: { type: Object, default: null },
})
const metricLabel = () => props.kind === 'sokoban' ? '我的通关数' : props.kind === 'mines' ? '我的最快用时' : '我的最高分'
function formatScore(value) {
  if (value == null) return '—'
  return props.kind === 'mines' ? `${(value / 1000).toFixed(2)} 秒` : props.kind === 'sokoban' ? `${value} 关` : value
}

const emit = defineEmits(['best'])
const mineTabs = [{ id: 'easy', label: '初级' }, { id: 'medium', label: '中级' }, { id: 'hard', label: '高级' }]
const selectedVariant = ref(props.variant)
watch(() => props.variant, (value) => { selectedVariant.value = value }, { flush: 'sync' })
const { entries, myBest, myLast, loading, error, refresh } = useLeaderboard(
  () => props.kind, () => selectedVariant.value, (best) => emit('best', best),
)
const recent = computed(() => props.lastRound?.variant === selectedVariant.value ? props.lastRound : myLast.value)
const recentLabel = computed(() => ({ won: '已通关', over: '未通关', ended: '已结束' })[recent.value?.outcome] || '')
defineExpose({ refresh })
</script>

<template>
  <section class="leaderboard" :aria-label="`${title}排行榜`">
    <div class="leaderboard-heading">
      <h2>排行榜 <span>TOP 50</span></h2>
      <button type="button" class="icon-button" aria-label="刷新排行榜" :disabled="loading" @click="refresh"><AppIcon name="refresh" :size="17" /></button>
    </div>
    <div v-if="kind === 'mines'" class="ranking-tabs" role="group" aria-label="扫雷排行榜难度">
      <button v-for="tab in mineTabs" :key="tab.id" type="button" :aria-pressed="selectedVariant === tab.id" :class="{ selected: selectedVariant === tab.id }" @click="selectedVariant = tab.id">{{ tab.label }}</button>
    </div>
    <div v-if="kind === 'mines'" class="recent-round">
      <span>最近一局用时<small v-if="recent">{{ recentLabel }}</small></span>
      <strong>{{ formatScore(recent?.elapsedMs) }}</strong>
    </div>
    <p v-if="auth.user" class="my-best">{{ metricLabel() }} <strong>{{ formatScore(myBest) }}</strong></p>
    <p v-else class="leaderboard-login"><button type="button" @click="openAuth()">登录参与排行</button></p>
    <p v-if="error" class="ranking-error" role="alert">{{ error }} <button type="button" @click="refresh">重试</button></p>
    <p v-else-if="loading && !entries.length" class="ranking-empty" role="status">正在加载…</p>
    <p v-else-if="!entries.length" class="ranking-empty">还没有成绩，来拿下第一名吧。</p>
    <ol v-else class="ranking-list" aria-label="游戏成绩排名">
      <li v-for="entry in entries" :key="entry.userId" :class="{ mine: entry.userId === auth.user?.id }">
        <span class="rank" :class="{ podium: entry.rank <= 3 }">{{ entry.rank }}</span>
        <span class="rank-name">{{ entry.username }}<small v-if="entry.userId === auth.user?.id"> 我</small></span>
        <strong>{{ formatScore(entry.score) }}</strong>
      </li>
    </ol>
    <p class="ranking-rule">{{ kind === 'sokoban' ? '累计通关越多越靠前，同一关只计一次；通关数相同按注册顺序排列。' : kind === 'mines' ? '本难度通关用时越短越靠前；未通关仅展示用时，不参与排名。' : kind === 'snake' ? '统一中速，仅统计中速最高分；同分按注册顺序排列。' : '每人显示最高分，同分按注册顺序排列。' }}</p>
  </section>
</template>

<style scoped>
.leaderboard { border: 1px solid var(--border); border-radius: 12px; background: #fff; padding: 22px; min-width: 0; }
.leaderboard-heading { display: flex; align-items: center; justify-content: space-between; }
.leaderboard h2 { font-size: 16px; gap: 10px; }
.leaderboard h2 span { font-size: 10px; letter-spacing: 1px; color: #8b987e; font-weight: 500; }
.my-best { display: flex; justify-content: space-between; margin-top: 16px; background: #edf5ef; padding: 10px 12px; border-radius: 7px; color: var(--green); }
.leaderboard-login { margin: 14px 0; }
.leaderboard button:not(.icon-button) { border: 0; padding: 0; background: none; color: var(--green); }
.ranking-tabs { display: flex; gap: 4px; padding: 4px; margin-top: 16px; border-radius: 9px; background: #f0f4f0; }
.leaderboard .ranking-tabs button { flex: 1; min-height: 38px; padding: 8px 4px; border-radius: 6px; color: #748178; }
.leaderboard .ranking-tabs button.selected { background: white; color: var(--green); box-shadow: 0 1px 4px #24473814; font-weight: 600; }
.recent-round { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; color: #617568; }
.recent-round span { display: grid; gap: 3px; }
.recent-round small { font-size: 11px; color: #849089; }
.recent-round strong { color: #304a3b; font-variant-numeric: tabular-nums; white-space: nowrap; }
.ranking-empty, .ranking-error { padding: 22px 0; color: #748178; }
.ranking-error { color: #a73b2b; }
.ranking-list { list-style: none; padding: 0; margin: 16px 0 0; max-height: 350px; overflow-y: auto; }
.ranking-list li { display: flex; align-items: center; gap: 10px; padding: 11px 5px; border-bottom: 1px solid #eff3ef; }
.ranking-list li.mine { background: #f0f7f1; }
.rank { width: 24px; height: 24px; flex-shrink: 0; display: grid; place-items: center; color: #849089; font-size: 12px; border-radius: 6px; }
.rank.podium { color: #947021; background: #fbf3de; font-weight: 700; }
.rank-name { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.rank-name small { color: var(--green); }
.ranking-list strong { font-variant-numeric: tabular-nums; }
.ranking-rule { margin-top: 16px; color: #849089; font-size: 12px; }
</style>
