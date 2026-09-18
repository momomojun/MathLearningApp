import { beforeEach, describe, expect, it } from 'vitest'
import { markIntroPlayed, resetIntroGate, shouldPlayIntro } from './introGate'

/** 造一个假的 window，只带闸门用得到的那两样东西 */
function fakeWin({ search = '', reduced = false } = {}) {
  return {
    location: { search },
    matchMedia: (q) => ({ matches: reduced && q.includes('reduce') }),
  }
}

describe('introGate', () => {
  beforeEach(() => resetIntroGate())

  it('这次加载还没放过就放', () => {
    expect(shouldPlayIntro(fakeWin())).toBe(true)
  })

  it('放过之后站内再进首页就不放了', () => {
    expect(shouldPlayIntro(fakeWin())).toBe(true)
    markIntroPlayed()
    expect(shouldPlayIntro(fakeWin())).toBe(false)
  })

  it('刷新相当于模块重新求值，闸门复位后又能放', () => {
    markIntroPlayed()
    expect(shouldPlayIntro(fakeWin())).toBe(false)
    resetIntroGate() // 等价于整页重新加载
    expect(shouldPlayIntro(fakeWin())).toBe(true)
  })

  it('?intro=1 强制放，放过了也照放', () => {
    markIntroPlayed()
    expect(shouldPlayIntro(fakeWin({ search: '?intro=1' }))).toBe(true)
  })

  it('?intro=1 的优先级高于减少动效——那是自己演示时手动加的', () => {
    expect(shouldPlayIntro(fakeWin({ search: '?intro=1', reduced: true }))).toBe(true)
  })

  it('用户要求减少动效就不放', () => {
    expect(shouldPlayIntro(fakeWin({ reduced: true }))).toBe(false)
  })

  it('其他 query 参数不会误触发', () => {
    expect(shouldPlayIntro(fakeWin({ search: '?intro=0' }))).toBe(true)
    markIntroPlayed()
    expect(shouldPlayIntro(fakeWin({ search: '?intro=0' }))).toBe(false)
    expect(shouldPlayIntro(fakeWin({ search: '?course=calculus' }))).toBe(false)
  })

  it('没有 window（SSR / 预渲染）时不放，也不抛错', () => {
    expect(shouldPlayIntro(null)).toBe(false)
  })

  it('window 上缺 matchMedia 也不抛错', () => {
    expect(shouldPlayIntro({ location: { search: '' } })).toBe(true)
  })
})
