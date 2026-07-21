<script setup>
defineProps({
  kind: {
    type: String,
    default: 'error',
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    default: '',
  },
  retryLabel: {
    type: String,
    default: '重新加载',
  },
  retryable: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['retry'])
</script>

<template>
  <div class="request-state" :class="`request-state-${kind}`" :role="kind === 'error' ? 'alert' : 'status'">
    <strong>{{ title }}</strong>
    <p v-if="message">{{ message }}</p>
    <button v-if="retryable" type="button" @click="$emit('retry')">{{ retryLabel }}</button>
  </div>
</template>
