// 纯函数，跟 DOM/Three.js 完全脱钩，方便在 jsdom 下测试滚动进度换算是否正确。
export function smoothstep(t) {
  const c = Math.min(Math.max(t, 0), 1)
  return c * c * (3 - 2 * c)
}

// 把整段旅程切成 N 个知识板块 + 结尾留给知识树的一段
export function buildSegments(count, treeShare = 0.22) {
  const journeyShare = 1 - treeShare
  const step = journeyShare / count
  return Array.from({ length: count }, (_, i) => ({
    start: i * step,
    end: (i + 1) * step,
  }))
}

// 某个场景在给定滚动进度下的透明度：淡入 → 停留 → 淡出。
// 淡出窗口特意放在 [end, end+fade]，跟下一段的淡入窗口 [start=end, start+fade]
// 完全重叠——这样交接处两张画会同时半透明地叠在一起，是真正的叠化，
// 不是"这张淡到0、下一张才从0开始淡"的硬切。
export function computeSceneOpacity(progress, segment, fade = 0.08) {
  const { start, end } = segment
  if (progress <= start || progress >= end + fade) return 0
  if (progress < start + fade) return smoothstep((progress - start) / fade)
  if (progress > end) return smoothstep((end + fade - progress) / fade)
  return 1
}

// 知识树在旅程末尾淡入，treeStart 通常是最后一个知识板块的 end
export function computeTreeOpacity(progress, treeStart, fade = 0.1) {
  if (progress <= treeStart) return 0
  return smoothstep((progress - treeStart) / fade)
}

// 鸟在某个板块内从左飞到右（或反向）的局部进度，0~1
export function localSegmentProgress(progress, segment) {
  const { start, end } = segment
  return Math.min(Math.max((progress - start) / (end - start), 0), 1)
}

// 鸟的整体位置：落在哪个板块，以及该板块内的局部进度
export function findActiveSegmentIndex(progress, segments) {
  const idx = segments.findIndex((seg) => progress >= seg.start && progress < seg.end)
  if (idx !== -1) return idx
  return progress < segments[0].start ? 0 : segments.length - 1
}

// 帧率无关的缓动。
// 直接写 current += (target-current)*rate 是"每帧靠近 rate 比例"，
// 在 60Hz 和 144Hz 屏幕上收敛速度差一倍多，高刷屏会显得急、低刷屏会显得拖。
// 这里按实际帧间隔换算，保证任何帧率下"追上目标"的手感一致。
export function frameLerp(current, target, perFrameRate, deltaMs, referenceMs = 1000 / 60) {
  // 切后台再切回来时 deltaMs 可能是好几秒，钳一下避免画面瞬移
  const delta = Math.min(Math.max(deltaMs, 1), 100)
  const t = 1 - Math.pow(1 - perFrameRate, delta / referenceMs)
  return current + (target - current) * t
}

// 从左到右分层的学习路径布局。
// 径向发散布局表达不了先修顺序，改成三列：起点 → 基础课 → 进阶课，
// 天然读作"先学左边，再学右边"，中文标签横排也不会互相挤。
// 每门基础课在纵向上居中于它自己的进阶课，这样连线看起来是平衡的。
export function layoutLearningPath(
  tracks,
  { rootX = -125, trackX = -15, leafX = 105, rowGap = 34 } = {},
) {
  const totalSlots = tracks.reduce((n, t) => n + Math.max(1, (t.next || []).length), 0)
  let slot = 0

  const laidTracks = tracks.map((track) => {
    const nextNames = track.next || []
    // 没有后续课的基础课也要占一个纵向槽位，否则它会跟别人重叠
    const count = Math.max(1, nextNames.length)
    const ys = []
    for (let i = 0; i < count; i += 1) {
      ys.push((slot - (totalSlots - 1) / 2) * rowGap)
      slot += 1
    }
    return {
      ...track,
      x: trackX,
      y: ys.reduce((a, b) => a + b, 0) / ys.length,
      next: nextNames.map((name, i) => ({ name, x: leafX, y: ys[i] })),
    }
  })

  const leafYs = laidTracks.flatMap((t) => t.next.map((n) => n.y))
  const rootY = leafYs.length ? leafYs.reduce((a, b) => a + b, 0) / leafYs.length : 0

  return { root: { x: rootX, y: rootY }, tracks: laidTracks }
}

// 左右流向的三次贝塞尔连线：控制点沿水平方向伸出，画出流程图里那种平滑 S 形。
// 之前用的是"垂直偏移的二次贝塞尔"，在分层布局里会拐得很别扭。
export function flowPath(x1, y1, x2, y2, curvature = 0.5) {
  const dx = (x2 - x1) * curvature
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`
}
