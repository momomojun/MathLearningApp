// 进度同步客户端。
//
// 职责：
// - 登录用户：把本地的每次操作镜像到服务端；离线/失败时进队列，稍后自动重试。
// - 首次登录：把本地记录并入服务端（自动合并），再用服务端快照水合本地。
// - 对外暴露一个响应式 syncState，让页面显示"同步中/已同步/待同步/离线"。
//
// 未登录用户完全不触发网络，只用本地状态（由各 store 自己维护）。

import { reactive } from 'vue'
import { progress as progressApi, ApiError } from '../api'

const TOKEN_KEY = 'mathapp_token'
const QUEUE_KEY = 'mathapp_sync_queue_v1'
const RETRY_DELAY_MS = 5000

export const syncState = reactive({
  status: 'idle', // idle | syncing | error | offline | pending
  pending: 0,
  lastError: '',
})

// 各 store（学习进度 / 做题）注册自己的"导出本地"和"水合"方法，避免循环依赖。
const stores = []
let queue = loadQueue()
let flushing = false
let retryTimer = null

function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch (err) {
    return ''
  }
}

function isAuthed() {
  return Boolean(getToken())
}

function isOnline() {
  return typeof navigator === 'undefined' ? true : navigator.onLine !== false
}

function loadQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    return []
  }
}

function persistQueue() {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  } catch (err) {
    // 存储不可用时忽略；操作已经写进了本地状态，不影响浏览。
  }
  syncState.pending = queue.length
}

function refreshStatus() {
  if (queue.length === 0) {
    if (syncState.status !== 'syncing') syncState.status = 'idle'
    return
  }
  if (!isOnline()) syncState.status = 'offline'
  else if (syncState.status !== 'syncing' && syncState.status !== 'error') {
    syncState.status = 'pending'
  }
}

export function registerStore(store) {
  stores.push(store)
}

/**
 * 记录一次操作。登录时才入队；未登录直接忽略（本地状态已经改好）。
 * op: { kind: 'section'|'problem'|'clear', key: string, payload?: object }
 * 同 key 的操作会被合并，避免队列无限膨胀。
 */
export function enqueue(op) {
  if (!isAuthed()) return
  if (op.kind === 'clear') {
    queue = queue.filter((item) => item.kind !== 'clear')
    queue.push({ kind: 'clear', key: 'clear' })
  } else {
    const existing = queue.find((item) => item.kind === op.kind && item.key === op.key)
    if (existing) existing.payload = { ...existing.payload, ...op.payload }
    else queue.push({ kind: op.kind, key: op.key, payload: op.payload })
  }
  persistQueue()
  refreshStatus()
  flush()
}

async function sendOne(item) {
  if (item.kind === 'section') return progressApi.upsertSection(item.payload)
  if (item.kind === 'problem') return progressApi.upsertProblem(item.payload)
  if (item.kind === 'clear') return progressApi.clearHistory()
  return null
}

export async function flush() {
  if (flushing || !isAuthed() || !isOnline() || queue.length === 0) {
    refreshStatus()
    return
  }
  flushing = true
  syncState.status = 'syncing'
  syncState.lastError = ''

  try {
    while (queue.length) {
      const item = queue[0]
      try {
        await sendOne(item)
        queue.shift()
        persistQueue()
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          // 登录失效：交给全局 auth-expired 处理，这里停止并保留队列。
          break
        }
        if (err instanceof ApiError && err.kind === 'http' && err.status >= 400 && err.status < 500) {
          // 客户端错误（如脏数据）：丢弃这条，避免卡住整个队列。
          queue.shift()
          persistQueue()
          continue
        }
        // 网络 / 超时 / 5xx：保留队列，稍后重试。
        syncState.status = 'error'
        syncState.lastError = err.message || '同步失败，稍后自动重试'
        scheduleRetry()
        return
      }
    }
    syncState.status = 'idle'
  } finally {
    flushing = false
    refreshStatus()
  }
}

function scheduleRetry() {
  if (retryTimer) return
  retryTimer = setTimeout(() => {
    retryTimer = null
    flush()
  }, RETRY_DELAY_MS)
}

function collectLocal() {
  const sections = []
  const problems = []
  for (const store of stores) {
    const data = store.serializeLocal ? store.serializeLocal() : {}
    if (Array.isArray(data.sections)) sections.push(...data.sections)
    if (Array.isArray(data.problems)) problems.push(...data.problems)
  }
  return { sections, problems }
}

function hydrateAll(snapshot) {
  for (const store of stores) {
    if (store.hydrate) store.hydrate(snapshot)
  }
}

/**
 * 首次登录：合并本地 → 服务端，再用服务端快照覆盖本地。
 */
export async function initialSync() {
  if (!isAuthed()) return
  syncState.status = 'syncing'
  try {
    const local = collectLocal()
    const snapshot = await progressApi.merge(local)
    hydrateAll(snapshot)
    syncState.status = 'idle'
    syncState.lastError = ''
    await flush()
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return
    syncState.status = 'error'
    syncState.lastError = err.message || '同步失败'
    scheduleRetry()
  }
}

/**
 * 已登录用户重新进入应用时，用服务端数据水合本地（服务端为准）。
 */
export async function hydrateFromServer() {
  if (!isAuthed()) return
  syncState.status = 'syncing'
  try {
    const snapshot = await progressApi.snapshot()
    hydrateAll(snapshot)
    syncState.status = 'idle'
    await flush()
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return
    syncState.status = 'error'
    syncState.lastError = err.message || '同步失败'
    scheduleRetry()
  }
}

export function onLogout() {
  queue = []
  persistQueue()
  syncState.status = 'idle'
  syncState.lastError = ''
}

let listenersReady = false
export function setupSyncListeners() {
  if (listenersReady || typeof window === 'undefined') return
  listenersReady = true
  window.addEventListener('online', () => flush())
  window.addEventListener('offline', () => {
    syncState.status = 'offline'
  })
  window.addEventListener('mathapp:auth-expired', () => onLogout())
}
