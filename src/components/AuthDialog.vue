<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { auth, authenticate } from '../composables/useAuth.js'
import AppIcon from './AppIcon.vue'

const dialog = ref(null)
const username = ref('')
const password = ref('')
const confirmation = ref('')
const error = ref('')
const busy = ref(false)
const registering = computed(() => auth.mode === 'register')

watch(() => auth.dialog, async (open) => {
  if (open) {
    error.value = ''
    password.value = ''
    confirmation.value = ''
    await nextTick()
    dialog.value.showModal()
  } else dialog.value?.close()
})

function switchMode() {
  auth.mode = registering.value ? 'login' : 'register'
  error.value = ''
  password.value = ''
  confirmation.value = ''
}

function close() { if (!busy.value) auth.dialog = false }

async function submit() {
  if (busy.value) return
  error.value = ''
  if (registering.value && password.value !== confirmation.value) {
    error.value = '两次输入的密码不一致。'
    return
  }
  busy.value = true
  try { await authenticate(auth.mode, { username: username.value.trim(), password: password.value }) }
  catch (failure) { error.value = failure.message }
  finally { busy.value = false; password.value = ''; confirmation.value = '' }
}
</script>

<template>
  <dialog ref="dialog" class="auth-dialog" aria-labelledby="auth-title" @cancel.prevent="close" @close="auth.dialog = false">
    <form @submit.prevent="submit">
      <div class="auth-heading">
        <h2 id="auth-title">{{ registering ? '注册账号' : '登录 DevHub' }}</h2>
        <button class="icon-button" type="button" aria-label="关闭登录窗口" :disabled="busy" @click="close"><AppIcon name="close" /></button>
      </div>
      <label for="auth-username">用户名</label>
      <input id="auth-username" v-model="username" name="username" autocomplete="username" required minlength="3" maxlength="24" pattern="[a-zA-Z0-9_]{3,24}" placeholder="3–24 位字母、数字或下划线" :disabled="busy" />
      <label for="auth-password">密码</label>
      <input id="auth-password" v-model="password" name="password" type="password" :autocomplete="registering ? 'new-password' : 'current-password'" required minlength="8" maxlength="128" placeholder="8–128 位密码" :disabled="busy" />
      <template v-if="registering">
        <label for="auth-confirmation">确认密码</label>
        <input id="auth-confirmation" v-model="confirmation" name="confirmation" type="password" autocomplete="new-password" required minlength="8" maxlength="128" :disabled="busy" />
      </template>
      <p v-if="error" class="auth-error" role="alert">{{ error }}</p>
      <button type="submit" class="button button-primary auth-submit" :disabled="busy">{{ busy ? '请稍候…' : registering ? '注册并登录' : '登录' }}</button>
      <button type="button" class="auth-switch" :disabled="busy" @click="switchMode">{{ registering ? '已有账号？去登录' : '还没有账号？去注册' }}</button>
    </form>
  </dialog>
</template>

<style scoped>
.auth-dialog { width: min(420px, calc(100vw - 32px)); padding: 28px; border: 1px solid var(--border); border-radius: 14px; color: #273b34; box-shadow: 0 20px 80px #152e3429; }
.auth-dialog::backdrop { background: #172b3466; }
.auth-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
.auth-dialog label { display: block; font-weight: 500; margin: 16px 0 8px; }
.auth-dialog input { width: 100%; border: 1px solid #dce5df; border-radius: 7px; padding: 11px 12px; background: #fcfdfc; color: inherit; }
.auth-dialog input:focus-visible { outline: 2px solid #84bda7; outline-offset: 2px; }
.auth-submit { margin-top: 24px; width: 100%; }
.auth-switch { display: block; margin: 18px auto 0; border: 0; background: none; color: var(--green); }
.auth-error { color: #a73b2b; margin-top: 16px; }
</style>
