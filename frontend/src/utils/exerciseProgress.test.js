import { beforeEach, describe, expect, it, vi } from 'vitest'

const STORAGE_KEY = 'mathapp_exercise_progress_v1'

async function loadModule() {
  vi.resetModules()
  return import('./exerciseProgress')
}

beforeEach(() => {
  localStorage.clear()
})

describe('exerciseProgress', () => {
  it('switches done and wrong states and persists metadata', async () => {
    const progress = await loadModule()
    progress.markProblemWrong('p-1', { title: '题目 1' })

    expect(progress.getProblemState('p-1')).toMatchObject({
      done: true,
      wrong: true,
      addedToWrongBook: true,
      meta: { title: '题目 1' },
    })

    progress.markProblemDone('p-1')
    expect(progress.isProblemDone('p-1')).toBe(true)
    expect(progress.isProblemWrong('p-1')).toBe(false)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)).problems['p-1'].done).toBe(true)
  })

  it('toggles favorite and wrong-book state and can reset a problem', async () => {
    const progress = await loadModule()
    progress.toggleProblemFavorite('p-2')
    progress.toggleWrongBook('p-2')

    expect(progress.isProblemFavorite('p-2')).toBe(true)
    expect(progress.isInWrongBook('p-2')).toBe(true)
    expect(progress.getWrongBook().map((item) => item.problemKey)).toEqual(['p-2'])

    progress.toggleProblemFavorite('p-2')
    progress.toggleWrongBook('p-2')
    expect(progress.isProblemFavorite('p-2')).toBe(false)
    expect(progress.isInWrongBook('p-2')).toBe(false)

    progress.resetProblemState('p-2')
    expect(progress.getProblemState('p-2')).toBeUndefined()
  })

  it('recovers from corrupted or structurally invalid cache', async () => {
    localStorage.setItem(STORAGE_KEY, '{broken json')
    let progress = await loadModule()
    expect(progress.getWrongBook()).toEqual([])

    localStorage.setItem(STORAGE_KEY, JSON.stringify({ problems: 'invalid' }))
    progress = await loadModule()
    expect(progress.getProblemState('missing')).toBeUndefined()
  })
})
