<script setup>
import { ref, watch } from 'vue'
import { useToolTask } from '../composables/useToolTask'

const input = ref('')
const output = ref('')
const indent = ref(2)
const message = ref('')
const { busy, error, run, cancel } = useToolTask()
watch(
  input,
  () => {
    cancel()
    output.value = ''
    error.value = ''
    message.value = ''
  },
  { flush: 'sync' },
)
function process(compact = false) {
  output.value = ''
  message.value = ''
  run('json', [input.value, compact ? 0 : indent.value], (result) => {
    output.value = result
    message.value = compact ? '已压缩' : '格式正确'
  })
}
async function copy() {
  try {
    await navigator.clipboard.writeText(output.value)
    message.value = '已复制'
  } catch {
    message.value = '复制失败，请手动选择结果复制'
  }
}
function download() {
  const url = URL.createObjectURL(
    new Blob([output.value], { type: 'application/json;charset=utf-8' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = 'formatted.json'
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function clear() {
  cancel()
  input.value = ''
  output.value = ''
  error.value = ''
  message.value = ''
}
</script>

<template>
  <main class="tool-page">
    <section class="page-heading">
      <h1>JSON 格式化</h1>
      <span class="muted">本地处理，不上传内容</span>
    </section>
    <section class="tool-panel" aria-label="JSON 编辑器" :aria-busy="busy">
      <div class="tool-actions">
        <button
          class="button button-primary"
          :disabled="busy"
          @click="process()"
        >
          {{ busy ? '处理中…' : '格式化 / 校验' }}
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
        <button class="button button-outline tool-clear" @click="clear">
          清空
        </button>
      </div>
      <p v-if="error" class="tool-error" role="alert">{{ error }}</p>
      <p class="tool-message" role="status">{{ message }}</p>
      <div class="editor-grid">
        <div class="editor-pane">
          <div class="editor-heading">
            <label for="json-input">输入 JSON</label
            ><span class="muted">{{ input.length }} 字符</span>
          </div>
          <textarea
            id="json-input"
            v-model="input"
            class="code-editor"
            spellcheck="false"
            autocapitalize="off"
            autocomplete="off"
            placeholder='粘贴 JSON，例如 {"name":"DevHub"}'
          ></textarea>
        </div>
        <div class="editor-pane">
          <div class="editor-heading">
            <label for="json-output">结果</label>
            <div class="editor-buttons">
              <button :disabled="!output || busy" @click="copy">复制</button
              ><button :disabled="!output || busy" @click="download">
                下载
              </button>
            </div>
          </div>
          <textarea
            id="json-output"
            :value="output"
            class="code-editor"
            readonly
            spellcheck="false"
            placeholder="处理结果"
          ></textarea>
        </div>
      </div>
    </section>
  </main>
</template>
