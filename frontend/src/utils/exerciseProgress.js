import { reactive } from 'vue'
import { enqueue, registerStore } from './syncClient'

const STORAGE_KEY = 'mathapp_exercise_progress_v1'

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { problems: {} }
    const parsed = JSON.parse(raw)
    return {
      problems: parsed.problems && typeof parsed.problems === 'object' ? parsed.problems : {},
    }
  } catch (err) {
    return { problems: {} }
  }
}

const state = reactive(loadState())

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ problems: state.problems }))
  } catch (err) {
    // localStorage 不可用时不阻断刷题流程。
  }
}

function ensureProblem(problemKey, meta = {}) {
  if (!problemKey) return null
  if (!state.problems[problemKey]) {
    state.problems[problemKey] = {
      done: false,
      wrong: false,
      favorite: false,
      addedToWrongBook: false,
      meta: {},
      updatedAt: Date.now(),
    }
  }
  state.problems[problemKey].meta = {
    ...state.problems[problemKey].meta,
    ...meta,
  }
  return state.problems[problemKey]
}

// 每次做题状态变化后，把这道题的完整状态镜像到服务端（登录时才真正发出）。
function syncProblem(problemKey) {
  const problem = state.problems[problemKey]
  if (!problem) return
  const meta = problem.meta || {}
  enqueue({
    kind: 'problem',
    key: problemKey,
    payload: {
      problem_key: problemKey,
      done: problem.done,
      wrong: problem.wrong,
      favorite: problem.favorite,
      in_wrong_book: problem.addedToWrongBook,
      title: meta.title || undefined,
      section_slug: meta.sectionSlug || undefined,
      section_title: meta.sectionTitle || undefined,
      course_slug: meta.courseSlug || undefined,
      course_title: meta.courseTitle || undefined,
      problem_type: meta.problemType || undefined,
      difficulty: meta.difficulty || undefined,
      knowledge: Array.isArray(meta.knowledge) ? meta.knowledge : undefined,
      tags: Array.isArray(meta.tags) ? meta.tags : undefined,
    },
  })
}

export function getProblemState(problemKey) {
  return problemKey ? state.problems[problemKey] : null
}

export function isProblemDone(problemKey) {
  return Boolean(getProblemState(problemKey)?.done)
}

export function isProblemWrong(problemKey) {
  return Boolean(getProblemState(problemKey)?.wrong)
}

export function isProblemFavorite(problemKey) {
  return Boolean(getProblemState(problemKey)?.favorite)
}

export function isInWrongBook(problemKey) {
  return Boolean(getProblemState(problemKey)?.addedToWrongBook)
}

export function markProblemDone(problemKey, meta = {}) {
  const problem = ensureProblem(problemKey, meta)
  if (!problem) return
  problem.done = true
  problem.wrong = false
  problem.updatedAt = Date.now()
  persist()
  syncProblem(problemKey)
}

export function markProblemWrong(problemKey, meta = {}) {
  const problem = ensureProblem(problemKey, meta)
  if (!problem) return
  problem.done = true
  problem.wrong = true
  problem.addedToWrongBook = true
  problem.updatedAt = Date.now()
  persist()
  syncProblem(problemKey)
}

export function toggleProblemFavorite(problemKey, meta = {}) {
  const problem = ensureProblem(problemKey, meta)
  if (!problem) return
  problem.favorite = !problem.favorite
  problem.updatedAt = Date.now()
  persist()
  syncProblem(problemKey)
}

export function toggleWrongBook(problemKey, meta = {}) {
  const problem = ensureProblem(problemKey, meta)
  if (!problem) return
  problem.addedToWrongBook = !problem.addedToWrongBook
  if (problem.addedToWrongBook) problem.wrong = true
  problem.done = problem.done || problem.addedToWrongBook
  problem.updatedAt = Date.now()
  persist()
  syncProblem(problemKey)
}

export function resetProblemState(problemKey) {
  if (!problemKey) return
  // 逻辑清零：本地删掉，服务端置为全 False（保持可同步，不物理删除记录）。
  const existed = Boolean(state.problems[problemKey])
  delete state.problems[problemKey]
  persist()
  if (existed) {
    enqueue({
      kind: 'problem',
      key: problemKey,
      payload: {
        problem_key: problemKey,
        done: false,
        wrong: false,
        favorite: false,
        in_wrong_book: false,
      },
    })
  }
}

export function getWrongBook() {
  return Object.entries(state.problems)
    .filter(([, problem]) => problem.addedToWrongBook)
    .map(([problemKey, problem]) => ({ problemKey, ...problem }))
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

// ---- 与后端同步 ----

function serializeLocal() {
  const problems = Object.entries(state.problems).map(([problemKey, problem]) => {
    const meta = problem.meta || {}
    return {
      problem_key: problemKey,
      done: Boolean(problem.done),
      wrong: Boolean(problem.wrong),
      favorite: Boolean(problem.favorite),
      in_wrong_book: Boolean(problem.addedToWrongBook),
      title: meta.title || '',
      section_slug: meta.sectionSlug || '',
      section_title: meta.sectionTitle || '',
      course_slug: meta.courseSlug || '',
      course_title: meta.courseTitle || '',
      problem_type: meta.problemType || '',
      difficulty: meta.difficulty || '',
      knowledge: Array.isArray(meta.knowledge) ? meta.knowledge : [],
      tags: Array.isArray(meta.tags) ? meta.tags : [],
    }
  })
  return { problems }
}

function hydrate(snapshot) {
  const rows = Array.isArray(snapshot?.problems) ? snapshot.problems : []
  const problems = {}
  for (const row of rows) {
    if (!row?.problem_key) continue
    problems[row.problem_key] = {
      done: Boolean(row.done),
      wrong: Boolean(row.wrong),
      favorite: Boolean(row.favorite),
      addedToWrongBook: Boolean(row.in_wrong_book),
      meta: {
        title: row.title || '',
        sectionSlug: row.section_slug || '',
        sectionTitle: row.section_title || '',
        courseSlug: row.course_slug || '',
        courseTitle: row.course_title || '',
        problemType: row.problem_type || '',
        difficulty: row.difficulty || '',
        knowledge: Array.isArray(row.knowledge) ? row.knowledge : [],
        tags: Array.isArray(row.tags) ? row.tags : [],
      },
      updatedAt: row.updated_at_ms || (row.updated_at ? Date.parse(row.updated_at) : Date.now()),
    }
  }
  state.problems = problems
  persist()
}

registerStore({ serializeLocal, hydrate })

export const exerciseProgressState = state
