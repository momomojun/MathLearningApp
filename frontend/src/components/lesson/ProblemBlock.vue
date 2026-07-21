<script setup>
import MarkdownPreview from './MarkdownPreview.vue'

defineProps({
  item: {
    type: Object,
    required: true,
  },
  status: {
    type: Object,
    default: null,
  },
  isFavorite: {
    type: Boolean,
    default: false,
  },
  inWrongBook: {
    type: Boolean,
    default: false,
  },
  isOpen: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['toggle', 'mark-done', 'mark-wrong', 'toggle-favorite', 'toggle-wrong-book'])
</script>

<template>
  <article
    class="prob"
    :class="{
      open: isOpen,
      done: status?.done,
      wrong: status?.wrong,
      favorite: isFavorite,
    }"
  >
    <div class="prob-meta-row">
      <span class="prob-chip">{{ item.problemType || '计算题' }}</span>
      <span class="prob-chip soft">{{ item.difficulty || '基础' }}</span>
      <span v-for="tag in item.knowledge" :key="tag" class="prob-chip pale">{{ tag }}</span>
      <span v-for="tag in item.tags" :key="tag" class="prob-chip pale">{{ tag }}</span>
    </div>

    <div class="prob-head">
      <span class="prob-num">{{ item.title || '例题' }}</span>
      <MarkdownPreview :id="`${item.id}-problem`" compact :model-value="item.body" />
    </div>

    <div class="prob-actions" aria-label="做题状态">
      <button
        type="button"
        class="prob-action"
        :class="{ active: status?.done && !status?.wrong }"
        @click="emit('mark-done', item)"
      >
        已做
      </button>
      <button
        type="button"
        class="prob-action danger"
        :class="{ active: status?.wrong }"
        @click="emit('mark-wrong', item)"
      >
        做错
      </button>
      <button
        type="button"
        class="prob-action"
        :class="{ active: isFavorite }"
        @click="emit('toggle-favorite', item)"
      >
        {{ isFavorite ? '已收藏' : '收藏' }}
      </button>
      <button
        type="button"
        class="prob-action"
        :class="{ active: inWrongBook }"
        @click="emit('toggle-wrong-book', item)"
      >
        {{ inWrongBook ? '已入错题本' : '加错题本' }}
      </button>
    </div>

    <div v-if="item.solution" class="divider">
      <span class="line"></span>
      <button
        class="arrow"
        type="button"
        :aria-label="isOpen ? '折叠解析' : '展开解析'"
        @click="emit('toggle', item.id)"
      >
        ↓
      </button>
    </div>
    <div v-if="item.solution" class="panel">
      <div class="solution">
        <span class="sol-lab">{{ item.solutionLabel }}</span>
        <MarkdownPreview :id="`${item.id}-solution`" compact :model-value="item.solution" />
      </div>
    </div>
  </article>
</template>
