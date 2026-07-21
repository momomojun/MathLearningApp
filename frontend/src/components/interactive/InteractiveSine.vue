<script setup>
import { computed, ref } from 'vue'

defineProps({
  title: {
    type: String,
    default: '',
  },
  desc: {
    type: String,
    default: '',
  },
})

const amplitude = ref(1)
const frequency = ref(1)

const path = computed(() => {
  const points = []

  for (let x = 0; x <= 720; x += 8) {
    const y = 160 - Math.sin((x / 720) * Math.PI * 2 * frequency.value) * amplitude.value * 70
    points.push(`${x},${y.toFixed(2)}`)
  }

  return `M${points.join(' L')}`
})
</script>

<template>
  <div class="ix">
    <div class="ix-head">
      <span class="ix-badge">交互</span>
      <span class="ix-title">{{ title || '正弦曲线交互' }}</span>
    </div>
    <div class="ix-body">
      <p v-if="desc" class="ix-desc">{{ desc }}</p>
      <svg class="ix-canvas" viewBox="0 0 720 320" role="img" aria-label="正弦曲线交互图">
        <line x1="0" y1="160" x2="720" y2="160" stroke="#dfe5e0" />
        <line x1="48" y1="28" x2="48" y2="292" stroke="#dfe5e0" />
        <path :d="path" fill="none" stroke="#284c3e" stroke-width="5" stroke-linecap="round" />
      </svg>
      <div class="ix-controls">
        <label>
          <span class="row">
            <span>振幅 A</span>
            <span class="val">{{ Number(amplitude).toFixed(1) }}</span>
          </span>
          <input v-model.number="amplitude" type="range" min="0.2" max="2.5" step="0.1">
        </label>
        <label>
          <span class="row">
            <span>角频率 ω</span>
            <span class="val">{{ Number(frequency).toFixed(1) }}</span>
          </span>
          <input v-model.number="frequency" type="range" min="0.5" max="4" step="0.1">
        </label>
      </div>
    </div>
  </div>
</template>
