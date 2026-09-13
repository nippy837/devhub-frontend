<script setup>
import { onMounted, ref, watch } from 'vue'
import { getLeaderboard } from '../api/game.js'
import { auth, openAuth } from '../composables/useAuth.js'
import AppIcon from './AppIcon.vue'

const emit = defineEmits(['best'])
const entries = ref([])
const loading = ref(false)
const error = ref('')
const myBest = ref(0)
let version = 0

async function refresh() {
  const requestVersion = ++version
  loading.value = true
  error.value = ''
  try {
    const result = await getLeaderboard()
    if (requestVersion !== version) return
    entries.value = result.entries
    myBest.value = result.myBest
    emit('best', result.myBest)
  } catch (failure) {
    if (requestVersion === version) error.value = failure.message
  } finally { if (requestVersion === version) loading.value = false }
}
onMounted(refresh)
watch(() => auth.user?.id, () => { entries.value = []; myBest.value = 0; refresh() })
defineExpose({ refresh })
</script>

<template>
  <section class="leaderboard" aria-label="贪吃蛇排行榜">
    <div class="leaderboard-heading">
      <h2>排行榜 <span>TOP 50</span></h2>
      <button type="button" class="icon-button" aria-label="刷新排行榜" :disabled="loading" @click="refresh"><AppIcon name="refresh" :size="17" /></button>
    </div>
    <p v-if="auth.user" class="my-best">我的最高分 <strong>{{ myBest }}</strong></p>
    <p v-else class="leaderboard-login"><button type="button" @click="openAuth()">登录参与排行</button></p>
    <p v-if="error" class="ranking-error" role="alert">{{ error }} <button type="button" @click="refresh">重试</button></p>
    <p v-else-if="loading && !entries.length" class="ranking-empty" role="status">正在加载…</p>
    <p v-else-if="!entries.length" class="ranking-empty">还没有成绩，来拿下第一名吧。</p>
    <ol v-else class="ranking-list" aria-label="最高分排名">
      <li v-for="entry in entries" :key="entry.userId" :class="{ mine: entry.userId === auth.user?.id }">
        <span class="rank" :class="{ podium: entry.rank <= 3 }">{{ entry.rank }}</span>
        <span class="rank-name">{{ entry.username }}<small v-if="entry.userId === auth.user?.id"> 我</small></span>
        <strong>{{ entry.score }}</strong>
      </li>
    </ol>
    <p class="ranking-rule">每人显示最高分，同分按注册顺序排列。</p>
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
