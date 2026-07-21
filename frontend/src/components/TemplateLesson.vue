<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import LessonItem from './lesson/LessonItem.vue'
import { parseTemplate } from '../utils/templateParser'
import {
  getProblemState,
  isInWrongBook,
  isProblemFavorite,
  markProblemDone,
  markProblemWrong,
  toggleProblemFavorite,
  toggleWrongBook,
} from '../utils/exerciseProgress'

const props = defineProps({
  source: {
    type: String,
    required: true,
  },
  fallbackTitle: {
    type: String,
    default: '未命名内容',
  },
  type: {
    type: String,
    default: 'knowledge',
  },
  sectionSlug: {
    type: String,
    default: '',
  },
  courseSlug: {
    type: String,
    default: '',
  },
  courseTitle: {
    type: String,
    default: '',
  },
  exerciseFilters: {
    type: Object,
    default: () => ({}),
  },
  favorite: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['toggle-favorite'])

const openIds = ref(new Set())
const activeId = ref('')
let removeScrollListeners = null

const page = computed(() => parseTemplate(props.source, props.fallbackTitle))
const isExercise = computed(() => props.type === 'exercise')
const normalizedFilters = computed(() => ({
  type: props.exerciseFilters.type || '全部',
  difficulty: props.exerciseFilters.difficulty || '全部',
  status: props.exerciseFilters.status || '全部',
  keyword: String(props.exerciseFilters.keyword || '').trim().toLowerCase(),
}))

function problemKey(item) {
  return `${props.sectionSlug || props.fallbackTitle}:${item.id}`
}

function problemMeta(item) {
  return {
    title: item.title,
    sectionSlug: props.sectionSlug,
    sectionTitle: props.fallbackTitle,
    courseSlug: props.courseSlug,
    courseTitle: props.courseTitle,
    problemType: item.problemType,
    difficulty: item.difficulty,
    knowledge: item.knowledge,
    tags: item.tags,
  }
}

function itemMatchesFilter(item) {
  if (!isExercise.value || item.kind !== 'problem') return true

  const filters = normalizedFilters.value
  const key = problemKey(item)
  const state = getProblemState(key)

  if (filters.type !== '全部' && item.problemType !== filters.type) return false
  if (filters.difficulty !== '全部' && item.difficulty !== filters.difficulty) return false

  if (filters.status === '未做' && state?.done) return false
  if (filters.status === '已做' && !state?.done) return false
  if (filters.status === '做错' && !state?.wrong) return false
  if (filters.status === '收藏' && !state?.favorite) return false
  if (filters.status === '错题本' && !state?.addedToWrongBook) return false

  if (filters.keyword) {
    const haystack = [
      item.title,
      item.problemType,
      item.difficulty,
      ...(item.knowledge || []),
      ...(item.tags || []),
      item.body,
    ]
      .join(' ')
      .toLowerCase()
    if (!haystack.includes(filters.keyword)) return false
  }

  return true
}

const filteredSubsections = computed(() => {
  if (!isExercise.value) return page.value.subsections

  return page.value.subsections
    .map((sub) => ({
      ...sub,
      items: sub.items.filter(itemMatchesFilter),
    }))
    .filter((sub) => sub.items.length)
})

const problemCounts = computed(() => {
  const allProblems = page.value.subsections.flatMap((sub) =>
    sub.items.filter((item) => item.kind === 'problem'),
  )
  const shownProblems = filteredSubsections.value.flatMap((sub) =>
    sub.items.filter((item) => item.kind === 'problem'),
  )
  const done = allProblems.filter((item) => getProblemState(problemKey(item))?.done).length
  const wrong = allProblems.filter((item) => getProblemState(problemKey(item))?.wrong).length
  return { all: allProblems.length, shown: shownProblems.length, done, wrong }
})

const collapsibleIds = computed(() =>
  filteredSubsections.value.flatMap((sub) =>
    sub.items.filter((item) => item.solution).map((item) => item.id),
  ),
)

const toc = computed(() => [
  {
    id: page.value.section.id,
    label: page.value.section.num
      ? `Section ${page.value.section.num} ${page.value.section.title}`
      : page.value.section.title,
    className: 'sec-link',
  },
  ...filteredSubsections.value.map((sub) => ({
    id: sub.id,
    label: sub.num ? `${sub.num} ${sub.title}` : sub.title,
    className: 'sub-link',
  })),
])

watch(
  () => props.source,
  () => {
    openIds.value = new Set()
    nextTick(setupSpy)
  },
)

onMounted(setupSpy)
onUnmounted(() => {
  if (removeScrollListeners) removeScrollListeners()
})

function toggleOpen(id) {
  const next = new Set(openIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  openIds.value = next
}

function expandAll() {
  openIds.value = new Set(collapsibleIds.value)
}

function collapseAll() {
  openIds.value = new Set()
}

function handleMarkDone(item) {
  markProblemDone(problemKey(item), problemMeta(item))
}

function handleMarkWrong(item) {
  markProblemWrong(problemKey(item), problemMeta(item))
}

function handleToggleProblemFavorite(item) {
  toggleProblemFavorite(problemKey(item), problemMeta(item))
}

function handleToggleWrongBook(item) {
  toggleWrongBook(problemKey(item), problemMeta(item))
}

function scrollToId(id) {
  const target = document.getElementById(id)
  if (!target) return
  const rect = target.getBoundingClientRect()
  const y = window.scrollY + rect.top - window.innerHeight / 2 + rect.height / 2
  window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
}

function setupSpy() {
  if (removeScrollListeners) removeScrollListeners()
  const ids = toc.value.map((item) => item.id)

  const update = () => {
    const middle = window.innerHeight * 0.46
    let bestId = ids[0] || ''
    let bestDistance = Number.POSITIVE_INFINITY

    ids.forEach((id) => {
      const element = document.getElementById(id)
      if (!element) return
      const rect = element.getBoundingClientRect()
      const distance = Math.abs(rect.top - middle)
      if (rect.top <= middle + 120 && distance < bestDistance) {
        bestDistance = distance
        bestId = id
      }
    })

    activeId.value = bestId
  }

  let ticking = false
  const onScroll = () => {
    if (ticking) return
    ticking = true
    requestAnimationFrame(() => {
      ticking = false
      update()
    })
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  removeScrollListeners = () => {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
  }
  update()
}

</script>

<template>
  <div class="template-lesson" :class="`template-lesson-${type}`">
    <div class="template-layout">
      <div class="template-main">
        <div v-if="page.chapter" class="crumb">
          Chapter {{ page.chapter.num }} · {{ page.chapter.title }}
        </div>

        <header :id="page.section.id" class="sec-head">
          <h1 class="sec-title">
            <span v-if="page.section.num" class="tag">Section {{ page.section.num }}</span>
            {{ page.section.title }}
          </h1>
          <div class="sec-rule"></div>
        </header>

        <p v-if="isExercise && !filteredSubsections.length" class="state-hint">
          没有符合当前筛选条件的题目
        </p>

        <section v-for="sub in filteredSubsections" :id="sub.id" :key="sub.id" class="sub">
          <h2 class="sub-title">
            <span v-if="sub.num" class="tag">{{ sub.num }}</span>
            {{ sub.title }}
          </h2>

          <div class="items">
            <template v-for="item in sub.items" :key="item.id">
              <LessonItem
                :item="item"
                :status="item.kind === 'problem' ? getProblemState(problemKey(item)) : null"
                :is-favorite="item.kind === 'problem' && isProblemFavorite(problemKey(item))"
                :in-wrong-book="item.kind === 'problem' && isInWrongBook(problemKey(item))"
                :is-open="openIds.has(item.id)"
                @toggle="toggleOpen"
                @mark-done="handleMarkDone"
                @mark-wrong="handleMarkWrong"
                @toggle-favorite="handleToggleProblemFavorite"
                @toggle-wrong-book="handleToggleWrongBook"
              />
            </template>
          </div>
        </section>
      </div>

      <aside class="template-toc">
        <div class="toc-actions" aria-label="内容展开控制">
          <button type="button" @click="expandAll">全部展开</button>
          <button type="button" @click="collapseAll">全部折叠</button>
        </div>
        <div class="toc-lab">本页内容</div>
        <nav>
          <button
            v-for="item in toc"
            :key="item.id"
            type="button"
            :class="[item.className, { active: activeId === item.id }]"
            @click="scrollToId(item.id)"
          >
            {{ item.label }}
          </button>
        </nav>
      </aside>
    </div>
  </div>
</template>
