<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

defineProps({
  title: {
    type: String,
    default: '',
  },
  loggedIn: {
    type: Boolean,
    default: false,
  },
})

const route = useRoute()
const loginTarget = computed(() => ({
  path: '/login',
  query: { redirect: route.fullPath },
}))
</script>

<template>
  <div class="locked-panel">
    <span class="locked-badge">会员专享</span>
    <h3>{{ title || '这部分内容为会员专享' }}</h3>
    <p v-if="loggedIn">开通会员后，即可解锁完整讲解、例题解析和视频内容。</p>
    <p v-else>登录并开通会员后，即可解锁完整讲解、例题解析和视频内容。</p>
    <div class="locked-actions">
      <RouterLink class="auth-btn primary" to="/membership">查看会员方案</RouterLink>
      <RouterLink v-if="!loggedIn" class="auth-btn" :to="loginTarget">去登录</RouterLink>
    </div>
  </div>
</template>
