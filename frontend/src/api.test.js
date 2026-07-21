import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

function mockResponse({ ok = true, status = 200, data = null, jsonError = null } = {}) {
  return {
    ok,
    status,
    json: jsonError ? vi.fn().mockRejectedValue(jsonError) : vi.fn().mockResolvedValue(data),
  }
}

async function loadApi() {
  vi.resetModules()
  return import('./api')
}

beforeEach(() => {
  localStorage.clear()
  vi.useRealTimers()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('api request layer', () => {
  it('adds the stored Token to authenticated requests', async () => {
    localStorage.setItem('mathapp_token', 'token-123')
    const fetchMock = vi.fn().mockResolvedValue(mockResponse({ data: { username: 'tester' } }))
    vi.stubGlobal('fetch', fetchMock)
    const { api } = await loadApi()

    await expect(api.me()).resolves.toEqual({ username: 'tester' })
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:8000/api/auth/me/',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Token token-123' }),
      }),
    )
  })

  it('returns structured HTTP errors and emits auth-expired on authenticated 401', async () => {
    localStorage.setItem('mathapp_token', 'expired-token')
    const eventListener = vi.fn()
    window.addEventListener('mathapp:auth-expired', eventListener, { once: true })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        mockResponse({ ok: false, status: 401, data: { detail: '登录已失效' } }),
      ),
    )
    const { api } = await loadApi()

    await expect(api.me()).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      kind: 'http',
      message: '登录已失效',
    })
    expect(eventListener).toHaveBeenCalledTimes(1)
  })

  it('extracts field errors and supports an empty successful response', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        mockResponse({ ok: false, status: 400, data: { username: ['账号已存在'] } }),
      )
      .mockResolvedValueOnce(mockResponse({ jsonError: new SyntaxError('empty') }))
    vi.stubGlobal('fetch', fetchMock)
    const { api } = await loadApi()

    await expect(api.register({ username: 'used' })).rejects.toMatchObject({
      status: 400,
      message: '账号已存在',
    })
    await expect(api.logout()).resolves.toBeNull()
  })

  it('distinguishes network failures from external cancellation', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new TypeError('offline')))
    let apiModule = await loadApi()
    await expect(apiModule.content.listCourses()).rejects.toMatchObject({ kind: 'network' })

    vi.stubGlobal(
      'fetch',
      vi.fn((url, options) =>
        new Promise((resolve, reject) => {
          options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        }),
      ),
    )
    apiModule = await loadApi()
    const controller = new AbortController()
    const request = apiModule.content.listCourses({ signal: controller.signal })
    controller.abort()
    await expect(request).rejects.toMatchObject({ kind: 'aborted', message: '请求已取消' })
  })

  it('aborts and classifies requests that exceed the configured timeout', async () => {
    vi.useFakeTimers()
    vi.stubGlobal(
      'fetch',
      vi.fn((url, options) =>
        new Promise((resolve, reject) => {
          options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        }),
      ),
    )
    const { content } = await loadApi()
    const request = content.listCourses({ timeoutMs: 25 })
    const assertion = expect(request).rejects.toMatchObject({
      kind: 'timeout',
      message: '请求超时，请稍后重试',
    })

    await vi.advanceTimersByTimeAsync(25)
    await assertion
  })
})
