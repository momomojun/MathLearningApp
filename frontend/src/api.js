const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'
const TOKEN_KEY = 'mathapp_token'
const DEFAULT_TIMEOUT_MS = 15000

export class ApiError extends Error {
  constructor(message, { status = 0, kind = 'http', data = null, cause = null } = {}) {
    super(message, cause ? { cause } : undefined)
    this.name = 'ApiError'
    this.status = status
    this.kind = kind
    this.data = data
  }
}

function getToken() {
  return localStorage.getItem(TOKEN_KEY) || ''
}

function extractErrorMessage(data, fallback) {
  if (!data) return fallback
  if (typeof data.detail === 'string') return data.detail
  const firstKey = Object.keys(data)[0]
  if (firstKey) {
    const value = data[firstKey]
    return Array.isArray(value) ? value[0] : String(value)
  }
  return fallback
}

async function request(
  path,
  { method = 'GET', body, auth = true, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = {},
) {
  const headers = { 'Content-Type': 'application/json' }
  const token = auth ? getToken() : ''
  if (auth) {
    if (token) headers.Authorization = `Token ${token}`
  }

  let response
  const controller = new AbortController()
  let timedOut = false
  const forwardAbort = () => controller.abort()
  if (signal?.aborted) controller.abort()
  else signal?.addEventListener('abort', forwardAbort, { once: true })
  const timeoutId = timeoutMs > 0
    ? window.setTimeout(() => {
        timedOut = true
        controller.abort()
      }, timeoutMs)
    : null

  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') {
      throw new ApiError(timedOut ? '请求超时，请稍后重试' : '请求已取消', {
        kind: timedOut ? 'timeout' : 'aborted',
        cause: err,
      })
    }
    throw new ApiError('无法连接服务器，请检查网络后重试', {
      kind: 'network',
      cause: err,
    })
  } finally {
    if (timeoutId !== null) window.clearTimeout(timeoutId)
    signal?.removeEventListener('abort', forwardAbort)
  }

  let data = null
  try {
    data = await response.json()
  } catch (err) {
    data = null
  }

  if (!response.ok) {
    const error = new ApiError(extractErrorMessage(data, '请求失败，请稍后重试'), {
      status: response.status,
      kind: 'http',
      data,
    })
    if (response.status === 401 && auth && token) {
      window.dispatchEvent(new CustomEvent('mathapp:auth-expired'))
    }
    throw error
  }

  return data
}

export const api = {
  register(payload) {
    return request('/users/', { method: 'POST', body: payload, auth: false })
  },
  login(username, password) {
    return request('/auth/login/', {
      method: 'POST',
      body: { username, password },
      auth: false,
    })
  },
  logout() {
    return request('/auth/logout/', { method: 'POST' })
  },
  me() {
    return request('/auth/me/')
  },
  updateMe(payload) {
    return request('/auth/me/', { method: 'PATCH', body: payload })
  },
  createMembershipOrder(planCode) {
    return request('/payments/membership-orders/', {
      method: 'POST',
      body: { plan_code: planCode },
    })
  },
  paymentOrder(orderNo) {
    return request(`/payments/orders/${orderNo}/`)
  },
}

// 学习进度 / 收藏 / 做题状态 / 错题本的多设备同步接口。
// 仅登录用户使用；未登录时前端继续走本地 localStorage。
export const progress = {
  // 拉取当前用户的完整进度快照，用于登录后一次性水合本地状态。
  snapshot(options = {}) {
    return request('/progress/', options)
  },
  // 首登自动合并：把本地记录并入服务端，返回合并后的最新快照。
  merge(payload, options = {}) {
    return request('/progress/merge/', { method: 'POST', body: payload, ...options })
  },
  // 单条小节 upsert（标记已读 / 切换收藏 / 记录最近学习）。
  upsertSection(payload, options = {}) {
    return request('/progress/sections/', { method: 'POST', body: payload, ...options })
  },
  // 清空已读与最近学习（保留收藏）。
  clearHistory(options = {}) {
    return request('/progress/sections/clear-history/', { method: 'POST', body: {}, ...options })
  },
  // 单条做题记录 upsert（做过 / 做错 / 收藏 / 错题本）。
  upsertProblem(payload, options = {}) {
    return request('/progress/problems/', { method: 'POST', body: payload, ...options })
  },
}

// 课程内容接口：课程/章节/小节目录来自 Django 后台录入，不再打包进前端。
// 正文按小节懒加载，只在用户真正点开时才请求。
export const content = {
  listCourses(options = {}) {
    return request('/content/courses/', options)
  },
  getCourse(slug, options = {}) {
    return request(`/content/courses/${encodeURIComponent(slug)}/`, options)
  },
  getSectionContent(slug, options = {}) {
    return request(`/content/sections/${encodeURIComponent(slug)}/`, options)
  },
}
