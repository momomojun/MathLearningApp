<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import OpeningSequence from '../components/home/OpeningSequence.vue'
import { markIntroPlayed, shouldPlayIntro } from '../components/home/introGate'

const root = ref(null)

// 开场每次整页加载放一遍：刷新能重看，站内跳转回首页不会重放。
// 判断逻辑在 introGate.js 里，那个模块级标记就是「这次加载放过了」。
const playIntro = ref(shouldPlayIntro())
// 这次到底放没放过开场。没放过就不要给首屏加入场动画——
// 直接进来的人不该白等一次淡入。
const hadIntro = playIntro.value
// 开场期间正文先压住，等开场落幕再让首屏「到位」，两段衔接成一个动作
const introDone = ref(!playIntro.value)

function finishIntro() {
  playIntro.value = false
  introDone.value = true
  markIntroPlayed()
  startReveals()
}

// 滚动浮现。
//
// 这里刻意没用 IntersectionObserver：它只在交叠比例跨过阈值时回调，
// 而从「在视口下方」一跳到「在视口上方」（按 End、锚点跳转、刷新后恢复滚动位置）
// 比例始终是 0，一次都不回调——中间那几块就永久停在 opacity:0，内容直接丢了。
// 目标一共就五个，每帧各取一次 getBoundingClientRect 的开销可以忽略，
// 换来的是一个不会有那种失效模式的判断：只要它的顶边越过阈线，就该显示。
let onScroll = null
let rafId = 0
let pending = []

function sweep() {
  rafId = 0
  // 阈线取视口高度的 92%，等价于原来 rootMargin 的 -8%：
  // 元素要真正进来一点才浮现，不是刚露个边就动
  const limit = window.innerHeight * 0.92
  pending = pending.filter((el) => {
    if (el.getBoundingClientRect().top >= limit) return true
    el.classList.add('is-revealed')
    return false
  })
  if (!pending.length) stopReveals()
}

function scheduleSweep() {
  if (!rafId) rafId = requestAnimationFrame(sweep)
}

function stopReveals() {
  if (onScroll) {
    window.removeEventListener('scroll', onScroll)
    window.removeEventListener('resize', onScroll)
    onScroll = null
  }
  if (rafId) {
    cancelAnimationFrame(rafId)
    rafId = 0
  }
}

// 要等开场落幕再开始。开场期间整页压在黑幕底下、滚动也锁着，
// 这时候就判定首屏下方那几块「已进入视口」的话，等黑幕退去它们早就浮现完了，
// 往下滚一个动画都看不到。
function startReveals() {
  pending = root.value ? [...root.value.querySelectorAll('.reveal')] : []
  if (!pending.length) return

  // 用户要求减少动效时，CSS 不会隐藏任何东西，这里直接不介入。
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  onScroll = scheduleSweep
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)
  sweep() // 先判一次：已经在视口里的不用等滚动
}

onMounted(() => {
  // 开场要放的话，等它落幕再开始；否则立刻开始
  if (!playIntro.value) startReveals()
})

onBeforeUnmount(stopReveals)

// 首页文案不走后台内容管理，但下面这些 slug、课程名、副标题、题量和价格
// 都跟数据库里的真实数据对齐，点进去能落到具体那一节。改了后台记得回来核一遍。

// 「免费读第一节」直达微积分第一节，它在数据库里就是 access=free。
const FREE_ENTRY = '/knowledge?course=calculus&section=calculus-limits-sequence'

const courses = [
  {
    no: '01',
    slug: 'calculus',
    name: '微积分',
    scope: '极限 · 导数 · 积分 · 级数',
    audience: '期末备考 / 考研数学 / 工科基础',
    drill: '86 题',
  },
  {
    no: '02',
    slug: 'linear-algebra',
    name: '线性代数',
    scope: '行列式 · 矩阵 · 向量空间 · 特征值',
    audience: '期末备考 / 考研数学 / 数据科学入门',
    drill: '72 题',
  },
  {
    no: '03',
    slug: 'probability',
    name: '概率统计',
    scope: '随机事件 · 随机变量 · 估计 · 检验',
    audience: '期末备考 / 考研数学 / 课题与数据分析',
    drill: '64 题',
  },
]

// 一节讲义由哪些模块组成。取自 docs/TEMPLATE_GUIDE.md 里真实支持的指令，
// 不是编出来的功能清单。
const parts = [
  { key: 'def', name: '定义与定理', note: '编号可引用' },
  { key: 'problem', name: '例题与解析', note: '解析可折叠' },
  { key: 'table', name: '速查表格', note: '公式对照' },
  { key: 'figure', name: '图像与互动', note: '可拖动参数' },
  { key: 'video', name: '视频讲解', note: '逐步推演' },
]
</script>

<template>
  <div
    ref="root"
    class="home"
    :class="{ 'intro-pending': !introDone, 'intro-arrive': hadIntro && introDone }"
  >
    <OpeningSequence v-if="playIntro" @done="finishIntro" />

    <!-- 首屏：左边说清楚这是什么，右边直接摊开一节真实讲义。
         付费产品的首屏与其宣称内容好，不如让人先看见内容。 -->
    <header class="hero">
      <div class="hero-copy">
        <p class="eyebrow">大学数学 · 讲义与习题</p>

        <h1 class="hero-title">
          定义、例题和解析<br />
          <span>在同一页上</span>
        </h1>

        <p class="hero-lede">
          微积分、线性代数、概率统计。为期末、考研与竞赛准备——
          每一节都从定义开始，配例题与完整解析，按自己的节奏走到能自己写出证明。
        </p>

        <div class="hero-actions">
          <RouterLink class="btn btn-solid" :to="FREE_ENTRY">
            免费读第一节<i aria-hidden="true">→</i>
          </RouterLink>
          <RouterLink class="btn btn-line" to="/knowledge">
            浏览全部课程
          </RouterLink>
        </div>

        <!-- 免费内容是最直接的转化理由。核实过：content 接口对未登录开放，
             会员小节在服务端另做一次校验，不只是前端隐藏。 -->
        <ul class="hero-facts">
          <li><strong>3</strong> 门课程</li>
          <li>标注免费的小节<strong>无需注册</strong></li>
          <li>会员 <strong>¥39</strong> 起</li>
        </ul>
      </div>

      <!-- 这张卡是知识库里「1.1 数列极限」的真实排版，不是示意图。
           块的配色、编号样式跟 TemplateLesson 里的定义块/例题块保持一致。 -->
      <figure class="hero-sheet">
        <div class="sheet">
          <div class="sheet-head">
            <span class="sheet-path">微积分 · 第一章 极限与连续</span>
            <span class="tag tag-free">免费</span>
          </div>
          <h2 class="sheet-title">1.1 数列极限</h2>

          <div class="block block-def">
            <p class="block-head"><span class="chip">定义 1</span>数列极限</p>
            <p class="block-text">
              设 <em>{aₙ}</em> 是一个数列，<em>A</em> 是一个常数。如果对任意
              <em>ε &gt; 0</em>，总存在正整数 <em>N</em>，使得当 <em>n &gt; N</em> 时都有
            </p>
            <p class="block-formula">| aₙ − A | &lt; ε</p>
            <p class="block-text">则称数列 <em>{aₙ}</em> 收敛于 <em>A</em>。</p>
          </div>

          <div class="block block-problem">
            <p class="block-head">
              <span class="chip chip-alt">例题 1</span>计算题 · 基础
            </p>
            <p class="block-text">
              判断数列 <em>aₙ = (2n+1) / (n+3)</em> 是否收敛，并求它的极限。
            </p>
            <p class="block-fold" aria-hidden="true">展开解析 ▾</p>
          </div>
        </div>
        <figcaption>知识库里真实的一节</figcaption>
      </figure>
    </header>

    <!-- 课程目录：三门课是真的同级，所以排成目录行而不是三张营销卡片。
         副标题、适合人群和题量都来自后台里这三门课的字段。 -->
    <section class="band">
      <div class="band-head">
        <h2>课程</h2>
        <p>讲义与习题按同一套章节组织，学到哪就在哪练</p>
      </div>

      <ul class="course-list reveal">
        <li v-for="course in courses" :key="course.slug" class="course-row">
          <RouterLink class="course-link" :to="`/knowledge?course=${course.slug}`">
            <span class="course-no">{{ course.no }}</span>
            <span class="course-main">
              <span class="course-name">{{ course.name }}</span>
              <span class="course-scope">{{ course.scope }}</span>
            </span>
            <span class="course-audience">{{ course.audience }}</span>
            <span class="course-drill">{{ course.drill }}</span>
            <span class="course-go" aria-hidden="true">→</span>
          </RouterLink>
        </li>
      </ul>
    </section>

    <!-- 一节讲义的组成：对应 TEMPLATE_GUIDE 里真实支持的模板指令 -->
    <section class="band band-tint">
      <div class="band-head">
        <h2>一节讲义里有什么</h2>
        <p>不是一段视频加一份 PDF</p>
      </div>

      <ul class="part-list reveal">
        <li v-for="part in parts" :key="part.key" class="part">
          <svg class="part-icon" viewBox="0 0 32 32" aria-hidden="true">
            <template v-if="part.key === 'def'">
              <rect x="5" y="6" width="22" height="20" rx="1" />
              <path d="M10 13h12M10 18h9" />
            </template>
            <template v-else-if="part.key === 'problem'">
              <path d="M6 9h20M6 15h14" />
              <path class="dash" d="M6 22h20M6 26h12" />
            </template>
            <template v-else-if="part.key === 'table'">
              <rect x="5" y="7" width="22" height="18" rx="1" />
              <path d="M5 13h22M12.3 13v12M19.6 13v12" />
            </template>
            <template v-else-if="part.key === 'figure'">
              <path d="M7 6v20h20" />
              <path d="M7 22c5 0 6-13 11-13 3 0 4 5 9 5" />
            </template>
            <template v-else>
              <circle cx="16" cy="16" r="11" />
              <path d="M13.5 11.5l8 4.5-8 4.5z" />
            </template>
          </svg>
          <span class="part-name">{{ part.name }}</span>
          <span class="part-note">{{ part.note }}</span>
        </li>
      </ul>

      <p class="part-note-all">
        标注<span class="tag tag-free">免费</span>的小节无需注册即可阅读；
        <span class="tag tag-member">会员</span>小节在服务端校验权限，不只是前端隐藏。
      </p>
    </section>

    <!-- 两个入口：先读后练是实际顺序，所以做成一深一浅，不是并列的两张卡 -->
    <section class="band">
      <div class="entry-grid">
        <RouterLink class="entry entry-primary reveal" to="/knowledge">
          <span class="entry-kicker">读</span>
          <span class="entry-name">知识库</span>
          <span class="entry-copy">
            从概念、定理到例题，按章节把容易断开的知识点重新连起来。支持收藏、已读和最近学习。
          </span>
          <span class="entry-go">进入知识库<i aria-hidden="true">→</i></span>
        </RouterLink>

        <RouterLink class="entry entry-second reveal" to="/exercises">
          <span class="entry-kicker">练</span>
          <span class="entry-name">习题库</span>
          <span class="entry-copy">
            按题型、难度与完成状态筛选，做错的自动进错题本，解析留到你需要的时候再展开。
          </span>
          <span class="entry-go">开始练习<i aria-hidden="true">→</i></span>
        </RouterLink>
      </div>

      <!-- 会员是付费项，不跟上面两个功能入口并列，单独一条 -->
      <RouterLink class="member-bar reveal" to="/membership">
        <span class="member-text">
          <strong>会员</strong>
          解锁全部讲义、会员题组与视频讲解，后续课程持续更新。
        </span>
        <span class="member-price">¥39 / 月　·　¥199 / 年</span>
        <span class="member-go">查看权益<i aria-hidden="true">→</i></span>
      </RouterLink>
    </section>

    <!-- 收尾。一幅《几何原本》第一卷命题一的作图：两段圆规弧交于一点，
         连成等边三角形。整页只留这一处装饰。 -->
    <section class="closing">
      <!-- 两段弧是被页面裁掉的，不是画不完整：圆规扫出的痕迹本来就会越过图框。
           viewBox 按作图的真实坐标取景，不缩放、不补画。 -->
      <svg viewBox="-42 -106 184 128" class="closing-figure" role="img"
           aria-label="《几何原本》第一卷命题一：在给定线段上作一个等边三角形">
        <circle class="arc" cx="0" cy="0" r="100" />
        <circle class="arc" cx="100" cy="0" r="100" />
        <path class="rule" d="M 0 0 L 100 0 L 50 -86.6 Z" />
        <circle class="node" cx="0" cy="0" r="2.6" />
        <circle class="node" cx="100" cy="0" r="2.6" />
        <circle class="node" cx="50" cy="-86.6" r="2.6" />
      </svg>

      <div class="closing-copy">
        <p class="eyebrow">命题一 · 在给定的有限直线上作一个等边三角形</p>
        <h2>先看懂一个证明，再亲手做一遍</h2>
        <p class="closing-text">
          这两步之间来回切换最费时间。讲义和习题放在一起，就是为了省掉这段切换。
        </p>
        <div class="hero-actions">
          <RouterLink class="btn btn-solid" :to="FREE_ENTRY">
            免费读第一节<i aria-hidden="true">→</i>
          </RouterLink>
          <RouterLink class="btn btn-line" to="/membership">查看会员</RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* 一套颜色用到底。墨绿取自导航栏的品牌印章 #284c3e，
   这样首页和站点其余部分是同一个产品，不是两张皮。 */
.home {
  --paper: #fbfaf7;
  --paper-2: #f4f2ec;
  --ink: #1c1b18;
  --ink-2: #57544d;
  --ink-3: #79756b;
  --line: #e3dfd4;
  --line-2: #cfc9ba;
  --accent: #1f4d3d;
  --accent-2: #2f6a52;
  --accent-soft: #edf3ef;
  --mark: #a6412f;
  --mark-soft: #f6efe9;

  --mono: "SF Mono", "JetBrains Mono", Menlo, Consolas, monospace;
  --math: Georgia, "Times New Roman", serif;

  /* 通栏铺底。.site-shell 的左右内边距在多个断点被覆盖过，
     这里用不依赖父级内边距的写法，任何断点都能铺到视口边缘。 */
  margin-inline: calc(50% - 50vw);
  margin-bottom: -52px;
  padding-inline: clamp(20px, 5vw, 72px);
  background: var(--paper);
  color: var(--ink);
}

/* ---------- 通用件 ---------- */
.eyebrow {
  margin: 0;
  color: var(--ink-3);
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.14em;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 46px;
  border: 1px solid var(--accent);
  border-radius: 3px;
  padding: 0 22px;
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  transition: background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
}

.btn i {
  font-style: normal;
  transition: transform 0.18s ease;
}

.btn:hover i {
  transform: translateX(4px);
}

.btn-solid {
  background: var(--accent);
  color: #fff;
}

.btn-solid:hover {
  background: #163828;
  border-color: #163828;
}

.btn-line {
  border-color: var(--line-2);
  background: transparent;
  color: var(--ink);
}

.btn-line:hover {
  border-color: var(--accent);
  color: var(--accent);
}

/* 免费 / 会员标记。整页只有这两个地方用朱红，它就一直是「标记」的意思。 */
.tag {
  display: inline-block;
  border-radius: 2px;
  padding: 1px 7px;
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.tag-free {
  background: var(--accent-soft);
  color: var(--accent);
}

.tag-member {
  background: var(--mark-soft);
  color: var(--mark);
}

/* ---------- 首屏 ---------- */
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(0, 0.98fr);
  gap: clamp(32px, 5vw, 76px);
  align-items: center;
  max-width: 1180px;
  margin: 0 auto;
  padding: clamp(40px, 6vw, 84px) 0 clamp(52px, 6.5vw, 96px);
}

.hero-title {
  margin: 18px 0 0;
  font-size: clamp(34px, 4.6vw, 58px);
  font-weight: 700;
  line-height: 1.24;
  letter-spacing: 0.01em;
}

.hero-title span {
  color: var(--accent);
}

.hero-lede {
  max-width: 30em;
  margin: clamp(18px, 2.2vw, 26px) 0 0;
  color: var(--ink-2);
  font-size: clamp(15px, 1.25vw, 16.5px);
  line-height: 1.95;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: clamp(24px, 3vw, 34px);
}

.hero-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 22px;
  margin: clamp(22px, 2.6vw, 30px) 0 0;
  padding: 0;
  list-style: none;
  color: var(--ink-3);
  font-size: 13px;
}

.hero-facts li {
  display: flex;
  align-items: baseline;
  gap: 5px;
}

/* 竖线分隔比小圆点更安静，也不会在换行后留下孤立的点 */
.hero-facts li + li {
  border-left: 1px solid var(--line);
  padding-left: 22px;
}

.hero-facts strong {
  color: var(--ink);
  font-size: 15px;
  font-weight: 700;
}

/* 讲义卡：白底 + 细边 + 轻投影，跟纸底拉开一层，像真的从讲义里取的一页 */
.hero-sheet {
  margin: 0;
}

.sheet {
  border: 1px solid var(--line);
  border-radius: 4px;
  padding: clamp(20px, 2.4vw, 30px);
  background: #fff;
  box-shadow: 0 1px 2px rgba(28, 27, 24, 0.04), 0 18px 40px rgba(28, 27, 24, 0.07);
}

.sheet-head {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.sheet-path {
  color: var(--ink-3);
  font-size: 12.5px;
}

.sheet-title {
  margin: 12px 0 18px;
  font-size: clamp(19px, 1.9vw, 23px);
  font-weight: 700;
  letter-spacing: 0.01em;
}

.block {
  border-radius: 3px;
  padding: 15px 18px 16px;
}

.block + .block {
  margin-top: 12px;
}

.block-def {
  background: var(--accent-soft);
  box-shadow: inset 3px 0 0 var(--accent-2);
}

.block-problem {
  background: #f8f4ec;
  box-shadow: inset 3px 0 0 #9a6a3d;
}

.block-head {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  align-items: center;
  margin: 0 0 11px;
  font-size: 14px;
  font-weight: 700;
}

.chip {
  border-radius: 2px;
  padding: 2px 8px;
  background: var(--accent-2);
  color: #fff;
  font-size: 11.5px;
  font-weight: 700;
}

.chip-alt {
  background: #9a6a3d;
}

.block-text {
  margin: 0 0 8px;
  font-size: 14px;
  line-height: 1.9;
}

.block-text:last-child {
  margin-bottom: 0;
}

/* 公式用衬线斜体，跟正文拉开区别，接近 KaTeX 的观感 */
.block-text em,
.block-formula {
  font-family: var(--math);
  font-style: italic;
}

.block-formula {
  margin: 12px 0;
  font-size: clamp(16px, 1.7vw, 19px);
  text-align: center;
}

.block-fold {
  margin: 10px 0 0;
  color: #8a5f35;
  font-size: 13px;
  font-weight: 600;
}

.hero-sheet figcaption {
  margin-top: 12px;
  color: var(--ink-3);
  font-size: 12.5px;
  text-align: right;
}

/* ---------- 分段 ---------- */
.band {
  max-width: 1180px;
  margin: 0 auto;
  padding: clamp(48px, 6vw, 82px) 0;
  border-top: 1px solid var(--line);
}

/* 通栏浅底，给页面一点节奏；内容仍然对齐同一条 1180 的中轴 */
.band-tint {
  max-width: none;
  margin-inline: calc(-1 * clamp(20px, 5vw, 72px));
  padding-inline: clamp(20px, 5vw, 72px);
  background: var(--paper-2);
  border-top-color: var(--line-2);
}

.band-tint > * {
  max-width: 1180px;
  margin-inline: auto;
}

.band-head {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  align-items: baseline;
  margin-bottom: clamp(22px, 2.8vw, 34px);
}

.band-head h2 {
  margin: 0;
  font-size: clamp(21px, 2.2vw, 27px);
  font-weight: 700;
  letter-spacing: 0.01em;
}

.band-head p {
  margin: 0;
  color: var(--ink-3);
  font-size: 13.5px;
}

/* ---------- 课程目录 ---------- */
.course-list {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--line);
}

.course-row {
  border-bottom: 1px solid var(--line);
}

.course-link {
  display: grid;
  grid-template-columns: 44px minmax(0, 1.5fr) minmax(0, 1.15fr) 68px 24px;
  gap: 16px;
  align-items: center;
  padding: 20px 8px 20px 4px;
  transition: background 0.18s ease, padding 0.18s ease;
}

.course-link:hover {
  background: var(--accent-soft);
  padding-left: 12px;
}

.course-no {
  color: var(--ink-3);
  font-family: var(--mono);
  font-size: 13px;
}

.course-main {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.course-name {
  font-size: clamp(17px, 1.6vw, 20px);
  font-weight: 700;
}

.course-scope {
  color: var(--ink-2);
  font-size: 13.5px;
}

.course-audience {
  color: var(--ink-3);
  font-size: 13px;
  line-height: 1.6;
}

.course-drill {
  color: var(--ink-2);
  font-size: 13px;
  text-align: right;
  white-space: nowrap;
}

.course-go {
  color: var(--line-2);
  font-size: 16px;
  text-align: right;
  transition: color 0.18s ease, transform 0.18s ease;
}

.course-link:hover .course-go {
  color: var(--accent);
  transform: translateX(3px);
}

/* ---------- 一节讲义的组成 ---------- */
.part-list {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: clamp(12px, 1.6vw, 22px);
  margin: 0;
  padding: 0;
  list-style: none;
}

.part {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: 1px solid var(--line);
  border-radius: 3px;
  padding: 20px 18px 22px;
  background: var(--paper);
}

.part-icon {
  width: 30px;
  height: 30px;
  margin-bottom: 4px;
  fill: none;
  stroke: var(--accent);
  stroke-width: 1.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 例题块里的解析是折叠的，图标上用虚线表示「可以展开」 */
.part-icon .dash {
  stroke: var(--line-2);
  stroke-dasharray: 3 3;
}

.part-name {
  font-size: 15px;
  font-weight: 700;
}

.part-note {
  color: var(--ink-3);
  font-size: 12.5px;
}

.part-note-all {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
  margin: clamp(20px, 2.4vw, 28px) 0 0;
  color: var(--ink-2);
  font-size: 13.5px;
  line-height: 1.9;
}

/* ---------- 两个入口 ---------- */
.entry-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(16px, 2vw, 24px);
}

.entry {
  display: flex;
  flex-direction: column;
  border-radius: 4px;
  padding: clamp(26px, 3vw, 38px);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.entry:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 34px rgba(28, 27, 24, 0.1);
}

.entry-primary {
  background: var(--accent);
  color: #fff;
}

.entry-second {
  border: 1px solid var(--line-2);
  background: var(--paper);
  color: var(--ink);
}

.entry-kicker {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  font-size: 15px;
  font-weight: 700;
}

.entry-primary .entry-kicker {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
}

.entry-second .entry-kicker {
  background: var(--accent-soft);
  color: var(--accent);
}

.entry-name {
  margin-top: 16px;
  font-size: clamp(22px, 2.4vw, 28px);
  font-weight: 700;
  letter-spacing: 0.01em;
}

.entry-copy {
  margin-top: 12px;
  max-width: 24em;
  font-size: 14px;
  line-height: 1.9;
}

.entry-primary .entry-copy {
  color: rgba(255, 255, 255, 0.84);
}

.entry-second .entry-copy {
  color: var(--ink-2);
}

.entry-go {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: auto;
  padding-top: 26px;
  font-size: 14.5px;
  font-weight: 600;
}

.entry-go i {
  font-style: normal;
  transition: transform 0.18s ease;
}

.entry:hover .entry-go i {
  transform: translateX(4px);
}

/* ---------- 会员条 ---------- */
.member-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 26px;
  align-items: center;
  justify-content: space-between;
  margin-top: clamp(16px, 2vw, 24px);
  border: 1px solid var(--line-2);
  border-left: 3px solid var(--mark);
  border-radius: 3px;
  padding: 20px clamp(20px, 2.4vw, 28px);
  background: var(--paper);
  transition: background 0.18s ease;
}

.member-bar:hover {
  background: var(--mark-soft);
}

.member-text {
  flex: 1 1 320px;
  color: var(--ink-2);
  font-size: 14px;
  line-height: 1.8;
}

.member-text strong {
  margin-right: 8px;
  color: var(--ink);
  font-size: 15.5px;
}

.member-price {
  color: var(--ink);
  font-size: 14.5px;
  font-weight: 700;
  white-space: nowrap;
}

.member-go {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--mark);
  font-size: 14.5px;
  font-weight: 600;
  white-space: nowrap;
}

.member-go i {
  font-style: normal;
  transition: transform 0.18s ease;
}

.member-bar:hover .member-go i {
  transform: translateX(4px);
}

/* ---------- 收尾 ---------- */
.closing {
  display: grid;
  grid-template-columns: minmax(0, 0.42fr) minmax(0, 1fr);
  gap: clamp(28px, 4vw, 60px);
  align-items: center;
  max-width: 1180px;
  margin: 0 auto;
  padding: clamp(48px, 6vw, 84px) 0 clamp(56px, 7vw, 96px);
  border-top: 1px solid var(--line);
}

/* 圆规画的弧细而浅，直尺连出的线实而重，跟真用工具画出来的层次一致 */
.closing-figure {
  width: min(100%, 300px);
  height: auto;
  justify-self: center;
}

.closing-figure .arc {
  fill: none;
  stroke: var(--line-2);
  stroke-width: 1;
}

.closing-figure .rule {
  fill: rgba(31, 77, 61, 0.05);
  stroke: var(--accent);
  stroke-width: 1.6;
  stroke-linejoin: round;
}

.closing-figure .node {
  fill: var(--accent);
}

.closing-copy h2 {
  margin: 14px 0 0;
  font-size: clamp(22px, 2.6vw, 32px);
  font-weight: 700;
  line-height: 1.4;
}

.closing-text {
  max-width: 34em;
  margin: 14px 0 0;
  color: var(--ink-2);
  font-size: 15px;
  line-height: 1.95;
}

/* ---------- 开场落幕后的首屏到位 ---------- */
/* 开场那条线收成品牌、黑幕淡去之后，首屏不该已经静静摊在那里等着——
   那样两段是两件事。让它在黑幕退去的同时逐件落位，接成一个动作。 */
.intro-pending .hero-copy > *,
.intro-pending .hero-sheet {
  opacity: 0;
}

@media (prefers-reduced-motion: no-preference) {
  .intro-arrive .hero-copy > * {
    animation: arrive 0.72s cubic-bezier(0.22, 0.61, 0.36, 1) backwards;
  }

  .intro-arrive .hero-copy > :nth-child(1) { animation-delay: 0.02s; }
  .intro-arrive .hero-copy > :nth-child(2) { animation-delay: 0.08s; }
  .intro-arrive .hero-copy > :nth-child(3) { animation-delay: 0.16s; }
  .intro-arrive .hero-copy > :nth-child(4) { animation-delay: 0.24s; }
  .intro-arrive .hero-copy > :nth-child(5) { animation-delay: 0.32s; }

  /* 讲义卡最后到位：先读懂这是什么，再看见内容 */
  .intro-arrive .hero-sheet {
    animation: arrive-sheet 0.86s cubic-bezier(0.22, 0.61, 0.36, 1) 0.2s backwards;
  }
}

@keyframes arrive {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes arrive-sheet {
  from {
    opacity: 0;
    transform: translateY(24px) scale(0.985);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

/* ---------- 滚动浮现 ---------- */
/* 只在允许动效时才隐藏；用户要求减少动效时内容始终可见。 */
@media (prefers-reduced-motion: no-preference) {
  .reveal {
    opacity: 0;
    transform: translateY(16px);
    transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.22, 0.61, 0.36, 1);
  }

  .reveal.is-revealed {
    opacity: 1;
    transform: none;
  }

  .entry-second { transition-delay: 0.08s; }
  .member-bar { transition-delay: 0.14s; }
}

/* ---------- 响应式 ---------- */
@media (max-width: 1040px) {
  .part-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .hero,
  .closing {
    grid-template-columns: minmax(0, 1fr);
  }

  /* 窄屏先读字再看图：讲义卡和收尾作图都挪到文字下面 */
  .hero-sheet,
  .closing-figure {
    order: 2;
  }

  .closing-figure {
    width: min(100%, 240px);
  }

  .entry-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  /* 课程行去掉「适合人群」那一列：窄屏挤成两三个字一行，不如不要。
     信息在课程页里仍然看得到。 */
  .course-link {
    grid-template-columns: 34px minmax(0, 1fr) auto 20px;
    gap: 12px;
  }

  .course-audience {
    display: none;
  }
}

@media (max-width: 620px) {
  .part-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  /* 三条事实在窄屏会折行，竖线分隔就会掉到行首变成一根没有来由的线，
     所以窄屏直接去掉分隔线，靠间距分开。 */
  .hero-facts {
    gap: 6px 18px;
  }

  .hero-facts li + li {
    border-left: 0;
    padding-left: 0;
  }

  /* 两个按钮各占一半，文字不换行 */
  .btn {
    flex: 1 1 auto;
    justify-content: center;
    padding: 0 16px;
  }

  /* 题量挪到课程名下面单独一行：挤在右侧会把副标题压成每行五六个字 */
  .course-link {
    grid-template-columns: 30px minmax(0, 1fr) 18px;
    row-gap: 7px;
  }

  .course-no,
  .course-main,
  .course-go {
    grid-row: 1;
  }

  .course-drill {
    grid-column: 2;
    grid-row: 2;
    color: var(--ink-3);
    font-size: 12.5px;
    text-align: left;
  }

  .member-price {
    flex: 1 1 100%;
  }
}

@media (max-width: 420px) {
  .part-list {
    grid-template-columns: minmax(0, 1fr);
  }

  .part {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 12px;
    padding: 14px 16px;
  }

  .part-icon {
    width: 24px;
    height: 24px;
    margin-bottom: 0;
  }

  .part-note {
    flex: 1 1 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .btn,
  .btn i,
  .entry,
  .course-link,
  .course-go,
  .member-bar {
    transition: none;
  }

  .entry:hover {
    transform: none;
  }
}
</style>
