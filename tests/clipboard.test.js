import test from 'node:test'
import assert from 'node:assert/strict'
import { copyText } from '../src/utils/clipboard.js'

function fixture(context, { secure = false, writeText, result = true, failure } = {}) {
  const calls = { copied: [], ranges: [] }
  const range = { cloneRange: () => range }
  const selection = {
    rangeCount: 1,
    getRangeAt: () => range,
    removeAllRanges: () => { calls.ranges = [] },
    addRange: (item) => calls.ranges.push(item),
  }
  const active = {
    isConnected: true, selectionStart: 2, selectionEnd: 4, selectionDirection: 'backward',
    focus: () => { calls.restoredFocus = true },
    setSelectionRange: (...args) => { calls.restoredSelection = args },
  }
  const field = {
    style: {}, value: '',
    focus: () => {}, select: () => {},
    setSelectionRange: (start, end) => { calls.selected = [start, end] },
    remove: () => { calls.removed = true },
  }
  const values = {
    isSecureContext: secure,
    navigator: writeText ? { clipboard: { writeText } } : {},
    document: {
      activeElement: active,
      getSelection: () => selection,
      createElement: () => field,
      body: { appendChild: () => { calls.appended = true } },
      execCommand: (command) => {
        assert.equal(command, 'copy')
        if (failure) throw failure
        calls.copied.push(field.value)
        return result
      },
    },
  }
  for (const [name, value] of Object.entries(values)) {
    const old = Object.getOwnPropertyDescriptor(globalThis, name)
    Object.defineProperty(globalThis, name, { value, configurable: true })
    context.after(() => old ? Object.defineProperty(globalThis, name, old) : delete globalThis[name])
  }
  return { calls, field, range }
}

test('secure context uses the modern clipboard without adding temporary fields', async (context) => {
  let copied
  const { calls } = fixture(context, { secure: true, writeText: async (text) => { copied = text } })
  await copyText('demo_user')
  assert.equal(copied, 'demo_user')
  assert.equal(calls.appended, undefined)
})

test('HTTP fallback preserves password whitespace and symbols, then cleans up and restores selection', async (context) => {
  const { calls, field, range } = fixture(context)
  const text = '  Fake<&密码🔑>\t!  '
  await copyText(text)
  assert.deepEqual(calls.copied, [text])
  assert.deepEqual(calls.selected, [0, text.length])
  assert.equal(field.value, '')
  assert.equal(calls.removed, true)
  assert.equal(calls.restoredFocus, true)
  assert.deepEqual(calls.restoredSelection, [2, 4, 'backward'])
  assert.deepEqual(calls.ranges, [range])
})

test('modern clipboard rejection falls back to compatible copying', async (context) => {
  const { calls } = fixture(context, { secure: true, writeText: async () => { throw new Error('NotAllowedError') } })
  await copyText('demo_user')
  assert.deepEqual(calls.copied, ['demo_user'])
})

for (const options of [{ result: false }, { failure: new Error('unsupported') }]) {
  test('failed compatibility copy rejects and always removes temporary password data', async (context) => {
    const { calls, field } = fixture(context, options)
    await assert.rejects(copyText('fake-password'))
    assert.equal(calls.removed, true)
    assert.equal(field.value, '')
    assert.equal(calls.restoredFocus, true)
  })
}
