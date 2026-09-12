<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  id: { type: String, required: true },
  placeholder: String,
  lines: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue'])
const value = computed({
  get: () => props.modelValue,
  set: (text) => emit('update:modelValue', text),
})
const editor = ref(null)
const backdrop = ref(null)
const highlighted = computed(() =>
  props.lines.some((line) => line.segments.some((part) => part.changed)),
)
let observer
function syncScroll() {
  if (!editor.value || !backdrop.value) return
  backdrop.value.style.width = `${editor.value.clientWidth}px`
  backdrop.value.scrollTop = editor.value.scrollTop
  backdrop.value.scrollLeft = editor.value.scrollLeft
}
watch([() => props.modelValue, () => props.lines], () => nextTick(syncScroll), {
  flush: 'post',
})
onMounted(() => {
  observer = new ResizeObserver(syncScroll)
  observer.observe(editor.value)
  syncScroll()
})
onUnmounted(() => observer?.disconnect())
</script>

<template>
  <div class="highlight-editor" :class="{ 'has-highlights': highlighted }">
    <pre
      ref="backdrop"
      class="highlight-backdrop"
      aria-hidden="true"
    ><template v-for="(line, index) in lines" :key="index"><template v-for="(part, partIndex) in line.segments" :key="partIndex"><span :class="{ 'red-difference': part.changed, 'blank-difference': part.changed && !part.text }">{{ part.text }}</span></template>{{ index < lines.length - 1 ? '\n' : '' }}</template>{{ '\n' }}</pre>
    <textarea
      :id="id"
      ref="editor"
      v-model="value"
      class="code-editor"
      :placeholder="placeholder"
      spellcheck="false"
      autocapitalize="off"
      autocomplete="off"
      @scroll="syncScroll"
    ></textarea>
  </div>
</template>
