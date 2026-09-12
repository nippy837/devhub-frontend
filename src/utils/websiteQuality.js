export function websiteQuality(site) {
  const valid = site.status === 'complete' &&
    typeof site.latency === 'number' && Number.isFinite(site.latency) && site.latency >= 0
  if (!valid) return {
    tone: 'neutral',
    label: { idle: '待测', running: '测量中', stopped: '已停止' }[site.status] || '未测得',
    position: null,
  }
  const { latency } = site
  return {
    tone: latency <= 200 ? 'green' : latency <= 500 ? 'yellow' : 'red',
    label: latency <= 200 ? '低延迟' : latency <= 500 ? '中等延迟' : '高延迟',
    position: Math.min(100, latency / 10),
  }
}
