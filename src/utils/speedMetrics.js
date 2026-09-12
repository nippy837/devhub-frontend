export const SPEED_TEST_URL = 'https://speed.cloudflare.com'
export const MIN_STABILITY_SAMPLES = 10
export const SPEED_TEST_TIMEOUT_MS = 90_000

export function createSpeedTestConfig() {
  return {
    autoStart: false,
    downloadApiUrl: `${SPEED_TEST_URL}/__down`,
    uploadApiUrl: `${SPEED_TEST_URL}/__up`,
    logMeasurementApiUrl: null,
    logAimApiUrl: null,
    includeCredentials: false,
    measureDownloadLoadedLatency: true,
    measureUploadLoadedLatency: true,
    loadedLatencyThrottle: 500,
    bandwidthAbortRequestDuration: 15_000,
    bandwidthFinishRequestDuration: 1000,
    measurements: [
      { type: 'latency', numPackets: 12 },
      { type: 'download', bytes: 100_000, count: 1, bypassMinDuration: true },
      { type: 'download', bytes: 1_000_000, count: 2 },
      { type: 'download', bytes: 5_000_000, count: 2 },
      { type: 'download', bytes: 20_000_000, count: 2 },
      { type: 'upload', bytes: 100_000, count: 1, bypassMinDuration: true },
      { type: 'upload', bytes: 1_000_000, count: 2 },
      { type: 'upload', bytes: 5_000_000, count: 2 },
      { type: 'upload', bytes: 10_000_000, count: 2 },
    ],
  }
}

export function finiteMeasurement(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null
}

export function formatMeasurement(value, digits = 1) {
  return finiteMeasurement(value) === null
    ? '—'
    : value.toLocaleString('zh-CN', { maximumFractionDigits: digits })
}

export function gaugeMaximum(value) {
  const target = Math.max(100, finiteMeasurement(value) ?? 0)
  return (
    [100, 250, 500, 1000, 2500, 5000, 10000].find((limit) => limit >= target) ??
    Math.ceil(target / 10000) * 10000
  )
}

export function getStability(jitter, sampleCount, completed) {
  if (!completed)
    return {
      tone: 'neutral',
      label: '等待结果',
      description: '测速完成后，根据延迟波动判断。',
    }
  if (
    finiteMeasurement(jitter) === null ||
    sampleCount < MIN_STABILITY_SAMPLES
  ) {
    return {
      tone: 'neutral',
      label: '未测得',
      description: '有效样本不足，暂时无法判断。',
    }
  }
  if (jitter <= 10)
    return { tone: 'green', label: '稳定', description: '本次延迟变化较小。' }
  if (jitter <= 30)
    return {
      tone: 'yellow',
      label: '有波动',
      description: '本次延迟有些起伏。',
    }
  return {
    tone: 'red',
    label: '波动较大',
    description: '通话或游戏可能出现顿一下的感觉。',
  }
}

export function readSpeedResults(results) {
  const summary = results.getSummary()
  const bpsToMbps = (value) => {
    const valid = finiteMeasurement(value)
    return valid === null ? null : valid / 1_000_000
  }
  return {
    download: bpsToMbps(summary.download),
    upload: bpsToMbps(summary.upload),
    latency: finiteMeasurement(summary.latency),
    jitter: finiteMeasurement(summary.jitter),
    downLoadedLatency: finiteMeasurement(summary.downLoadedLatency),
    upLoadedLatency: finiteMeasurement(summary.upLoadedLatency),
    latencyPoints: results
      .getUnloadedLatencyPoints()
      .filter((value) => finiteMeasurement(value) !== null),
  }
}

export function emptySpeedState() {
  return {
    status: 'idle',
    phase: 'connection',
    node: '',
    error: '',
    elapsed: 0,
    download: null,
    upload: null,
    latency: null,
    jitter: null,
    downLoadedLatency: null,
    upLoadedLatency: null,
    latencyPoints: [],
  }
}
