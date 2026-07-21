<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
})

const open = ref(false)
const failed = ref(false)
const widthClass = computed(() => {
  const allowed = ['small', 'medium', 'wide']
  return allowed.includes(props.item.width) ? `w-${props.item.width}` : 'w-wide'
})

function openPreview() {
  if (!props.item.src || failed.value) return
  open.value = true
}
</script>

<template>
  <article class="module">
    <div class="module-head">
      <span class="module-badge">插图</span>
      <span class="module-title">{{ item.title }}</span>
    </div>
    <figure class="module-body figure-box">
      <div class="figure-frame" :class="widthClass">
        <button
          v-if="item.src && !failed"
          type="button"
          class="figure-zoom"
          :aria-label="`放大查看：${item.alt || item.title || '插图'}`"
          @click="openPreview"
        >
          <img
            :src="item.src"
            :alt="item.alt || item.title"
            loading="lazy"
            @error="failed = true"
          >
          <span class="figure-zoom-hint">点击放大</span>
        </button>
        <div v-else-if="failed" class="figure-placeholder">
          <span class="t">IMAGE ERROR</span>
          <span class="s">图片加载失败，请检查地址。</span>
        </div>
        <div v-else class="figure-placeholder">
          <span class="t">FIGURE</span>
          <span class="s">在这里填写图片地址</span>
        </div>
      </div>
      <figcaption v-if="item.caption" class="figure-caption">{{ item.caption }}</figcaption>
    </figure>

    <div v-if="open" class="figure-lightbox" role="dialog" aria-modal="true" @click.self="open = false">
      <button type="button" class="figure-lightbox-close" aria-label="关闭图片预览" @click="open = false">
        ×
      </button>
      <img :src="item.src" :alt="item.alt || item.title">
      <p v-if="item.caption">{{ item.caption }}</p>
    </div>
  </article>
</template>
