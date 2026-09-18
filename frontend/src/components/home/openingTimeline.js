// 开场序列的时间轴与形状，从 OpeningSequence.vue 里单独拆出来：
// 这些都是纯函数，可以直接测；组件里只剩画布绘制。
//
// 整段开场是「一条线走完三门课」：
//   一条光线 → 弯成三次曲线（微积分）→ 被矩阵剪切，格子跟着走（线性代数）
//   → 塌成正态曲线，直方图长起来（概率统计）→ 拉平收短，品牌落在线下
// 全程只有一个主体在动，别的东西都只是这条线所在的空间。

// ---------------------------------------------------------------------------
// 想整体调快慢，只改这一张时长表（毫秒）。
// 幕标、格子、直方图、切线的进出时刻都是从 T 派生出来的，不用逐个跟着改。
//
// 形变段（toXxx）给得比停顿段长：形变是好看的地方，停顿是让眼睛跟上的地方。
// 停顿给太短整段会显得赶，给太长会显得卡住——目前每幕停顿约是形变的四成。
// ---------------------------------------------------------------------------
const DURATION = {
  lineIn: 380, // 一条光线画出来
  toCurve: 980, // 弯成三次曲线
  holdCurve: 420,
  toMatrix: 980, // 空间被剪切
  holdMatrix: 400,
  toBell: 980, // 塌成正态曲线
  holdBell: 420,
  toBrand: 780, // 拉平收短，品牌浮现
  holdBrand: 560,
  fadeOut: 500, // 黑幕退去，露出首屏
}

function buildTimeline(durations) {
  const timeline = {}
  let at = 0
  for (const key of Object.keys(durations)) {
    timeline[key] = [at, at + durations[key]]
    at += durations[key]
  }
  return timeline
}

/** 每一段的 [起, 止]，首尾相接 */
export const T = buildTimeline(DURATION)

export const END = T.fadeOut[1]

// 背景层（格子、基向量）的淡入淡出时长
const FADE = 380
// 幕标和切线比它所属那一幕稍晚进场：先看见形变开始，再看见它叫什么
const LEAD = 180

const LINE_FADE_IN = [0, Math.round(T.lineIn[1] * 0.8)]
// 矩阵在正态那一幕的开头解除：让空间先复位，再让线塌成正态，
// 两件事挤在一起发生会看不清任何一件
const MATRIX_UNWIND = [T.toBell[0], T.toBell[0] + FADE + 200]
const LATTICE = [T.toMatrix[0], T.toMatrix[0] + FADE, T.toBell[0], T.toBell[0] + FADE]
const BASIS = [
  T.toMatrix[0] + 80,
  T.toMatrix[0] + 80 + FADE,
  T.toBell[0],
  T.toBell[0] + FADE - 60,
]
// 直方图长到满正好是正态那一幕收尾，然后随收束退掉——
// 忘了让它退场，品牌就会压在一堆柱子上
const BARS = [T.toBell[0] + 200, T.holdBell[1], T.holdBell[1], T.holdBell[1] + 480]
const TANGENT_RIDE = [T.toCurve[0] + LEAD, T.toMatrix[0] + 280]
const TANGENT = [
  T.toCurve[0] + LEAD,
  T.toCurve[0] + LEAD + 340,
  T.toMatrix[0],
  T.toMatrix[0] + 280,
]

/** 跳过提示从什么时候开始露出：第一幕已经起来了再给，不要一上来就劝人走 */
export const SKIP_HINT_FROM = T.toCurve[0] + LEAD

// 点了跳过，跳到哪。
// 尾巴固定留 800ms（品牌短暂落定 + 黑幕退去），这样整段放多慢都不影响
// 「按下去多久能出去」——节奏拉长时如果跟着 holdBrand 走，跳过会越来越不像跳过。
// 下限卡在 toBrand 结束：至少要让品牌完整浮现，否则跳过看到的是半截字。
export const SKIP_TAIL = 800
export const SKIP_TO = Math.max(T.toBrand[1], END - SKIP_TAIL)

function actLabel(start, end) {
  return [start + LEAD, start + LEAD + 340, end - 80, end + 200]
}

// 幕标。idea 是那门课在讲的事，name 是课名——先给概念再给课名，
// 因为这一刻画面上演的是概念，课名只是它的落点。
export const ACTS = [
  { idea: '变化', name: '微积分', label: actLabel(T.toCurve[0], T.holdCurve[1]) },
  { idea: '结构', name: '线性代数', label: actLabel(T.toMatrix[0], T.holdMatrix[1]) },
  { idea: '偶然', name: '概率统计', label: actLabel(T.toBell[0], T.holdBell[1]) },
]

// 剪切 + 轻微旋转。det ≈ 1.05，接近保面积，看着像空间被推歪而不是被压扁。
const M1 = [1, 0.58, -0.3, 0.88]

export const BELL_BASE = -0.22

export function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

/** 某一段时间轴上的归一化进度 */
export function segment(now, [start, end]) {
  if (end <= start) return now >= end ? 1 : 0
  return clamp01((now - start) / (end - start))
}

export function ease(p) {
  const t = clamp01(p)
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

export function lerp(a, b, t) {
  return a + (b - a) * t
}

/** 梯形窗：淡入、保持、淡出，给幕标这类只露一会儿的东西用 */
export function windowAt(now, [inStart, inEnd, outStart, outEnd]) {
  if (now <= inStart || now >= outEnd) return 0
  if (now < inEnd) return ease(segment(now, [inStart, inEnd]))
  if (now <= outStart) return 1
  return 1 - ease(segment(now, [outStart, outEnd]))
}

/** 三次曲线：两个拐点，是最像教科书插图的那条 */
export function curveAt(x) {
  return 1.6 * (x * x * x - 0.7 * x)
}

/** 上面那条曲线的导数，切线的斜率直接用它 */
export function curveSlopeAt(x) {
  return 1.6 * (3 * x * x - 0.7)
}

export function bellAt(x) {
  return BELL_BASE + 0.5 * Math.exp(-((2 * x) ** 2) / 2)
}

/** 单位矩阵到 M1 之间插值 */
export function matrixAt(amount) {
  const t = clamp01(amount)
  return [lerp(1, M1[0], t), lerp(0, M1[1], t), lerp(0, M1[2], t), lerp(1, M1[3], t)]
}

export function applyMatrix(m, x, y) {
  return [m[0] * x + m[1] * y, m[2] * x + m[3] * y]
}

/**
 * 取某一时刻的整个舞台状态。
 * 返回的 pts 是舞台坐标（x∈[-1,1] 附近，y 向上为正），绘制时再投到像素。
 */
export function sampleStage(now, count = 320) {
  const curveAmt = ease(segment(now, T.toCurve))
  const bellAmt = ease(segment(now, T.toBell))
  const brandAmt = ease(segment(now, T.toBrand))

  const mAmt = ease(segment(now, T.toMatrix)) * (1 - ease(segment(now, MATRIX_UNWIND)))
  const m = matrixAt(mAmt)

  // 收束时线横向收短成一道细线，品牌落在它下面
  const shrink = 1 - 0.74 * brandAmt

  const pts = new Array(count)
  for (let i = 0; i < count; i += 1) {
    const x0 = -1 + (2 * i) / (count - 1)
    let y = lerp(0, curveAt(x0), curveAmt)
    y = lerp(y, bellAt(x0), bellAmt)
    y = lerp(y, 0, brandAmt)
    const [mx, my] = applyMatrix(m, x0, y)
    pts[i] = [mx * shrink, my]
  }

  // 切线沿曲线滑过去，斜率跟着曲线变——这就是导数在做的事
  const tx = lerp(-1.02, 1.02, ease(segment(now, TANGENT_RIDE)))

  return {
    pts,
    drawn: segment(now, T.lineIn),
    lineAlpha: ease(segment(now, LINE_FADE_IN)),
    lattice: windowAt(now, LATTICE),
    basis: windowAt(now, BASIS),
    bars: windowAt(now, BARS),
    bellBase: BELL_BASE,
    bellAt,
    apply: (x, y) => applyMatrix(m, x, y),
    tangent: {
      x: tx,
      y: curveAt(tx) * curveAmt,
      slope: curveSlopeAt(tx) * curveAmt,
      alpha: windowAt(now, TANGENT),
    },
  }
}
