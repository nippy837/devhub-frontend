<script setup>
import { computed, nextTick, onActivated, onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import { auth, openAuth } from '../composables/useAuth.js'
import { aiRequest, conversationContext } from '../api/ai.js'
import { copyText } from '../utils/clipboard.js'

const messages = ref([])
const draft = ref('')
const busy = ref(false)
const error = ref('')
const notice = ref('')
const status = ref(null)
const statusError = ref('')
const checking = ref(false)
const transcript = ref(null)
const input = ref(null)
let activeRequest = null
let statusRequest = null
const unresolved = computed(() => messages.value.at(-1)?.role === 'user')
const canSend = computed(() => auth.user && status.value?.configured && !busy.value && !unresolved.value && draft.value.trim())
const prompts = [
  { icon: 'code', title: '解释一段代码', text: '请帮我解释下面这段代码的作用，并指出可能的问题：\n' },
  { icon: 'flask', title: '一起排查问题', text: '我遇到了一个问题，请帮我梳理排查步骤：\n' },
  { icon: 'compare', title: '比较技术方案', text: '请从适用场景、优缺点和实现成本比较下面两种方案：\n' },
]

async function checkStatus() {
  statusRequest?.abort()
  const controller = new AbortController()
  statusRequest = controller
  checking.value = true
  statusError.value = ''
  try { status.value = await aiRequest('status', { signal: controller.signal, timeoutMs: 10000 }) }
  catch (failure) { if (!controller.signal.aborted) { status.value = null; statusError.value = failure.message } }
  finally { if (statusRequest === controller) checking.value = false }
}
onActivated(checkStatus)
async function scrollDown() {
  await nextTick()
  if (transcript.value) transcript.value.scrollTop = transcript.value.scrollHeight
}
watch(() => [messages.value.length, busy.value, error.value], scrollDown)
watch(() => auth.user?.id, () => { newChat(); checkStatus() })
onBeforeUnmount(() => { activeRequest?.abort(); statusRequest?.abort() })

function stop() {
  activeRequest?.abort()
  activeRequest = null
  busy.value = false
  error.value = '已取消等待。服务端可能仍在处理，请稍后再重试。'
}
function newChat() {
  activeRequest?.abort()
  activeRequest = null
  busy.value = false
  messages.value = []
  draft.value = ''
  error.value = ''
  notice.value = ''
}
async function send() {
  if (!canSend.value) return
  messages.value.push({ role: 'user', content: draft.value.trim() })
  draft.value = ''
  await requestAnswer()
}
async function requestAnswer() {
  if (busy.value || !unresolved.value || !auth.user) return
  error.value = ''
  notice.value = ''
  busy.value = true
  const controller = new AbortController()
  activeRequest = controller
  try {
    const response = await aiRequest('chat', { messages: conversationContext(messages.value), signal: controller.signal })
    if (activeRequest !== controller) return
    messages.value.push({ role: 'assistant', content: response.content, truncated: response.truncated })
  } catch (failure) {
    if (activeRequest !== controller) return
    error.value = failure.message
    if (failure.status === 401) openAuth()
    if (failure.status === 503) checkStatus()
  } finally {
    if (activeRequest === controller) { busy.value = false; activeRequest = null; await nextTick(); input.value?.focus() }
  }
}
function editQuestion() {
  if (busy.value || !unresolved.value) return
  draft.value = messages.value.pop().content
  error.value = ''
  input.value?.focus()
}
function choosePrompt(text) { draft.value = text; input.value?.focus() }
function onKeydown(event) {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && event.keyCode !== 229) {
    event.preventDefault()
    send()
  }
}
async function copyAnswer(text) {
  try { await copyText(text); notice.value = '回答已复制' }
  catch { notice.value = '复制失败，请选中文本手动复制' }
}
</script>

<template>
  <main class="tool-page ai-page">
    <div class="page-heading">
      <div><h1>AI 对话<span class="title-dot">.</span></h1><p class="page-description">从一个问题开始，让思路更清晰。</p></div>
      <button class="button button-outline" type="button" :disabled="!messages.length && !draft" @click="newChat"><AppIcon name="plus" :size="16" />新建对话</button>
    </div>

    <section class="chat-panel" aria-label="AI 对话">
      <header class="chat-heading">
        <div class="assistant-identity"><span class="assistant-logo"><AppIcon name="sparkles" :size="21" /></span><div><strong>DevHub AI</strong><p>{{ status?.configured ? status.model : '你的开发助手' }}</p></div></div>
        <span class="chat-status"><i :class="{ ready: status?.configured }"></i>{{ checking ? '检查连接中' : status?.configured ? '已配置' : '尚未就绪' }}</span>
      </header>

      <div v-if="statusError || (status && !status.configured)" class="chat-banner" role="status">
        <span>{{ statusError || 'AI 服务尚未配置，请联系管理员配置后使用。' }}</span>
        <button type="button" :disabled="checking" @click="checkStatus">重新检查</button>
      </div>
      <div v-if="auth.ready && !auth.user" class="chat-banner login-banner"><span>登录后即可开始对话。</span><button type="button" @click="openAuth()">去登录 <span aria-hidden="true">→</span></button></div>

      <div ref="transcript" class="chat-transcript" role="log" aria-label="对话记录" aria-live="polite" :aria-busy="busy" tabindex="0">
        <div v-if="!messages.length" class="chat-welcome">
          <span class="welcome-logo"><AppIcon name="sparkles" :size="32" /></span>
          <h2>今天想一起解决什么？</h2>
          <p>解释代码、整理思路，或聊聊你的下一个想法。</p>
          <div class="prompt-grid"><button v-for="prompt in prompts" :key="prompt.title" type="button" @click="choosePrompt(prompt.text)"><AppIcon :name="prompt.icon" :size="20" /><strong>{{ prompt.title }}</strong><span aria-hidden="true">↗</span></button></div>
        </div>
        <article v-for="(message, index) in messages" :key="index" class="chat-message" :class="message.role">
          <span class="message-avatar"><AppIcon v-if="message.role === 'assistant'" name="sparkles" :size="18" /><AppIcon v-else name="player" :size="18" /></span>
          <div class="message-main"><strong class="message-name">{{ message.role === 'user' ? '你' : 'DevHub AI' }}</strong><div class="message-text">{{ message.content }}</div>
            <p v-if="message.truncated" class="truncated-note">回答达到长度限制，可以继续追问。</p>
            <button v-if="message.role === 'assistant'" class="copy-answer" type="button" @click="copyAnswer(message.content)"><AppIcon name="copy" :size="13" />复制回答</button>
          </div>
        </article>
        <div v-if="busy" class="thinking" role="status"><AppIcon name="sparkles" :size="18" /><span>正在思考，请稍候…</span><span class="thinking-dots" aria-hidden="true">•••</span></div>
      </div>

      <div v-if="error" class="chat-error" role="alert"><p>{{ error }}</p><div v-if="unresolved && !busy"><button type="button" :disabled="!auth.user || !status?.configured" @click="requestAnswer">重试</button><button type="button" @click="editQuestion">编辑问题</button></div></div>
      <form class="chat-composer" @submit.prevent="send">
        <label class="sr-only" for="ai-question">输入你的问题</label>
        <textarea id="ai-question" ref="input" v-model="draft" rows="3" maxlength="4000" :disabled="busy || unresolved" placeholder="输入你的问题，或粘贴一段代码…" @keydown="onKeydown"></textarea>
        <div class="composer-actions"><span>{{ draft.length }} / 4000<span class="keyboard-hint"> · Enter 发送，Shift + Enter 换行</span></span><button v-if="busy" class="button button-outline" type="button" @click="stop">取消等待</button><button v-else class="button button-primary" type="submit" :disabled="!canSend">发送<AppIcon name="arrow" :size="17" /></button></div>
      </form>
      <footer class="chat-footnote">对话仅保留在当前页面，刷新或退出登录后清空。发送时携带最近最多 10 轮对话。</footer>
    </section>
    <p class="copy-notice" role="status">{{ notice }}</p>
  </main>
</template>

<style scoped>
.ai-page { max-width: 1400px; }
.chat-panel { background: #fff; border: 1px solid var(--border); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px #273b3404; }
.chat-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 20px 26px; border-bottom: 1px solid var(--border); }
.assistant-identity { display: flex; align-items: center; gap: 12px; min-width: 0; }
.assistant-identity strong { font-size: 15px; }
.assistant-identity p { font-size: 12px; color: #849089; overflow-wrap: anywhere; }
.assistant-logo, .welcome-logo { display: grid; place-items: center; color: var(--green); background: #edf5f0; border: 1px solid #e0ece5; border-radius: 12px; width: 42px; height: 42px; flex-shrink: 0; }
.chat-status { display: flex; align-items: center; gap: 7px; font-size: 12px; color: #74837a; flex-shrink: 0; }
.chat-status i { width: 6px; height: 6px; border-radius: 50%; background: #b4beb8; }
.chat-status i.ready { background: #27825f; }
.chat-banner { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 26px; background: #fff8ec; color: #876223; font-size: 13px; }
.chat-banner button, .chat-error button { background: transparent; border: 0; color: inherit; text-decoration: underline; white-space: nowrap; padding: 4px; }
.login-banner { background: #eff6f2; color: var(--green); }
.chat-transcript { height: clamp(340px, 48vh, 650px); overflow-y: auto; padding: 28px; scrollbar-gutter: stable; }
.chat-transcript:focus-visible { outline: 2px solid #84bda7; outline-offset: -2px; }
.chat-welcome { min-height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 24px 0; }
.welcome-logo { height: 66px; width: 66px; border-radius: 21px; margin-bottom: 22px; }
.chat-welcome h2 { font-size: clamp(20px, 2.5vw, 27px); font-weight: 600; letter-spacing: -.5px; }
.chat-welcome > p { color: #849089; margin-top: 10px; }
.prompt-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; width: 100%; max-width: 660px; margin-top: 34px; }
.prompt-grid button { display: flex; align-items: center; gap: 10px; text-align: left; border: 1px solid var(--border); border-radius: 10px; padding: 17px 13px; background: #fcfdfc; color: #577065; }
.prompt-grid button:hover { border-color: #b8d3c4; background: #f1f7f3; }
.prompt-grid strong { font-weight: 500; font-size: 13px; }
.prompt-grid button > span { margin-left: auto; color: #9ba9a1; }
.chat-message { display: flex; gap: 12px; margin-bottom: 28px; }
.message-avatar { height: 32px; width: 32px; display: grid; place-items: center; border-radius: 10px; background: #edf5f0; color: var(--green); flex-shrink: 0; }
.message-main { min-width: 0; flex: 1; }
.message-name { display: block; font-size: 12px; margin: 6px 0 10px; color: #718278; font-weight: 500; }
.message-text { white-space: pre-wrap; overflow-wrap: anywhere; line-height: 1.85; font-size: 14px; }
.user .message-text { background: #f3f6f4; border-radius: 0 12px 12px; padding: 13px 17px; display: inline-block; max-width: 100%; }
.user .message-avatar { background: #f0f2f1; color: #75877d; }
.copy-answer { display: inline-flex; gap: 6px; align-items: center; margin-top: 12px; border: 0; background: none; padding: 3px 0; color: #849089; font-size: 12px; }
.copy-answer:hover { color: var(--green); }
.truncated-note { margin-top: 8px; color: #9b6800; font-size: 12px; }
.thinking { display: flex; align-items: center; gap: 12px; color: #72877b; font-size: 13px; padding: 4px 0 18px; }
.thinking-dots { letter-spacing: 3px; animation: breathe 1.2s ease-in-out infinite alternate; }
@keyframes breathe { to { opacity: .3; } }
.chat-error { margin: 0 26px 16px; padding: 12px 16px; border-radius: 8px; background: #fff1ee; color: #a73b2b; }
.chat-error > div { display: flex; gap: 16px; margin-top: 6px; }
.chat-composer { border: 1px solid #dce6df; border-radius: 12px; margin: 0 26px; overflow: hidden; }
.chat-composer:focus-within { border-color: #84bda7; box-shadow: 0 0 0 3px #176b5108; }
.chat-composer textarea { display: block; font: inherit; line-height: 1.7; width: 100%; min-height: 100px; max-height: 260px; resize: vertical; border: 0; outline: none; padding: 17px 18px 4px; color: #273b34; background: transparent; }
.chat-composer textarea::placeholder { color: #9aa69e; }
.composer-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 14px; }
.composer-actions > span { font-size: 11px; color: #91a097; }
.composer-actions .button { padding: 8px 17px; }
.chat-footnote { padding: 14px 26px 20px; text-align: center; color: #97a39b; font-size: 11px; }
.copy-notice { min-height: 24px; margin-top: 10px; color: var(--green); text-align: center; font-size: 12px; }
@media (max-width: 650px) {
  .chat-heading { padding: 17px; }
  .chat-transcript { padding: 20px 16px; height: 440px; }
  .prompt-grid { grid-template-columns: 1fr; gap: 8px; margin-top: 24px; }
  .prompt-grid button { padding: 12px 15px; }
  .chat-welcome { padding: 12px 0; }
  .chat-composer { margin-inline: 12px; }
  .chat-banner { padding-inline: 16px; }
  .chat-error { margin-inline: 12px; }
  .keyboard-hint { display: none; }
}
</style>
