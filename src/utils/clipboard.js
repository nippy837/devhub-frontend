export async function copyText(text) {
  if (typeof text !== 'string') throw new TypeError('复制内容必须是文本')
  if (globalThis.isSecureContext && globalThis.navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return
    } catch {}
  }
  const activeElement = document.activeElement
  const selection = document.getSelection()
  const ranges = selection
    ? Array.from({ length: selection.rangeCount }, (_, index) => selection.getRangeAt(index).cloneRange())
    : []
  const inputSelection = activeElement && typeof activeElement.selectionStart === 'number'
    ? [activeElement.selectionStart, activeElement.selectionEnd, activeElement.selectionDirection]
    : null
  const field = document.createElement('textarea')
  field.value = text
  field.readOnly = true
  field.tabIndex = -1
  field.style.cssText = 'position:fixed;top:0;left:-9999px;font-size:16px;opacity:0;'
  try {
    document.body.appendChild(field)
    field.focus({ preventScroll: true })
    field.select()
    field.setSelectionRange(0, field.value.length)
    if (!document.execCommand('copy')) throw new Error('浏览器未允许复制')
  } finally {
    field.value = ''
    field.remove()
    if (activeElement?.isConnected) {
      activeElement.focus({ preventScroll: true })
      if (inputSelection) activeElement.setSelectionRange(...inputSelection)
    }
    if (selection) {
      selection.removeAllRanges()
      ranges.forEach((range) => selection.addRange(range))
    }
  }
}
