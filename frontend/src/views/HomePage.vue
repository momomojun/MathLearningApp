<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import MountainJourney from '../components/home/MountainJourney.vue'

const root = ref(null)

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
})

onBeforeUnmount(() => {
  observer?.disconnect()
  if (failsafeId) clearTimeout(failsafeId)
})

// 首页展陈文案，不是课程内容，不需要走后台内容管理。

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

// 底部年表：人、著作、年份、贡献放在一起讲。
// 之前这里只有书名，另有一节「名录」单独列同样这 6 位数学家的肖像卡片——
// 而那 6 张肖像在上面的画廊墙里已经出现过一次，同一批人在一页里出现三遍。
// 现在合并成一条年表：有肖像的条目配头像和一句贡献，其余只留年份和书名，
// 长短交错反而比 12 行一模一样的条目更有节奏。
const canon = [
  {
    who: '欧几里得',
    work: '几何原本',
    year: '约前 300',
    portrait: 'euclid.jpg',
    accent: '#bfaf9e',
    note: '把零散的几何事实收进公理与证明的秩序里。',
  },
  { who: '阿基米德', work: '圆的度量', year: '约前 250' },
  { who: '笛卡尔', work: '几何学', year: '1637' },
  {
    who: '牛顿',
    work: '自然哲学的数学原理',
    year: '1687',
    portrait: 'newton.jpg',
    accent: '#9fb8c9',
    note: '用变化率重写运动，微积分从此有了物理的重量。',
  },
  {
    who: '欧拉',
    work: '无穷分析引论',
    year: '1748',
    portrait: 'euler.jpg',
    accent: '#c9a86a',
    note: '级数、函数与复数在他笔下第一次连成一体。',
  },
  {
    who: '高斯',
    work: '算术研究',
    year: '1801',
    portrait: 'gauss.jpg',
    accent: '#c98a7a',
    note: '消元法与正态分布，至今仍是代数与统计的地基。',
  },
  {
    who: '拉普拉斯',
    work: '概率的分析理论',
    year: '1812',
    portrait: 'laplace.jpg',
    accent: '#8fb3a6',
    note: '让偶然可以被计算，概率因此成为一门学科。',
  },
  {
    who: '柯西',
    work: '分析教程',
    year: '1821',
    portrait: 'cauchy.jpg',
    accent: '#a9b2b5',
    note: '一句 ε–N，把「无限接近」从直觉变成可验证的语言。',
  },
  { who: '黎曼', work: '论几何学的基础假设', year: '1854' },
  { who: '康托尔', work: '超穷数理论基础', year: '1895' },
  { who: '希尔伯特', work: '几何基础', year: '1899' },
  { who: '柯尔莫哥洛夫', work: '概率论基础', year: '1933' },
]

// 一节讲义由哪些模块组成。取自 docs/TEMPLATE_GUIDE.md 里真实支持的指令，
// 不是编出来的功能清单。
const blockKinds = ['定义与定理', '例题与解析', '速查表格', '图像与互动', '视频讲解']
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

      <!-- 这个位置原来是「约前 300 —— 至今」，好看但不传递任何产品信息。
           首屏最显眼的一行应该让人三秒内知道"这里有我要的课"。 -->
      <p class="hero-courses">
        <span>微积分</span><i></i><span>线性代数</span><i></i><span>概率统计</span>
      </p>

      <p class="hero-lede">
        为期末、考研与竞赛准备的大学数学。<br />
        讲义、习题与解析在同一处，按自己的节奏把数学学扎实。
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

    <!-- 山脉旅程：三座山 = 三个知识板块，鸟引路，终点是知识树。原型阶段。 -->
    <MountainJourney />

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

    <!-- 讲义预览：原来这里是「学习方式」的三条空泛承诺（先建立结构 / 再完成练习 /
         最后回看讲解）。付费产品的首页与其宣称内容好，不如直接把内容摊开给人看。
         下面这段是知识库里「数列极限」那一节的真实内容，不是示意图。 -->
    <section class="salon-section salon-preview">
      <div class="section-rule">
        <span class="rule-label">讲义预览</span>
        <span class="rule-line"></span>
        <span class="rule-note">翻开任意一节，就是这样</span>
      </div>

      <div class="preview-grid">
        <article class="preview-sheet reveal">
          <header class="sheet-head">
            <span class="sheet-path">微积分 · 第一章 极限与连续</span>
            <span class="sheet-free">免费试读</span>
          </header>
          <h3 class="sheet-title">1.1 数列极限</h3>

          <div class="sheet-block sheet-block-def">
            <p class="sheet-block-head">
              <span class="sheet-chip">定义 1</span><span>数列极限</span>
            </p>
            <p class="sheet-text">
              设 <em>{aₙ}</em> 是一个数列，<em>A</em> 是一个常数。如果对任意
              <em>ε &gt; 0</em>，总存在正整数 <em>N</em>，使得当 <em>n &gt; N</em> 时都有
            </p>
            <p class="sheet-formula">| aₙ − A | &lt; ε</p>
            <p class="sheet-text">则称数列 <em>{aₙ}</em> 收敛于 <em>A</em>。</p>
          </div>

          <div class="sheet-block sheet-block-problem">
            <p class="sheet-block-head">
              <span class="sheet-chip sheet-chip-alt">例题 1</span><span>计算题 · 基础</span>
            </p>
            <p class="sheet-text">
              判断数列 <em>aₙ = (2n+1) / (n+3)</em> 是否收敛，并求它的极限。
            </p>
            <p class="sheet-fold" aria-hidden="true">解析　▾</p>
          </div>
        </article>

        <aside class="preview-side reveal">
          <p class="side-eyebrow">每一节的组成</p>
          <ul class="side-blocks">
            <li v-for="kind in blockKinds" :key="kind">{{ kind }}</li>
          </ul>
          <p class="side-note">
            标注免费的小节无需注册即可阅读；会员小节在服务端校验权限，不只是前端隐藏。
          </p>
          <RouterLink class="side-link" to="/knowledge">
            <span>去看完整的一节</span><i aria-hidden="true">→</i>
          </RouterLink>
        </aside>
      </div>
    </section>

    <!-- 经典著作 -->
    <section class="salon-section salon-canon">
      <div class="section-rule section-rule-light">
        <span class="rule-label">经典著作</span>
        <span class="rule-line"></span>
        <span class="rule-note">写进教科书之前，它们先是某个人的手稿</span>
      </div>

      <ol class="canon-list">
        <li
          v-for="entry in canon"
          :key="entry.work"
          class="canon-item reveal"
          :class="{ 'canon-item-major': entry.portrait }"
        >
          <span class="canon-year">{{ entry.year }}</span>

          <span class="canon-marker" aria-hidden="true">
            <img
              v-if="entry.portrait"
              :src="`/portraits/${entry.portrait}`"
              alt=""
              loading="lazy"
              decoding="async"
              :style="{ borderColor: entry.accent }"
            />
            <span v-else class="canon-dot"></span>
          </span>

          <span class="canon-body">
            <span class="canon-head">
              <span class="canon-author">{{ entry.who }}</span>
              <span class="canon-work">《{{ entry.work }}》</span>
            </span>
            <span v-if="entry.note" class="canon-note">{{ entry.note }}</span>
          </span>
        </li>
      </ol>
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

.hero-courses {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: center;
  justify-content: center;
  margin: clamp(26px, 3.5vw, 44px) 0 0;
  color: var(--ink);
  font-size: clamp(14px, 1.4vw, 17px);
  letter-spacing: 0.2em;
}

.hero-courses i {
  width: clamp(28px, 4vw, 56px);
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

/* 学习入口卡片的底色。原来还有 umber/slate/sage 三个，是给已经删掉的
   「名录」肖像框用的，跟着一起清掉了。 */
.tone-forest { background: var(--forest); }
.tone-ochre { background: var(--ochre); }
.tone-terra { background: var(--terra); }

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

/* ---------- 讲义预览 ---------- */
.preview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: clamp(24px, 3.5vw, 52px);
  align-items: start;
}

/* 这张卡片刻意做成"一张纸"的样子：白底、细边、轻微投影，
   跟周围羊皮纸色的画布拉开层次，像真的从讲义里撕下来的一页。 */
.preview-sheet {
  border: 1px solid rgba(107, 88, 68, 0.22);
  border-radius: 3px;
  padding: clamp(22px, 2.6vw, 34px);
  background: rgba(255, 253, 248, 0.86);
  box-shadow: 0 20px 46px rgba(35, 32, 29, 0.09);
}

.sheet-head {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.sheet-path {
  color: var(--ink-soft);
  font-size: 12.5px;
  letter-spacing: 0.12em;
}

.sheet-free {
  border: 1px solid rgba(47, 106, 82, 0.4);
  border-radius: 999px;
  padding: 3px 10px;
  color: #2f6a52;
  font-size: 11.5px;
  letter-spacing: 0.1em;
}

.sheet-title {
  margin: 14px 0 20px;
  font-size: clamp(20px, 2.2vw, 26px);
  font-weight: 500;
  letter-spacing: 0.06em;
}

/* 复用知识库里定义块/例题块的视觉语言，预览才是"真的长这样" */
.sheet-block {
  border-radius: 4px 10px 10px 4px;
  padding: 16px 20px 18px;
}

.sheet-block + .sheet-block {
  margin-top: 14px;
}

.sheet-block-def {
  background: #edf5ef;
  box-shadow: inset 4px 0 0 #2f6a52;
}

.sheet-block-problem {
  background: #f7f3ea;
  box-shadow: inset 4px 0 0 #9a6a3d;
}

.sheet-block-head {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin: 0 0 12px;
  font-size: 14.5px;
  font-weight: 600;
}

.sheet-chip {
  border-radius: 4px;
  padding: 2px 8px;
  background: #2f6a52;
  color: #f2ece0;
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.sheet-chip-alt {
  background: #9a6a3d;
}

.sheet-text {
  margin: 0 0 10px;
  color: var(--ink);
  font-size: 14px;
  line-height: 1.95;
}

.sheet-text:last-child {
  margin-bottom: 0;
}

/* 公式用衬线斜体，跟正文拉开区别，接近 KaTeX 的观感 */
.sheet-text em,
.sheet-formula {
  font-family: Georgia, "Times New Roman", serif;
  font-style: italic;
}

.sheet-formula {
  margin: 14px 0;
  color: var(--ink);
  font-size: clamp(17px, 1.9vw, 21px);
  text-align: center;
  letter-spacing: 0.04em;
}

.sheet-fold {
  margin: 12px 0 0;
  color: #9a6a3d;
  font-size: 13px;
  letter-spacing: 0.1em;
}

.preview-side {
  border: 1px solid rgba(107, 88, 68, 0.24);
  padding: clamp(24px, 2.8vw, 34px);
  background: linear-gradient(160deg, rgba(255, 253, 247, 0.72), rgba(232, 223, 205, 0.5));
}

.side-eyebrow {
  margin: 0 0 16px;
  color: var(--umber);
  font-size: 12px;
  letter-spacing: 0.28em;
}

.side-blocks {
  margin: 0;
  padding: 0;
  list-style: none;
}

.side-blocks li {
  border-top: 1px solid rgba(107, 88, 68, 0.16);
  padding: 10px 0;
  font-size: 14.5px;
  letter-spacing: 0.04em;
}

.side-blocks li:last-child {
  border-bottom: 1px solid rgba(107, 88, 68, 0.16);
}

.side-note {
  margin: 18px 0 0;
  color: var(--ink-soft);
  font-size: 13px;
  line-height: 1.9;
}

.side-link {
  display: inline-flex;
  gap: 10px;
  align-items: center;
  margin-top: 18px;
  border-bottom: 1px solid rgba(107, 88, 68, 0.4);
  padding-bottom: 5px;
  font-size: 14px;
  letter-spacing: 0.12em;
  transition: border-color 0.25s ease, color 0.25s ease;
}

.side-link i {
  font-style: normal;
  transition: transform 0.25s ease;
}

.side-link:hover {
  border-color: var(--umber);
  color: var(--umber);
}

.side-link:hover i {
  transform: translateX(5px);
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

/* 单列时间线：左侧一条竖轴串起所有条目。
   之前是两列网格，年份在视觉上跳来跳去，读不出"时间在往前走"。 */
.canon-list {
  position: relative;
  max-width: 760px;
  margin: 0 auto;
  padding: 0;
  list-style: none;
}

/* 竖轴：贴在头像列的中心线上 */
.canon-list::before {
  content: '';
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: calc(clamp(56px, 7vw, 78px) + 18px);
  width: 1px;
  background: linear-gradient(
    180deg,
    transparent,
    rgba(242, 236, 224, 0.22) 8%,
    rgba(242, 236, 224, 0.22) 92%,
    transparent
  );
}

.canon-item {
  position: relative;
  display: grid;
  grid-template-columns: clamp(56px, 7vw, 78px) 36px minmax(0, 1fr);
  align-items: start;
  gap: 0 14px;
  padding: 13px 0;
}

/* 有肖像的条目是"主角"，给它更多呼吸空间 */
.canon-item-major {
  padding: 20px 0;
}

.canon-year {
  color: var(--taupe);
  font-size: 13px;
  letter-spacing: 0.06em;
  text-align: right;
  padding-top: 3px;
  white-space: nowrap;
}

.canon-marker {
  display: flex;
  justify-content: center;
  align-items: flex-start;
}

.canon-marker img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  object-position: center 20%;
  border: 1.5px solid;
  background: var(--forest);
  filter: grayscale(0.15) contrast(1.05) sepia(0.08);
}

/* 没有肖像的条目退化成一个小圆点，长短交错才有节奏 */
.canon-dot {
  width: 7px;
  height: 7px;
  margin-top: 9px;
  border-radius: 50%;
  background: rgba(242, 236, 224, 0.4);
  box-shadow: 0 0 0 4px rgba(10, 8, 1, 0.9);
}

.canon-body {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-top: 1px;
}

.canon-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px;
}

.canon-author {
  color: rgba(242, 236, 224, 0.58);
  font-size: 13px;
  letter-spacing: 0.1em;
}

.canon-work {
  color: rgba(242, 236, 224, 0.94);
  font-size: 15.5px;
}

.canon-item-major .canon-work {
  font-size: 17px;
}

.canon-note {
  color: rgba(242, 236, 224, 0.6);
  font-size: 13.5px;
  line-height: 1.85;
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
  .hall-card:nth-child(2) { transition-delay: 0.1s; }
  .hall-card:nth-child(3) { transition-delay: 0.2s; }

  /* 年表按顺序往下淌，比整块一起出现更像"时间在走" */
  .canon-item:nth-child(3n + 2) { transition-delay: 0.06s; }
  .canon-item:nth-child(3n) { transition-delay: 0.12s; }

  /* 讲义先出现，说明性的侧栏稍后跟上 */
  .preview-side { transition-delay: 0.12s; }
}

/* ---------- 响应式 ---------- */
@media (max-width: 900px) {
  .hall-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .preview-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 620px) {
  .hall-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .hero-echo {
    display: none;
  }

  /* 窄屏把年份挪到内容上方，别再单占一列挤压书名 */
  .canon-item {
    grid-template-columns: 26px minmax(0, 1fr);
    gap: 0 12px;
  }

  .canon-year {
    grid-column: 2;
    grid-row: 1;
    text-align: left;
    margin-bottom: 4px;
  }

  .canon-marker {
    grid-column: 1;
    grid-row: 1 / span 2;
  }

  .canon-marker img {
    width: 26px;
    height: 26px;
  }

  .canon-body {
    grid-column: 2;
    grid-row: 2;
  }

  .canon-list::before {
    left: 13px;
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
  .hall-card,
  .plate-link,
  .plate-link i,
  .hall-action i {
    transition: none;
  }

  .hall-card:hover,
  .plate-link:hover {
    transform: none;
  }
}
</style>
