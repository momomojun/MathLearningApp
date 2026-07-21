<script setup>
defineProps({
  item: {
    type: Object,
    required: true,
  },
})
</script>

<template>
  <article class="ix">
    <div class="ix-head">
      <span class="ix-badge">交互</span>
      <span class="ix-title">{{ item.title || '交互模块' }}</span>
    </div>
    <div class="ix-body">
      <p v-if="item.desc" class="ix-desc">{{ item.desc }}</p>
      <div class="ix-stub">
        <span class="t">INTERACTIVE MODULE</span>
        <span class="s">这里可以挂载几何作图、函数图像、向量演示或自定义 Vue 交互组件。</span>
      </div>
    </div>
  </article>
</template>
