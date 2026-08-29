<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  buildSegments,
  computeSceneOpacity,
  computeTreeOpacity,
  findActiveSegmentIndex,
  flowPath,
  frameLerp,
  layoutLearningPath,
  localSegmentProgress,
  smoothstep,
} from './mountainJourneySupport'

// 画廊墙 + 学习路径图。
//
// 两个刻意的技术选择，都是为了"丝滑"：
// 1. 所有每帧变化的量（opacity/transform/dashoffset）都直接写 DOM style，
//    不走 Vue 响应式——响应式每帧触发虚拟 DOM diff，60fps 下开销很可观。
//    只有离散变化的量（当前板块名）才留在响应式里。
// 2. 缓动用 frameLerp 按真实帧间隔换算，保证 60Hz / 144Hz 屏手感一致。

// slug 对应 content 里真实的课程标识，scope 取自这些课程在数据库里的 subtitle，
// 不是另编的一套说法。有了 slug，每一屏都能直接点进对应课程，
// 而不是看完三屏漂亮画面却无处可去。
const TOPICS = [
  {
    name: '微积分',
    slug: 'calculus',
    accent: '#c9a86a',
    kicker: '从变化开始',
    scope: '极限 · 导数 · 积分 · 级数',
    intro: '用极限刻画"无限接近"，用导数捕捉变化的快慢，再用积分把无数个瞬间重新连成整体。',
  },
  {
    name: '线性代数',
    slug: 'linear-algebra',
    accent: '#9fb8c9',
    kicker: '给结构一个坐标',
    scope: '行列式 · 矩阵 · 向量空间 · 特征值',
    intro: '向量、矩阵与线性变换，把方程组、空间旋转和数据降维，都收进同一套语言里。',
  },
  {
    name: '概率统计',
    slug: 'probability',
    accent: '#c98a7a',
    kicker: '让偶然可以计算',
    scope: '随机事件 · 随机变量 · 估计 · 检验',
    intro: '从随机事件到分布模型，从抽样到推断，在不确定里找到能落地的结论。',
  },
]

// 画廊墙：肖像常驻，只是"跟当前板块相关"时被聚光灯照亮，不相关时暗下去但不消失
const TILES = [
  { id: 'euclid', src: '/portraits/euclid.jpg', name: '欧几里得', top: '10%', left: '5%', size: 12, topics: [0, 1, 2] },
  { id: 'newton', src: '/portraits/newton.jpg', name: '牛顿', top: '6%', left: '64%', size: 17, topics: [0] },
  { id: 'cauchy', src: '/portraits/cauchy.jpg', name: '柯西', top: '34%', left: '40%', size: 11, topics: [0] },
  { id: 'euler', src: '/portraits/euler.jpg', name: '欧拉', top: '50%', left: '80%', size: 14, topics: [0, 1] },
  { id: 'gauss', src: '/portraits/gauss.jpg', name: '高斯', top: '68%', left: '68%', size: 15, topics: [1, 2] },
  { id: 'laplace', src: '/portraits/laplace.jpg', name: '拉普拉斯', top: '76%', left: '58%', size: 15, topics: [2] },
]

// 学习路径：左边是基础课，右边是它真正的后续课。
// 这里放的是"课程之间的先修关系"，不是课程内部的章节——章节属于课程页面，
// 混进来会让这张图的语义变乱。每条分支挂一位代表人物，呼应上面的画廊墙。
const PATH_TRACKS = [
  {
    name: '微积分',
    slug: 'calculus',
    accent: '#c9a86a',
    portrait: '/portraits/newton.jpg',
    portraitName: '牛顿',
    next: ['实变函数', '复变函数'],
  },
  {
    name: '线性代数',
    slug: 'linear-algebra',
    accent: '#9fb8c9',
    portrait: '/portraits/gauss.jpg',
    portraitName: '高斯',
    next: ['抽象代数', '数值分析'],
  },
  {
    // 课名跟数据库里的真实课程保持一致（不是「概率论」），
    // 否则地图上点进去看到的标题跟这里对不上。
    name: '概率统计',
    slug: 'probability',
    accent: '#c98a7a',
    portrait: '/portraits/laplace.jpg',
    portraitName: '拉普拉斯',
    next: ['数理统计', '随机过程'],
  },
]

const MAP = layoutLearningPath(PATH_TRACKS, { rootX: -125, trackX: -15, leafX: 105, rowGap: 34 })
const LEAF_NODES = MAP.tracks.flatMap((t) => t.next.map((n) => ({ ...n, accent: t.accent })))
const ROOT_LINES = MAP.tracks.map((t) => flowPath(MAP.root.x, MAP.root.y, t.x, t.y))
const LEAF_LINES = MAP.tracks.flatMap((t) => t.next.map((n) => flowPath(t.x, t.y, n.x, n.y)))

// SVG 和 HTML 节点共用同一套坐标：容器锁死这个宽高比，百分比换算才能精确对齐
const VB = { x: -165, y: -115, w: 330, h: 230 }
const pctX = (x) => ((x - VB.x) / VB.w) * 100
const pctY = (y) => ((y - VB.y) / VB.h) * 100

const SEGMENTS = buildSegments(TOPICS.length, 0.24)
const TREE_START = SEGMENTS[SEGMENTS.length - 1].end
// 第一段前面没有画面可叠化，不该有淡入，否则页面一打开就是黑的
const DISPLAY_SEGMENTS = SEGMENTS.map((seg, i) =>
  i === 0 ? { start: seg.start - 1, end: seg.end } : seg,
)
const TILE_FADE = 0.08

// 只有这两个是响应式的：它们只在切换板块时变一次，不是每帧都变
const activeLabel = ref(TOPICS[0].name)
const activeIndex = ref(0)
const reduced = ref(false)
const grainTile = ref('')

// 下面这些是直接操作的 DOM 引用，动画期间绕开 Vue
const host = ref(null)
const stickyEl = ref(null)
const introEl = ref(null)
const pathSceneEl = ref(null)
const rootEl = ref(null)
const tileEls = []
const trackEls = []
const leafEls = []
const rootLineEls = []
const leafLineEls = []

let rafId = 0
let onScroll = null
let smoothProgress = 0
let lastFrame = 0

const LERP = 0.14
const SETTLE = 0.0004

function buildGrainTile() {
  const size = 160
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const data = ctx.createImageData(size, size)
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.random() * 255
    data.data[i] = v
    data.data[i + 1] = v
    data.data[i + 2] = v
    data.data[i + 3] = 22
  }
  ctx.putImageData(data, 0, 0)
  return canvas.toDataURL('image/png')
}

function readProgress() {
  const el = host.value
  if (!el) return 0
  const rect = el.getBoundingClientRect()
  const scrollable = rect.height - window.innerHeight
  if (scrollable <= 0) return 0
  return Math.min(Math.max(-rect.top / scrollable, 0), 1)
}

// 路径图按"从根往外生长"的顺序逐级浮现，而不是整块一起淡入
function revealAt(t, delay, duration = 0.34) {
  return smoothstep((t - delay) / duration)
}

function paint(progress) {
  const treeT = computeTreeOpacity(progress, TREE_START)
  const galleryFade = 1 - treeT

  // 画廊墙
  for (let i = 0; i < TILES.length; i += 1) {
    const el = tileEls[i]
    if (!el) continue
    let relevance = 0.14
    const topics = TILES[i].topics
    for (let k = 0; k < topics.length; k += 1) {
      const v = computeSceneOpacity(progress, DISPLAY_SEGMENTS[topics[k]], TILE_FADE)
      if (v > relevance) relevance = v
    }
    el.style.opacity = relevance * galleryFade
    el.style.transform = `scale(${0.78 + relevance * 0.34})`
  }

  const idx = findActiveSegmentIndex(progress, SEGMENTS)
  activeIndex.value = idx
  activeLabel.value = treeT > 0.6 ? '你的学习路径' : TOPICS[idx].name

  const local = localSegmentProgress(progress, SEGMENTS[idx])
  const spotlight = computeSceneOpacity(progress, DISPLAY_SEGMENTS[idx], TILE_FADE)
  if (introEl.value) {
    const introOp = spotlight * smoothstep((local - 0.12) / 0.2) * galleryFade
    introEl.value.style.opacity = introOp
    // 面板里有"进入某课程"的链接，淡出后必须停止接收点击，
    // 否则一个看不见的链接会一直挡在画面上拦截鼠标。
    introEl.value.style.pointerEvents = introOp > 0.5 ? 'auto' : 'none'
  }

  // 学习路径图
  const scene = pathSceneEl.value
  if (scene) {
    scene.style.opacity = treeT
    scene.style.visibility = treeT <= 0.001 ? 'hidden' : 'visible'
  }
  if (treeT > 0.001) {
    if (rootEl.value) rootEl.value.style.opacity = revealAt(treeT, 0)
    for (let i = 0; i < rootLineEls.length; i += 1) {
      const el = rootLineEls[i]
      if (el) el.style.strokeDashoffset = 1 - revealAt(treeT, 0.08)
    }
    for (let i = 0; i < trackEls.length; i += 1) {
      const el = trackEls[i]
      if (!el) continue
      const r = revealAt(treeT, 0.2 + i * 0.04)
      el.style.opacity = r
      el.style.transform = `translate(-50%, -50%) scale(${0.9 + r * 0.1})`
    }
    for (let i = 0; i < leafLineEls.length; i += 1) {
      const el = leafLineEls[i]
      if (el) el.style.strokeDashoffset = 1 - revealAt(treeT, 0.38 + i * 0.02)
    }
    for (let i = 0; i < leafEls.length; i += 1) {
      const el = leafEls[i]
      if (!el) continue
      const r = revealAt(treeT, 0.52 + i * 0.03)
      el.style.opacity = r
      el.style.transform = `translate(-50%, -50%) scale(${0.9 + r * 0.1})`
    }
  }
}

function loop(now) {
  const delta = lastFrame ? now - lastFrame : 1000 / 60
  lastFrame = now
  const target = readProgress()
  smoothProgress = frameLerp(smoothProgress, target, LERP, delta)

  if (Math.abs(target - smoothProgress) < SETTLE) {
    smoothProgress = target
    paint(smoothProgress)
    rafId = 0
    lastFrame = 0
    return
  }
  paint(smoothProgress)
  rafId = requestAnimationFrame(loop)
}

// 减少动效时：全部直接置成终态，不做任何滚动联动
function paintStatic() {
  tileEls.forEach((el) => {
    if (!el) return
    el.style.opacity = 1
    el.style.transform = 'scale(1)'
  })
  if (introEl.value) {
    introEl.value.style.opacity = 1
    introEl.value.style.pointerEvents = 'auto'
  }
  if (pathSceneEl.value) {
    pathSceneEl.value.style.opacity = 1
    pathSceneEl.value.style.visibility = 'visible'
  }
  if (rootEl.value) rootEl.value.style.opacity = 1
  ;[...rootLineEls, ...leafLineEls].forEach((el) => {
    if (el) el.style.strokeDashoffset = 0
  })
  ;[...trackEls, ...leafEls].forEach((el) => {
    if (!el) return
    el.style.opacity = 1
    el.style.transform = 'translate(-50%, -50%) scale(1)'
  })
}

onMounted(() => {
  reduced.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  grainTile.value = buildGrainTile()

  if (reduced.value) {
    paintStatic()
    return
  }

  smoothProgress = readProgress()
  paint(smoothProgress)

  onScroll = () => {
    if (!rafId) {
      lastFrame = 0
      rafId = requestAnimationFrame(loop)
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  if (onScroll) window.removeEventListener('scroll', onScroll)
  if (rafId) cancelAnimationFrame(rafId)
})
</script>

<template>
  <section ref="host" class="journey" :class="{ 'journey-reduced': reduced }">
    <div ref="stickyEl" class="journey-sticky">
      <div class="backdrop" aria-hidden="true">
        <img src="/art/hero.jpg" alt="" decoding="async" />
        <div class="backdrop-vignette"></div>
      </div>

      <!-- 画廊墙 -->
      <div
        v-for="(tile, i) in TILES"
        :key="tile.id"
        :ref="(el) => { if (el) tileEls[i] = el }"
        class="tile"
        :style="{ top: tile.top, left: tile.left, width: `${tile.size}vw` }"
      >
        <img :src="tile.src" :alt="`${tile.name}肖像`" decoding="async" />
        <span class="tile-label">{{ tile.name }}</span>
      </div>

      <div ref="introEl" class="intro-panel">
        <span class="intro-bar" :style="{ background: TOPICS[activeIndex].accent }"></span>
        <p class="intro-kicker">{{ TOPICS[activeIndex].kicker }}</p>
        <h3 class="intro-title">{{ TOPICS[activeIndex].name }}</h3>
        <p class="intro-scope">{{ TOPICS[activeIndex].scope }}</p>
        <p class="intro-copy">{{ TOPICS[activeIndex].intro }}</p>
        <RouterLink class="intro-cta" :to="`/knowledge?course=${TOPICS[activeIndex].slug}`">
          <span>进入{{ TOPICS[activeIndex].name }}</span><i aria-hidden="true">→</i>
        </RouterLink>
      </div>

      <div class="grain" :style="{ backgroundImage: `url(${grainTile})` }" aria-hidden="true"></div>

      <!-- 学习路径图：左→右分层，读作"先学左边再学右边" -->
      <div ref="pathSceneEl" class="path-scene">
        <div class="path-stage">
          <svg :viewBox="`${VB.x} ${VB.y} ${VB.w} ${VB.h}`" class="path-svg" aria-hidden="true">
            <path
              v-for="(d, i) in ROOT_LINES"
              :key="`rl-${i}`"
              :ref="(el) => { if (el) rootLineEls[i] = el }"
              :d="d"
              class="path-line path-line-main"
              pathLength="1"
            />
            <path
              v-for="(d, i) in LEAF_LINES"
              :key="`ll-${i}`"
              :ref="(el) => { if (el) leafLineEls[i] = el }"
              :d="d"
              class="path-line path-line-sub"
              pathLength="1"
            />
          </svg>

          <div
            ref="rootEl"
            class="path-root"
            :style="{ left: `${pctX(MAP.root.x)}%`, top: `${pctY(MAP.root.y)}%` }"
          >
            <span class="path-root-dot"></span>
            <span class="path-root-label">大学数学</span>
          </div>

          <RouterLink
            v-for="(track, i) in MAP.tracks"
            :key="track.name"
            :ref="(c) => { if (c) trackEls[i] = c.$el ?? c }"
            class="path-track"
            :style="{
              left: `${pctX(track.x)}%`,
              top: `${pctY(track.y)}%`,
              borderColor: track.accent,
            }"
            :to="`/knowledge?course=${track.slug}`"
          >
            <img class="path-avatar" :src="track.portrait" :alt="`${track.portraitName}肖像`" decoding="async" />
            <span class="path-track-text">
              <span class="path-track-name">{{ track.name }}</span>
              <span class="path-track-figure">{{ track.portraitName }}</span>
            </span>
          </RouterLink>

          <RouterLink
            v-for="(leaf, i) in LEAF_NODES"
            :key="leaf.name"
            :ref="(c) => { if (c) leafEls[i] = c.$el ?? c }"
            class="path-leaf"
            :style="{ left: `${pctX(leaf.x)}%`, top: `${pctY(leaf.y)}%` }"
            to="/knowledge"
          >
            <span class="path-leaf-dot" :style="{ background: leaf.accent }"></span>
            {{ leaf.name }}
          </RouterLink>
        </div>

        <p class="path-caption">从左往右，就是你接下来几年的数学路线</p>
      </div>

      <div class="journey-hud" aria-live="polite">
        <span class="hud-dot"></span>
        <span>{{ activeLabel }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.journey {
  position: relative;
  /* 从 420vh 压到 320vh：氛围留着，但少滚一屏才摸得到会员和讲义。
     每个板块仍有约 76vh 的滚动行程，节奏不会被压得太急。 */
  height: 320vh;
  background: #0a0801;
  margin-inline: calc(50% - 50vw);
  margin-bottom: clamp(60px, 7.5vw, 108px);
}

.journey-sticky {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
  background: #0a0801;
}

.backdrop {
  position: absolute;
  inset: 0;
}

.backdrop img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 38% 45%;
  filter: grayscale(0.5) brightness(0.34) contrast(1.05);
  transform: scale(1.08);
}

.backdrop-vignette {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 90% at 50% 45%, transparent 30%, rgba(6, 5, 1, 0.72) 100%),
    linear-gradient(180deg, rgba(6, 5, 1, 0.3) 0%, transparent 30%, transparent 70%, rgba(6, 5, 1, 0.45) 100%);
}

/* 这些元素的 opacity/transform 全部由 JS 每帧直接写，
   所以刻意不加 CSS transition——两套缓动叠在一起会互相打架。 */
.tile {
  position: absolute;
  aspect-ratio: 3 / 4;
  overflow: hidden;
  border: 1px solid rgba(242, 236, 224, 0.22);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55);
  opacity: 0;
  will-change: opacity, transform;
}

.tile img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center 22%;
  filter: grayscale(0.1) brightness(1.02) contrast(1.04) sepia(0.06);
}

.tile-label {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 5px 0 6px;
  background: linear-gradient(0deg, rgba(6, 5, 1, 0.85), transparent);
  color: rgba(242, 236, 224, 0.88);
  font-size: 11px;
  letter-spacing: 0.14em;
  text-align: center;
}

.grain {
  position: absolute;
  inset: -20%;
  background-repeat: repeat;
  background-size: 160px 160px;
  mix-blend-mode: overlay;
  opacity: 0.5;
  animation: grain-shift 0.7s steps(4) infinite;
  pointer-events: none;
}

@keyframes grain-shift {
  0% { transform: translate(0, 0); }
  25% { transform: translate(-4%, 3%); }
  50% { transform: translate(3%, -3%); }
  75% { transform: translate(-2%, -4%); }
  100% { transform: translate(0, 0); }
}

.intro-panel {
  position: absolute;
  left: clamp(20px, 6vw, 88px);
  bottom: clamp(80px, 14vh, 160px);
  width: min(420px, 44vw);
  padding-left: 20px;
  opacity: 0;
  will-change: opacity;
}

.intro-bar {
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 3px;
}

.intro-kicker {
  margin: 0 0 10px;
  color: rgba(242, 236, 224, 0.68);
  font-size: 12px;
  letter-spacing: 0.3em;
  text-transform: uppercase;
}

.intro-title {
  margin: 0 0 14px;
  color: #f2ece0;
  font-family: "Noto Serif SC", "Source Han Serif SC", serif;
  font-size: clamp(24px, 3vw, 34px);
  font-weight: 500;
  letter-spacing: 0.06em;
}

/* 这门课具体讲什么，取自数据库里课程的 subtitle */
.intro-scope {
  margin: 0 0 14px;
  color: rgba(242, 236, 224, 0.6);
  font-size: 13px;
  letter-spacing: 0.1em;
}

.intro-copy {
  margin: 0;
  color: rgba(242, 236, 224, 0.82);
  font-size: 14.5px;
  line-height: 1.9;
}

/* 每一屏都要能直接进对应课程，不然看完三屏漂亮画面无处可去 */
.intro-cta {
  display: inline-flex;
  gap: 10px;
  align-items: center;
  margin-top: 20px;
  border-bottom: 1px solid rgba(242, 236, 224, 0.45);
  padding-bottom: 6px;
  color: #f2ece0;
  font-size: 14px;
  letter-spacing: 0.14em;
  transition: border-color 0.25s ease, color 0.25s ease;
}

.intro-cta i {
  font-style: normal;
  transition: transform 0.25s ease;
}

.intro-cta:hover {
  border-color: #c9a86a;
  color: #c9a86a;
}

.intro-cta:hover i {
  transform: translateX(5px);
}

/* ---------- 学习路径图 ---------- */
.path-scene {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(12px, 2vh, 26px);
  opacity: 0;
  visibility: hidden;
  will-change: opacity;
}

/* 宽高比必须严格等于 viewBox 的比例，SVG 坐标和 HTML 节点的百分比定位才能对齐。
   高度限制不能用 max-height——那会压扁盒子、破坏比例，SVG 于是居中留白，
   连线端点就会偏离节点中心。把高度上限折算成宽度上限，比例才永远成立。 */
.path-stage {
  position: relative;
  width: min(1060px, 92vw, 74vh * 330 / 230);
  aspect-ratio: 330 / 230;
}

.path-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.path-line {
  fill: none;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  will-change: stroke-dashoffset;
}

.path-line-main {
  stroke: rgba(242, 236, 224, 0.45);
  stroke-width: 0.8;
}

.path-line-sub {
  stroke: rgba(242, 236, 224, 0.22);
  stroke-width: 0.6;
}

.path-root {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  transform: translate(-50%, -50%);
  opacity: 0;
  will-change: opacity;
}

.path-root-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #f2ece0;
  box-shadow: 0 0 16px rgba(242, 236, 224, 0.5);
}

.path-root-label {
  color: rgba(242, 236, 224, 0.72);
  font-size: 12px;
  letter-spacing: 0.2em;
  white-space: nowrap;
}

.path-track {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 16px 7px 7px;
  border: 1.4px solid;
  border-radius: 999px;
  background: rgba(10, 8, 1, 0.78);
  color: #f2ece0;
  white-space: nowrap;
  opacity: 0;
  transform: translate(-50%, -50%);
  will-change: opacity, transform;
  backdrop-filter: blur(2px);
}

.path-avatar {
  width: clamp(30px, 3.2vmin, 42px);
  height: clamp(30px, 3.2vmin, 42px);
  border-radius: 50%;
  object-fit: cover;
  object-position: center 20%;
  filter: grayscale(0.1) contrast(1.04) sepia(0.06);
  flex: none;
}

.path-track-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  line-height: 1.25;
}

.path-track-name {
  font-size: clamp(13px, 1.35vmin + 8px, 16px);
  font-weight: 600;
  letter-spacing: 0.08em;
}

.path-track-figure {
  color: rgba(242, 236, 224, 0.5);
  font-size: 10.5px;
  letter-spacing: 0.1em;
}

.path-leaf {
  position: absolute;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 13px;
  border: 1px solid rgba(242, 236, 224, 0.26);
  border-radius: 999px;
  background: rgba(10, 8, 1, 0.68);
  color: rgba(242, 236, 224, 0.86);
  font-size: 12px;
  letter-spacing: 0.06em;
  white-space: nowrap;
  opacity: 0;
  transform: translate(-50%, -50%);
  will-change: opacity, transform;
}

.path-leaf-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex: none;
}

.path-track:hover,
.path-leaf:hover {
  background: rgba(242, 236, 224, 0.15);
  border-color: rgba(242, 236, 224, 0.75);
}

.path-caption {
  margin: 0;
  color: rgba(242, 236, 224, 0.55);
  font-size: 12.5px;
  letter-spacing: 0.14em;
  white-space: nowrap;
}

.journey-hud {
  position: absolute;
  left: 50%;
  bottom: clamp(24px, 5vh, 56px);
  display: flex;
  gap: 10px;
  align-items: center;
  transform: translateX(-50%);
  padding: 10px 20px;
  border-radius: 999px;
  background: rgba(10, 8, 1, 0.55);
  border: 1px solid rgba(242, 236, 224, 0.18);
  color: #f2ece0;
  font-size: 14px;
  letter-spacing: 0.12em;
  pointer-events: none;
}

.hud-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #c9a86a;
}

/* 减少动效：不做滚动联动，画廊墙和路径图各占一屏，直接显示 */
.journey-reduced {
  height: auto;
}

.journey-reduced .journey-sticky {
  position: relative;
  height: 90vh;
}

.journey-reduced .path-scene {
  position: relative;
  height: 90vh;
}

@media (max-width: 900px) {
  .path-stage {
    width: 96vw;
  }

  .path-track-figure {
    display: none;
  }

  .path-leaf {
    font-size: 11px;
    padding: 4px 10px;
  }

  /* 桌面上限宽 44vw 是为了给右侧画廊留位置；窄屏没有这个需要，
     再压着只会把正文挤成每行十来个字，白白空掉半个屏幕。 */
  .intro-panel {
    width: min(420px, 78vw);
  }
}
</style>
