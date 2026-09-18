<script setup>
import { onBeforeUnmount, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { authState, clearSession, logout, refreshMe } from './auth'

const router = useRouter()

function handleAuthExpired() {
  const current = router.currentRoute.value
  const redirect = current.fullPath
  clearSession()
  if (current.path !== '/login') {
    router.replace({ path: '/login', query: { redirect, reason: 'expired' } })
  }
}

onMounted(() => {
  window.addEventListener('mathapp:auth-expired', handleAuthExpired)
  refreshMe()
})

onBeforeUnmount(() => {
  window.removeEventListener('mathapp:auth-expired', handleAuthExpired)
})

async function handleLogout() {
  await logout()
  router.push('/')
}
</script>

<template>
  <div class="site-shell">
    <header class="topbar">
      <RouterLink class="brand" to="/">
        <span class="brand-seal">M</span>
        <span>
          <strong>MathAPP</strong>
          <small>数学知识付费馆</small>
        </span>
      </RouterLink>

      <nav class="nav-tabs" aria-label="主导航">
        <RouterLink class="nav-button" to="/">介绍</RouterLink>
        <RouterLink class="nav-button" to="/knowledge">知识库</RouterLink>
        <RouterLink class="nav-button" to="/exercises">习题库</RouterLink>
        <RouterLink class="nav-button" to="/membership">会员</RouterLink>
        <RouterLink class="nav-button" to="/profile">我的</RouterLink>
      </nav>

      <div class="auth-box">
        <template v-if="authState.user">
          <span class="auth-user">{{ authState.user.nickname || authState.user.username }}</span>
          <button type="button" class="auth-btn" @click="handleLogout">退出</button>
        </template>
        <template v-else>
          <RouterLink class="auth-btn" to="/login">登录</RouterLink>
          <RouterLink class="auth-btn primary" to="/register">注册</RouterLink>
        </template>
      </div>
    </header>

    <main class="site-content">
      <RouterView />
    </main>
  </div>
</template>
