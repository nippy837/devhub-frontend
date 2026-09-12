<script setup>
import { computed, ref, watch } from 'vue'
import { useToolTask } from '../composables/useToolTask'

const left = ref('')
const right = ref('')
const ignoreWhitespace = ref(false)
const onlyChanges = ref(false)
const result = ref(null)
const { busy, error, run, cancel } = useToolTask()
watch(
  [left, right, ignoreWhitespace],
  () => {
    cancel()
    result.value = null
    error.value = ''
  },
  { flush: 'sync' },
)
const rows = computed(() =>
  (result.value?.rows || []).filter(
    (row) => !onlyChanges.value || row.kind !== 'equal',
  ),
)
const identical = computed(
  () =>
    result.value &&
    Object.values(result.value.counts).every((count) => count === 0),
)
function compare() {
  result.value = null
  run('diff', [left.value, right.value, ignoreWhitespace.value], (value) => {
    result.value = value
  })
}
function swap() {
  ;[left.value, right.value] = [right.value, left.value]
}
function clear() {
  cancel()
  left.value = ''
  right.value = ''
  result.value = null
  error.value = ''
}
</script>

<template>
  <main class="tool-page">
    <section class="page-heading">
      <h1>文本对比</h1>
      <span class="muted">本地处理，不上传内容</span>
    </section>
    <section class="tool-panel" aria-label="文本编辑器" :aria-busy="busy">
      <div class="tool-actions">
        <button class="button button-primary" :disabled="busy" @click="compare">
          {{ busy ? '对比中…' : '开始对比' }}
        </button>
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
      <div class="editor-grid diff-inputs">
        <div class="editor-pane">
          <div class="editor-heading">
            <label for="diff-left">原始文本</label
            ><span class="muted">{{ left.length }} 字符</span>
          </div>
          <textarea
            id="diff-left"
            v-model="left"
            class="code-editor"
            spellcheck="false"
            autocapitalize="off"
            autocomplete="off"
            placeholder="粘贴原始文本"
          ></textarea>
        </div>
        <div class="editor-pane">
          <div class="editor-heading">
            <label for="diff-right">修改后文本</label
            ><span class="muted">{{ right.length }} 字符</span>
          </div>
          <textarea
            id="diff-right"
            v-model="right"
            class="code-editor"
            spellcheck="false"
            autocapitalize="off"
            autocomplete="off"
            placeholder="粘贴修改后的文本"
          ></textarea>
        </div>
      </div>
    </section>
    <section v-if="result" class="tool-panel diff-result" aria-label="对比结果">
      <div class="diff-summary" role="status">
        <h2>对比结果</h2>
        <span v-if="identical" class="diff-success">{{
          ignoreWhitespace ? '文本一致（忽略行首尾空白）' : '文本一致'
        }}</span>
        <template v-else
          ><span class="diff-success">+ {{ result.counts.added }} 新增</span
          ><span class="diff-deleted">− {{ result.counts.removed }} 删除</span
          ><span>~ {{ result.counts.changed }} 修改</span></template
        >
        <label class="tool-checkbox"
          ><input v-model="onlyChanges" type="checkbox" />只看差异</label
        >
      </div>
      <div
        v-if="rows.length"
        class="diff-scroll"
        tabindex="0"
        aria-label="逐行对比，左右分别为原始和修改后文本"
      >
        <div class="diff-columns">
          <strong>原始文本</strong><strong>修改后文本</strong>
        </div>
        <div
          v-for="(row, index) in rows"
          :key="index"
          class="diff-row"
          :class="`diff-${row.kind}`"
        >
          <div
            v-for="side in ['left', 'right']"
            :key="side"
            class="diff-cell"
            :class="[side, { 'empty-cell': !row[side] }]"
          >
            <template v-if="row[side]">
              <span class="line-number">{{ row[side].number }}</span
              ><span
                class="line-sign"
                :aria-label="
                  row.kind === 'equal'
                    ? '未变'
                    : side === 'left'
                      ? '删除'
                      : '新增'
                "
                >{{
                  row.kind === 'equal' ? ' ' : side === 'left' ? '−' : '+'
                }}</span
              >
              <code
                ><template
                  v-for="(segment, segmentIndex) in row[side].segments"
                  :key="segmentIndex"
                  ><span :class="{ 'changed-text': segment.changed }">{{
                    segment.text
                  }}</span></template
                ><span v-if="row[side].text === ''" class="muted"
                  >（空行）</span
                ></code
              >
            </template>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>
