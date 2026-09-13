<script setup>
import { computed, onDeactivated, onMounted, onUnmounted, ref } from 'vue'
import { getAccounts } from '../api/accounts'
import AppIcon from './AppIcon.vue'
import AccountFormDialog from './AccountFormDialog.vue'
import AccountDeleteDialog from './AccountDeleteDialog.vue'
import { copyText } from '../utils/clipboard.js'

const accounts = ref([])
const search = ref('')
const environment = ref('all')
const loading = ref(true)
const error = ref('')
const lastUpdated = ref('')
const toast = ref('')
const showFormDialog = ref(false)
const editingAccount = ref(null)
const deletingAccount = ref(null)
const environmentLabels = {
  dev: '开发环境',
  test: '测试环境',
  prod: '生产环境',
}
let requestController
let toastTimer

const environments = computed(() => [
  ...new Set(
    accounts.value.map((account) => account.environment).filter(Boolean),
  ),
])
const systemCount = computed(
  () =>
    new Set(accounts.value.map((account) => account.systemName).filter(Boolean))
      .size,
)
const testCount = computed(
  () =>
    accounts.value.filter((account) => account.environment === 'test').length,
)
// 当前搜索与环境筛选基于已加载列表，不额外请求后端，也没有服务端分页。
const filteredAccounts = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return accounts.value.filter((account) => {
    const matchesEnvironment =
      environment.value === 'all' || account.environment === environment.value
    const matchesSearch = [
      account.systemName,
      account.username,
      account.remark,
    ].some((value) =>
      String(value ?? '')
        .toLowerCase()
        .includes(keyword),
    )
    return matchesEnvironment && matchesSearch
  })
})

async function loadAccounts() {
  requestController?.abort()
  const controller = new AbortController()
  requestController = controller
  loading.value = true
  error.value = ''
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    const data = await getAccounts(controller.signal)
    // 连续刷新时，旧请求即使稍后返回，也不能覆盖最新一次请求的结果。
    if (requestController !== controller) return
    accounts.value = data
    if (
      environment.value !== 'all' &&
      !environments.value.includes(environment.value)
    ) {
      environment.value = 'all'
    }
    lastUpdated.value = new Date().toLocaleTimeString('zh-CN', {
      hour12: false,
    })
  } catch (cause) {
    if (requestController !== controller) return
    error.value =
      cause.name === 'AbortError'
        ? '请求超时，请检查后端服务后重试。'
        : cause instanceof TypeError
          ? '暂时无法连接服务，请检查网络后重试。'
          : cause.message
    accounts.value = []
  } finally {
    clearTimeout(timeout)
    if (requestController === controller) loading.value = false
  }
}

function resetFilters() {
  search.value = ''
  environment.value = 'all'
}

function openForm(account = null) {
  editingAccount.value = account
  showFormDialog.value = true
}

function showToast(message) {
  toast.value = message
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 2500)
}

async function handleSaved(editing) {
  showFormDialog.value = false
  editingAccount.value = null
  // 新增后清空筛选，便于找到新账号；编辑后保留用户正在查看的筛选条件。
  if (!editing) resetFilters()
  showToast(editing ? '账号已更新' : '账号已保存')
  await loadAccounts()
}

async function handleDeleted() {
  deletingAccount.value = null
  showToast('账号已删除')
  await loadAccounts()
}

async function copyAccountValue(value, label) {
  try {
    await copyText(value)
    toast.value = `${label}已复制`
  } catch {
    toast.value = `复制失败，请选中${label}手动复制`
  }
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
  }, 2500)
}

// 只允许正常网页地址，避免将非网页协议变成可点击链接。
function loginHref(value) {
  try {
    const url = new URL(value)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

function loginLabel(value) {
  try {
    return new URL(value).host
  } catch {
    return value || '未设置'
  }
}

function formatTime(value) {
  return value ? value.replace('T', ' ').slice(0, 16) : '—'
}

onMounted(loadAccounts)
// 页面由 KeepAlive 缓存，切换菜单不一定卸载，因此需要主动关闭传送到 body 的弹窗。
onDeactivated(() => {
  showFormDialog.value = false
  editingAccount.value = null
  deletingAccount.value = null
})
onUnmounted(() => {
  requestController?.abort()
  requestController = null
  clearTimeout(toastTimer)
})
</script>

<template>
  <main id="accounts">
    <section class="page-heading">
      <div>
        <h1>账号管理</h1>
        <p class="page-description">集中管理开发与测试账号</p>
      </div>
      <div class="page-actions">
        <button
          class="button button-outline"
          :disabled="loading"
          @click="loadAccounts"
        >
          <AppIcon name="refresh" :size="17" :class="{ spinning: loading }" />{{
            loading ? '正在加载' : '刷新列表'
          }}
        </button>
        <button class="button button-primary" @click="openForm()">
          新增账号
        </button>
      </div>
    </section>

    <section class="stats" aria-label="账号概览">
      <article class="stat-card">
        <div>
          <p>全部账号</p>
          <strong>{{ loading || error ? '—' : accounts.length }}</strong
          ><span>条账号记录</span>
        </div>
        <span class="stat-icon green"
          ><AppIcon name="accounts" :size="23"
        /></span>
      </article>
      <article class="stat-card">
        <div>
          <p>关联系统</p>
          <strong>{{ loading || error ? '—' : systemCount }}</strong
          ><span>个独立系统</span>
        </div>
        <span class="stat-icon blue"><AppIcon name="box" :size="23" /></span>
      </article>
      <article class="stat-card">
        <div>
          <p>测试账号</p>
          <strong>{{ loading || error ? '—' : testCount }}</strong
          ><span>条测试环境账号</span>
        </div>
        <span class="stat-icon amber"><AppIcon name="flask" :size="23" /></span>
      </article>
    </section>

    <section
      class="account-panel"
      aria-labelledby="list-heading"
      :aria-busy="loading"
    >
      <div class="panel-heading">
        <div>
          <h2 id="list-heading">
            账号列表
            <span class="count-badge">{{
              loading || error ? '—' : accounts.length
            }}</span>
          </h2>
        </div>
      </div>
      <div class="toolbar">
        <div class="search-field">
          <AppIcon name="search" :size="18" /><label
            class="sr-only"
            for="account-search"
            >搜索系统、用户名或备注</label
          ><input
            id="account-search"
            v-model="search"
            type="search"
            placeholder="搜索系统、用户名或备注…"
          /><button
            v-if="search"
            class="icon-button"
            aria-label="清空搜索"
            @click="search = ''"
          >
            <AppIcon name="close" :size="15" />
          </button>
        </div>
        <div class="environment-filter">
          <label for="environment">环境</label
          ><select id="environment" v-model="environment">
            <option value="all">全部环境</option>
            <option v-for="item in environments" :key="item" :value="item">
              {{ environmentLabels[item] || item }}
            </option>
          </select>
        </div>
      </div>

      <div v-if="loading" class="state-panel" role="status">
        <span class="loading-ring"></span>
        <h3>正在加载账号</h3>
        <p>请稍候，正在获取最新列表。</p>
      </div>
      <div v-else-if="error" class="state-panel" role="alert">
        <span class="state-icon error-icon"
          ><AppIcon name="alert" :size="27"
        /></span>
        <h3>暂时无法加载账号</h3>
        <p>{{ error }}</p>
        <button class="button button-outline" @click="loadAccounts">
          重新加载
        </button>
      </div>
      <div v-else-if="!filteredAccounts.length" class="state-panel">
        <span class="state-icon"
          ><AppIcon :name="accounts.length ? 'search' : 'accounts'" :size="28"
        /></span>
        <h3>
          {{ accounts.length ? '没有找到匹配的账号' : '还没有账号记录' }}
        </h3>
        <p>
          {{
            accounts.length
              ? '试试其他关键词，或调整环境筛选。'
              : '点击“新增账号”开始录入。'
          }}
        </p>
        <button
          v-if="accounts.length"
          class="button button-outline"
          @click="resetFilters"
        >
          清除筛选
        </button>
      </div>
      <div
        v-else
        class="table-scroll"
        tabindex="0"
        aria-label="账号列表，可横向滚动"
      >
        <table>
          <thead>
            <tr>
              <th scope="col">所属系统</th>
              <th scope="col">环境</th>
              <th scope="col">用户名</th>
              <th scope="col">密码</th>
              <th scope="col">登录地址</th>
              <th scope="col">备注</th>
              <th scope="col">更新时间</th>
              <th scope="col" class="account-actions-cell">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="account in filteredAccounts" :key="account.id">
              <td>
                <div class="system-cell">
                  <span class="system-avatar">{{
                    (account.systemName || '?').slice(0, 1).toUpperCase()
                  }}</span>
                  <div>
                    <strong>{{ account.systemName || '未命名系统' }}</strong
                    ><span class="record-id"
                      >编号 {{ String(account.id).padStart(3, '0') }}</span
                    >
                  </div>
                </div>
              </td>
              <td>
                <span
                  class="environment-badge"
                  :class="
                    ['dev', 'test', 'prod'].includes(account.environment)
                      ? account.environment
                      : 'other'
                  "
                  ><span></span
                  >{{
                    environmentLabels[account.environment] ||
                    account.environment ||
                    '未设置'
                  }}</span
                >
              </td>
              <td>
                <div class="username-cell">
                  <span class="mono">{{ account.username || '—' }}</span
                  ><button
                    v-if="account.username"
                    class="icon-button copy-button"
                    :aria-label="`复制用户名 ${account.username}`"
                    title="复制用户名"
                    @click="copyAccountValue(account.username, '用户名')"
                  >
                    <AppIcon name="copy" :size="15" />
                  </button>
                </div>
              </td>
              <td>
                <div class="username-cell">
                  <span class="mono password-value">{{ account.password || '—' }}</span>
                  <button
                    v-if="account.password"
                    type="button"
                    class="icon-button copy-button"
                    aria-label="复制密码"
                    title="复制密码"
                    @click="copyAccountValue(account.password, '密码')"
                  >
                    <AppIcon name="copy" :size="15" />
                  </button>
                </div>
              </td>
              <td>
                <a
                  v-if="loginHref(account.loginUrl)"
                  class="login-link"
                  :href="loginHref(account.loginUrl)"
                  target="_blank"
                  rel="noopener noreferrer"
                  :title="account.loginUrl"
                  >{{ loginLabel(account.loginUrl)
                  }}<AppIcon name="arrow" :size="15" /><span class="sr-only"
                    >（在新标签页打开）</span
                  ></a
                ><span v-else class="muted">{{
                  account.loginUrl ? '地址不可用' : '未设置'
                }}</span>
              </td>
              <td>
                <span class="remark" :title="account.remark || ''">{{
                  account.remark || '—'
                }}</span>
              </td>
              <td
                class="date-cell"
                :title="`创建时间：${formatTime(account.createTime)}`"
              >
                {{ formatTime(account.updateTime) }}
              </td>
              <td class="account-actions-cell">
                <div class="account-row-actions">
                  <button
                    type="button"
                    class="button button-outline"
                    :aria-label="`编辑账号 ${account.systemName} ${account.username}`"
                    @click="openForm(account)"
                  >编辑</button>
                  <button
                    type="button"
                    class="button button-outline account-delete-button"
                    :aria-label="`删除账号 ${account.systemName} ${account.username}`"
                    @click="deletingAccount = account"
                  >删除</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <footer class="table-footer">
        <span aria-live="polite">{{
          loading
            ? '正在获取数据…'
            : error
              ? '加载失败'
              : `${filteredAccounts.length}/${accounts.length}`
        }}</span
        ><span v-if="lastUpdated && !error && !loading" class="sync-time"
          ><span></span>更新于 {{ lastUpdated }}</span
        >
      </footer>
    </section>
    <footer class="page-footer">
      <span>个人开发工作空间</span>
    </footer>
  </main>
  <AccountFormDialog
    v-if="showFormDialog"
    :account="editingAccount"
    @close="showFormDialog = false; editingAccount = null"
    @saved="handleSaved"
  />
  <AccountDeleteDialog
    v-if="deletingAccount"
    :account="deletingAccount"
    @close="deletingAccount = null"
    @deleted="handleDeleted"
  />
  <div class="toast" role="status" aria-live="polite">
    <template v-if="toast"
      ><AppIcon name="check" :size="18" />{{ toast }}</template
    >
  </div>
</template>

<style scoped>
/* 表格较宽时固定操作列，用户不必横向滚动到最右侧才能编辑或删除。 */
.account-actions-cell {
  position: sticky;
  right: 0;
  z-index: 1;
  background: #fff;
  box-shadow: -5px 0 8px -6px #273b3455;
}
th.account-actions-cell {
  background: #f8faf8;
}
tr:hover td.account-actions-cell {
  background: #fcfdfb;
}
.account-row-actions {
  display: flex;
  gap: 8px;
  white-space: nowrap;
}
.account-row-actions .button {
  padding: 6px 10px;
  font-size: 13px;
}
.account-delete-button {
  color: #a03e37;
  border-color: #ebd2cf;
}
.account-delete-button:hover:not(:disabled) {
  background: #fff2ef;
}
</style>
