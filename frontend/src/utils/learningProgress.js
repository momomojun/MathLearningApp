// 学习状态：已读、收藏、最近学习。
//
// 本地 localStorage 始终是即时缓存：未登录用户只用它；登录用户在本地更新的
// 同时，把每次操作镜像到服务端（见 syncClient），并在登录时用服务端快照水合。
// 页面组件只依赖下面导出的这几个函数，不需要关心是否登录、是否联网。

import { reactive } from 'vue'
import { enqueue, registerStore } from './syncClient'

const STORAGE_KEY = 'mathapp_learning_progress_v1'
const MAX_RECENT = 8

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { read: {}, favorites: {}, recent: [] }
    const parsed = JSON.parse(raw)
    return {
      read: parsed.read && typeof parsed.read === 'object' ? parsed.read : {},
      favorites: parsed.favorites && typeof parsed.favorites === 'object' ? parsed.favorites : {},
      recent: Array.isArray(parsed.recent) ? parsed.recent : [],
    }
  } catch (err) {
    return { read: {}, favorites: {}, recent: [] }
  }
}

const state = reactive(loadState())

function persist() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ read: state.read, favorites: state.favorites, recent: state.recent }),
    )
  } catch (err) {
    // 隐私模式或存储被禁用时静默忽略，不影响正常浏览
  }
}

// 把本地 meta（驼峰）转成服务端小节字段（下划线）。
function sectionPayload(slug, meta = {}) {
  return {
    slug,
    kind: meta.type || undefined,
    title: meta.title || undefined,
    course_slug: meta.courseSlug || undefined,
    course_title: meta.courseTitle || undefined,
  }
}

export function isRead(slug) {
  return Boolean(slug && state.read[slug])
}

export function isFavorite(slug) {
  return Boolean(slug && state.favorites[slug])
}

/**
 * 把某个小节加入"最近学习"，并标记为已读。
 * @param {string} slug 小节标识
 * @param {{title: string, courseSlug: string, courseTitle: string, type: 'knowledge'|'exercise'}} meta
 */
export function markRead(slug, meta) {
  if (!slug) return
  state.read[slug] = true
  state.recent = [
    { slug, at: Date.now(), ...meta },
    ...state.recent.filter((item) => item.slug !== slug),
  ].slice(0, MAX_RECENT)
  persist()
  enqueue({ kind: 'section', key: slug, payload: { ...sectionPayload(slug, meta), mark_recent: true } })
}

export function toggleFavorite(slug, meta) {
  if (!slug) return
  if (state.favorites[slug]) {
    delete state.favorites[slug]
  } else {
    state.favorites[slug] = { ...meta, at: Date.now() }
  }
  persist()
  enqueue({
    kind: 'section',
    key: slug,
    payload: { ...sectionPayload(slug, meta), is_favorite: Boolean(state.favorites[slug]) },
  })
}

export function getRecent(type) {
  const list = state.recent.filter((item) => item.slug)
  return type ? list.filter((item) => item.type === type) : list
}

/**
 * 只清"已读"和"最近学习"，不动收藏——收藏是用户主动选的，不该被这个按钮误清掉。
 */
export function clearHistory() {
  state.read = {}
  state.recent = []
  persist()
  enqueue({ kind: 'clear', key: 'clear' })
}

// ---- 与后端同步：导出本地记录用于首登合并，以及用服务端快照水合本地 ----

function serializeLocal() {
  const slugs = new Set([
    ...Object.keys(state.read),
    ...Object.keys(state.favorites),
    ...state.recent.map((item) => item.slug),
  ])
  const sections = []
  for (const slug of slugs) {
    if (!slug) continue
    const fav = state.favorites[slug]
    const recent = state.recent.find((item) => item.slug === slug)
    const meta = fav || recent || {}
    sections.push({
      slug,
      kind: meta.type || 'knowledge',
      is_read: Boolean(state.read[slug]),
      is_favorite: Boolean(fav),
      title: meta.title || '',
      course_slug: meta.courseSlug || '',
      course_title: meta.courseTitle || '',
      last_read_at_ms: recent ? recent.at : undefined,
      favorited_at_ms: fav ? fav.at : undefined,
    })
  }
  return { sections }
}

function toMs(iso) {
  const t = iso ? Date.parse(iso) : NaN
  return Number.isNaN(t) ? Date.now() : t
}

function hydrate(snapshot) {
  const rows = Array.isArray(snapshot?.sections) ? snapshot.sections : []
  const read = {}
  const favorites = {}
  const recent = []
  for (const row of rows) {
    if (!row?.slug) continue
    const meta = {
      title: row.title || '',
      courseSlug: row.course_slug || '',
      courseTitle: row.course_title || '',
      type: row.kind || 'knowledge',
    }
    if (row.is_read) read[row.slug] = true
    if (row.is_favorite) {
      favorites[row.slug] = { ...meta, at: toMs(row.favorited_at) }
    }
    if (row.last_read_at) {
      recent.push({ slug: row.slug, at: row.at || toMs(row.last_read_at), ...meta })
    }
  }
  recent.sort((a, b) => b.at - a.at)
  state.read = read
  state.favorites = favorites
  state.recent = recent.slice(0, MAX_RECENT)
  persist()
}

registerStore({ serializeLocal, hydrate })

export const progressState = state
