<script setup>
defineProps({
  item: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <article class="module code-card">
    <div class="module-head">
      <span class="module-badge">代码</span>
      <span class="module-title">{{ item.title }}</span>
      <span v-if="item.lang" class="module-meta">{{ item.lang }}</span>
    </div>
    <div class="module-body">
      <p v-if="item.desc" class="module-desc">{{ item.desc }}</p>
      <pre><code>{{ item.body }}</code></pre>
    </div>
  </article>
</template>
