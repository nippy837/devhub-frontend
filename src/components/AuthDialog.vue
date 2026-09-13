<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { auth, authenticate } from '../composables/useAuth.js'
import { validateAuthFields } from '../utils/authValidation.js'
import AppIcon from './AppIcon.vue'

const dialog = ref(null)
const usernameInput = ref(null), passwordInput = ref(null), confirmationInput = ref(null)
const username = ref('')
const password = ref('')
const confirmation = ref('')
const error = ref('')
const busy = ref(false)
const showPassword = ref(false), showConfirmation = ref(false)
const submitted = ref(false)
const touched = reactive({ username: false, password: false, confirmation: false })
const registering = computed(() => auth.mode === 'register')
const validation = computed(() => validateAuthFields({ username: username.value, password: password.value, confirmation: confirmation.value, registering: registering.value }))
const usernameError = computed(() => submitted.value || touched.username ? validation.value.username : '')
const passwordError = computed(() => submitted.value || touched.password ? validation.value.password : '')
const confirmationError = computed(() => submitted.value || (touched.confirmation && confirmation.value) ? validation.value.confirmation : '')
const confirmationMatches = computed(() => touched.confirmation && confirmation.value && !validation.value.confirmation && !validation.value.password)

function resetFeedback() {
  error.value = ''
  submitted.value = false
  Object.assign(touched, { username: false, password: false, confirmation: false })
  showPassword.value = false
  showConfirmation.value = false
  password.value = ''
  confirmation.value = ''
}

watch(() => auth.dialog, async (open) => {
  resetFeedback()
  if (open) {
    await nextTick()
    if (auth.dialog) dialog.value.showModal()
  } else dialog.value?.close()
})

function switchMode() {
  auth.mode = registering.value ? 'login' : 'register'
  resetFeedback()
}

function close() { if (!busy.value) auth.dialog = false }

async function submit() {
  if (busy.value) return
  error.value = ''
  submitted.value = true
  const firstInvalid = Object.keys(validation.value).find((field) => validation.value[field])
  if (firstInvalid) {
    await nextTick()
    const inputs = { username: usernameInput, password: passwordInput, confirmation: confirmationInput }
    inputs[firstInvalid].value?.focus()
    return
  }
  busy.value = true
  try { await authenticate(auth.mode, { username: username.value.trim(), password: password.value }) }
  catch (failure) { error.value = failure.message }
  finally { busy.value = false }
}
</script>

<template>
  <dialog ref="dialog" class="auth-dialog" aria-labelledby="auth-title" @cancel.prevent="close" @close="auth.dialog = false">
    <form novalidate @submit.prevent="submit" @input="error = ''">
      <div class="auth-heading">
        <h2 id="auth-title">{{ registering ? '注册账号' : '登录 DevHub' }}</h2>
        <button class="icon-button" type="button" aria-label="关闭登录窗口" :disabled="busy" @click="close"><AppIcon name="close" /></button>
      </div>
      <div class="auth-field">
        <label for="auth-username">用户名</label>
        <input id="auth-username" ref="usernameInput" v-model="username" name="username" autocomplete="username" autocapitalize="none" :spellcheck="false" required maxlength="24" placeholder="请输入用户名" :disabled="busy" :aria-invalid="Boolean(usernameError)" aria-describedby="auth-username-feedback" @blur="touched.username = true" />
        <p id="auth-username-feedback" class="auth-feedback" :class="{ 'is-error': usernameError }" aria-live="polite">
          <AppIcon v-if="usernameError" name="alert" :size="15" />
          <span>{{ usernameError || '3–24 位英文字母、数字或下划线' }}</span>
        </p>
      </div>
      <div class="auth-field">
        <label for="auth-password">密码</label>
        <div class="auth-password-field">
          <input id="auth-password" ref="passwordInput" v-model="password" name="password" :type="showPassword ? 'text' : 'password'" :autocomplete="registering ? 'new-password' : 'current-password'" required maxlength="128" placeholder="请输入 8–128 位密码" :disabled="busy" :aria-invalid="Boolean(passwordError)" :aria-describedby="passwordError ? 'auth-password-feedback' : undefined" @blur="touched.password = true" />
          <button type="button" class="auth-password-toggle" :aria-label="showPassword ? '隐藏密码' : '显示密码'" :title="showPassword ? '隐藏密码' : '显示密码'" :aria-pressed="showPassword" aria-controls="auth-password" :disabled="busy" @pointerdown.prevent @click="showPassword = !showPassword"><AppIcon :name="showPassword ? 'eye-off' : 'eye'" :size="20" /></button>
        </div>
        <p v-if="passwordError" id="auth-password-feedback" class="auth-feedback is-error" aria-live="polite"><AppIcon name="alert" :size="15" /><span>{{ passwordError }}</span></p>
      </div>
      <div v-if="registering" class="auth-field">
        <label for="auth-confirmation">确认密码</label>
        <div class="auth-password-field">
          <input id="auth-confirmation" ref="confirmationInput" v-model="confirmation" name="confirmation" :type="showConfirmation ? 'text' : 'password'" autocomplete="new-password" required maxlength="128" placeholder="请再次输入密码" :disabled="busy" :aria-invalid="Boolean(confirmationError)" :class="{ 'is-match': confirmationMatches }" aria-describedby="auth-confirmation-feedback" @focus="touched.confirmation = true" />
          <button type="button" class="auth-password-toggle" :aria-label="showConfirmation ? '隐藏确认密码' : '显示确认密码'" :title="showConfirmation ? '隐藏确认密码' : '显示确认密码'" :aria-pressed="showConfirmation" aria-controls="auth-confirmation" :disabled="busy" @pointerdown.prevent @click="showConfirmation = !showConfirmation"><AppIcon :name="showConfirmation ? 'eye-off' : 'eye'" :size="20" /></button>
        </div>
        <p id="auth-confirmation-feedback" class="auth-feedback" :class="{ 'is-error': confirmationError, 'is-success': confirmationMatches }" aria-live="polite">
          <AppIcon v-if="confirmationError || confirmationMatches" :name="confirmationMatches ? 'check' : 'alert'" :size="15" />
          <span>{{ confirmationError || (confirmationMatches ? '两次密码一致' : '再次输入上面的密码，输入时会自动核对') }}</span>
        </p>
      </div>
      <p v-if="error" class="auth-error" role="alert"><AppIcon name="alert" :size="18" /><span>{{ error }}</span></p>
      <button type="submit" class="button button-primary auth-submit" :disabled="busy">{{ busy ? '请稍候…' : registering ? '注册并登录' : '登录' }}</button>
      <button type="button" class="auth-switch" :disabled="busy" @click="switchMode">{{ registering ? '已有账号？去登录' : '还没有账号？去注册' }}</button>
    </form>
  </dialog>
</template>

<style scoped>
.auth-dialog { width: min(420px, calc(100vw - 32px)); max-height: calc(100dvh - 32px); overflow-y: auto; padding: 28px; border: 1px solid var(--border); border-radius: 14px; color: #273b34; box-shadow: 0 20px 80px #152e3429; }
.auth-dialog::backdrop { background: #172b3466; }
.auth-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
.auth-field { margin-top: 18px; }
.auth-dialog label { display: block; font-weight: 500; margin-bottom: 8px; }
.auth-dialog input { width: 100%; min-height: 46px; border: 1px solid #dce5df; border-radius: 8px; padding: 11px 12px; background: #fcfdfc; color: inherit; transition: border-color .15s, box-shadow .15s; }
.auth-dialog input:focus-visible { outline: 2px solid #84bda7; outline-offset: 2px; }
.auth-dialog input[aria-invalid="true"] { border-color: #cc998d; background: #fffaf8; }
.auth-dialog input[aria-invalid="true"]:focus-visible { outline-color: #d7aca1; }
.auth-dialog input.is-match { border-color: #84bda7; }
.auth-password-field { position: relative; }
.auth-password-field input { padding-right: 52px; }
.auth-password-toggle { position: absolute; right: 3px; top: 50%; transform: translateY(-50%); display: grid; place-items: center; width: 42px; height: 40px; padding: 0; border: 0; border-radius: 7px; color: #72887a; background: transparent; cursor: pointer; }
.auth-password-toggle:hover, .auth-password-toggle[aria-pressed="true"] { color: #176b51; background: #edf5ef; }
.auth-password-toggle:focus-visible { outline: 2px solid #84bda7; outline-offset: -2px; }
.auth-password-toggle:disabled { cursor: default; opacity: .5; }
.auth-feedback { display: flex; align-items: flex-start; gap: 7px; min-height: 18px; margin-top: 8px; color: #819086; font-size: 12px; line-height: 1.5; }
.auth-feedback svg, .auth-error svg { flex-shrink: 0; margin-top: 1px; }
.auth-feedback.is-error { color: #a65a47; }
.auth-feedback.is-success { color: #217452; }
.auth-submit { margin-top: 24px; width: 100%; }
.auth-switch { display: block; margin: 18px auto 0; border: 0; background: none; color: var(--green); }
.auth-error { display: flex; align-items: flex-start; gap: 9px; color: #a65a47; padding: 12px 14px; background: #fff5ef; border: 1px solid #eddbd1; border-radius: 8px; margin-top: 18px; font-size: 13px; line-height: 1.6; }
@media (max-width: 480px) { .auth-dialog { padding: 24px 20px; }.auth-dialog input { font-size: 16px; } }
</style>
