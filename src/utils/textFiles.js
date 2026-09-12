export async function readTextFile(file, maxCharacters) {
  if (file.size > maxCharacters * 4) throw new Error('文件过大，请分段导入')
  let text
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(
      await file.arrayBuffer(),
    )
  } catch {
    throw new Error('无法读取文件，请选择 UTF-8 编码的文本文件')
  }
  if (/[\u0000-\u0008\u000b\u000e-\u001f]/.test(text))
    throw new Error('请选择文本文件，不支持二进制文件')
  text = text.replace(/\r\n?/g, '\n')
  if (text.length > maxCharacters)
    throw new Error(
      `文件内容不能超过 ${maxCharacters.toLocaleString('zh-CN')} 字符`,
    )
  return text
}
