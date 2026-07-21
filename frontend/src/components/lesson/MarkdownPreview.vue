<script setup>
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/preview.css'

defineProps({
  id: {
    type: String,
    required: true,
  },
  modelValue: {
    type: String,
    default: '',
  },
  compact: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <MdPreview
    :id="id"
    class="template-md"
    :class="{ compact }"
    theme="light"
    preview-theme="github"
    code-theme="github"
    :model-value="modelValue"
  />
</template>
