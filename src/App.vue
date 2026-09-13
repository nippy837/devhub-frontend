<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import AccountList from './components/AccountList.vue'
import JsonTool from './components/JsonTool.vue'
import DiffTool from './components/DiffTool.vue'
import SpeedTool from './components/SpeedTool.vue'
import AiChat from './components/AiChat.vue'
import AppIcon from './components/AppIcon.vue'
import SnakeGame from './components/SnakeGame.vue'
import ArcadeGame from './components/ArcadeGame.vue'
import AuthDialog from './components/AuthDialog.vue'
import { auth, loadAuth, logout, openAuth } from './composables/useAuth.js'

const logoutError = ref('')
const loggingOut = ref(false)
onMounted(loadAuth)
async function signOut() {
  loggingOut.value = true
  logoutError.value = ''
  try { await logout() } catch (error) { logoutError.value = error.message }
  finally { loggingOut.value = false }
}

const pages = [
  {
    id: 'accounts',
    title: '账号管理',
    icon: 'accounts',
    component: AccountList,
  },
  { id: 'tools/json', title: 'JSON 格式化', icon: 'code', component: JsonTool },
  { id: 'tools/diff', title: '文本对比', icon: 'compare', component: DiffTool },
  { id: 'tools/speed', title: '网速测试', icon: 'speed', component: SpeedTool },
  { id: 'tools/ai', title: 'AI 对话', icon: 'sparkles', component: AiChat },
  { id: 'games/snake', title: '贪吃蛇', icon: 'snake', component: SnakeGame, group: 'games' },
  { id: 'games/2048', title: '2048', icon: 'grid', component: ArcadeGame, props: { kind: '2048' }, group: 'games' },
  { id: 'games/sokoban', title: '推箱子', icon: 'box', component: ArcadeGame, props: { kind: 'sokoban' }, group: 'games' },
  { id: 'games/mines', title: '扫雷', icon: 'mine', component: ArcadeGame, props: { kind: 'mines' }, group: 'games' },
]
const mainPages = pages.filter((page) => page.group !== 'games')
const games = pages.filter((page) => page.group === 'games')
const gamesExpanded = ref(false)
const hash = ref(location.hash)
const current = computed(
  () =>
    pages.find((page) => page.id === hash.value.replace(/^#\/?/, '')) ||
    pages[0],
)
function syncHash() {
  hash.value = location.hash
}
window.addEventListener('hashchange', syncHash)
onUnmounted(() => window.removeEventListener('hashchange', syncHash))
watch(
  current,
  (page) => {
    document.title = `${page.title} · DevHub`
    if (page.group === 'games') gamesExpanded.value = true
  },
  { immediate: true },
)
</script>

<template>
  <div class="workspace">
    <aside class="sidebar">
      <a class="brand" href="#/accounts" aria-label="DevHub 首页">
        <span class="brand-symbol"><AppIcon name="grid" :size="19" /></span>
        <span>DevHub<span class="brand-dot">.</span></span>
      </a>
      <nav aria-label="主导航">
        <template v-for="(page, index) in mainPages" :key="page.id">
          <p
            v-if="index < 2"
            class="nav-heading"
            :class="{ 'tools-heading': index === 1 }"
          >
            {{ index === 0 ? '资产管理' : '开发工具' }}
          </p>
          <a
            class="nav-item"
            :class="{ active: current.id === page.id }"
            :href="`#/${page.id}`"
            :aria-current="current.id === page.id ? 'page' : undefined"
          >
            <AppIcon :name="page.icon" :size="19" /><span>{{
              page.title
            }}</span>
            <span v-if="current.id === page.id" class="nav-dot"></span>
          </a>
        </template>
        <div class="nav-game-group">
          <button
            class="nav-item nav-group-toggle"
            :class="{ 'group-active': current.group === 'games' }"
            type="button"
            :aria-expanded="gamesExpanded"
            aria-controls="game-navigation"
            @click="gamesExpanded = !gamesExpanded"
          >
            <AppIcon name="game" :size="19" /><span>小游戏</span>
            <AppIcon class="nav-group-chevron" :class="{ expanded: gamesExpanded }" name="chevron" :size="15" />
          </button>
          <div v-show="gamesExpanded" id="game-navigation" class="nav-children">
            <a
              v-for="game in games"
              :key="game.id"
              class="nav-item"
              :class="{ active: current.id === game.id }"
              :href="`#/${game.id}`"
              :aria-current="current.id === game.id ? 'page' : undefined"
            >
              <AppIcon :name="game.icon" :size="18" /><span>{{ game.title }}</span>
              <span v-if="current.id === game.id" class="nav-dot"></span>
            </a>
          </div>
        </div>
      </nav>
      <div class="sidebar-bottom">
        <div class="workspace-avatar">我</div>
        <strong>我的工作空间</strong>
      </div>
    </aside>
    <div class="main-shell">
      <header class="topbar">
        <div class="breadcrumb">
          <span>工作空间</span><AppIcon name="chevron" :size="13" /><strong>{{
            current.title
          }}</strong>
        </div>
        <div class="auth-controls">
          <span v-if="logoutError" role="alert">{{ logoutError }}</span>
          <template v-if="auth.user">
            <strong>{{ auth.user.username }}</strong>
            <button type="button" class="button button-outline" :disabled="loggingOut" @click="signOut">退出登录</button>
          </template>
          <template v-else>
            <button type="button" class="button button-outline" :disabled="!auth.ready" @click="openAuth()">登录</button>
            <button type="button" class="button button-primary" :disabled="!auth.ready" @click="openAuth('register')">注册</button>
          </template>
        </div>
      </header>
      <KeepAlive><component :is="current.component" :key="current.id" v-bind="current.props || {}" /></KeepAlive>
    </div>
    <AuthDialog />
  </div>
</template>

<style scoped>
.auth-controls { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 10px; }
.auth-controls strong { overflow-wrap: anywhere; }
.auth-controls > span { color: #a73b2b; font-size: 12px; }
.auth-controls .button { padding: 7px 13px; }
@media (max-width: 800px) {
  .topbar { display: flex; height: auto; min-height: 60px; padding: 12px 16px; justify-content: flex-end; }
  .breadcrumb { display: none; }
}
</style>
