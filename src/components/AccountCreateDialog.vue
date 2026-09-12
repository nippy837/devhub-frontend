<script setup>
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import { createAccount } from '../api/accounts'
import AppIcon from './AppIcon.vue'

const emit = defineEmits(['close', 'created'])
const dialog = ref(null)
const saving = ref(false)
const error = ref('')
const form = reactive({
  systemName: '',
  environment: 'test',
  username: '',
  password: '',
  loginUrl: '',
  remark: '',
})
let controller

function close() {
  if (!saving.value) emit('close')
}

async function submit() {
  if (saving.value) return
  error.value = ''
  if (!form.systemName.trim() || !form.username.trim()) {
    error.value = '系统名称和用户名不能为空'
    return
  }
  if (form.loginUrl.trim()) {
    try {
      const url = new URL(form.loginUrl.trim())
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password
      )
        throw new Error()
    } catch {
      error.value = '请输入有效的 http:// 或 https:// 登录地址'
      return
    }
  }

  saving.value = true
  controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)
  try {
    await createAccount(
      {
        ...form,
        systemName: form.systemName.trim(),
        username: form.username.trim(),
        loginUrl: form.loginUrl.trim(),
      },
      controller.signal,
    )
    emit('created')
  } catch (cause) {
    error.value =
      cause.name === 'AbortError' || cause instanceof TypeError
        ? '连接中断或超时，请刷新列表确认是否已保存后再重试。'
        : cause.message
  } finally {
    clearTimeout(timeout)
    saving.value = false
  }
}

onMounted(() => dialog.value.showModal())
onUnmounted(() => controller?.abort())
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="account-dialog"
      aria-labelledby="create-title"
      @cancel.prevent="close"
      @click="
        (event) => {
          if (event.target === dialog) close()
        }
      "
    >
      <header class="dialog-heading">
        <h2 id="create-title">新增账号</h2>
        <button
          type="button"
          class="icon-button"
          aria-label="关闭新增账号"
          :disabled="saving"
          @click="close"
        >
          <AppIcon name="close" />
        </button>
      </header>
      <form @submit.prevent="submit">
        <fieldset :disabled="saving" class="account-form">
          <div class="form-field">
            <label for="create-system"
              >系统名称 <span aria-hidden="true">*</span></label
            >
            <input
              id="create-system"
              v-model="form.systemName"
              required
              maxlength="100"
              autocomplete="off"
              autofocus
            />
          </div>
          <div class="form-field">
            <label for="create-environment"
              >环境 <span aria-hidden="true">*</span></label
            >
            <select id="create-environment" v-model="form.environment" required>
              <option value="dev">开发环境</option>
              <option value="test">测试环境</option>
              <option value="prod">生产环境</option>
            </select>
          </div>
          <div class="form-field">
            <label for="create-username"
              >用户名 <span aria-hidden="true">*</span></label
            >
            <input
              id="create-username"
              v-model="form.username"
              required
              maxlength="100"
              autocomplete="off"
              spellcheck="false"
            />
          </div>
          <div class="form-field">
            <label for="create-password">密码</label>
            <input
              id="create-password"
              v-model="form.password"
              type="text"
              maxlength="4096"
              autocomplete="off"
              spellcheck="false"
            />
          </div>
          <div class="form-field full-width">
            <label for="create-url">登录地址</label>
            <input
              id="create-url"
              v-model="form.loginUrl"
              type="url"
              maxlength="500"
              placeholder="https://"
              autocomplete="off"
            />
          </div>
          <div class="form-field full-width">
            <label for="create-remark">备注</label>
            <textarea
              id="create-remark"
              v-model="form.remark"
              maxlength="500"
              rows="3"
            ></textarea>
          </div>
        </fieldset>
        <p v-if="error" class="form-error" role="alert">{{ error }}</p>
        <footer class="dialog-actions">
          <button
            type="button"
            class="button button-outline"
            :disabled="saving"
            @click="close"
          >
            取消
          </button>
          <button
            type="submit"
            class="button button-primary"
            :disabled="saving"
          >
            {{ saving ? '保存中…' : '保存账号' }}
          </button>
        </footer>
      </form>
    </dialog>
  </Teleport>
</template>

<style scoped>
.account-dialog {
  width: min(600px, calc(100% - 32px));
  max-height: calc(100dvh - 40px);
  margin: auto;
  padding: 0;
  border: 1px solid #dfe7e1;
  border-radius: 14px;
  color: #273b34;
  background: #fff;
  box-shadow: 0 24px 80px #16352726;
}
.account-dialog::backdrop {
  background: #152b244d;
  backdrop-filter: blur(3px);
}
.dialog-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22px 26px;
  border-bottom: 1px solid var(--border);
}
.account-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  border: 0;
  margin: 0;
  padding: 24px 26px;
  min-width: 0;
}
.form-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}
.full-width {
  grid-column: 1 / -1;
}
.form-field label {
  font-size: 14px;
  font-weight: 500;
}
.form-field label span {
  color: #ad5e4b;
}
.form-field input,
.form-field select,
.form-field textarea {
  width: 100%;
  border: 1px solid #dce5de;
  border-radius: 7px;
  padding: 10px 12px;
  background: #fcfdfc;
  color: #273b34;
  font: inherit;
  font-size: 14px;
  line-height: 1.5;
}
.form-field textarea {
  resize: vertical;
  min-height: 90px;
}
.form-field input:focus,
.form-field select:focus,
.form-field textarea:focus {
  outline: 2px solid #b0d2bf;
  outline-offset: 1px;
  border-color: #659a7d;
}
.form-error {
  margin: 0 26px 20px;
  padding: 10px 12px;
  background: #fff3ed;
  color: #9b4e38;
  border-radius: 7px;
  font-size: 14px;
}
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 18px 26px;
  border-top: 1px solid var(--border);
}
@media (max-width: 500px) {
  .account-form {
    grid-template-columns: 1fr;
    padding: 20px;
    gap: 16px;
  }
  .dialog-heading,
  .dialog-actions {
    padding: 18px 20px;
  }
  .form-error {
    margin-inline: 20px;
  }
}
</style>
