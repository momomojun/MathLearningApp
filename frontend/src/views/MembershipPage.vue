<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { api } from '../api'
import { authState } from '../auth'

const isMember = computed(() => Boolean(authState.user?.is_member))
const memberDaysRemaining = computed(() => authState.user?.membership_days_remaining ?? 0)
const payingPlan = ref('')
const paymentError = ref('')

const benefits = [
  '全部知识库讲义',
  '会员题组与解析',
  '视频讲解合集',
  '交互模块与学习路径',
  '后续课程持续更新',
  '学习报告与错题整理',
]

const plans = [
  {
    code: 'monthly',
    name: '月度会员',
    price: '¥39',
    period: '每月',
    note: '适合期末前集中复习',
    detail: '按月使用，随时调整学习计划',
  },
  {
    code: 'yearly',
    name: '年度会员',
    price: '¥199',
    period: '每年',
    note: '适合考研、竞赛和系统学习',
    detail: '覆盖完整学习周期，性价比更高',
    featured: true,
  },
]

async function startPayment(plan) {
  paymentError.value = ''
  payingPlan.value = plan.code

  try {
    const order = await api.createMembershipOrder(plan.code)
    window.location.href = order.pay_url
  } catch (err) {
    paymentError.value = err.message || '创建支付订单失败，请稍后重试'
  } finally {
    payingPlan.value = ''
  }
}
</script>

<template>
  <section class="content-section membership-section">
    <div class="section-heading">
      <p>订阅会员</p>
      <h2>{{ isMember ? '你的会员状态' : '解锁完整学习内容' }}</h2>
    </div>

    <div v-if="isMember" class="member-status-panel">
      <span class="member-badge">当前为会员</span>
      <strong>{{ memberDaysRemaining }} 天</strong>
      <p>会员有效期剩余时间。到期前你仍可访问完整知识库、题库、视频讲解和交互模块。</p>
    </div>

    <div v-else class="subscription-layout">
      <div class="plan-grid">
        <article v-for="plan in plans" :key="plan.code" class="plan-card" :class="{ featured: plan.featured }">
          <span class="plan-name">{{ plan.name }}</span>
          <strong>{{ plan.price }}<small>{{ plan.period }}</small></strong>
          <p>{{ plan.note }}</p>
          <em>{{ plan.detail }}</em>
          <RouterLink v-if="!authState.user" class="plan-action" to="/login">登录后订阅</RouterLink>
          <button v-else type="button" :disabled="payingPlan === plan.code" @click="startPayment(plan)">
            {{ payingPlan === plan.code ? '创建订单中...' : plan.featured ? '推荐订阅' : '选择方案' }}
          </button>
        </article>
      </div>

      <aside class="benefits-panel">
        <h3>会员权益</h3>
        <p v-if="paymentError" class="auth-error">{{ paymentError }}</p>
        <ul>
          <li v-for="benefit in benefits" :key="benefit">{{ benefit }}</li>
        </ul>
      </aside>
    </div>
  </section>
</template>
