<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useToolTask } from '../composables/useToolTask'
import HighlightEditor from './HighlightEditor.vue'
import FileImport from './FileImport.vue'

const left = ref('')
const right = ref('')
const ignoreWhitespace = ref(false)
const result = ref(null)
const resetKey = ref(0)
const { busy, error, run, cancel } = useToolTask()
let debounce
watch(
  [left, right, ignoreWhitespace],
  () => {
    clearTimeout(debounce)
    cancel()
    result.value = null
    error.value = ''
    if (left.value === right.value) return
    debounce = setTimeout(() => {
      run(
        'diff',
        [left.value, right.value, ignoreWhitespace.value],
        (value) => {
          result.value = value
        },
      )
    }, 150)
  },
  { flush: 'sync' },
)
onUnmounted(() => clearTimeout(debounce))
const leftLines = computed(
  () =>
    result.value?.rows.filter((row) => row.left).map((row) => row.left) || [],
)
const rightLines = computed(
  () =>
    result.value?.rows.filter((row) => row.right).map((row) => row.right) || [],
)
function swap() {
  resetKey.value++
  ;[left.value, right.value] = [right.value, left.value]
}
function clear() {
  resetKey.value++
  left.value = ''
  right.value = ''
  clearTimeout(debounce)
  cancel()
  result.value = null
  error.value = ''
}
</script>

<template>
  <main class="tool-page">
    <section class="page-heading">
      <h1>文本对比</h1>
      <span class="muted">文件与内容仅在本地处理</span>
    </section>
    <section class="tool-panel" aria-label="文本编辑器" :aria-busy="busy">
      <div class="tool-actions">
        <button class="button button-outline" @click="swap">交换左右</button>
        <label class="tool-checkbox"
          ><input
            v-model="ignoreWhitespace"
            type="checkbox"
          />忽略行首尾空白</label
        >
        <button class="button button-outline tool-clear" @click="clear">
          清空
        </button>
      </div>
      <p v-if="error" class="tool-error" role="alert">{{ error }}</p>
      <div class="editor-grid live-diff-inputs">
        <div class="editor-pane">
          <div class="editor-heading">
            <label for="diff-left">左侧文本</label
            ><FileImport
              label="导入左侧文件"
              :max-characters="400000"
              :content="left"
              :reset-key="resetKey"
              @loaded="left = $event"
            />
          </div>
          <HighlightEditor
            id="diff-left"
            v-model="left"
            :lines="leftLines"
            placeholder="粘贴或导入文本，自动对比"
          />
        </div>
        <div class="editor-pane">
          <div class="editor-heading">
            <label for="diff-right">右侧文本</label
            ><FileImport
              label="导入右侧文件"
              :max-characters="400000"
              :content="right"
              :reset-key="resetKey"
              @loaded="right = $event"
            />
          </div>
          <HighlightEditor
            id="diff-right"
            v-model="right"
            :lines="rightLines"
            placeholder="粘贴或导入文本，自动对比"
          />
        </div>
      </div>
    </section>
  </main>
</template>
