<script setup>
import MarkdownPreview from './MarkdownPreview.vue'

defineProps({
  item: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <article class="template-text-card">
    <h3 v-if="item.title">{{ item.title }}</h3>
    <MarkdownPreview :id="`${item.id}-preview`" :model-value="item.body" />
  </article>
</template>
