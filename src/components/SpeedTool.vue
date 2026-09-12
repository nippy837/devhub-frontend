<script setup>
import { computed, ref, watch } from 'vue'
import SpeedGauge from './SpeedGauge.vue'
import { websiteQuality } from '../utils/websiteQuality.js'
import { useSpeedTest } from '../composables/useSpeedTest'
import {
  formatMeasurement,
  gaugeMaximum,
  getStability,
} from '../utils/speedMetrics'

const defaultNodeName = import.meta.env.DEV ? '本地开发节点' : '北京 · DevHub'
const { state, start, stop } = useSpeedTest()
const websites = computed(() => state.value.websites.map((site) => ({ ...site, quality: websiteQuality(site) })))
const running = computed(() => state.value.status === 'running')
const maximum = ref(100)
watch(
  () => [state.value.download, state.value.upload],
  (values) => {
    maximum.value = Math.max(
      maximum.value,
      gaugeMaximum(Math.max(...values.map((value) => value ?? 0))),
    )
  },
)
function begin() {
  maximum.value = 100
  start()
}
const phaseNames = {
  websites: '测量常用网站访问耗时',
  connection: '连接测速节点',
  latency: '测量延迟',
  download: '测量下载速度',
  upload: '测量上传速度',
}
const statusText = computed(() => {
  if (running.value) return phaseNames[state.value.phase]
  return {
    idle: '准备就绪',
    complete: '测速完成',
    stopped: '已停止，保留部分结果',
    partial: '部分数据未测得，可以重测',
    error: '测速未完成',
  }[state.value.status]
})
const stability = computed(() =>
  getStability(
    state.value.jitter,
    state.value.latencyPoints.length,
    ['complete', 'partial'].includes(state.value.status),
  ),
)
const ms = (value) =>
  value === null ? '未测得' : `${formatMeasurement(value)} ms`
const points = computed(() => state.value.latencyPoints)
const chartMax = computed(() => Math.max(10, ...points.value))
const chartPath = computed(() =>
  points.value
    .map(
      (value, index) =>
        `${index === 0 ? 'M' : 'L'} ${12 + (index / Math.max(1, points.value.length - 1)) * 576} ${82 - (value / chartMax.value) * 64}`,
    )
    .join(' '),
)
const stabilityText = computed(() => {
  if (running.value) return '测量中'
  if (['stopped', 'error'].includes(state.value.status)) return '未完成'
  return stability.value.label
})
</script>

<template>
  <main class="tool-page speed-page">
    <section class="page-heading">
      <div>
        <h1>网速测试</h1>
        <p class="page-description">预计 30～60 秒，超过 90 秒自动结束。</p>
      </div>
      <button v-if="running" class="button button-outline" @click="stop">
        停止测速
      </button>
      <button v-else class="button button-primary" @click="begin">
        {{ state.status === 'idle' ? '开始测速' : '重新测速' }}
      </button>
    </section>
    <section class="speed-overview" aria-label="测速进度">
      <div class="speed-status">
        <span class="speed-status-dot" :class="{ 'is-running': running }"></span
        ><span role="status">{{ statusText }}</span
        ><span v-if="state.elapsed" class="muted"
          >{{ Math.floor(state.elapsed / 1000) }} 秒</span
        >
      </div>
      <span class="muted"
        >测速节点：{{ state.node || defaultNodeName }}</span
      >
    </section>
    <p v-if="state.error" class="speed-error" role="alert">{{ state.error }}</p>
    <div class="speed-gauges">
      <SpeedGauge
        title="下载速度"
        description="看视频、下载文件，主要看这个。"
        :value="state.download"
        :maximum="maximum"
        :active="running && state.phase === 'download'"
        tone="download"
      />
      <SpeedGauge
        title="上传速度"
        description="发文件、备份照片、视频通话，主要看这个。"
        :value="state.upload"
        :maximum="maximum"
        :active="running && state.phase === 'upload'"
        tone="upload"
      />
    </div>
    <section class="website-panel" aria-labelledby="website-heading">
      <div class="website-panel-heading">
        <h2 id="website-heading">常用网站访问</h2>
        <span class="muted">网站资源加载耗时</span>
      </div>
      <div class="website-cards">
        <article v-for="site in websites" :key="site.id" class="website-card" :class="`website-${site.quality.tone}`">
          <div class="website-card-heading">
            <h3>{{ site.name }}</h3>
            <span class="website-badge"><i aria-hidden="true"></i>{{ site.quality.label }}</span>
          </div>
          <div class="website-reading">
            <strong>{{ site.quality.position === null ? '—' : formatMeasurement(site.latency) }}</strong>
            <span>ms</span>
          </div>
          <div class="website-scale" aria-hidden="true">
            <span v-if="site.quality.position !== null" class="website-marker" :style="{ left: `${site.quality.position}%` }"></span>
          </div>
          <div class="website-scale-labels" aria-hidden="true"><span>0</span><span>1,000+ ms</span></div>
          <p>{{ site.samples ? `${site.samples} 次有效测量 · 中位数` : '等待有效测量' }}</p>
        </article>
      </div>
      <div class="website-legend">
        <span><i class="guide-dot green"></i>低：≤200 ms</span>
        <span><i class="guide-dot yellow"></i>中：200～500 ms</span>
        <span><i class="guide-dot red"></i>高：>500 ms</span>
      </div>
      <p class="muted">本站参考分档，不代表 App 打开速度。</p>
    </section>
    <section class="speed-metrics" aria-label="网络质量">
      <article class="speed-metric">
        <h2>延迟</h2>
        <div class="metric-reading">
          <strong>{{ formatMeasurement(state.latency) }}</strong
          ><span>ms</span>
        </div>
        <p>发出请求后，要等多久才有回应。越低越跟手。</p>
      </article>
      <article class="speed-metric">
        <h2>抖动</h2>
        <div class="metric-reading">
          <strong>{{ formatMeasurement(state.jitter) }}</strong
          ><span>ms</span>
        </div>
        <p>延迟忽高忽低的程度。越小，通话和游戏越稳。</p>
      </article>
      <article
        class="speed-metric stability-card"
        :class="`stability-${stability.tone}`"
      >
        <h2>本次稳定性</h2>
        <div class="stability-value">
          <span class="stability-dot"></span
          ><strong>{{ stabilityText }}</strong>
        </div>
        <p>
          {{
            ['stopped', 'error'].includes(state.status)
              ? '本次测速未完成，暂不判断稳定性。'
              : stability.description
          }}
        </p>
      </article>
    </section>
    <section class="speed-detail" aria-label="延迟变化与判定说明">
      <div class="latency-chart">
        <div class="latency-chart-heading">
          <h2>延迟变化</h2>
          <span class="muted">{{ points.length }} 个样本</span>
        </div>
        <template v-if="points.length > 1">
          <svg
            viewBox="0 0 600 100"
            role="img"
            :aria-label="`本次空闲延迟变化，最低 ${formatMeasurement(Math.min(...points))} ms，最高 ${formatMeasurement(Math.max(...points))} ms`"
          >
            <path class="chart-baseline" d="M12 82H588" />
            <path class="chart-line" :d="chartPath" />
          </svg>
          <div class="chart-range">
            <span>最低 {{ ms(Math.min(...points)) }}</span
            ><span>最高 {{ ms(Math.max(...points)) }}</span>
          </div>
        </template>
        <p v-else class="chart-empty">开始测速后，这里会显示延迟的变化。</p>
      </div>
      <div class="stability-guide">
        <h2>颜色怎么看</h2>
        <ul>
          <li><span class="guide-dot green"></span>绿：抖动 ≤ 10 ms，稳定</li>
          <li><span class="guide-dot yellow"></span>黄：10～30 ms，有波动</li>
          <li><span class="guide-dot red"></span>红：抖动 > 30 ms，波动较大</li>
        </ul>
        <p>
          这是本站的参考规则，只反映本次测试。至少有 10 个有效样本才会判断。
        </p>
      </div>
    </section>
    <details class="speed-notes">
      <summary>测速说明</summary>
      <ul>
        <li>
          Mbps 是宽带常用的单位，MB/s 更接近下载文件时看到的速度。100 Mbps
          大约是 12.5 MB/s。
        </li>
        <li>
          点击开始后才会收发测速数据，单次计划传输最多约 85
          MB，重试可能增加流量；可以随时停止，离开页面或切到后台也会停止。
        </li>
        <li>
          测速流量直接连接北京的 DevHub 服务器，由独立测速接口收发，不经过 Java 业务接口。
          结果受服务器带宽上限、Wi-Fi、代理和其他下载任务影响，不代表宽带套餐的最高速度。
        </li>
        <li>
          使用短时分段测速，高速宽带的结果可能偏低。
        </li>
        <li>
          常用网站先于下载、上传测速：每站加载 3 次图标，取成功请求的中位数，单次最多等 4 秒。
          耗时包含连接与资源加载，资源可能来自 CDN；加载失败显示“未测得”，不代表网站或网络不可用。
        </li>
        <li>本版暂不测丢包率。请求失败不能直接当成丢包。</li>
      </ul>
    </details>
    <p class="speed-traffic-note">
      测速会消耗流量，建议暂停其他下载任务后再测。
    </p>
  </main>
</template>
