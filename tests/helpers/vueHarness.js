import { createRenderer, h, KeepAlive, ref } from 'vue'

// A minimal renderer exercises Vue watchers and KeepAlive hooks without a browser dependency.
const renderer = createRenderer({
  createElement: (tag) => ({ tag, children: [] }),
  createText: (text) => ({ text }), createComment: (text) => ({ text }),
  setText: (node, text) => { node.text = text }, setElementText: (node, text) => { node.text = text },
  patchProp: () => {}, parentNode: (node) => node.parent, nextSibling: () => null,
  insert(node, parent) { node.parent = parent; parent.children.push(node) },
  remove(node) { if (node.parent) node.parent.children = node.parent.children.filter((child) => child !== node) },
})
export function mountComposable(t, setup) {
  const previousWindow = globalThis.window, previousDocument = globalThis.document
  globalThis.window = new EventTarget()
  globalThis.document = Object.assign(new EventTarget(), { hidden: false })
  const visible = ref(true)
  let value
  const child = { setup() { value = setup(); return () => h('div') } }
  const app = renderer.createApp({ setup: () => () => h(KeepAlive, null, { default: () => visible.value ? h(child) : null }) })
  app.mount({ children: [] })
  t.after(() => { app.unmount(); globalThis.window = previousWindow; globalThis.document = previousDocument })
  return { value, visible }
}
export const flush = () => new Promise((resolve) => setImmediate(resolve))
export const response = (data) => new Response(JSON.stringify({ code: 0, data }))
