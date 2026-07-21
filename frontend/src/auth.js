import { reactive, readonly } from 'vue'
import { api } from './api'
import { initialSync, onLogout as onSyncLogout } from './utils/syncClient'

const TOKEN_KEY = 'mathapp_token'
const USER_KEY = 'mathapp_user'

function loadStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (err) {
    return null
  }
}

const state = reactive({
  token: localStorage.getItem(TOKEN_KEY) || '',
  user: loadStoredUser(),
})

function persist() {
  if (state.token) {
    localStorage.setItem(TOKEN_KEY, state.token)
  } else {
    localStorage.removeItem(TOKEN_KEY)
  }

  if (state.user) {
    localStorage.setItem(USER_KEY, JSON.stringify(state.user))
  } else {
    localStorage.removeItem(USER_KEY)
  }
}

export function clearSession() {
  state.token = ''
  state.user = null
  persist()
  // 退出后停止同步并清空待发队列（本地状态保留给游客继续使用）。
  onSyncLogout()
}

export const authState = readonly(state)

export async function login(username, password) {
  const data = await api.login(username, password)
  state.token = data.token
  state.user = data.user
  persist()
  // 首次登录：把本地（未登录时产生）的收藏/错题/学习记录自动合并进账号，
  // 再用服务端快照水合本地。合并失败不影响登录本身，队列会稍后重试。
  initialSync().catch(() => {})
  return data.user
}

export async function register(payload) {
  return api.register(payload)
}

export async function logout() {
  if (state.token) {
    try {
      await api.logout()
    } catch (err) {
      // 即使退出接口失败，也继续清空本地登录状态
    }
  }
  clearSession()
}

export async function updateProfile(payload) {
  const user = await api.updateMe(payload)
  state.user = user
  persist()
  return user
}

export async function refreshMe() {
  if (!state.token) return null
  try {
    const user = await api.me()
    state.user = user
    persist()
    return user
  } catch (err) {
    // 只有服务端明确拒绝 Token 时才退出；临时断网继续保留本地登录态。
    if (err.status === 401) clearSession()
    return null
  }
}
