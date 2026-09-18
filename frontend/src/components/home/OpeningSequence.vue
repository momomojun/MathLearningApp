<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import {
  ACTS,
  END,
  SKIP_HINT_FROM,
  SKIP_TO,
  T,
  ease,
  sampleStage,
  segment,
  windowAt,
} from './openingTimeline'

const emit = defineEmits(['done'])

const overlay = ref(null)
const canvas = ref(null)
const brand = ref(null)
const skip = ref(null)
const labelEls = []

// 舞台参数。线本身是纸白，只有基向量和直方图用亮玉色——
// 深底上原本的品牌墨绿 #1f4d3d 几乎不可见，所以这里取它提亮后的同色系。
const BG = '#0b0f0d'
const LINE = '#f4f1ea'
const JADE = '#7fd8a8'
const FAINT = 'rgba(244, 241, 234, 0.16)'

const N = 320 // 折线采样点数，320 在 4K 上也看不出棱角

let ctx = null
let dpr = 1
let cssW = 0
let cssH = 0
let rafId = 0
let startAt = 0
let skipOffset = 0
let finished = false
let onResize = null
const listeners = []

function resize() {
  const el = canvas.value
  if (!el) return
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  cssW = window.innerWidth
  cssH = window.innerHeight
  el.width = Math.round(cssW * dpr)
  el.height = Math.round(cssH * dpr)
  el.style.width = `${cssW}px`
  el.style.height = `${cssH}px`
  ctx = el.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

// 舞台坐标 x∈[-1.3,1.3] y∈[-0.78,0.78]，按能装下的那一边定标。
//
// 竖屏手机上画面是被宽度卡住的：横向留白给得更省，构图往上提一点，
// 纵向再单独放大——这几条曲线本身又宽又扁，等比缩进竖屏里只剩一条细带。
// 纵横不等比是仿射变换，切线仍然是切线、剪切仍然是剪切，画面里的数学关系不会错。
// 线宽和箭头仍按横向尺度算，不然竖屏上线会被拉粗。
function projector() {
  const portrait = cssH / cssW > 1.3
  const scale = Math.min(cssW / (portrait ? 2.35 : 2.75), cssH / 1.62)
  const yScale = portrait ? scale * 1.75 : scale
  const cy = cssH * (portrait ? 0.43 : 0.5)
  return {
    scale,
    cy,
    px: (x) => cssW / 2 + x * scale,
    py: (y) => cy - y * yScale,
  }
}

function strokePath(pts, width, color, alpha) {
  if (alpha <= 0.002 || pts.length < 2) return
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1])
  ctx.stroke()
  ctx.globalAlpha = 1
}

// 发光不用 shadowBlur——320 段折线上它太贵。
// 同一条路径描三遍，由宽到窄、由淡到实，肉眼效果一样。
function glowPath(pts, alpha, unit) {
  strokePath(pts, unit * 0.030, LINE, alpha * 0.10)
  strokePath(pts, unit * 0.012, LINE, alpha * 0.22)
  strokePath(pts, Math.max(1.35, unit * 0.0042), LINE, alpha)
}

function arrow(x, y, ux, uy, unit, alpha) {
  const h = unit * 0.036
  ctx.globalAlpha = alpha
  ctx.fillStyle = JADE
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x - ux * h + uy * h * 0.52, y - uy * h - ux * h * 0.52)
  ctx.lineTo(x - ux * h - uy * h * 0.52, y - uy * h + ux * h * 0.52)
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1
}

function paint(now) {
  const p = projector()
  const unit = p.scale

  ctx.fillStyle = BG
  ctx.fillRect(0, 0, cssW, cssH)

  // 品牌那一行要落在收束后那道细线的下面，所以它的位置得跟着舞台中心走，
  // 不能写死 50%——竖屏时中心是被提起来过的。
  if (overlay.value) overlay.value.style.setProperty('--stage-center', `${p.cy}px`)

  const stage = sampleStage(now, N)

  // ---- 背景格子：线性变换那一段的主角，它让「线被变换了」这件事看得见 ----
  if (stage.lattice > 0.002) {
    const step = 0.26
    const lim = 1.42
    const vlim = 0.9
    ctx.globalAlpha = stage.lattice
    ctx.strokeStyle = FAINT
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let gx = -lim; gx <= lim + 1e-6; gx += step) {
      const a = stage.apply(gx, -vlim)
      const b = stage.apply(gx, vlim)
      ctx.moveTo(p.px(a[0]), p.py(a[1]))
      ctx.lineTo(p.px(b[0]), p.py(b[1]))
    }
    for (let gy = -vlim; gy <= vlim + 1e-6; gy += step) {
      const a = stage.apply(-lim, gy)
      const b = stage.apply(lim, gy)
      ctx.moveTo(p.px(a[0]), p.py(a[1]))
      ctx.lineTo(p.px(b[0]), p.py(b[1]))
    }
    ctx.stroke()
    ctx.globalAlpha = 1
  }

  // ---- 直方图：正态那一段从基线长起来 ----
  if (stage.bars > 0.002) {
    const bars = 23
    const base = stage.bellBase
    ctx.globalAlpha = stage.bars * 0.44
    ctx.fillStyle = JADE
    for (let i = 0; i < bars; i += 1) {
      const x = -1 + ((i + 0.5) / bars) * 2
      const top = base + (stage.bellAt(x) - base) * stage.bars
      const w = (2 / bars) * 0.74 * unit
      const y0 = p.py(top)
      const y1 = p.py(base)
      ctx.fillRect(p.px(x) - w / 2, y0, w, Math.max(0, y1 - y0))
    }
    ctx.globalAlpha = 1
  }

  // ---- 基线：正态那一段的横轴 ----
  if (stage.bars > 0.002) {
    const b = stage.bellBase
    strokePath(
      [
        [p.px(-1.08), p.py(b)],
        [p.px(1.08), p.py(b)],
      ],
      1,
      LINE,
      stage.bars * 0.3,
    )
  }

  // ---- 主角：那一条线 ----
  const pts = []
  const upTo = Math.max(2, Math.round(N * stage.drawn))
  for (let i = 0; i < upTo; i += 1) {
    pts.push([p.px(stage.pts[i][0]), p.py(stage.pts[i][1])])
  }
  glowPath(pts, stage.lineAlpha, unit)

  // 线头的光点：只在「线正在画出来」的时候有
  if (stage.drawn < 0.999 && pts.length) {
    const tip = pts[pts.length - 1]
    ctx.globalAlpha = stage.lineAlpha
    ctx.fillStyle = LINE
    ctx.beginPath()
    ctx.arc(tip[0], tip[1], Math.max(2, unit * 0.007), 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  // ---- 切线：微积分那一段，沿曲线滑过，斜率跟着变 ----
  if (stage.tangent.alpha > 0.002) {
    const { x, y, slope, alpha } = stage.tangent
    const len = 0.34
    const norm = Math.hypot(1, slope)
    const dx = (len / norm) * 1
    const dy = (len / norm) * slope
    strokePath(
      [
        [p.px(x - dx), p.py(y - dy)],
        [p.px(x + dx), p.py(y + dy)],
      ],
      Math.max(1.2, unit * 0.0032),
      JADE,
      alpha * 0.9,
    )
    ctx.globalAlpha = alpha
    ctx.fillStyle = JADE
    ctx.beginPath()
    ctx.arc(p.px(x), p.py(y), Math.max(2.4, unit * 0.0082), 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  // ---- 基向量：线性代数那一段，两支箭领着整个格子走 ----
  if (stage.basis > 0.002) {
    const a = stage.basis
    const ox = p.px(0)
    const oy = p.py(0)
    for (const v of [
      [0.52, 0],
      [0, 0.52],
    ]) {
      const m = stage.apply(v[0], v[1])
      const tx = p.px(m[0])
      const ty = p.py(m[1])
      strokePath([[ox, oy], [tx, ty]], Math.max(1.6, unit * 0.0044), JADE, a)
      const L = Math.hypot(tx - ox, ty - oy) || 1
      arrow(tx, ty, (tx - ox) / L, (ty - oy) / L, unit, a)
    }
  }
}

function frame(ts) {
  if (!startAt) startAt = ts
  const now = Math.min(ts - startAt + skipOffset, END)

  paint(now)

  // 文字层交给 DOM：canvas 里画中文要自己处理字体加载和亚像素，不值得
  for (let i = 0; i < ACTS.length; i += 1) {
    const el = labelEls[i]
    if (el) el.style.opacity = windowAt(now, ACTS[i].label)
  }
  if (brand.value) {
    const b = ease(segment(now, T.toBrand))
    brand.value.style.opacity = b
    brand.value.style.transform = `translateY(${(1 - b) * 14}px)`
  }
  if (skip.value) {
    // 已经开始收束就别再提示可以跳过了——那时候跳过和放完没有区别
    skip.value.style.opacity = now > SKIP_HINT_FROM && now < SKIP_TO ? 0.55 : 0
  }
  if (overlay.value) {
    overlay.value.style.opacity = 1 - ease(segment(now, T.fadeOut))
  }

  if (now >= END) {
    settle()
    return
  }
  rafId = requestAnimationFrame(frame)
}

function settle() {
  if (finished) return
  finished = true
  if (rafId) cancelAnimationFrame(rafId)
  rafId = 0
  emit('done')
}

function skipToEnd() {
  if (finished || skipOffset) return
  const elapsed = startAt ? performance.now() - startAt : 0
  if (elapsed >= SKIP_TO) return
  skipOffset = SKIP_TO - elapsed
}

onMounted(() => {
  // 开场必须从页首开始，否则淡出后落在半页中间
  window.scrollTo(0, 0)
  document.body.style.overflow = 'hidden'

  resize()
  onResize = () => resize()
  window.addEventListener('resize', onResize)

  const bind = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts)
    listeners.push(() => target.removeEventListener(type, fn, opts))
  }
  bind(window, 'keydown', skipToEnd)
  bind(window, 'wheel', skipToEnd, { passive: true })
  bind(window, 'touchstart', skipToEnd, { passive: true })
  bind(window, 'pointerdown', skipToEnd)

  rafId = requestAnimationFrame(frame)
})

onBeforeUnmount(() => {
  if (rafId) cancelAnimationFrame(rafId)
  if (onResize) window.removeEventListener('resize', onResize)
  listeners.forEach((off) => off())
  document.body.style.overflow = ''
})
</script>

<template>
  <Teleport to="body">
    <div ref="overlay" class="opening" role="presentation">
      <canvas ref="canvas" aria-hidden="true"></canvas>

      <p
        v-for="(act, i) in ACTS"
        :key="act.name"
        :ref="(el) => { if (el) labelEls[i] = el }"
        class="act"
      >
        <span class="act-idea">{{ act.idea }}</span>
        <span class="act-rule"></span>
        <span class="act-course">{{ act.name }}</span>
      </p>

      <div ref="brand" class="brand-resolve">
        <strong>MathAPP</strong>
        <span>大学数学 · 讲义 · 习题 · 解析</span>
      </div>

      <button ref="skip" type="button" class="skip" @click="skipToEnd">跳过</button>
    </div>
  </Teleport>
</template>

<style scoped>
.opening {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: #0b0f0d;
  /* 淡出期间下面的页面要能接收滚动，不然会有一下卡顿感 */
  pointer-events: auto;
}

canvas {
  display: block;
}

/* 三条幕标叠在同一处交叉淡入淡出，位置不动——动的只有那条线 */
.act {
  position: absolute;
  left: 0;
  right: 0;
  bottom: clamp(74px, 13vh, 132px);
  display: flex;
  gap: 14px;
  align-items: center;
  justify-content: center;
  margin: 0;
  opacity: 0;
  color: rgba(244, 241, 234, 0.9);
  font-size: clamp(13px, 1.25vw, 15px);
  letter-spacing: 0.2em;
  white-space: nowrap;
}

.act-idea {
  color: #7fd8a8;
}

.act-rule {
  width: 28px;
  height: 1px;
  background: rgba(244, 241, 234, 0.34);
}

/* 收束：一道细线之下落品牌。线由 canvas 画，正好停在视口正中。 */
.brand-resolve {
  position: absolute;
  left: 0;
  right: 0;
  top: var(--stage-center, 50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-top: clamp(20px, 3vh, 34px);
  opacity: 0;
  text-align: center;
}

.brand-resolve strong {
  color: #f4f1ea;
  font-size: clamp(30px, 4.4vw, 54px);
  font-weight: 700;
  letter-spacing: 0.12em;
}

.brand-resolve span {
  color: rgba(244, 241, 234, 0.62);
  font-size: clamp(12.5px, 1.2vw, 15px);
  letter-spacing: 0.24em;
}

.skip {
  position: absolute;
  right: clamp(18px, 3vw, 40px);
  bottom: clamp(18px, 3vh, 36px);
  border: 1px solid rgba(244, 241, 234, 0.3);
  border-radius: 999px;
  padding: 7px 16px;
  background: transparent;
  color: rgba(244, 241, 234, 0.9);
  font-size: 12.5px;
  letter-spacing: 0.16em;
  opacity: 0;
  transition: opacity 0.3s ease, border-color 0.2s ease;
}

.skip:hover {
  border-color: rgba(244, 241, 234, 0.7);
}

@media (max-width: 620px) {
  .act {
    letter-spacing: 0.14em;
  }
}
</style>
