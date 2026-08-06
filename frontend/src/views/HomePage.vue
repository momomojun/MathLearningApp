<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'

const root = ref(null)
const stageArt = ref(null)

let observer = null
let onScroll = null
let rafId = 0
let failsafeId = 0

onMounted(() => {
  const targets = root.value ? [...root.value.querySelectorAll('.reveal')] : []

  // 用户要求减少动效时，CSS 不会隐藏任何东西，这里直接不介入。
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          entry.target.classList.add('is-revealed')
          observer.unobserve(entry.target)
        })
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
    )
    targets.forEach((el) => observer.observe(el))
  } else {
    // 老浏览器兜底：直接全部显示，不能让内容卡在透明状态。
    targets.forEach((el) => el.classList.add('is-revealed'))
  }

  // 保险丝：某些环境里观察器存在却不回调（无头浏览器、部分隐私插件），
  // 那样整页会永久停在 opacity:0。到点无条件显示，宁可不要入场动画。
  failsafeId = window.setTimeout(() => {
    targets.forEach((el) => el.classList.add('is-revealed'))
  }, 1600)

  // 画作随滚动缓慢反向位移，做出景深。用 rAF 节流，避免滚动时重排。
  onScroll = () => {
    if (rafId) return
    rafId = requestAnimationFrame(() => {
      rafId = 0
      const art = stageArt.value
      if (!art) return
      const stage = art.parentElement.getBoundingClientRect()
      if (stage.bottom < 0 || stage.top > window.innerHeight) return
      const progress = stage.top / window.innerHeight
      art.style.setProperty('--shift', `${(progress * -46).toFixed(1)}px`)
    })
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
})

onBeforeUnmount(() => {
  observer?.disconnect()
  if (onScroll) window.removeEventListener('scroll', onScroll)
  if (rafId) cancelAnimationFrame(rafId)
  if (failsafeId) clearTimeout(failsafeId)
})

// 首页展陈文案，不是课程内容，不需要走后台内容管理。

// 数学家名录。portrait 留空时显示颜料色块 + 首字，
// 想换成真实肖像画：把图片放进 public/portraits/，再把文件名填到 portrait 字段。
const figures = [
  {
    name: '欧几里得',
    latin: 'Euclid',
    life: '约前 325 — 前 265',
    work: '《几何原本》',
    note: '把零散的几何事实收进公理与证明的秩序里。',
    tone: 'umber',
    to: '/knowledge',
    portrait: 'euclid.jpg',
  },
  {
    name: '牛顿',
    latin: 'Isaac Newton',
    life: '1643 — 1727',
    work: '流数术',
    note: '用变化率重写运动，微积分从此有了物理的重量。',
    tone: 'forest',
    to: '/knowledge',
    portrait: 'newton.jpg',
  },
  {
    name: '欧拉',
    latin: 'Leonhard Euler',
    life: '1707 — 1783',
    work: '《无穷分析引论》',
    note: '级数、函数与复数在他笔下第一次连成一体。',
    tone: 'ochre',
    to: '/knowledge',
    portrait: 'euler.jpg',
  },
  {
    name: '高斯',
    latin: 'Carl F. Gauss',
    life: '1777 — 1855',
    work: '《算术研究》',
    note: '消元法与正态分布，至今仍是代数与统计的地基。',
    tone: 'terra',
    to: '/knowledge',
    portrait: 'gauss.jpg',
  },
  {
    name: '柯西',
    latin: 'Augustin-Louis Cauchy',
    life: '1789 — 1857',
    work: '《分析教程》',
    note: '一句 ε–N，把「无限接近」从直觉变成可验证的语言。',
    tone: 'slate',
    to: '/knowledge',
    portrait: 'cauchy.jpg',
  },
  {
    name: '拉普拉斯',
    latin: 'Pierre-Simon Laplace',
    life: '1749 — 1827',
    work: '《概率的分析理论》',
    note: '让偶然可以被计算，概率因此成为一门学科。',
    tone: 'sage',
    to: '/knowledge',
    portrait: 'laplace.jpg',
  },
]

// 三个学习入口。
const halls = [
  {
    numeral: 'I',
    eyebrow: '01 · 系统学习',
    title: '知识库',
    copy: '从概念、定理到例题，按章节把容易断开的知识点重新连起来。',
    action: '进入知识库',
    to: '/knowledge',
    tone: 'forest',
  },
  {
    numeral: 'II',
    eyebrow: '02 · 针对训练',
    title: '习题库',
    copy: '按题型、难度与完成状态筛选，解析留到你需要的时候再展开。',
    action: '开始练习',
    to: '/exercises',
    tone: 'terra',
  },
  {
    numeral: 'III',
    eyebrow: '03 · 持续更新',
    title: '会员内容',
    copy: '课程讲义、会员题组、视频讲解与互动图形，持续增补。',
    action: '查看权益',
    to: '/membership',
    tone: 'ochre',
  },
]

// 底部年表：这些著作在成为教材之前，先是某个人的手稿。
const canon = [
  ['欧几里得', '几何原本', '约前 300'],
  ['阿基米德', '圆的度量', '约前 250'],
  ['笛卡尔', '几何学', '1637'],
  ['牛顿', '自然哲学的数学原理', '1687'],
  ['欧拉', '无穷分析引论', '1748'],
  ['高斯', '算术研究', '1801'],
  ['拉普拉斯', '概率的分析理论', '1812'],
  ['柯西', '分析教程', '1821'],
  ['黎曼', '论几何学的基础假设', '1854'],
  ['康托尔', '超穷数理论基础', '1895'],
  ['希尔伯特', '几何基础', '1899'],
  ['柯尔莫哥洛夫', '概率论基础', '1933'],
]

const method = [
  ['先建立结构', '用短讲义和清晰目录快速定位本节重点。'],
  ['再完成练习', '用题型训练检查理解，把错题留在下一轮复习里。'],
  ['最后回看讲解', '通过视频与互动图形，把抽象关系看得更具体。'],
]
</script>

<template>
  <div ref="root" class="salon">
    <!-- 首屏 -->
    <header class="salon-hero">
      <p class="hero-eyebrow"><span>MathAPP</span><i></i><span>在线数学学习</span></p>

      <h1 class="hero-title">
        <span class="hero-echo" aria-hidden="true">数之形</span>
        <span class="hero-line">数之形</span>
        <span class="hero-line hero-line-alt">理之序</span>
      </h1>

      <p class="hero-range">
        <span>约前 300</span>
        <i></i>
        <span>至今</span>
      </p>

      <p class="hero-lede">
        一处完成课程学习、针对练习与重点讲解。<br />
        从欧几里得的公理到现代分析，按自己的节奏把数学学扎实。
      </p>

      <div class="hero-actions">
        <RouterLink class="plate-link" to="/knowledge">
          <span>进入知识库</span><i aria-hidden="true">→</i>
        </RouterLink>
        <RouterLink class="plate-link plate-link-ghost" to="/exercises">
          <span>查看习题库</span><i aria-hidden="true">→</i>
        </RouterLink>
      </div>
    </header>

    <!-- 画作 -->
    <section class="hero-stage">
      <div ref="stageArt" class="stage-art" aria-hidden="true"></div>
      <div class="stage-varnish" aria-hidden="true"></div>
      <div class="stage-panel reveal">
        <p class="stage-eyebrow">从这里开始</p>
        <p class="stage-text">
          从一条数轴开始，到能写下
          <em>lim</em>、<em>∫</em> 与 <em>det</em> 的那一天。
        </p>
        <RouterLink class="stage-link" to="/knowledge">
          <span>开始学习</span><i aria-hidden="true">→</i>
        </RouterLink>
      </div>
    </section>

    <!-- 名录 -->
    <section class="salon-section">
      <div class="section-rule">
        <span class="rule-label">名录</span>
        <span class="rule-line"></span>
        <span class="rule-note">把定义写下来的人</span>
      </div>

      <div class="figure-grid">
        <RouterLink
          v-for="figure in figures"
          :key="figure.name"
          class="figure-card reveal"
          :to="figure.to"
        >
          <div class="figure-frame" :class="`tone-${figure.tone}`">
            <img
              v-if="figure.portrait"
              :src="`/portraits/${figure.portrait}`"
              :alt="`${figure.name}肖像`"
              loading="lazy"
              decoding="async"
            />
            <span v-else class="figure-monogram" aria-hidden="true">{{ figure.name.charAt(0) }}</span>
            <span class="figure-varnish" aria-hidden="true"></span>
          </div>
          <div class="figure-plate">
            <p class="figure-life">{{ figure.life }}</p>
            <h3 class="figure-name">{{ figure.name }}</h3>
            <p class="figure-latin">{{ figure.latin }}</p>
            <p class="figure-work">{{ figure.work }}</p>
            <p class="figure-note">{{ figure.note }}</p>
          </div>
        </RouterLink>
      </div>
    </section>

    <!-- 学习入口 -->
    <section class="salon-section">
      <div class="section-rule">
        <span class="rule-label">学习入口</span>
        <span class="rule-line"></span>
        <span class="rule-note">每一步都知道下一步做什么</span>
      </div>

      <div class="hall-grid">
        <RouterLink
          v-for="hall in halls"
          :key="hall.to"
          class="hall-card reveal"
          :class="`tone-${hall.tone}`"
          :to="hall.to"
        >
          <span class="hall-numeral" aria-hidden="true">{{ hall.numeral }}</span>
          <p class="hall-eyebrow">{{ hall.eyebrow }}</p>
          <h3 class="hall-title">{{ hall.title }}</h3>
          <p class="hall-copy">{{ hall.copy }}</p>
          <span class="hall-action">{{ hall.action }} <i aria-hidden="true">→</i></span>
        </RouterLink>
      </div>
    </section>

    <!-- 学习方式 -->
    <section class="salon-section salon-method">
      <div class="method-copy">
        <div class="section-rule">
          <span class="rule-label">学习方式</span>
          <span class="rule-line"></span>
        </div>
        <ol class="method-list">
          <li v-for="(step, index) in method" :key="step[0]" class="reveal">
            <span class="method-index" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span>
            <strong>{{ step[0] }}</strong>
            <span class="method-note">{{ step[1] }}</span>
          </li>
        </ol>
      </div>

      <aside class="method-seal reveal">
        <p class="seal-eyebrow">适合这些阶段</p>
        <p class="seal-main">期末 · 考研 · 竞赛</p>
        <p class="seal-note">
          核心内容由数学、统计与工科背景教师共同整理，兼顾不同课程语境和复习节奏。
        </p>
      </aside>
    </section>

    <!-- 经典著作 -->
    <section class="salon-section salon-canon">
      <div class="section-rule section-rule-light">
        <span class="rule-label">经典著作</span>
        <span class="rule-line"></span>
        <span class="rule-note">写进教科书之前，它们先是某个人的手稿</span>
      </div>

      <ul class="canon-list">
        <li v-for="entry in canon" :key="entry[1]" class="reveal">
          <span class="canon-author">{{ entry[0] }}</span>
          <span class="canon-work">《{{ entry[1] }}》</span>
          <span class="canon-dots" aria-hidden="true"></span>
          <span class="canon-year">{{ entry[2] }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
/* 颜料取自文艺复兴油画的常用色：赭石、氧化铁红、鼠尾草绿、深褐。 */
.salon {
  --parch: #f2ece0;
  --parch-deep: #e8dfcd;
  --ink: #23201d;
  --ink-soft: #57504a;
  --umber: #6b5844;
  --taupe: #bfaf9e;
  --sage: #5e887f;
  --forest: #2c382d;
  --ochre: #b8863c;
  --terra: #a63c2c;
  --slate: #3c4446;

  --serif: "Noto Serif SC", "Source Han Serif SC", "Songti SC", STSong, SimSun,
    Georgia, "Times New Roman", serif;

  /* 拉斐尔《雅典学院》，画面正中是持圆规俯身作图的欧几里得。
     换画只需改这一行；设为 none 则回落到下面的渐变底子。 */
  --stage-art: url('/art/hero.jpg');

  /* 通栏展陈画布。.site-shell 的左右内边距在多个断点被覆盖过，
     这里用不依赖父级内边距的写法，任何断点都能铺到视口边缘。 */
  margin-inline: calc(50% - 50vw);
  margin-bottom: -52px;
  padding: clamp(40px, 6vw, 96px) clamp(20px, 5vw, 88px) clamp(56px, 7vw, 104px);
  background-color: var(--parch);
  /* 画布纹理：斜向织纹 + 四角压暗，模拟油画的画布与暗角 */
  background-image:
    radial-gradient(120% 90% at 50% 0%, rgba(255, 253, 247, 0.9), transparent 60%),
    radial-gradient(100% 100% at 50% 100%, rgba(107, 88, 68, 0.16), transparent 70%),
    repeating-linear-gradient(45deg, rgba(107, 88, 68, 0.035) 0 2px, transparent 2px 4px),
    repeating-linear-gradient(-45deg, rgba(107, 88, 68, 0.03) 0 2px, transparent 2px 4px);
  color: var(--ink);
  font-family: var(--serif);
}

/* ---------- 首屏 ---------- */
.salon-hero {
  position: relative;
  max-width: 1180px;
  margin: 0 auto clamp(64px, 8vw, 120px);
  text-align: center;
}

.hero-eyebrow {
  display: flex;
  gap: 14px;
  align-items: center;
  justify-content: center;
  margin: 0 0 clamp(20px, 3vw, 38px);
  color: var(--umber);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.34em;
  text-transform: uppercase;
}

.hero-eyebrow i {
  width: 40px;
  height: 1px;
  background: currentColor;
  opacity: 0.5;
}

.hero-title {
  position: relative;
  margin: 0;
  font-size: clamp(58px, 12vw, 154px);
  font-weight: 500;
  line-height: 0.92;
  letter-spacing: 0.06em;
}

.hero-line {
  display: block;
  position: relative;
  z-index: 1;
}

.hero-line-alt {
  color: var(--umber);
  font-style: italic;
}

/* 背后的一层回声，标题字重复叠印出立体感 */
.hero-echo {
  position: absolute;
  top: -0.14em;
  left: 50%;
  z-index: 0;
  transform: translateX(-50%);
  color: transparent;
  -webkit-text-stroke: 1px rgba(107, 88, 68, 0.22);
  white-space: nowrap;
  pointer-events: none;
  user-select: none;
}

.hero-range {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: center;
  margin: clamp(26px, 3.5vw, 44px) 0 0;
  color: var(--ink-soft);
  font-size: clamp(13px, 1.3vw, 16px);
  letter-spacing: 0.24em;
}

.hero-range i {
  width: clamp(48px, 8vw, 120px);
  height: 1px;
  background: var(--taupe);
}

.hero-lede {
  max-width: 620px;
  margin: clamp(28px, 3.5vw, 44px) auto 0;
  color: var(--ink-soft);
  font-size: clamp(15px, 1.5vw, 18px);
  line-height: 2;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  justify-content: center;
  margin-top: clamp(32px, 4vw, 52px);
}

.plate-link {
  display: inline-flex;
  gap: 12px;
  align-items: center;
  border: 1px solid var(--ink);
  padding: 15px 30px;
  background: var(--ink);
  color: var(--parch);
  font-size: 15px;
  letter-spacing: 0.16em;
  transition: background 0.25s ease, color 0.25s ease, transform 0.25s ease;
}

.plate-link i {
  font-style: normal;
  transition: transform 0.25s ease;
}

.plate-link:hover {
  background: var(--umber);
  border-color: var(--umber);
  transform: translateY(-2px);
}

.plate-link:hover i {
  transform: translateX(5px);
}

.plate-link-ghost {
  background: transparent;
  color: var(--ink);
}

.plate-link-ghost:hover {
  background: var(--ink);
  border-color: var(--ink);
  color: var(--parch);
}

/* ---------- 画作 ---------- */
.hero-stage {
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  overflow: hidden;
  min-height: clamp(420px, 68vh, 720px);
  margin-inline: calc(-1 * clamp(20px, 5vw, 88px));
  margin-bottom: clamp(60px, 7.5vw, 108px);
  background: var(--forest);
}

/* 视差层：JS 只改 --shift，不触发重排 */
.stage-art {
  position: absolute;
  inset: 0;
  transform: translate3d(0, var(--shift, 0px), 0);
  will-change: transform;
}

/* 画面层：想换成真迹，把 --stage-art 设成 url('/art/hero.jpg') 即可，
   未设置时下面几层渐变会画出一幅暗调的油画底子。 */
.stage-art::before {
  content: '';
  position: absolute;
  inset: -9%;
  background-image:
    var(--stage-art, none),
    radial-gradient(58% 68% at 22% 26%, rgba(216, 180, 118, 0.58), transparent 62%),
    radial-gradient(46% 56% at 73% 40%, rgba(166, 60, 44, 0.44), transparent 66%),
    radial-gradient(52% 60% at 88% 74%, rgba(94, 136, 127, 0.34), transparent 68%),
    radial-gradient(76% 84% at 50% 98%, rgba(24, 30, 24, 0.92), transparent 72%),
    linear-gradient(152deg, #6b5844 0%, #3c4446 46%, #2c382d 100%);
  background-size: cover;
  /* 画面偏左下取景：把持圆规的欧几里得、写字的毕达哥拉斯留在视野内，
     右下角让给文字块。裁切不满意就调这两个百分比。 */
  background-position: 38% 52%;
  animation: stage-drift 30s ease-in-out infinite alternate;
}

/* 罩光油：斜向高光 + 暗角，和名录里的画框同一套明暗对照 */
.stage-varnish {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(114deg, rgba(255, 250, 238, 0.16) 0%, transparent 46%),
    radial-gradient(120% 100% at 50% 45%, transparent 40%, rgba(18, 14, 10, 0.58) 100%),
    repeating-linear-gradient(45deg, rgba(107, 88, 68, 0.05) 0 2px, transparent 2px 4px);
  pointer-events: none;
}

@keyframes stage-drift {
  from {
    transform: scale(1.02) translate3d(0, 0, 0);
  }
  to {
    transform: scale(1.13) translate3d(-1.6%, -1.4%, 0);
  }
}

.stage-panel {
  position: relative;
  width: min(560px, 100%);
  padding: clamp(30px, 3.6vw, 56px);
  background: rgba(40, 52, 41, 0.94);
  color: rgba(242, 236, 224, 0.95);
}

.stage-eyebrow {
  margin: 0 0 16px;
  color: var(--taupe);
  font-size: 12px;
  letter-spacing: 0.32em;
  text-transform: uppercase;
}

.stage-text {
  margin: 0;
  font-size: clamp(19px, 2.1vw, 27px);
  line-height: 1.85;
  letter-spacing: 0.04em;
}

.stage-text em {
  color: var(--ochre);
  font-family: Georgia, "Times New Roman", serif;
  font-style: italic;
}

.stage-link {
  display: inline-flex;
  gap: 12px;
  align-items: center;
  margin-top: clamp(22px, 2.6vw, 34px);
  border-bottom: 1px solid rgba(242, 236, 224, 0.45);
  padding-bottom: 6px;
  font-size: 14px;
  letter-spacing: 0.18em;
  transition: border-color 0.25s ease, color 0.25s ease;
}

.stage-link i {
  display: inline-block;
  font-style: normal;
  transition: transform 0.25s ease;
}

.stage-link:hover {
  border-color: var(--ochre);
  color: var(--ochre);
}

.stage-link:hover i {
  transform: translateX(6px);
}

/* ---------- 分节标尺 ---------- */
.salon-section {
  max-width: 1180px;
  margin: 0 auto clamp(60px, 7.5vw, 108px);
}

.salon-section:last-child {
  margin-bottom: 0;
}

.section-rule {
  display: flex;
  gap: 18px;
  align-items: center;
  margin-bottom: clamp(26px, 3.5vw, 46px);
}

.rule-label {
  flex: none;
  color: var(--ink);
  font-size: clamp(17px, 1.8vw, 21px);
  letter-spacing: 0.3em;
}

.rule-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, var(--taupe), rgba(191, 175, 158, 0.15));
}

.rule-note {
  flex: none;
  color: var(--ink-soft);
  font-size: 13px;
  letter-spacing: 0.1em;
}

/* ---------- 名录 ---------- */
.figure-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(20px, 2.6vw, 34px);
}

.figure-card {
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(107, 88, 68, 0.2);
  background: rgba(255, 253, 247, 0.5);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.figure-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 22px 46px rgba(35, 32, 29, 0.16);
}

.figure-frame {
  position: relative;
  aspect-ratio: 4 / 5;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.figure-frame img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  /* 肖像的脸多在画面上半部，裁切时把重心上提，避免只剩下巴和衣领 */
  object-position: center 26%;
  /* 略降饱和、压暗对比，让不同来源的肖像画统一在同一层罩染下 */
  filter: sepia(0.24) saturate(0.86) contrast(1.04);
}

.figure-monogram {
  color: rgba(242, 236, 224, 0.9);
  font-size: clamp(64px, 8vw, 104px);
  line-height: 1;
  letter-spacing: 0.05em;
}

/* 罩光油：一层斜向高光 + 四周暗角，就是油画的明暗对照 */
.figure-varnish {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(118deg, rgba(255, 250, 238, 0.2) 0%, transparent 42%),
    radial-gradient(120% 100% at 50% 50%, transparent 44%, rgba(20, 16, 12, 0.44) 100%);
  pointer-events: none;
}

.tone-umber { background: var(--umber); }
.tone-forest { background: var(--forest); }
.tone-ochre { background: var(--ochre); }
.tone-terra { background: var(--terra); }
.tone-slate { background: var(--slate); }
.tone-sage { background: var(--sage); }

.figure-plate {
  flex: 1;
  border-top: 1px solid rgba(107, 88, 68, 0.2);
  padding: 20px 22px 24px;
}

.figure-life {
  margin: 0 0 8px;
  color: var(--umber);
  font-size: 12px;
  letter-spacing: 0.18em;
}

.figure-name {
  margin: 0;
  font-size: clamp(21px, 2.2vw, 26px);
  font-weight: 500;
  letter-spacing: 0.08em;
}

.figure-latin {
  margin: 4px 0 0;
  color: var(--ink-soft);
  font-size: 12.5px;
  font-style: italic;
  letter-spacing: 0.06em;
}

.figure-work {
  margin: 14px 0 0;
  color: var(--ink);
  font-size: 14.5px;
}

.figure-note {
  margin: 8px 0 0;
  color: var(--ink-soft);
  font-size: 13.5px;
  line-height: 1.85;
}

/* ---------- 学习入口 ---------- */
.hall-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(18px, 2.4vw, 30px);
}

.hall-card {
  position: relative;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-height: clamp(260px, 26vw, 330px);
  padding: clamp(26px, 3vw, 38px);
  color: rgba(242, 236, 224, 0.94);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.hall-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 100% at 30% 0%, rgba(255, 250, 238, 0.16), transparent 62%);
  pointer-events: none;
}

.hall-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 24px 50px rgba(35, 32, 29, 0.24);
}

.hall-numeral {
  position: absolute;
  right: 0.12em;
  bottom: -0.22em;
  color: rgba(255, 250, 238, 0.13);
  font-size: clamp(110px, 13vw, 176px);
  line-height: 1;
  pointer-events: none;
  user-select: none;
}

.hall-eyebrow {
  margin: 0;
  font-size: 12px;
  letter-spacing: 0.3em;
  opacity: 0.75;
}

.hall-title {
  margin: 12px 0 0;
  font-size: clamp(26px, 3vw, 36px);
  font-weight: 500;
  letter-spacing: 0.1em;
}

.hall-copy {
  position: relative;
  z-index: 1;
  margin: 16px 0 0;
  max-width: 22em;
  font-size: 14px;
  line-height: 1.95;
  opacity: 0.86;
}

.hall-action {
  position: relative;
  z-index: 1;
  margin-top: auto;
  padding-top: 26px;
  font-size: 14px;
  letter-spacing: 0.16em;
}

.hall-action i {
  display: inline-block;
  font-style: normal;
  transition: transform 0.25s ease;
}

.hall-card:hover .hall-action i {
  transform: translateX(6px);
}

/* ---------- 学习方式 ---------- */
.salon-method {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: clamp(28px, 4vw, 60px);
  align-items: start;
}

.method-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.method-list li {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 6px 20px;
  border-top: 1px solid rgba(107, 88, 68, 0.18);
  padding: 20px 0;
}

.method-list li:last-child {
  border-bottom: 1px solid rgba(107, 88, 68, 0.18);
}

.method-index {
  grid-row: span 2;
  color: var(--taupe);
  font-size: clamp(26px, 3vw, 36px);
  line-height: 1;
}

.method-list strong {
  align-self: center;
  font-size: clamp(17px, 1.8vw, 20px);
  font-weight: 500;
  letter-spacing: 0.08em;
}

.method-note {
  color: var(--ink-soft);
  font-size: 14px;
  line-height: 1.9;
}

.method-seal {
  border: 1px solid rgba(107, 88, 68, 0.24);
  padding: clamp(26px, 3vw, 36px);
  background: linear-gradient(160deg, rgba(255, 253, 247, 0.72), rgba(232, 223, 205, 0.5));
}

.seal-eyebrow {
  margin: 0;
  color: var(--umber);
  font-size: 12px;
  letter-spacing: 0.28em;
}

.seal-main {
  margin: 14px 0 0;
  font-size: clamp(22px, 2.4vw, 28px);
  letter-spacing: 0.1em;
}

.seal-note {
  margin: 16px 0 0;
  color: var(--ink-soft);
  font-size: 13.5px;
  line-height: 1.95;
}

/* ---------- 经典著作 ---------- */
.salon-canon {
  /* 这一段要撑满画布，不受 .salon-section 的 max-width 约束 */
  max-width: none;
  margin-inline: calc(-1 * clamp(20px, 5vw, 88px));
  padding: clamp(40px, 5vw, 72px) clamp(20px, 5vw, 88px);
  background: var(--forest);
  color: rgba(242, 236, 224, 0.92);
}

.salon-canon .section-rule {
  max-width: 1180px;
  margin-inline: auto;
}

.section-rule-light .rule-label {
  color: rgba(242, 236, 224, 0.94);
}

.section-rule-light .rule-line {
  background: linear-gradient(90deg, rgba(242, 236, 224, 0.4), rgba(242, 236, 224, 0.08));
}

.section-rule-light .rule-note {
  color: rgba(242, 236, 224, 0.6);
}

.canon-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 clamp(32px, 5vw, 72px);
  max-width: 1180px;
  margin: 0 auto;
  padding: 0;
  list-style: none;
}

.canon-list li {
  display: flex;
  gap: 12px;
  align-items: baseline;
  border-bottom: 1px solid rgba(242, 236, 224, 0.14);
  padding: 15px 0;
  font-size: 15px;
}

.canon-author {
  flex: none;
  min-width: 5.6em;
  color: rgba(242, 236, 224, 0.62);
  font-size: 13px;
  letter-spacing: 0.1em;
}

.canon-work {
  flex: none;
}

.canon-dots {
  flex: 1;
  height: 1px;
  border-bottom: 1px dotted rgba(242, 236, 224, 0.28);
}

.canon-year {
  flex: none;
  color: var(--taupe);
  font-size: 13.5px;
  letter-spacing: 0.08em;
}

/* ---------- 滚动浮现 ---------- */
/* 只在允许动效时才隐藏；用户要求减少动效时内容始终可见。 */
@media (prefers-reduced-motion: no-preference) {
  .reveal {
    opacity: 0;
    transform: translateY(26px);
    transition: opacity 0.85s cubic-bezier(0.22, 0.61, 0.36, 1),
      transform 0.85s cubic-bezier(0.22, 0.61, 0.36, 1);
  }

  .reveal.is-revealed {
    opacity: 1;
    transform: none;
  }

  /* 逐个入场，像展签一块块被点亮 */
  .figure-card:nth-child(2),
  .hall-card:nth-child(2) {
    transition-delay: 0.1s;
  }

  .figure-card:nth-child(3),
  .hall-card:nth-child(3) {
    transition-delay: 0.2s;
  }

  .figure-card:nth-child(4) { transition-delay: 0.06s; }
  .figure-card:nth-child(5) { transition-delay: 0.16s; }
  .figure-card:nth-child(6) { transition-delay: 0.26s; }

  .canon-list li:nth-child(even) {
    transition-delay: 0.08s;
  }

  .method-list li:nth-child(2) { transition-delay: 0.1s; }
  .method-list li:nth-child(3) { transition-delay: 0.2s; }
}

/* 肖像随悬停缓缓推近，像凑近细看一幅画 */
.figure-frame img,
.figure-monogram {
  transition: transform 0.9s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.figure-card:hover .figure-frame img,
.figure-card:hover .figure-monogram {
  transform: scale(1.06);
}

/* ---------- 响应式 ---------- */
@media (max-width: 900px) {
  .figure-grid,
  .hall-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .salon-method {
    grid-template-columns: minmax(0, 1fr);
  }

  .canon-list {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 620px) {
  .figure-grid,
  .hall-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .hero-echo {
    display: none;
  }

  .hero-stage {
    min-height: clamp(360px, 56vh, 460px);
  }

  .section-rule {
    flex-wrap: wrap;
    gap: 10px;
  }

  .rule-note {
    flex-basis: 100%;
  }

  .plate-link {
    flex: 1;
    justify-content: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .figure-card,
  .hall-card,
  .plate-link,
  .plate-link i,
  .hall-action i,
  .stage-link,
  .stage-link i,
  .figure-frame img,
  .figure-monogram {
    transition: none;
  }

  .figure-card:hover,
  .hall-card:hover,
  .plate-link:hover {
    transform: none;
  }

  .figure-card:hover .figure-frame img,
  .figure-card:hover .figure-monogram {
    transform: none;
  }

  /* 画作停在中间状态，不做缓慢推移 */
  .stage-art::before {
    animation: none;
    transform: scale(1.06);
  }
}
</style>
