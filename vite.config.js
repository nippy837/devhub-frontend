import vue from '@vitejs/plugin-vue'
import { createSpeedHandler } from './server/speed-handler.mjs'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), {
    name: 'devhub-local-speed',
    configureServer(server) { server.middlewares.use(createSpeedHandler()) },
  }],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8080',
    },
  },
})
