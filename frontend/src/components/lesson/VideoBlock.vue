<script setup>
import { computed, ref, watch } from 'vue'
import { authState } from '../../auth'

const props = defineProps({
  item: {
    type: Object,
    required: true,
  },
})

const videoRef = ref(null)
const previewEnded = ref(false)

function isVideoFile(src) {
  return /\.(mp4|webm|ogg)(\?.*)?$/i.test(src || '')
}

const isMember = computed(() => Boolean(authState.user?.is_member))
const fileVideo = computed(() => isVideoFile(props.item.src))
const requiresMember = computed(() => props.item.access === 'member')
const previewSeconds = computed(() => Math.max(0, Number(props.item.previewSeconds) || 0))
const canPlayFull = computed(() => !requiresMember.value || isMember.value)
const canPreview = computed(() => requiresMember.value && !isMember.value && previewSeconds.value > 0)
const showLockedPoster = computed(
  () => requiresMember.value && !isMember.value && (!canPreview.value || !fileVideo.value),
)
const showVideoFile = computed(() => props.item.src && fileVideo.value && (canPlayFull.value || canPreview.value))
const showIframe = computed(() => props.item.src && !fileVideo.value && canPlayFull.value)

watch(
  () => props.item.src,
  () => {
    previewEnded.value = false
  },
)

function handleTimeUpdate() {
  if (!canPreview.value || !videoRef.value) return
  if (videoRef.value.currentTime >= previewSeconds.value) {
    videoRef.value.currentTime = previewSeconds.value
    videoRef.value.pause()
    previewEnded.value = true
  }
}
</script>

<template>
  <article class="module video-card">
    <div class="module-head">
      <span class="module-badge">视频</span>
      <span class="module-title">{{ item.title || '视频讲解' }}</span>
      <span v-if="requiresMember" class="module-meta">
        {{ canPlayFull ? '会员完整观看' : previewSeconds ? `试看 ${previewSeconds} 秒` : '会员专享' }}
      </span>
    </div>
    <div class="module-body">
      <p v-if="item.desc" class="module-desc">{{ item.desc }}</p>
      <div class="video-frame" :class="{ locked: showLockedPoster || previewEnded }">
        <video
          v-if="showVideoFile"
          ref="videoRef"
          controls
          preload="metadata"
          :poster="item.poster"
          :src="item.src"
          @timeupdate="handleTimeUpdate"
        ></video>
        <iframe
          v-else-if="showIframe"
          :src="item.src"
          title="视频讲解"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
        <div v-else-if="showLockedPoster" class="video-locked-poster">
          <img v-if="item.poster" :src="item.poster" :alt="item.title || '会员视频封面'">
          <div class="video-lock-copy">
            <span>会员专享视频</span>
            <strong>{{ item.title || '完整课程视频' }}</strong>
            <RouterLink to="/membership">查看会员方案</RouterLink>
          </div>
        </div>
        <div v-else class="video-placeholder">
          <span class="t">VIDEO</span>
          <span class="s">在 @video 指令里填写 mp4 地址或 iframe 播放地址。</span>
        </div>
        <div v-if="previewEnded" class="video-preview-gate">
          <span>试看已结束</span>
          <strong>开通会员后继续观看完整视频</strong>
          <RouterLink to="/membership">查看会员方案</RouterLink>
        </div>
      </div>
    </div>
  </article>
</template>
