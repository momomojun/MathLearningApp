<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  title: {
    type: String,
    default: '章节目录',
  },
  chapters: {
    type: Array,
    default: () => [],
  },
  activeId: {
    type: String,
    default: '',
  },
  isMember: {
    type: Boolean,
    default: false,
  },
  isRead: {
    type: Function,
    default: () => false,
  },
  isFavorite: {
    type: Function,
    default: () => false,
  },
})

const emit = defineEmits(['select', 'clear-history', 'back'])

const query = ref('')
const openChapters = ref(new Set())

function chapterKey(chapter) {
  return String(chapter.id ?? chapter.title)
}

function isOpen(chapter) {
  return openChapters.value.has(chapterKey(chapter))
}

function toggleChapter(chapter) {
  const key = chapterKey(chapter)
  const next = new Set(openChapters.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  openChapters.value = next
}

function expandChapterOf(slug) {
  if (!slug) return
  const chapter = props.chapters.find((item) =>
    item.sections.some((section) => section.slug === slug),
  )
  if (!chapter) return
  const key = chapterKey(chapter)
  if (!openChapters.value.has(key)) {
    openChapters.value = new Set(openChapters.value).add(key)
  }
}

watch(
  () => props.activeId,
  (slug) => expandChapterOf(slug),
  { immediate: true },
)

watch(
  () => props.chapters,
  () => expandChapterOf(props.activeId),
)

const normalizedQuery = computed(() => query.value.trim().toLowerCase())

const isSearching = computed(() => normalizedQuery.value.length > 0)

const filteredChapters = computed(() => {
  if (!isSearching.value) return props.chapters

  return props.chapters
    .map((chapter) => {
      const sections = chapter.sections.filter((section) => {
        const haystack = section.title.toLowerCase()
        return haystack.includes(normalizedQuery.value)
      })
      return { ...chapter, sections }
    })
    .filter((chapter) => chapter.sections.length > 0)
})

function isChapterExpanded(chapter) {
  return isSearching.value || isOpen(chapter)
}
</script>

<template>
  <aside class="subject-sidebar" aria-label="章节目录">
    <button type="button" class="sidebar-back-link" @click="emit('back')">
      返回课程选择
    </button>
    <p class="sidebar-title">{{ title }}</p>

    <div class="sidebar-search">
      <input
        v-model="query"
        type="search"
        placeholder="搜索本课程的知识点..."
        aria-label="搜索章节"
      />
    </div>

    <p v-if="isSearching && !filteredChapters.length" class="sidebar-empty">没有找到匹配的内容</p>

    <section v-for="chapter in filteredChapters" :key="chapterKey(chapter)" class="subject-block">
      <button
        type="button"
        class="chapter-toggle"
        :class="{ open: isChapterExpanded(chapter) }"
        @click="toggleChapter(chapter)"
      >
        <span class="chapter-chevron">›</span>
        <h3>{{ chapter.title }}</h3>
      </button>

      <div v-show="isChapterExpanded(chapter)" class="chapter-block">
        <ul>
          <li v-for="section in chapter.sections" :key="section.slug">
            <button
              class="section-link"
              :class="{ active: activeId === section.slug }"
              type="button"
              @click="emit('select', section)"
            >
              <span class="section-link-top">
                <span class="section-status">
                  <em v-if="isRead(section.slug)" class="status-dot read-dot" title="已学">✓</em>
                  <em v-if="isFavorite(section.slug)" class="status-dot fav-dot" title="已收藏">★</em>
                </span>
                <span class="section-title-text">
                  {{ section.title }}
                  <em v-if="section.access === 'member' && !isMember" class="lock-tag">会员</em>
                </span>
              </span>
            </button>
          </li>
        </ul>
      </div>
    </section>

    <button type="button" class="clear-history-link" @click="emit('clear-history')">
      清除阅读历史
    </button>
  </aside>
</template>
