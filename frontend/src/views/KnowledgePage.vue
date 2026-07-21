<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import LockedContent from '../components/LockedContent.vue'
import RequestState from '../components/RequestState.vue'
import SubjectSidebar from '../components/SubjectSidebar.vue'
import TemplateLesson from '../components/TemplateLesson.vue'
import { content as contentApi } from '../api'
import { authState } from '../auth'
import {
  clearHistory,
  getRecent,
  isFavorite,
  isRead,
  markRead,
  toggleFavorite,
} from '../utils/learningProgress'

const route = useRoute()
const router = useRouter()

const courses = ref([])
const coursesLoading = ref(true)
const coursesError = ref('')
const routeNotice = ref('')

const selectedCourseSlug = ref(null)
const courseDetail = ref(null)
const courseLoading = ref(false)
const courseError = ref('')

const selectedSectionSlug = ref(null)
const sectionContent = ref('')
const contentLoading = ref(false)
const contentError = ref('')
const accessDenied = ref(false)

let courseController = null
let contentController = null
let courseRequestId = 0
let contentRequestId = 0

const isMember = computed(() => Boolean(authState.user?.is_member))
const isLoggedIn = computed(() => Boolean(authState.user))

const sections = computed(() => {
  if (!courseDetail.value) return []
  return courseDetail.value.chapters.flatMap((chapter) =>
    chapter.sections.map((section) => ({ ...section, chapter: chapter.title })),
  )
})

const selectedSection = computed(
  () => sections.value.find((section) => section.slug === selectedSectionSlug.value) ?? null,
)
const hasCatalogAccess = computed(
  () => selectedSection.value?.access !== 'member' || isMember.value,
)
const hasAccess = computed(() => hasCatalogAccess.value && !accessDenied.value)

const currentIndex = computed(() =>
  sections.value.findIndex((section) => section.slug === selectedSectionSlug.value),
)
const previousSection = computed(() =>
  currentIndex.value > 0 ? sections.value[currentIndex.value - 1] : null,
)
const nextSection = computed(() => sections.value[currentIndex.value + 1])
const recentSections = computed(() => getRecent('knowledge'))

function queryValue(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function cancelCourseRequest() {
  courseRequestId += 1
  courseController?.abort()
  courseController = null
}

function cancelContentRequest() {
  contentRequestId += 1
  contentController?.abort()
  contentController = null
}

function resetReader() {
  cancelCourseRequest()
  cancelContentRequest()
  selectedCourseSlug.value = null
  courseDetail.value = null
  courseError.value = ''
  courseLoading.value = false
  selectedSectionSlug.value = null
  sectionContent.value = ''
  contentError.value = ''
  contentLoading.value = false
  accessDenied.value = false
}

async function returnToCourseList(message) {
  routeNotice.value = message
  resetReader()
  if (route.query.course || route.query.section) {
    await router.replace({ path: '/knowledge', query: {} })
  }
}

async function loadCourses() {
  coursesLoading.value = true
  coursesError.value = ''
  try {
    courses.value = await contentApi.listCourses()
  } catch (err) {
    if (err.kind !== 'aborted') {
      coursesError.value = err.message || '课程列表加载失败'
    }
  } finally {
    coursesLoading.value = false
  }
}

async function syncFromRoute() {
  const courseSlug = queryValue(route.query.course)
  const sectionSlug = queryValue(route.query.section)

  if (!courseSlug) {
    if (sectionSlug) {
      await returnToCourseList('链接缺少课程信息，请重新选择课程。')
    } else if (selectedCourseSlug.value) {
      resetReader()
    }
    return
  }

  routeNotice.value = ''

  if (selectedCourseSlug.value === courseSlug && courseDetail.value) {
    if (sectionSlug) {
      if (!sections.value.some((section) => section.slug === sectionSlug)) {
        await returnToCourseList('链接中的知识小节不存在或已下线，请重新选择。')
        return
      }
      selectedSectionSlug.value = sectionSlug
      return
    }

    const firstSection = sections.value[0]
    if (firstSection) {
      await router.replace({
        path: '/knowledge',
        query: { course: courseSlug, section: firstSection.slug },
      })
    }
    return
  }

  cancelCourseRequest()
  cancelContentRequest()
  const requestId = courseRequestId
  courseController = new AbortController()
  selectedCourseSlug.value = courseSlug
  courseDetail.value = null
  courseError.value = ''
  selectedSectionSlug.value = null
  sectionContent.value = ''
  courseLoading.value = true

  try {
    const detail = await contentApi.getCourse(courseSlug, { signal: courseController.signal })
    if (requestId !== courseRequestId) return
    courseDetail.value = detail

    const availableSections = detail.chapters.flatMap((chapter) => chapter.sections)
    if (sectionSlug) {
      if (!availableSections.some((section) => section.slug === sectionSlug)) {
        await returnToCourseList('链接中的知识小节不存在或已下线，请重新选择。')
        return
      }
      selectedSectionSlug.value = sectionSlug
      return
    }

    const firstSection = availableSections[0]
    if (firstSection) {
      await router.replace({
        path: '/knowledge',
        query: { course: courseSlug, section: firstSection.slug },
      })
    }
  } catch (err) {
    if (requestId !== courseRequestId || err.kind === 'aborted') return
    if (err.status === 404) {
      await returnToCourseList('链接中的课程不存在或已下线，请重新选择。')
    } else {
      courseError.value = err.message || '课程目录加载失败'
    }
  } finally {
    if (requestId === courseRequestId) courseLoading.value = false
  }
}

async function loadSectionContent() {
  cancelContentRequest()
  accessDenied.value = false
  contentError.value = ''

  if (!selectedSection.value || !hasCatalogAccess.value) {
    sectionContent.value = ''
    contentLoading.value = false
    return
  }

  const requestId = contentRequestId
  contentController = new AbortController()
  contentLoading.value = true
  sectionContent.value = ''

  try {
    const data = await contentApi.getSectionContent(selectedSection.value.slug, {
      signal: contentController.signal,
    })
    if (requestId !== contentRequestId) return
    sectionContent.value = data.content || ''
    markRead(selectedSection.value.slug, {
      title: selectedSection.value.title,
      courseSlug: selectedCourseSlug.value,
      courseTitle: courseDetail.value?.title,
      type: 'knowledge',
    })
  } catch (err) {
    if (requestId !== contentRequestId || err.kind === 'aborted') return
    if (err.status === 403) {
      accessDenied.value = true
    } else if (err.status === 404) {
      await returnToCourseList('该知识小节不存在或已下线，请重新选择。')
    } else {
      contentError.value = err.message || '内容加载失败'
    }
  } finally {
    if (requestId === contentRequestId) contentLoading.value = false
  }
}

function selectCourse(course) {
  routeNotice.value = ''
  router.push({ path: '/knowledge', query: { course: course.slug } })
}

function selectRecent(entry) {
  routeNotice.value = ''
  router.push({
    path: '/knowledge',
    query: { course: entry.courseSlug, section: entry.slug },
  })
}

function selectSection(section) {
  router.push({
    path: '/knowledge',
    query: { course: selectedCourseSlug.value, section: section.slug },
  })
}

function backToCourseList() {
  routeNotice.value = ''
  router.push({ path: '/knowledge', query: {} })
}

function handleToggleFavorite() {
  if (!selectedSection.value || !courseDetail.value) return
  toggleFavorite(selectedSection.value.slug, {
    title: selectedSection.value.title,
    courseSlug: selectedCourseSlug.value,
    courseTitle: courseDetail.value.title,
    type: 'knowledge',
  })
}

watch(
  () => [route.query.course, route.query.section],
  syncFromRoute,
  { immediate: true },
)
watch(selectedSectionSlug, loadSectionContent)
watch(isMember, loadSectionContent)

onBeforeUnmount(() => {
  cancelCourseRequest()
  cancelContentRequest()
})

loadCourses()
</script>

<template>
  <section v-if="!selectedCourseSlug" class="content-section course-select-section">
    <div class="section-heading">
      <p>知识库</p>
      <h2>先选择一门课程</h2>
    </div>

    <RequestState
      v-if="routeNotice"
      kind="notice"
      title="已返回课程选择"
      :message="routeNotice"
    />

    <div v-if="recentSections.length" class="recent-panel">
      <span class="recent-label">最近学习</span>
      <div class="recent-list">
        <button
          v-for="entry in recentSections"
          :key="entry.slug"
          type="button"
          class="recent-chip"
          @click="selectRecent(entry)"
        >
          <strong>{{ entry.title }}</strong>
          <small>{{ entry.courseTitle }}</small>
        </button>
      </div>
    </div>

    <RequestState v-if="coursesLoading" kind="loading" title="课程列表加载中" />
    <RequestState
      v-else-if="coursesError"
      title="课程列表加载失败"
      :message="coursesError"
      retryable
      @retry="loadCourses"
    />
    <RequestState
      v-else-if="!courses.length"
      kind="empty"
      title="暂无已发布课程"
      message="课程发布后会显示在这里。"
    />
    <div v-else class="course-select-grid">
      <article v-for="course in courses" :key="course.slug" class="select-card">
        <span>{{ course.audience }}</span>
        <h3>{{ course.title }}</h3>
        <p>{{ course.description }}</p>
        <button type="button" @click="selectCourse(course)">进入课程</button>
      </article>
    </div>
  </section>

  <section v-else class="learning-shell template-learning-shell">
    <div v-if="courseLoading || courseError" class="content-section reader-state-shell">
      <RequestState v-if="courseLoading" kind="loading" title="课程目录加载中" />
      <RequestState
        v-else
        title="课程目录加载失败"
        :message="courseError"
        retryable
        @retry="syncFromRoute"
      />
      <button type="button" class="back-link" @click="backToCourseList">返回课程选择</button>
    </div>

    <template v-else-if="courseDetail">
      <SubjectSidebar
        :title="courseDetail.title"
        :chapters="courseDetail.chapters"
        :active-id="selectedSectionSlug"
        :is-member="isMember"
        :is-read="isRead"
        :is-favorite="isFavorite"
        @select="selectSection"
        @back="backToCourseList"
        @clear-history="clearHistory"
      />

      <article class="content-section knowledge-reader template-reader-shell">
        <RequestState v-if="contentLoading" kind="loading" title="正文加载中" />
        <RequestState
          v-else-if="contentError"
          title="正文加载失败"
          :message="contentError"
          retryable
          @retry="loadSectionContent"
        />
        <RequestState
          v-else-if="!selectedSection"
          kind="empty"
          title="该课程暂无知识内容"
          message="请返回课程列表选择其他课程。"
        />
        <TemplateLesson
          v-else-if="hasAccess && sectionContent"
          :source="sectionContent"
          :fallback-title="selectedSection.title"
          :favorite="isFavorite(selectedSectionSlug)"
          type="knowledge"
          @toggle-favorite="handleToggleFavorite"
        />
        <RequestState
          v-else-if="hasAccess"
          kind="empty"
          title="该小节暂无正文"
          message="目录已经发布，但正文内容尚未录入。"
        />
        <LockedContent
          v-else
          :title="selectedSection?.title"
          :logged-in="isLoggedIn"
        />

        <footer v-if="previousSection || nextSection" class="reader-footer">
          <button v-if="previousSection" type="button" class="prev-btn" @click="selectSection(previousSection)">
            上一节：{{ previousSection.title }}
          </button>
          <button v-if="nextSection" type="button" class="next-btn" @click="selectSection(nextSection)">
            下一节：{{ nextSection.title }}
          </button>
        </footer>
      </article>
    </template>
  </section>
</template>
