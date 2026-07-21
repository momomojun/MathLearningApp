<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login } from '../auth'

const router = useRouter()
const route = useRoute()
const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

function safeRedirect() {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  return redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : '/profile'
}

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    await login(username.value.trim(), password.value)
    router.replace(safeRedirect())
  } catch (err) {
    error.value = err.message || '登录失败，请检查账号或密码'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="content-section auth-section">
    <div class="section-heading">
      <p>登录</p>
      <h2>欢迎回来</h2>
    </div>

    <p v-if="route.query.reason === 'expired'" class="auth-notice" role="status">
      登录状态已失效，请重新登录。登录后会返回刚才的页面。
    </p>

    <form class="auth-form" @submit.prevent="handleSubmit">
      <label>
        账号
        <input v-model="username" type="text" autocomplete="username" required />
      </label>
      <label>
        密码
        <input v-model="password" type="password" autocomplete="current-password" required />
      </label>

      <p v-if="error" class="auth-error">{{ error }}</p>

      <button type="submit" :disabled="loading">{{ loading ? '登录中…' : '登录' }}</button>
    </form>

    <p class="auth-switch">
      还没有账号？<RouterLink to="/register">去注册</RouterLink>
    </p>
  </section>
</template>
