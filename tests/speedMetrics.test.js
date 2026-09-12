import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createSpeedTestConfig,
  finiteMeasurement,
  formatMeasurement,
  gaugeMaximum,
  getStability,
  readSpeedResults,
} from '../src/utils/speedMetrics.js'

test('stability uses exact thresholds and only valid completed samples', () => {
  for (const [value, tone] of [
    [0, 'green'],
    [10, 'green'],
    [10.01, 'yellow'],
    [30, 'yellow'],
    [30.01, 'red'],
  ])
    assert.equal(getStability(value, 12, true).tone, tone)
  for (const value of [null, undefined, NaN, Infinity, -1])
    assert.equal(getStability(value, 12, true).tone, 'neutral')
  assert.equal(getStability(0, 9, true).tone, 'neutral')
  assert.equal(getStability(0, 12, false).tone, 'neutral')
})
test('missing measurements stay unknown, zero remains a valid measurement', () => {
  assert.equal(finiteMeasurement(null), null)
  assert.equal(finiteMeasurement('100'), null)
  assert.equal(finiteMeasurement(-1), null)
  assert.equal(formatMeasurement(NaN), '—')
  assert.equal(formatMeasurement(0), '0')
})
test('converts bps to Mbps and filters invalid latency samples', () => {
  const results = readSpeedResults({
    getSummary: () => ({
      download: 100_000_000,
      upload: 8_000_000,
      latency: 0,
      jitter: NaN,
      downLoadedLatency: 45,
    }),
    getUnloadedLatencyPoints: () => [0, 10, null, -1, NaN, Infinity],
  })
  assert.equal(results.download, 100)
  assert.equal(results.upload, 8)
  assert.equal(results.download / 8, 12.5)
  assert.equal(results.latency, 0)
  assert.equal(results.jitter, null)
  assert.equal(results.upLoadedLatency, null)
  assert.deepEqual(results.latencyPoints, [0, 10])
})
test('gauge scale always covers the measured speed', () => {
  for (const value of [0, 100, 101, 250, 500, 10001, 100000])
    assert.ok(gaugeMaximum(value) >= value)
  assert.equal(gaugeMaximum(null), 100)
  assert.equal(gaugeMaximum(Infinity), 100)
})
test('speed test is opt-in, bounded, and does not run packet loss or result logging', () => {
  const config = createSpeedTestConfig()
  assert.equal(config.autoStart, false)
  assert.equal(config.logAimApiUrl, null)
  assert.equal(config.logMeasurementApiUrl, null)
  assert.equal(config.includeCredentials, false)
  assert.ok(
    config.measurements.every((item) =>
      ['latency', 'download', 'upload'].includes(item.type),
    ),
  )
  assert.ok(
    config.measurements.reduce(
      (sum, item) => sum + (item.bytes || 0) * (item.count || 0),
      0,
    ) <= 85_000_000,
  )
  assert.ok(config.bandwidthAbortRequestDuration > 0)
})
