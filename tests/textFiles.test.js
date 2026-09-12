import test from 'node:test'
import assert from 'node:assert/strict'
import { readTextFile } from '../src/utils/textFiles.js'

test('imports UTF-8 JSON and preserves long integer literals', async () => {
  const content = '{"id":9223372036854775807,"name":"中文"}'
  assert.equal(
    await readTextFile(new File([content], 'example.json'), 1000),
    content,
  )
})
test('handles UTF-8 BOM, line endings and empty files', async () => {
  assert.equal(
    await readTextFile(new File(['\ufeff甲\r\n乙\r'], 'text.txt'), 100),
    '甲\n乙\n',
  )
  assert.equal(await readTextFile(new File([], 'empty.txt'), 100), '')
})
test('rejects invalid encoding and binary contents', async () => {
  await assert.rejects(
    readTextFile(
      new File([new Uint8Array([0xff, 0xfe, 0x41])], 'legacy.txt'),
      100,
    ),
    /UTF-8/,
  )
  await assert.rejects(
    readTextFile(new File(['abc\0def'], 'binary.txt'), 100),
    /二进制/,
  )
})
test('checks byte limit before reading and character limit after decoding', async () => {
  await assert.rejects(
    readTextFile(
      {
        size: 401,
        arrayBuffer() {
          throw new Error('must not read')
        },
      },
      100,
    ),
    /文件过大/,
  )
  await assert.rejects(
    readTextFile(new File(['x'.repeat(101)], 'large.txt'), 100),
    /不能超过/,
  )
})
test('reports unreadable files without returning partial content', async () => {
  await assert.rejects(
    readTextFile(
      {
        size: 1,
        async arrayBuffer() {
          throw new Error('read failure')
        },
      },
      100,
    ),
    /无法读取/,
  )
})
