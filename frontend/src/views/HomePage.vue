<script setup>
import { RouterLink } from 'vue-router'
import studyHero from '../assets/math-study-hero.webp'

const learningEntrances = [
  {
    eyebrow: '系统课程',
    title: '按章节建立数学框架',
    copy: '从概念、定理到例题，把容易断开的知识点重新连起来。',
    action: '进入知识库',
    to: '/knowledge',
  },
  {
    eyebrow: '针对训练',
    title: '把薄弱点练成得分点',
    copy: '按题型、难度和完成状态筛选，解析在需要时再展开。',
    action: '开始刷题',
    to: '/exercises',
  },
  {
    eyebrow: '完整访问',
    title: '会员内容持续更新',
    copy: '解锁课程讲义、会员题组、视频讲解和互动学习模块。',
    action: '查看会员权益',
    to: '/membership',
  },
]

const features = [
  ['先建立结构', '用短讲义和清晰目录快速定位本节重点。'],
  ['再完成练习', '用题型训练检查理解，把错题留在下一轮复习里。'],
  ['最后回看讲解', '通过视频与互动图形，把抽象关系看得更具体。'],
]

// 首页营销文案，不是课程内容，不需要走后台内容管理。
const learningPaths = [
  {
    title: '分析学路径',
    items: ['微积分', '数学分析', '常微分方程', '实变函数'],
  },
  {
    title: '代数学路径',
    items: ['线性代数', '高等代数', '抽象代数', '数值线性代数'],
  },
  {
    title: '统计学路径',
    items: ['概率统计', '数理统计', '随机过程', '机器学习基础'],
  },
  {
    title: '学科交叉关系',
    items: ['线性代数 + 统计建模', '微积分 + 优化方法', '概率论 + 数据科学'],
  },
]
</script>

<template>
  <section class="home-page">
    <div class="intro-hero">
      <div class="hero-copy-column">
        <p class="eyebrow">面向大学数学与升学备考</p>
        <h1>MathAPP</h1>
        <p class="hero-copy">
          一处完成课程学习、针对练习和重点讲解，按自己的节奏把数学学扎实。
        </p>
        <div class="hero-actions">
          <RouterLink class="primary-action" to="/knowledge">进入知识库</RouterLink>
          <RouterLink class="secondary-action" to="/exercises">查看习题库</RouterLink>
        </div>
      </div>
      <div class="hero-visual">
        <img :src="studyHero" alt="打开的数学笔记本和函数图形" />
        <div class="hero-visual-note">
          <strong>课程、练习、讲解</strong>
          <span>围绕同一条学习路径组织</span>
        </div>
      </div>
    </div>

    <section class="info-band">
      <div class="section-heading">
        <p>学习入口</p>
        <h2>每一步，都知道下一步做什么</h2>
      </div>
      <div class="learning-entrance-grid">
        <article v-for="entrance in learningEntrances" :key="entrance.to" class="learning-entrance">
          <p>{{ entrance.eyebrow }}</p>
          <h3>{{ entrance.title }}</h3>
          <span>{{ entrance.copy }}</span>
          <RouterLink :to="entrance.to">{{ entrance.action }}</RouterLink>
        </article>
      </div>
    </section>

    <section class="info-band two-column-band">
      <div>
        <div class="section-heading">
          <p>学习方式</p>
          <h2>讲义、练习和讲解互相补位</h2>
        </div>
        <div class="feature-row">
          <article v-for="feature in features" :key="feature[0]">
            <strong>{{ feature[0] }}</strong>
            <span>{{ feature[1] }}</span>
          </article>
        </div>
      </div>
      <aside class="credential-panel">
        <span>适合这些阶段</span>
        <strong>期末 · 考研 · 竞赛</strong>
        <p>核心内容由数学、统计与工科背景教师共同整理，兼顾不同课程语境和复习节奏。</p>
      </aside>
    </section>
  </section>
</template>
