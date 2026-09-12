import { diffArrays, diffChars } from 'diff'

export function formatJson(input, indent = 2) {
  if (!input.trim()) throw new Error('请先输入 JSON')
  if (input.length > 2_000_000) throw new Error('JSON 请控制在 200 万字符以内')
  if (![0, 2, 4].includes(indent)) throw new Error('不支持的缩进')
  try {
    JSON.parse(input)
  } catch (error) {
    throw new Error(`JSON 格式错误：${error.message}`)
  }
  const tokens = input.match(
    /"(?:\\[\s\S]|[^"\\])*"|[{}\[\],:]|[^\s{}\[\],:]+/g,
  )
  if (indent === 0) return tokens.join('')
  let depth = 0
  let output = ''
  const newline = () => '\n' + ' '.repeat(depth * indent)
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token === '{' || token === '[') {
      output += token
      depth++
      if (tokens[i + 1] !== (token === '{' ? '}' : ']')) output += newline()
    } else if (token === '}' || token === ']') {
      depth--
      if (tokens[i - 1] !== (token === '}' ? '{' : '[')) output += newline()
      output += token
    } else if (token === ',') output += ',' + newline()
    else if (token === ':') output += ': '
    else output += token
    if (output.length > 4_000_000)
      throw new Error('格式化结果过大，请减少内容或缩进')
  }
  return output
}

export function compareText(left, right, ignoreWhitespace = false) {
  if (left.length + right.length > 400_000)
    throw new Error('两侧文本合计请控制在 40 万字符以内')
  const lines = (value) =>
    value === '' ? [] : value.replace(/\r\n?/g, '\n').split('\n')
  const oldLines = lines(left)
  const newLines = lines(right)
  if (oldLines.length + newLines.length > 6000)
    throw new Error('两侧文本合计请控制在 6000 行以内')
  const changes = diffArrays(oldLines, newLines, {
    comparator: (a, b) => (ignoreWhitespace ? a.trim() === b.trim() : a === b),
    timeout: 1500,
  })
  if (!changes) throw new Error('文本差异过多，请分段对比')
  const rows = []
  const counts = { added: 0, removed: 0, changed: 0 }
  let oldIndex = 0
  let newIndex = 0
  const cell = (text, number) => ({
    text,
    number,
    segments: [{ text, changed: false }],
  })
  for (let i = 0; i < changes.length; i++) {
    const change = changes[i]
    if (!change.added && !change.removed) {
      for (let n = 0; n < change.count; n++)
        rows.push({
          kind: 'equal',
          left: cell(oldLines[oldIndex], ++oldIndex),
          right: cell(newLines[newIndex], ++newIndex),
        })
      continue
    }
    const removed = change.removed ? change.count : 0
    let added = change.added ? change.count : 0
    if (change.removed && changes[i + 1]?.added) added = changes[++i].count
    for (let n = 0; n < Math.max(removed, added); n++) {
      const a = n < removed ? cell(oldLines[oldIndex], ++oldIndex) : null
      const b = n < added ? cell(newLines[newIndex], ++newIndex) : null
      const kind = a && b ? 'changed' : a ? 'removed' : 'added'
      for (const side of [a, b]) {
        if (side) side.segments[0].changed = true
      }
      if (a && b) {
        const parts = diffChars(a.text, b.text, {
          timeout: 10,
          maxEditLength: 1000,
        })
        if (parts) {
          a.segments = parts
            .filter((p) => !p.added)
            .map((p) => ({ text: p.value, changed: !!p.removed }))
          b.segments = parts
            .filter((p) => !p.removed)
            .map((p) => ({ text: p.value, changed: !!p.added }))
          if (!a.segments.length) a.segments = [{ text: '', changed: true }]
          if (!b.segments.length) b.segments = [{ text: '', changed: true }]
        }
      }
      counts[kind]++
      rows.push({ kind, left: a, right: b })
    }
  }
  return { rows, counts }
}
