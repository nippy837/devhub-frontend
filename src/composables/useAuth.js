import { reactive } from 'vue'
import { gameRequest } from '../api/game.js'

export const auth = reactive({ user: null, ready: false, error: '', dialog: false, mode: 'login' })
let sessionVersion = 0

export async function loadAuth() {
  const version = ++sessionVersion
  auth.error = ''
  try {
    const user = await gameRequest('/auth/me')
    if (version === sessionVersion) auth.user = user
  } catch (error) { if (version === sessionVersion) auth.error = error.message }
  finally { if (version === sessionVersion) auth.ready = true }
}

export function openAuth(mode = 'login') {
  auth.mode = mode
  auth.dialog = true
}

export async function authenticate(mode, credentials) {
  ++sessionVersion
  auth.ready = true
  auth.user = await gameRequest(`/auth/${mode}`, { method: 'POST', body: credentials })
  auth.ready = true
  auth.error = ''
  auth.dialog = false
}

export async function logout() {
  ++sessionVersion
  await gameRequest('/auth/logout', { method: 'POST', body: {} })
  auth.user = null
}
