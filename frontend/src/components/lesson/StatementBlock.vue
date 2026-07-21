<script setup>
import MarkdownPreview from './MarkdownPreview.vue'

defineProps({
  item: {
    type: Object,
    required: true,
  },
  isOpen: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['toggle'])

function blockLabel(kind, num) {
  const names = {
    def: '定义',
    theorem: '定理',
    corollary: '推论',
    proposition: '命题',
  }
  return `${names[kind] || '模块'}${num ? ` ${num}` : ''}`
}

function blockClass(kind) {
  return `tpl-block tpl-block-${kind}`
}
</script>

<template>
  <article :class="[blockClass(item.kind), { open: isOpen }]">
    <div class="block-head">
      <span class="block-label">{{ blockLabel(item.kind, item.num) }}</span>
      <span v-if="item.title" class="block-title">{{ item.title }}</span>
    </div>
    <MarkdownPreview :id="`${item.id}-body`" compact :model-value="item.body" />
    <div v-if="item.solution" class="divider">
      <span class="line"></span>
      <button class="arrow" type="button" :aria-label="isOpen ? '折叠证明' : '展开证明'" @click="emit('toggle', item.id)">
        ↓
      </button>
    </div>
    <div v-if="item.solution" class="panel">
      <div class="solution">
        <span class="sol-lab">{{ item.solutionLabel }}</span>
        <MarkdownPreview :id="`${item.id}-proof`" compact :model-value="item.solution" />
      </div>
    </div>
  </article>
</template>
