import test from 'node:test'
import assert from 'node:assert/strict'
import { formatJson, compareText } from '../src/utils/developerTools.js'

test('formats nested JSON and preserves string whitespace and escapes', () => {
  const source = '{"a":[{},[],true,null,1],"text":"a  b\\n\\\"{}"}'
  assert.deepEqual(JSON.parse(formatJson(source)), JSON.parse(source))
  assert.equal(formatJson(formatJson(source), 0), source)
  assert.match(formatJson(source, 4), /\n {4}"a"/)
})
test('preserves long integers, exponent notation, negative zero and duplicate keys', () => {
  const source = '{"id":9223372036854775807,"n":1e999,"z":-0,"id":2}'
  assert.equal(formatJson(formatJson(source), 0), source)
})
test('supports all valid primitive roots and empty containers', () => {
  for (const value of ['null', 'true', 'false', '0', '"hello"', '{}', '[]'])
    assert.equal(formatJson(value), value)
})
test('rejects invalid, empty and excessive JSON', () => {
  for (const value of [
    '',
    ' ',
    '{"x":}',
    '{"x":1,}',
    '//comment\n{}',
    '[NaN]',
    '{}{}',
  ])
    assert.throws(() => formatJson(value))
  assert.throws(() => formatJson(' '.repeat(2_000_001) + '{}'), /200 万/)
  assert.throws(() => formatJson('{}', 8), /缩进/)
})
test('aligns additions and removals without marking following lines as changed', () => {
  const result = compareText('a\nb\nc', 'a\nnew\nb\nc')
  assert.deepEqual(result.counts, { added: 1, removed: 0, changed: 0 })
  assert.equal(result.rows[2].left.number, 2)
  assert.equal(result.rows[2].right.number, 3)
  assert.equal(compareText('a\nb\nc', 'a\nc').counts.removed, 1)
})
test('highlights modified characters and preserves both source texts', () => {
  const { rows, counts } = compareText('你好 old\nlast', '你好 new\nlast')
  assert.equal(counts.changed, 1)
  assert.equal(rows[0].left.segments.map((p) => p.text).join(''), '你好 old')
  assert.equal(rows[0].right.segments.map((p) => p.text).join(''), '你好 new')
  assert.ok(rows[0].right.segments.some((p) => p.changed))
})
test('handles empty inputs, blank lines and final newline differences', () => {
  assert.deepEqual(compareText('', '').rows, [])
  assert.equal(compareText('', 'a').counts.added, 1)
  assert.equal(compareText('a', '').counts.removed, 1)
  assert.equal(compareText('a', 'a\n').counts.added, 1)
  assert.equal(compareText('a\n\nb', 'a\nb').counts.removed, 1)
})
test('normalizes line endings and only optionally ignores leading/trailing whitespace', () => {
  assert.equal(compareText('a\r\nb', 'a\nb').counts.changed, 0)
  const result = compareText('  a  ', 'a', true)
  assert.equal(result.rows[0].kind, 'equal')
  assert.equal(result.rows[0].left.text, '  a  ')
  assert.equal(result.rows[0].right.text, 'a')
  assert.equal(compareText('  a  ', 'a').counts.changed, 1)
  assert.equal(compareText('a b', 'ab', true).counts.changed, 1)
})
test('rejects excessively large text', () => {
  assert.throws(() => compareText('a'.repeat(400_001), ''), /40 万/)
  assert.throws(() => compareText('\n'.repeat(6000), ''), /6000 行/)
})
test('reconstructs original sides across varied edits', () => {
  const samples = [
    '',
    'a',
    'a\nb\nc',
    'b\na\nc',
    'a\na\nb',
    '\n',
    'x\ny\nz\n',
    '<script>alert(1)</script>',
  ]
  for (const left of samples)
    for (const right of samples) {
      const { rows } = compareText(left, right)
      assert.equal(
        rows
          .filter((r) => r.left)
          .map((r) => r.left.text)
          .join('\n'),
        left,
      )
      assert.equal(
        rows
          .filter((r) => r.right)
          .map((r) => r.right.text)
          .join('\n'),
        right,
      )
    }
})

test('marks added, removed and blank lines for inline red highlights', () => {
  const inserted = compareText('a', 'a\nb\n').rows.filter(
    (row) => row.kind === 'added',
  )
  assert.ok(
    inserted.every((row) => row.right.segments.every((part) => part.changed)),
  )
  assert.equal(inserted[1].right.segments[0].text, '')
  const removed = compareText('a\nb', 'a').rows.find(
    (row) => row.kind === 'removed',
  )
  assert.equal(removed.left.segments[0].changed, true)
})
test('unchanged texts have no highlight segments, including ignored whitespace', () => {
  for (const result of [
    compareText('相同\n内容', '相同\n内容'),
    compareText(' a ', 'a', true),
  ]) {
    assert.ok(
      result.rows.every((row) =>
        [...row.left.segments, ...row.right.segments].every(
          (part) => !part.changed,
        ),
      ),
    )
  }
})
test('inline highlights retain exact content including tabs, emoji and HTML-like text', () => {
  const left = '标题\n\t甲😀<b>原文</b>\n'
  const right = '标题\n\t乙😀<b>新文</b>\n'
  const result = compareText(left, right)
  for (const [side, expected] of [
    ['left', left],
    ['right', right],
  ]) {
    assert.equal(
      result.rows
        .filter((row) => row[side])
        .map((row) => row[side].segments.map((part) => part.text).join(''))
        .join('\n'),
      expected,
    )
  }
})
