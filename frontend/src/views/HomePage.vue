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

// 三张卡片各配一幅圆规直尺作图，跟页尾那张欧氏命题一是同一套语言：
// 圆是圆规留下的痕迹，多边形是直尺连出的结论。
// 顶点坐标都在半径 40 的圆上，是真的内接正多边形，不是描出来的形状。
const FIGURES = {
  // 正六边形：圆规张成半径，绕圆走六步就回到原点（《几何原本》IV.15）
  hexagon: {
    poly: '0,-40 34.64,-20 34.64,20 0,40 -34.64,20 -34.64,-20',
    lines: [],
  },
  // 正方形与两条对角线（IV.6），对角线与边之比就是 √2
  square: {
    poly: '28.28,-28.28 28.28,28.28 -28.28,28.28 -28.28,-28.28',
    lines: [
      [-28.28, -28.28, 28.28, 28.28],
      [-28.28, 28.28, 28.28, -28.28],
    ],
  },
  // 五角星：内接正五边形隔点连线（IV.11），线段之比即黄金分割
  pentagram: {
    poly: '0,-40 23.51,32.36 -38.04,-12.36 38.04,-12.36 -23.51,32.36',
    lines: [],
  },
}

// 三个学习入口。
const halls = [
  {
    figure: 'hexagon',
    eyebrow: '01 · 系统学习',
    title: '知识库',
    copy: '从概念、定理到例题，按章节把容易断开的知识点重新连起来。',
    action: '进入知识库',
    to: '/knowledge',
    tone: 'forest',
  },
  {
    figure: 'square',
    eyebrow: '02 · 针对训练',
    title: '习题库',
    copy: '按题型、难度与完成状态筛选，解析留到你需要的时候再展开。',
    action: '开始练习',
    to: '/exercises',
    tone: 'terra',
  },
  {
    figure: 'pentagram',
    eyebrow: '03 · 持续更新',
    title: '会员内容',
    copy: '课程讲义、会员题组、视频讲解与互动图形，持续增补。',
    action: '查看权益',
    to: '/membership',
    tone: 'ochre',
  },
]

// 一节讲义由哪些模块组成。取自 docs/TEMPLATE_GUIDE.md 里真实支持的指令，
// 不是编出来的功能清单。
const blockKinds = ['定义与定理', '例题与解析', '速查表格', '图像与互动', '视频讲解']
</script>

<template>
  <div ref="root" class="salon">
    <!-- 首屏：整个按中世纪科学抄本的开卷页重排。
         抄本正文是左对齐的文本块（居中大标题是现代印刷的做法），
         左边一条竖界栏划出书写区，图解画在页边——大学用的欧几里得、
         波爱修斯抄本都是这个样子。 -->
    <header class="salon-hero">
      <div class="hero-page">
        <div class="hero-block">
          <p class="hero-incipit">
            <span>MathAPP</span><i></i><span>在线数学学习</span>
          </p>

          <h1 class="hero-title">
            <span class="hero-line">数之形</span>
            <span class="hero-line hero-line-alt">理之序</span>
          </h1>

          <p class="hero-courses">
            <span>微积分</span><i></i><span>线性代数</span><i></i><span>概率统计</span>
          </p>

          <!-- 花体首字开卷：抄本的装饰首字母就是用来起正文的。
               「大」既是装饰也是正文第一个字，没有重复。 -->
          <p class="hero-lede">
            <span class="hero-initial">大</span>学数学的讲义、习题与解析放在同一处。
            为期末、考研与竞赛准备，按自己的节奏，从第一个定义走到能自己写出证明。
          </p>

          <div class="hero-actions">
            <RouterLink class="plate-link" to="/knowledge">
              <span>进入知识库</span><i aria-hidden="true">→</i>
            </RouterLink>
            <RouterLink class="plate-link plate-link-ghost" to="/exercises">
              <span>查看习题库</span><i aria-hidden="true">→</i>
            </RouterLink>
          </div>
        </div>

        <!-- 页边图解：两个正三角互叠成六芒星，六个交点正好落在
             半径 100/√3 ≈ 57.7 的同心圆上。这是能验算的，不是画着好看。 -->
        <figure class="hero-figure">
          <svg viewBox="-124 -124 248 248" class="hero-diagram" role="img"
               aria-label="圆内接六芒星，六个交点落在同心圆上">
            <circle class="hero-arc" cx="0" cy="0" r="100" />
            <circle class="hero-arc hero-arc-inner" cx="0" cy="0" r="57.74" />
            <polygon class="hero-rule" points="0,-100 86.6,50 -86.6,50" />
            <polygon class="hero-rule" points="0,100 86.6,-50 -86.6,-50" />
            <g class="hero-node">
              <circle cx="0" cy="-100" r="3" />
              <circle cx="86.6" cy="-50" r="3" />
              <circle cx="86.6" cy="50" r="3" />
              <circle cx="0" cy="100" r="3" />
              <circle cx="-86.6" cy="50" r="3" />
              <circle cx="-86.6" cy="-50" r="3" />
            </g>
          </svg>
          <figcaption>两个正三角互叠，六个交点落在同一个内圆上</figcaption>
        </figure>
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
          <svg class="hall-figure" viewBox="-52 -52 104 104" aria-hidden="true">
            <circle class="hall-arc" cx="0" cy="0" r="40" />
            <polygon class="hall-rule" :points="FIGURES[hall.figure].poly" />
            <line
              v-for="(seg, si) in FIGURES[hall.figure].lines"
              :key="si"
              class="hall-rule-line"
              :x1="seg[0]"
              :y1="seg[1]"
              :x2="seg[2]"
              :y2="seg[3]"
            />
          </svg>
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
            <!-- 起首字：抄本每段正文开头的花体首字母。这里的「设」既是装饰也是
                 正文的第一个字，没有重复，读屏软件读到的仍是完整句子。 -->
            <p class="sheet-text sheet-text-open">
              <span class="sheet-initial">设</span><em>{aₙ}</em> 是一个数列，<em>A</em>
              是一个常数。如果对任意 <em>ε &gt; 0</em>，总存在正整数 <em>N</em>，使得当
              <em>n &gt; N</em> 时都有
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

    <!-- 收尾：仿中世纪手抄本的书末题记。
         图不是装饰画，是《几何原本》第一卷命题一的真实作图——
         两段圆规弧交于一点，连成等边三角形。中世纪欧洲大学的学生
         学几何，第一页画的就是这个。 -->
    <section class="salon-section salon-colophon">
      <div class="colophon-grid">
        <figure class="colophon-figure reveal">
          <svg viewBox="-118 -112 336 226" class="construction" role="img"
               aria-label="《几何原本》第一卷命题一：在给定线段上作等边三角形">
            <!-- 圆规画出的两段弧 -->
            <circle class="arc" cx="0" cy="0" r="100" />
            <circle class="arc" cx="100" cy="0" r="100" />
            <!-- 直尺连出的三角形 -->
            <path class="rule" d="M 0 0 L 100 0 L 50 -86.6 Z" />
            <!-- 三个交点 -->
            <circle class="node" cx="0" cy="0" r="3.2" />
            <circle class="node" cx="100" cy="0" r="3.2" />
            <circle class="node" cx="50" cy="-86.6" r="3.2" />
            <text class="mark" x="-12" y="14">A</text>
            <text class="mark" x="106" y="14">B</text>
            <text class="mark" x="44" y="-96">Γ</text>
          </svg>
          <figcaption>命题一 · 在给定的有限直线上作一个等边三角形</figcaption>
        </figure>

        <div class="colophon-copy reveal">
          <p class="colophon-eyebrow">从第一个命题开始</p>
          <h2 class="colophon-title">方法八百年没变</h2>
          <p class="colophon-text">
            中世纪欧洲的大学把几何列进必修的四艺，学生翻开《几何原本》的第一页，
            照着抄一遍图，再自己用圆规和直尺重做一次。
          </p>
          <p class="colophon-text">
            先看懂一个证明，再亲手做一遍——这件事到今天也没有更省力的替代品。
            我们把讲义和习题放在一起，就是为了让这两步不用来回切换。
          </p>
          <div class="colophon-actions">
            <RouterLink class="plate-link" to="/knowledge">
              <span>进入知识库</span><i aria-hidden="true">→</i>
            </RouterLink>
            <RouterLink class="plate-link plate-link-ghost" to="/membership">
              <span>查看会员</span><i aria-hidden="true">→</i>
            </RouterLink>
          </div>
        </div>
      </div>
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
  /* 朱砂：抄本里写章节题名和记号用的红墨水 */
  --rubric: #9c3b2e;

  --serif: "Noto Serif SC", "Source Han Serif SC", "Songti SC", STSong, SimSun,
    Georgia, "Times New Roman", serif;

  /* 通栏展陈画布。.site-shell 的左右内边距在多个断点被覆盖过，
     这里用不依赖父级内边距的写法，任何断点都能铺到视口边缘。 */
  margin-inline: calc(50% - 50vw);
  margin-bottom: -52px;
  padding: clamp(40px, 6vw, 96px) clamp(20px, 5vw, 88px) clamp(56px, 7vw, 104px);
  background-color: var(--parch);
  /* 羊皮纸，不是画布。原来铺的是 45° 交叉织纹——那是绷在框上的油画布纹理；
     羊皮纸是兽皮，没有经纬，只有大小不一的斑驳和边缘的陈旧。
     所以改成几团错落的暖褐晕染，再压暗四角。 */
  background-image:
    radial-gradient(58% 44% at 18% 12%, rgba(107, 88, 68, 0.07), transparent 62%),
    radial-gradient(46% 38% at 82% 30%, rgba(122, 96, 66, 0.06), transparent 66%),
    radial-gradient(52% 40% at 34% 66%, rgba(107, 88, 68, 0.05), transparent 64%),
    radial-gradient(40% 34% at 74% 84%, rgba(140, 110, 74, 0.05), transparent 62%),
    radial-gradient(120% 90% at 50% 0%, rgba(255, 253, 247, 0.85), transparent 58%),
    radial-gradient(100% 100% at 50% 100%, rgba(107, 88, 68, 0.18), transparent 70%);
  color: var(--ink);
  font-family: var(--serif);
}

/* ---------- 首屏 ---------- */
.salon-hero {
  position: relative;
  max-width: 1180px;
  margin: 0 auto clamp(64px, 8vw, 120px);
}

/* 书页：外一圈双线界栏，抄本每页都先划好边框再写字 */
.hero-page {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: clamp(28px, 5vw, 72px);
  align-items: center;
  padding: clamp(30px, 4.5vw, 64px) clamp(24px, 4vw, 56px);
  border: 1px solid rgba(107, 88, 68, 0.42);
  box-shadow:
    inset 0 0 0 1px rgba(242, 236, 224, 0.75),
    inset 0 0 0 2px rgba(107, 88, 68, 0.18);
}

/* 书写区：左对齐。居中大标题是现代印刷的排法，抄本正文是成栏的文本块。 */
.hero-block {
  position: relative;
  padding-left: clamp(18px, 2.2vw, 30px);
  text-align: left;
}

/* 左界栏：划栏留下的竖线，朱砂一条、褐色一条 */
.hero-block::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 3px;
  border-left: 1px solid rgba(156, 59, 46, 0.5);
  border-right: 1px solid rgba(191, 175, 158, 0.7);
}

/* 卷首题（incipit）：抄本开卷第一行用朱砂写 */
.hero-incipit {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin: 0 0 clamp(16px, 2.4vw, 26px);
  color: var(--rubric);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.32em;
  text-transform: uppercase;
}

.hero-incipit i {
  width: 34px;
  height: 1px;
  background: currentColor;
  opacity: 0.45;
}

.hero-title {
  margin: 0;
  font-size: clamp(46px, 7.2vw, 100px);
  font-weight: 500;
  line-height: 1.04;
  letter-spacing: 0.08em;
}

.hero-line {
  display: block;
}

.hero-line-alt {
  color: var(--umber);
  font-style: italic;
}

.hero-courses {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  align-items: center;
  margin: clamp(20px, 2.6vw, 32px) 0 0;
  color: var(--ink);
  font-size: clamp(13px, 1.2vw, 16px);
  letter-spacing: 0.18em;
}

/* 分隔用小菱形，抄本断句用的是点、菱这类记号，不是横线 */
.hero-courses i {
  width: 5px;
  height: 5px;
  background: var(--rubric);
  opacity: 0.75;
  transform: rotate(45deg);
}

.hero-lede {
  margin: clamp(20px, 2.6vw, 30px) 0 0;
  color: var(--ink-soft);
  font-size: clamp(14.5px, 1.35vw, 16.5px);
  line-height: 2.05;
}

/* 首字是浮动的，清一下免得影响下面的按钮 */
.hero-lede::after {
  content: '';
  display: block;
  clear: both;
}

/* 花体首字：金框 + 内白线 + 赭石底 + 朱砂字 */
.hero-initial {
  float: left;
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  margin: 5px 14px 2px 0;
  border: 1.5px solid rgba(184, 134, 60, 0.85);
  box-shadow:
    inset 0 0 0 1px rgba(255, 253, 248, 0.9),
    inset 0 0 0 2px rgba(184, 134, 60, 0.32);
  background: rgba(184, 134, 60, 0.14);
  color: var(--rubric);
  font-size: 30px;
  line-height: 1;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: clamp(26px, 3.2vw, 40px);
}

/* 页边图解：抄本的图画在页边，不是压在正文底下当水印 */
.hero-figure {
  margin: 0;
  text-align: center;
}

.hero-diagram {
  width: min(100%, 340px);
  height: auto;
  overflow: visible;
}

.hero-arc {
  fill: none;
  stroke: rgba(107, 88, 68, 0.4);
  stroke-width: 0.9;
}

/* 内圆用朱砂虚线：它是结论（六个交点共圆），不是作图痕迹 */
.hero-arc-inner {
  stroke: rgba(156, 59, 46, 0.45);
  stroke-dasharray: 4 3;
}

.hero-rule {
  fill: rgba(184, 134, 60, 0.06);
  stroke: var(--umber);
  stroke-width: 1.4;
  stroke-linejoin: round;
}

.hero-node circle {
  fill: var(--ink);
}

.hero-figure figcaption {
  margin-top: 16px;
  color: var(--ink-soft);
  font-size: 12px;
  letter-spacing: 0.1em;
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

/* 朱红标题（rubrication）：中世纪抄本的正文用铁胆墨水写成褐黑色，
   章节题名另用朱砂写成红色，好让读者一眼找到分节。这里沿用同一套做法。 */
.rule-label {
  flex: none;
  color: var(--rubric);
  font-size: clamp(17px, 1.8vw, 21px);
  letter-spacing: 0.3em;
}

/* 双线分隔：抄本划栏用的是成对的细线，不是单独一条 */
.rule-line {
  flex: 1;
  height: 4px;
  border-top: 1px solid rgba(191, 175, 158, 0.85);
  border-bottom: 1px solid rgba(191, 175, 158, 0.5);
  background: none;
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

/* 作图水印：原来这里是罗马数字，但眉标已经写了 01/02/03，重复了。
   换成几何作图后，整页的视觉语言跟页尾的欧氏命题一统一到一起。 */
.hall-figure {
  position: absolute;
  right: -12%;
  bottom: -14%;
  width: clamp(140px, 16vw, 210px);
  height: auto;
  overflow: visible;
  pointer-events: none;
}

/* 圆规痕迹比直尺结论更浅，跟真的作图层次一致 */
.hall-arc {
  fill: none;
  stroke: rgba(255, 250, 238, 0.16);
  stroke-width: 1.1;
}

.hall-rule {
  fill: rgba(255, 250, 238, 0.05);
  stroke: rgba(255, 250, 238, 0.26);
  stroke-width: 1.4;
  stroke-linejoin: round;
}

.hall-rule-line {
  stroke: rgba(255, 250, 238, 0.16);
  stroke-width: 1;
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

/* 起首字要靠浮动让正文绕排，这里清一下浮动，免得影响下一段 */
.sheet-text-open::after {
  content: '';
  display: block;
  clear: both;
}

/* 花体首字：金框 + 内白线 + 赭石底 + 朱砂字，跟抄本的装饰首字母同构 */
.sheet-initial {
  float: left;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin: 3px 12px 2px 0;
  border: 1.5px solid rgba(184, 134, 60, 0.85);
  box-shadow:
    inset 0 0 0 1px rgba(255, 253, 248, 0.9),
    inset 0 0 0 2px rgba(184, 134, 60, 0.32);
  background: rgba(184, 134, 60, 0.12);
  color: var(--rubric);
  font-size: 25px;
  line-height: 1;
  font-style: normal;
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

/* ---------- 书末题记 ---------- */
.salon-colophon {
  /* 撑满画布，不受 .salon-section 的 max-width 约束 */
  max-width: none;
  margin-inline: calc(-1 * clamp(20px, 5vw, 88px));
  margin-bottom: 0;
  padding: clamp(52px, 6vw, 96px) clamp(20px, 5vw, 88px);
  background:
    radial-gradient(90% 70% at 20% 25%, rgba(184, 134, 60, 0.1), transparent 60%),
    linear-gradient(180deg, rgba(232, 223, 205, 0.62), rgba(226, 214, 192, 0.85));
  border-top: 1px solid rgba(107, 88, 68, 0.24);
}

.colophon-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.15fr);
  gap: clamp(30px, 5vw, 72px);
  align-items: center;
  max-width: 1080px;
  margin: 0 auto;
}

.colophon-figure {
  margin: 0;
  text-align: center;
}

/* 手抄本里的几何图：圆规弧细而浅，直尺连出的线实而重，
   跟真的用工具画出来的层次一致。 */
.construction {
  width: min(100%, 420px);
  height: auto;
  overflow: visible;
}

.construction .arc {
  fill: none;
  stroke: rgba(107, 88, 68, 0.36);
  stroke-width: 0.8;
}

.construction .rule {
  fill: rgba(184, 134, 60, 0.09);
  stroke: var(--umber);
  stroke-width: 1.6;
  stroke-linejoin: round;
}

.construction .node {
  fill: var(--ink);
}

/* 点的标注用朱红——中世纪抄本里标题和记号就是用红墨水写的 */
.construction .mark {
  fill: var(--rubric);
  font-family: Georgia, "Times New Roman", serif;
  font-size: 15px;
  font-style: italic;
}

.colophon-figure figcaption {
  margin-top: 18px;
  color: var(--ink-soft);
  font-size: 12.5px;
  letter-spacing: 0.12em;
}

.colophon-eyebrow {
  margin: 0 0 12px;
  color: var(--rubric);
  font-size: 12px;
  letter-spacing: 0.3em;
}

.colophon-title {
  margin: 0 0 20px;
  font-size: clamp(26px, 3.2vw, 40px);
  font-weight: 500;
  letter-spacing: 0.08em;
}

.colophon-text {
  margin: 0 0 14px;
  color: var(--ink-soft);
  font-size: 15px;
  line-height: 2;
}

.colophon-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 28px;
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

  /* 讲义先出现，说明性的侧栏稍后跟上 */
  .preview-side { transition-delay: 0.12s; }

  /* 先看到作图，再读旁边的字，跟"照着抄一遍再自己做"的顺序一致 */
  .colophon-copy { transition-delay: 0.14s; }
}

/* ---------- 响应式 ---------- */
@media (max-width: 900px) {
  .hall-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .preview-grid,
  .colophon-grid,
  .hero-page {
    grid-template-columns: minmax(0, 1fr);
  }

  /* 窄屏把页边图解挪到正文下面，仍是先读字后看图 */
  .hero-diagram {
    width: min(100%, 260px);
  }

  /* 窄屏图放上面、字在下面，读的顺序还是"先看图再读字" */
  .construction {
    width: min(100%, 320px);
  }
}

@media (max-width: 620px) {
  .hall-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  /* 窄屏卡片变窄，原尺寸的水印会压到正文和按钮上。
     缩小并推向右下角，让它彻底避开按钮的横向范围，再压淡一档。 */
  .hall-figure {
    width: 104px;
    right: -26px;
    bottom: -26px;
    opacity: 0.6;
  }

  /* 两处花体首字在窄屏都收小一号，免得挤掉正文的行宽 */
  .hero-initial {
    width: 42px;
    height: 42px;
    font-size: 24px;
    margin-right: 11px;
  }

  .sheet-initial {
    width: 38px;
    height: 38px;
    font-size: 21px;
    margin-right: 10px;
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
