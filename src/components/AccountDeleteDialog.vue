<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { deleteAccount } from '../api/accounts'

const props = defineProps({ account: { type: Object, required: true } })
const emit = defineEmits(['close', 'deleted'])
const dialog = ref(null)
const deleting = ref(false)
const error = ref('')
let controller

function close() {
  // 删除执行期间保持确认框可见，防止用户误以为关闭弹窗就撤销了删除。
  if (!deleting.value) emit('close')
}

async function confirmDelete() {
  // 删除确认框只负责请求与错误提示，列表刷新由父组件统一处理。
  if (deleting.value) return
  deleting.value = true
  error.value = ''
  controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    await deleteAccount(props.account.id, controller.signal)
    emit('deleted')
  } catch (cause) {
    // 超时可能发生在数据库删除之后，不能自动补发请求或把界面当作成功。
    error.value = cause.name === 'AbortError' || cause instanceof TypeError
      ? '连接中断或超时，请关闭弹窗并刷新列表，确认是否已删除后再重试。'
      : cause.message
  } finally {
    clearTimeout(timeout)
    deleting.value = false
  }
}

onMounted(() => dialog.value.showModal())
// 清理页面侧请求；服务端是否已经删除，需要重新查询才能确定。
onUnmounted(() => controller?.abort())
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="delete-dialog"
      aria-labelledby="delete-title"
      aria-describedby="delete-description"
      :aria-busy="deleting"
      @cancel.prevent="close"
    >
      <h2 id="delete-title">删除账号</h2>
      <p id="delete-description">确定删除以下账号记录吗？删除后无法恢复。</p>
      <dl class="delete-summary">
        <dt>所属系统</dt><dd>{{ account.systemName }}</dd>
        <dt>用户名</dt><dd>{{ account.username }}</dd>
        <dt>环境</dt><dd>{{ { dev: '开发环境', test: '测试环境', prod: '生产环境' }[account.environment] || account.environment }}</dd>
      </dl>
      <p v-if="error" class="delete-error" role="alert">{{ error }}</p>
      <div class="delete-actions">
        <button type="button" class="button button-outline" :disabled="deleting" autofocus @click="close">取消</button>
        <button type="button" class="button delete-confirm" :disabled="deleting" @click="confirmDelete">{{ deleting ? '删除中…' : '确认删除' }}</button>
      </div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.delete-dialog {
  width: min(460px, calc(100% - 32px));
  max-height: calc(100dvh - 40px);
  overflow-y: auto;
  margin: auto;
  padding: 26px;
  border: 1px solid #dfe7e1;
  border-radius: 14px;
  color: #273b34;
  background: #fff;
  box-shadow: 0 24px 80px #16352726;
}
.delete-dialog::backdrop { background: #152b244d; backdrop-filter: blur(3px); }
.delete-dialog h2 { margin: 0 0 14px; }
.delete-dialog p { font-size: 14px; line-height: 1.7; }
.delete-summary { display: grid; grid-template-columns: auto 1fr; gap: 10px 16px; padding: 16px; background: #f5f8f6; border-radius: 8px; font-size: 14px; }
.delete-summary dt { color: #687b72; }
.delete-summary dd { margin: 0; overflow-wrap: anywhere; }
.delete-error { background: #fff3ed; color: #9b4e38; padding: 10px 12px; border-radius: 7px; }
.delete-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; }
.delete-confirm { color: white; background: #a33d35; border: 1px solid #a33d35; }
.delete-confirm:hover:not(:disabled) { background: #892e28; }
</style>
