<script setup>
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login, register } from '../auth'

const router = useRouter()
const route = useRoute()
const form = reactive({
  username: '',
  email: '',
  nickname: '',
  password: '',
})
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
    await register({ ...form })
    await login(form.username.trim(), form.password)
    router.replace(safeRedirect())
  } catch (err) {
    error.value = err.message || '注册失败，请检查填写内容'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="content-section auth-section">
    <div class="section-heading">
      <p>注册</p>
      <h2>创建账号</h2>
    </div>

    <form class="auth-form" @submit.prevent="handleSubmit">
      <label>
        账号
        <input v-model="form.username" type="text" autocomplete="username" required />
      </label>
      <label>
        邮箱
        <input v-model="form.email" type="email" autocomplete="email" required />
      </label>
      <label>
        昵称（可选）
        <input v-model="form.nickname" type="text" />
      </label>
      <label>
        密码（至少 8 位）
        <input v-model="form.password" type="password" autocomplete="new-password" minlength="8" required />
      </label>

      <p v-if="error" class="auth-error">{{ error }}</p>

      <button type="submit" :disabled="loading">{{ loading ? '注册中…' : '注册并登录' }}</button>
    </form>

    <p class="auth-switch">
      已有账号？<RouterLink to="/login">去登录</RouterLink>
    </p>
  </section>
</template>
