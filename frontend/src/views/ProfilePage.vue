<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { authState, updateProfile } from '../auth'
import { getRecent, progressState } from '../utils/learningProgress'
import { exerciseProgressState, getWrongBook } from '../utils/exerciseProgress'
import { syncState } from '../utils/syncClient'

const editing = ref(false)
const saving = ref(false)
const error = ref('')
const success = ref('')

const form = reactive({
  nickname: '',
  organization: '',
  email: '',
  oldPassword: '',
  newPassword: '',
})

function fillFormFromUser() {
  form.nickname = authState.user?.nickname || ''
  form.organization = authState.user?.organization || ''
  form.email = authState.user?.email || ''
  form.oldPassword = ''
  form.newPassword = ''
}

watch(
  () => authState.user,
  () => {
    if (!editing.value) fillFormFromUser()
  },
  { immediate: true },
)

function openEdit() {
  fillFormFromUser()
  error.value = ''
  success.value = ''
  editing.value = true
}

function cancelEdit() {
  editing.value = false
  error.value = ''
}

async function handleSubmit() {
  error.value = ''
  success.value = ''
  saving.value = true

  const payload = {
    nickname: form.nickname,
    organization: form.organization,
    email: form.email,
  }
  if (form.newPassword) {
    payload.new_password = form.newPassword
    payload.old_password = form.oldPassword
  }

  try {
    // updateProfile 会把返回的用户写回全局 authState，昵称/机构即时生效。
    await updateProfile(payload)
    success.value = '资料已更新'
    form.oldPassword = ''
    form.newPassword = ''
    editing.value = false
  } catch (err) {
    error.value = err.message || '更新失败，请检查填写内容'
  } finally {
    saving.value = false
  }
}

// ---- 学习记录聚合：最近学习、收藏、错题本、统计 ----

function knowledgeLink(entry) {
  return { path: '/knowledge', query: { course: entry.courseSlug, section: entry.slug } }
}
function exerciseSectionLink(entry) {
  return { path: '/exercises', query: { course: entry.courseSlug, section: entry.slug } }
}
function problemLink(meta) {
  const query = {}
  if (meta.courseSlug) query.course = meta.courseSlug
  if (meta.sectionSlug) query.section = meta.sectionSlug
  return { path: '/exercises', query }
}
function continueLink(entry) {
  return entry.type === 'exercise' ? exerciseSectionLink(entry) : knowledgeLink(entry)
}

const recentList = computed(() => getRecent().slice(0, 6))

const knowledgeFavorites = computed(() =>
  Object.entries(progressState.favorites)
    .filter(([, meta]) => (meta.type || 'knowledge') === 'knowledge')
    .map(([slug, meta]) => ({ slug, ...meta }))
    .sort((a, b) => (b.at || 0) - (a.at || 0)),
)

// 习题收藏：题组（小节）级收藏 + 单题收藏，合并展示。
const exerciseFavorites = computed(() => {
  const sectionFavs = Object.entries(progressState.favorites)
    .filter(([, meta]) => meta.type === 'exercise')
    .map(([slug, meta]) => ({
      key: `sec:${slug}`,
      title: meta.title,
      subtitle: meta.courseTitle,
      to: exerciseSectionLink({ slug, courseSlug: meta.courseSlug }),
      at: meta.at || 0,
    }))
  const problemFavs = Object.entries(exerciseProgressState.problems)
    .filter(([, problem]) => problem.favorite)
    .map(([key, problem]) => ({
      key: `prob:${key}`,
      title: problem.meta?.title || key,
      subtitle: problem.meta?.sectionTitle || problem.meta?.courseTitle,
      to: problemLink(problem.meta || {}),
      at: problem.updatedAt || 0,
    }))
  return [...sectionFavs, ...problemFavs].sort((a, b) => b.at - a.at)
})

const wrongBook = computed(() =>
  getWrongBook().map((item) => ({
    key: item.problemKey,
    title: item.meta?.title || item.problemKey,
    subtitle: [item.meta?.sectionTitle, item.meta?.difficulty].filter(Boolean).join(' · '),
    to: problemLink(item.meta || {}),
  })),
)

const stats = computed(() => {
  const learned = Object.values(progressState.read).filter(Boolean).length
  const problems = Object.values(exerciseProgressState.problems)
  const done = problems.filter((p) => p.done).length
  const wrong = problems.filter((p) => p.addedToWrongBook).length
  return { learned, done, wrong }
})

const hasAnyRecord = computed(
  () =>
    recentList.value.length ||
    knowledgeFavorites.value.length ||
    exerciseFavorites.value.length ||
    wrongBook.value.length,
)

const syncLabel = computed(() => {
  switch (syncState.status) {
    case 'syncing':
      return '同步中…'
    case 'error':
      return '同步出错，稍后自动重试'
    case 'offline':
      return `离线，待同步 ${syncState.pending} 项`
    case 'pending':
      return `待同步 ${syncState.pending} 项`
    default:
      return '已同步到云端'
  }
})
</script>

<template>
  <section class="content-section profile-section">
    <div class="section-heading">
      <p>个人中心</p>
      <h2 v-if="authState.user">你好，{{ authState.user.nickname || authState.user.username }}</h2>
      <h2 v-else>我的板块规划中</h2>
    </div>

    <template v-if="authState.user">
      <div class="profile-sync" :class="`is-${syncState.status}`">
        <span class="dot" aria-hidden="true"></span>
        <span>{{ syncLabel }}</span>
      </div>

      <!-- 基础统计 -->
      <div class="profile-stats">
        <article>
          <strong>{{ stats.learned }}</strong>
          <span>已学知识点</span>
        </article>
        <article>
          <strong>{{ stats.done }}</strong>
          <span>已做题目</span>
        </article>
        <article>
          <strong>{{ stats.wrong }}</strong>
          <span>错题</span>
        </article>
      </div>

      <!-- 账号信息 -->
      <div class="profile-board">
        <article>
          <span>账号</span>
          <strong>{{ authState.user.username }}</strong>
        </article>
        <article>
          <span>邮箱</span>
          <strong>{{ authState.user.email }}</strong>
        </article>
        <article>
          <span>机构</span>
          <strong>{{ authState.user.organization || '未填写' }}</strong>
        </article>
        <article>
          <span>会员状态</span>
          <strong>{{ authState.user.is_member ? `会员剩余 ${authState.user.membership_days_remaining} 天` : '未开通' }}</strong>
        </article>
      </div>

      <p v-if="success" class="auth-success">{{ success }}</p>

      <button v-if="!editing" type="button" class="auth-btn" @click="openEdit">编辑资料</button>

      <form v-else class="auth-form profile-edit-form" @submit.prevent="handleSubmit">
        <label>
          昵称
          <input v-model="form.nickname" type="text" />
        </label>
        <label>
          机构
          <input v-model="form.organization" type="text" />
        </label>
        <label>
          邮箱
          <input v-model="form.email" type="email" required />
        </label>
        <label>
          原密码（不改密码可留空）
          <input v-model="form.oldPassword" type="password" autocomplete="current-password" />
        </label>
        <label>
          新密码（至少 8 位，不改密码可留空）
          <input v-model="form.newPassword" type="password" autocomplete="new-password" minlength="8" />
        </label>

        <p v-if="error" class="auth-error">{{ error }}</p>

        <div class="locked-actions">
          <button type="submit" :disabled="saving">{{ saving ? '保存中…' : '保存' }}</button>
          <button type="button" class="auth-btn" :disabled="saving" @click="cancelEdit">取消</button>
        </div>
      </form>

      <!-- 空状态：完全没有学习记录时，给清晰入口，而不是一堆空卡片 -->
      <div v-if="!hasAnyRecord" class="profile-empty">
        <p>还没有学习记录。收藏、做题和错题都会自动汇总到这里。</p>
        <div class="profile-empty-actions">
          <RouterLink class="primary-action" to="/knowledge">去学知识点</RouterLink>
          <RouterLink class="auth-btn" to="/exercises">去刷题</RouterLink>
        </div>
      </div>

      <template v-else>
        <!-- 最近学习 -->
        <div v-if="recentList.length" class="profile-block">
          <div class="profile-block-head">
            <h3>最近学习</h3>
          </div>
          <ul class="record-list">
            <li v-for="entry in recentList" :key="`${entry.type}-${entry.slug}`">
              <div class="record-main">
                <strong>{{ entry.title }}</strong>
                <span>{{ entry.courseTitle }} · {{ entry.type === 'exercise' ? '习题' : '知识' }}</span>
              </div>
              <RouterLink class="record-action" :to="continueLink(entry)">继续</RouterLink>
            </li>
          </ul>
        </div>

        <!-- 课程收藏（知识库） -->
        <div v-if="knowledgeFavorites.length" class="profile-block">
          <div class="profile-block-head">
            <h3>课程收藏</h3>
          </div>
          <ul class="record-list">
            <li v-for="fav in knowledgeFavorites" :key="fav.slug">
              <div class="record-main">
                <strong>{{ fav.title }}</strong>
                <span>{{ fav.courseTitle }}</span>
              </div>
              <RouterLink class="record-action" :to="knowledgeLink({ slug: fav.slug, courseSlug: fav.courseSlug })">
                查看
              </RouterLink>
            </li>
          </ul>
        </div>

        <!-- 习题收藏 -->
        <div v-if="exerciseFavorites.length" class="profile-block">
          <div class="profile-block-head">
            <h3>习题收藏</h3>
          </div>
          <ul class="record-list">
            <li v-for="fav in exerciseFavorites" :key="fav.key">
              <div class="record-main">
                <strong>{{ fav.title }}</strong>
                <span>{{ fav.subtitle }}</span>
              </div>
              <RouterLink class="record-action" :to="fav.to">查看</RouterLink>
            </li>
          </ul>
        </div>

        <!-- 错题本 -->
        <div v-if="wrongBook.length" class="profile-block">
          <div class="profile-block-head">
            <h3>错题本</h3>
            <span class="profile-block-count">{{ wrongBook.length }} 题</span>
          </div>
          <ul class="record-list">
            <li v-for="item in wrongBook" :key="item.key">
              <div class="record-main">
                <strong>{{ item.title }}</strong>
                <span>{{ item.subtitle }}</span>
              </div>
              <RouterLink class="record-action" :to="item.to">重做</RouterLink>
            </li>
          </ul>
        </div>
      </template>
    </template>

    <div v-else class="profile-guest">
      <p>登录后可以查看你的学习记录、收藏和错题本，并在多台设备间自动同步。</p>
      <RouterLink class="primary-action" to="/login">去登录</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.profile-sync {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.14);
  color: #475569;
  font-size: 13px;
  margin-bottom: 18px;
}
.profile-sync .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
}
.profile-sync.is-syncing .dot {
  background: #3b82f6;
}
.profile-sync.is-error .dot {
  background: #ef4444;
}
.profile-sync.is-offline .dot,
.profile-sync.is-pending .dot {
  background: #f59e0b;
}

.profile-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.profile-stats article {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  border-radius: 14px;
  background: rgba(148, 163, 184, 0.1);
  text-align: center;
}
.profile-stats strong {
  font-size: 26px;
  color: #0f172a;
}
.profile-stats span {
  font-size: 13px;
  color: #64748b;
}

.profile-block {
  margin-top: 26px;
}
.profile-block-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 12px;
}
.profile-block-head h3 {
  margin: 0;
  font-size: 17px;
  color: #0f172a;
}
.profile-block-count {
  font-size: 13px;
  color: #94a3b8;
}

.record-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.record-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: #fff;
}
.record-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.record-main strong {
  font-size: 15px;
  color: #0f172a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.record-main span {
  font-size: 13px;
  color: #94a3b8;
}
.record-action {
  flex: none;
  padding: 6px 16px;
  border-radius: 999px;
  background: #2563eb;
  color: #fff;
  font-size: 13px;
  text-decoration: none;
  white-space: nowrap;
}
.record-action:hover {
  background: #1d4ed8;
}

.profile-empty {
  margin-top: 24px;
  padding: 24px;
  border-radius: 14px;
  background: rgba(148, 163, 184, 0.1);
  text-align: center;
}
.profile-empty p {
  margin: 0 0 14px;
  color: #475569;
}
.profile-empty-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

@media (max-width: 600px) {
  .profile-stats {
    gap: 8px;
  }
  .profile-stats strong {
    font-size: 22px;
  }
}
</style>
