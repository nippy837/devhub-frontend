<script setup>
import { ref, watch } from 'vue'
import { useToolTask } from '../composables/useToolTask'
import { copyText } from '../utils/clipboard.js'
import FileImport from './FileImport.vue'

const input = ref('')
const indent = ref(2)
const message = ref('')
const resetKey = ref(0)
const { busy, error, run, cancel } = useToolTask()
watch(
  input,
  () => {
    cancel()
    error.value = ''
    message.value = ''
  },
  { flush: 'sync' },
)
function process(compact = false) {
  message.value = ''
  run('json', [input.value, compact ? 0 : indent.value], (result) => {
    input.value = result
  })
}
async function copy() {
  try {
    await copyText(input.value)
    message.value = '已复制'
  } catch {
    message.value = '复制失败，请手动选择内容复制'
  }
}
function download() {
  const url = URL.createObjectURL(
    new Blob([input.value], { type: 'application/json;charset=utf-8' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = 'formatted.json'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function clear() {
  resetKey.value++
  cancel()
  input.value = ''
  error.value = ''
  message.value = ''
}
</script>

<template>
  <main class="tool-page">
    <section class="page-heading">
      <h1>JSON 格式化</h1>
      <span class="muted">文件与内容仅在本地处理</span>
    </section>
    <section class="tool-panel" aria-label="JSON 编辑器" :aria-busy="busy">
      <div class="tool-actions">
        <button
          class="button button-primary"
          :disabled="busy"
          @click="process()"
        >
          {{ busy ? '处理中…' : '格式化' }}
        </button>
        <button
          class="button button-outline"
          :disabled="busy"
          @click="process(true)"
        >
          压缩
        </button>
        <label class="tool-select"
          >缩进<select v-model="indent">
            <option :value="2">2 空格</option>
            <option :value="4">4 空格</option>
          </select></label
        >
        <FileImport
          label="导入 JSON 文件"
          accept=".json,.txt,application/json,text/plain"
          :max-characters="2000000"
          :content="input"
          :reset-key="resetKey"
          @loaded="input = $event"
        />
        <button
          class="button button-outline"
          :disabled="!input || busy"
          @click="copy"
        >
          复制
        </button>
        <button
          class="button button-outline"
          :disabled="!input || busy"
          @click="download"
        >
          下载
        </button>
        <button class="button button-outline tool-clear" @click="clear">
          清空
        </button>
      </div>
      <p v-if="error" class="tool-error" role="alert">{{ error }}</p>
      <p class="tool-message" role="status">{{ message }}</p>
      <div class="editor-pane json-editor">
        <div class="editor-heading">
          <label for="json-input">JSON 内容</label
          ><span class="muted">{{ input.length }} 字符</span>
        </div>
        <textarea
          id="json-input"
          v-model="input"
          class="code-editor"
          spellcheck="false"
          autocapitalize="off"
          autocomplete="off"
          placeholder="粘贴或导入 JSON，点击上方格式化"
        ></textarea>
      </div>
    </section>
  </main>
</template>
