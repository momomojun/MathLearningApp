import { beforeEach, describe, expect, it, vi } from 'vitest'

const STORAGE_KEY = 'mathapp_learning_progress_v1'

async function loadModule() {
  vi.resetModules()
  return import('./learningProgress')
}

beforeEach(() => {
  localStorage.clear()
  vi.useRealTimers()
})

describe('learningProgress', () => {
  it('writes read/recent state and keeps only the latest entry per section', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-10T00:00:00Z'))
    const progress = await loadModule()

    progress.markRead('section-a', { title: 'A', courseSlug: 'math', type: 'knowledge' })
    vi.setSystemTime(new Date('2026-07-10T00:01:00Z'))
    progress.markRead('section-a', { title: 'A2', courseSlug: 'math', type: 'knowledge' })
    progress.markRead('section-b', { title: 'B', courseSlug: 'math', type: 'exercise' })

    expect(progress.isRead('section-a')).toBe(true)
    expect(progress.getRecent()).toHaveLength(2)
    expect(progress.getRecent('knowledge')).toMatchObject([{ slug: 'section-a', title: 'A2' }])
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).read['section-b']).toBe(true)
  })

  it('toggles favorites and clearHistory preserves favorites', async () => {
    const progress = await loadModule()
    progress.markRead('section-a', { title: 'A', type: 'knowledge' })
    progress.toggleFavorite('section-a', { title: 'A' })

    expect(progress.isFavorite('section-a')).toBe(true)
    progress.clearHistory()
    expect(progress.isRead('section-a')).toBe(false)
    expect(progress.getRecent()).toEqual([])
    expect(progress.isFavorite('section-a')).toBe(true)

    progress.toggleFavorite('section-a')
    expect(progress.isFavorite('section-a')).toBe(false)
  })

  it('limits recent history and recovers from corrupted cache', async () => {
    let progress = await loadModule()
    for (let index = 0; index < 10; index += 1) {
      progress.markRead(`section-${index}`, { title: String(index), type: 'knowledge' })
    }
    expect(progress.getRecent()).toHaveLength(8)
    expect(progress.getRecent()[0].slug).toBe('section-9')

    localStorage.setItem(STORAGE_KEY, '{broken json')
    progress = await loadModule()
    expect(progress.getRecent()).toEqual([])
    expect(progress.isRead('section-9')).toBe(false)
  })
})
