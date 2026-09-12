<script setup>
import { computed } from 'vue'
import { formatMeasurement, finiteMeasurement } from '../utils/speedMetrics'

const props = defineProps({
  title: String,
  description: String,
  value: { type: Number, default: null },
  maximum: { type: Number, default: 100 },
  active: Boolean,
  tone: String,
})
const percent = computed(() =>
  Math.min(100, Math.max(0, ((props.value ?? 0) / props.maximum) * 100)),
)
const ticks = computed(() =>
  [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const angle = Math.PI * ratio
    return {
      label: formatMeasurement(props.maximum * ratio, 1),
      x: 180 - 157 * Math.cos(angle),
      y: 177 - 157 * Math.sin(angle),
    }
  }),
)
const megabytes = computed(() =>
  finiteMeasurement(props.value) === null ? null : props.value / 8,
)
</script>

<template>
  <article
    class="speed-gauge"
    :class="[tone, { 'gauge-active': active }]"
    :aria-label="`${title}：${value === null ? '未测得' : formatMeasurement(value) + ' Mbps'}`"
  >
    <div class="gauge-heading">
      <h2>{{ title }}</h2>
      <span v-if="active" class="gauge-measuring">测量中</span>
    </div>
    <svg class="gauge-svg" viewBox="0 0 360 210" aria-hidden="true">
      <path class="gauge-track" d="M44 180 A136 136 0 0 1 316 180" />
      <path
        class="gauge-fill"
        d="M44 180 A136 136 0 0 1 316 180"
        pathLength="100"
        :stroke-dasharray="`${percent} 100`"
      />
      <text
        v-for="tick in ticks"
        :key="tick.label"
        :x="tick.x"
        :y="tick.y"
        text-anchor="middle"
      >
        {{ tick.label }}
      </text>
      <g
        class="gauge-needle"
        :style="{ transform: `rotate(${percent * 1.8}deg)` }"
      >
        <path d="M180 175 L68 180 L180 185 Z" />
      </g>
      <circle class="gauge-pivot" cx="180" cy="180" r="8" />
    </svg>
    <div class="gauge-reading">
      <strong>{{ formatMeasurement(value) }}</strong
      ><span>Mbps</span>
    </div>
    <div class="gauge-conversion">
      {{
        megabytes === null
          ? '等待测速'
          : `约 ${formatMeasurement(megabytes, 2)} MB/s`
      }}
    </div>
    <p>{{ description }}</p>
  </article>
</template>
