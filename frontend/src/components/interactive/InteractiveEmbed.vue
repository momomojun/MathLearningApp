<script setup>
import { computed } from 'vue'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
})

const src = computed(() => props.item.config?.src || props.item.config?.url || '')
const providerLabel = computed(() => {
  if (props.item.interactiveType === 'geogebra') return 'GeoGebra'
  if (props.item.interactiveType === 'desmos') return 'Desmos'
  return '交互'
})
</script>

<template>
  <article class="ix embed-ix">
    <div class="ix-head">
      <span class="ix-badge">{{ providerLabel }}</span>
      <span class="ix-title">{{ item.title || `${providerLabel} 演示` }}</span>
    </div>
    <div class="ix-body">
      <p v-if="item.desc" class="ix-desc">{{ item.desc }}</p>
      <div class="interactive-frame">
        <iframe
          v-if="src"
          :src="src"
          :title="item.title || `${providerLabel} 演示`"
          loading="lazy"
          allowfullscreen
        ></iframe>
        <div v-else class="ix-stub">
          <span class="t">{{ providerLabel.toUpperCase() }}</span>
          <span class="s">在模块下方添加 `src: 嵌入地址` 即可挂载演示。</span>
        </div>
      </div>
    </div>
  </article>
</template>
