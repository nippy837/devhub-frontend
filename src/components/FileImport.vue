<script setup>
import { onUnmounted, ref, watch } from 'vue'
import { readTextFile } from '../utils/textFiles'

const props = defineProps({
  label: { type: String, required: true },
  accept: {
    type: String,
    default:
      'text/*,.json,.txt,.md,.csv,.log,.yaml,.yml,.xml,.js,.java,.sql,.html,.css,.diff,.patch',
  },
  maxCharacters: { type: Number, required: true },
  content: { type: String, default: '' },
  resetKey: { type: Number, default: 0 },
})
const emit = defineEmits(['loaded'])
const picker = ref(null)
const loading = ref(false)
const error = ref('')
let revision = 0
watch(
  [() => props.content, () => props.resetKey],
  () => {
    revision++
    loading.value = false
    error.value = ''
  },
  { flush: 'sync' },
)
onUnmounted(() => {
  revision++
})
async function importFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  const current = ++revision
  loading.value = true
  error.value = ''
  try {
    const text = await readTextFile(file, props.maxCharacters)
    if (current === revision) emit('loaded', text)
  } catch (reason) {
    if (current === revision) error.value = reason.message
  } finally {
    if (current === revision) loading.value = false
  }
}
</script>

<template>
  <div class="file-import">
    <button
      class="button button-outline"
      :disabled="loading"
      @click="picker.click()"
    >
      {{ loading ? '读取中…' : label }}
    </button>
    <input
      ref="picker"
      type="file"
      hidden
      :accept="accept"
      :aria-label="label"
      @change="importFile"
    />
    <span v-if="error" class="file-error" role="alert">{{ error }}</span>
  </div>
</template>
