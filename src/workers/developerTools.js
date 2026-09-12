import { formatJson, compareText } from '../utils/developerTools'

self.onmessage = ({ data }) => {
  try {
    const result =
      data.type === 'json'
        ? formatJson(...data.args)
        : compareText(...data.args)
    self.postMessage({ result })
  } catch (error) {
    self.postMessage({ error: error.message })
  }
}
