import { describe, expect, it } from 'vitest'
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

describe('smoothstep', () => {
  it('clamps and eases between 0 and 1', () => {
    expect(smoothstep(-1)).toBe(0)
    expect(smoothstep(0)).toBe(0)
    expect(smoothstep(0.5)).toBeCloseTo(0.5, 5)
    expect(smoothstep(1)).toBe(1)
    expect(smoothstep(2)).toBe(1)
  })
})

describe('buildSegments', () => {
  it('splits the journey into equal segments leaving room for the tree', () => {
    const segments = buildSegments(3, 0.22)
    expect(segments).toHaveLength(3)
    expect(segments[0].start).toBe(0)
    expect(segments[2].end).toBeCloseTo(0.78, 5)
    // segments must be contiguous, no gaps or overlaps
    expect(segments[0].end).toBe(segments[1].start)
    expect(segments[1].end).toBe(segments[2].start)
  })
})

describe('computeSceneOpacity', () => {
  const segment = { start: 0.2, end: 0.5 }

  it('is 0 before the segment starts and once the fade-out past its end finishes', () => {
    expect(computeSceneOpacity(0.1, segment, 0.08)).toBe(0)
    expect(computeSceneOpacity(0.59, segment, 0.08)).toBe(0)
  })

  it('is fully opaque in the held middle of the segment', () => {
    expect(computeSceneOpacity(0.35, segment)).toBe(1)
  })

  it('is still opaque exactly at its nominal end — the fade-out happens after end, not before', () => {
    expect(computeSceneOpacity(0.5, segment, 0.08)).toBe(1)
  })

  it('fades in at the start and out after the end', () => {
    const fadeIn = computeSceneOpacity(0.22, segment, 0.08)
    const fadeOut = computeSceneOpacity(0.54, segment, 0.08)
    expect(fadeIn).toBeGreaterThan(0)
    expect(fadeIn).toBeLessThan(1)
    expect(fadeOut).toBeGreaterThan(0)
    expect(fadeOut).toBeLessThan(1)
  })

  it('genuinely crossfades at the handoff — both neighbors are simultaneously visible', () => {
    const segments = buildSegments(3)
    const fade = 0.08
    const boundary = segments[0].end // === segments[1].start
    const midway = boundary + fade / 2
    const outgoing = computeSceneOpacity(midway, segments[0], fade)
    const incoming = computeSceneOpacity(midway, segments[1], fade)
    // 真正的叠化：交接点两张画都该有实质透明度，而不是一个死一个才刚开始活
    expect(outgoing).toBeGreaterThan(0.3)
    expect(incoming).toBeGreaterThan(0.3)
    // 且大致对称：中点应该接近各 50%
    expect(outgoing).toBeCloseTo(0.5, 1)
    expect(incoming).toBeCloseTo(0.5, 1)
  })
})

describe('computeTreeOpacity', () => {
  it('stays invisible until the journey reaches the tree', () => {
    expect(computeTreeOpacity(0.5, 0.78)).toBe(0)
  })

  it('fades in after treeStart', () => {
    expect(computeTreeOpacity(0.83, 0.78, 0.1)).toBeGreaterThan(0)
    expect(computeTreeOpacity(0.88, 0.78, 0.1)).toBe(1)
  })
})

describe('localSegmentProgress', () => {
  it('maps global progress to 0..1 within a segment and clamps outside it', () => {
    const segment = { start: 0.2, end: 0.5 }
    expect(localSegmentProgress(0.2, segment)).toBe(0)
    expect(localSegmentProgress(0.35, segment)).toBeCloseTo(0.5, 5)
    expect(localSegmentProgress(0.5, segment)).toBe(1)
    expect(localSegmentProgress(0.1, segment)).toBe(0)
    expect(localSegmentProgress(0.9, segment)).toBe(1)
  })
})

describe('findActiveSegmentIndex', () => {
  const segments = buildSegments(3)

  it('finds which segment the current progress falls into', () => {
    expect(findActiveSegmentIndex(0.01, segments)).toBe(0)
    expect(findActiveSegmentIndex(segments[1].start + 0.01, segments)).toBe(1)
    expect(findActiveSegmentIndex(0.99, segments)).toBe(2)
  })

  it('clamps to the first/last segment for out-of-range progress', () => {
    expect(findActiveSegmentIndex(-0.1, segments)).toBe(0)
    expect(findActiveSegmentIndex(1.5, segments)).toBe(segments.length - 1)
  })
})

describe('frameLerp', () => {
  const RATE = 0.14
  const FRAME60 = 1000 / 60

  it('matches the plain per-frame lerp at exactly 60fps', () => {
    const plain = 0 + (1 - 0) * RATE
    expect(frameLerp(0, 1, RATE, FRAME60)).toBeCloseTo(plain, 6)
  })

  it('converges the same amount over the same wall-clock time regardless of frame rate', () => {
    // 跑 100ms：一次 60fps 的大步 vs 多次 144fps 的小步，结果应该基本一致
    let at60 = 0
    for (let t = 0; t < 100; t += FRAME60) at60 = frameLerp(at60, 1, RATE, FRAME60)

    const FRAME144 = 1000 / 144
    let at144 = 0
    for (let t = 0; t < 100; t += FRAME144) at144 = frameLerp(at144, 1, RATE, FRAME144)

    // 帧率差 2.4 倍，若不做校正两者会差很远；校正后应该很接近
    expect(Math.abs(at60 - at144)).toBeLessThan(0.05)
  })

  it('clamps absurd deltas so switching back from a background tab does not teleport', () => {
    const huge = frameLerp(0, 1, RATE, 5000)
    expect(huge).toBeLessThan(1)
    expect(huge).toBe(frameLerp(0, 1, RATE, 100))
  })

  it('never overshoots the target', () => {
    let v = 0
    for (let i = 0; i < 500; i += 1) v = frameLerp(v, 1, RATE, FRAME60)
    expect(v).toBeLessThanOrEqual(1)
    expect(v).toBeGreaterThan(0.99)
  })
})

describe('layoutLearningPath', () => {
  const tracks = [
    { name: '微积分', next: ['常微分方程', '实变函数', '复变函数'] },
    { name: '线性代数', next: ['抽象代数'] },
    { name: '概率论', next: ['数理统计'] },
  ]

  it('puts every column at its own fixed x — the map reads left to right', () => {
    const { root, tracks: laid } = layoutLearningPath(tracks, {
      rootX: -125,
      trackX: -15,
      leafX: 105,
    })
    expect(root.x).toBe(-125)
    laid.forEach((t) => {
      expect(t.x).toBe(-15)
      t.next.forEach((n) => expect(n.x).toBe(105))
    })
  })

  it('gives every advanced course its own row — no two leaves overlap', () => {
    const { tracks: laid } = layoutLearningPath(tracks, { rowGap: 34 })
    const ys = laid.flatMap((t) => t.next.map((n) => n.y))
    expect(new Set(ys).size).toBe(ys.length)
  })

  it('centers each base course vertically on its own advanced courses', () => {
    const { tracks: laid } = layoutLearningPath(tracks)
    laid.forEach((t) => {
      const mean = t.next.reduce((a, n) => a + n.y, 0) / t.next.length
      expect(t.y).toBeCloseTo(mean, 6)
    })
  })

  it('keeps the whole map vertically centered on the root', () => {
    const { root } = layoutLearningPath(tracks)
    expect(root.y).toBeCloseTo(0, 6)
  })

  it('still reserves a row for a base course that has no follow-up yet', () => {
    const { tracks: laid } = layoutLearningPath([
      { name: '微积分', next: ['实变函数'] },
      { name: '离散数学', next: [] },
    ])
    expect(laid[0].y).not.toBeCloseTo(laid[1].y, 6)
    expect(Number.isNaN(laid[1].y)).toBe(false)
  })
})

describe('flowPath', () => {
  it('emits a cubic bezier whose control points extend horizontally', () => {
    const d = flowPath(0, 0, 100, 50, 0.5)
    expect(d).toBe('M 0 0 C 50 0, 50 50, 100 50')
  })

  it('starts and ends exactly at the two endpoints', () => {
    const d = flowPath(-15, -34, 105, 68)
    expect(d.startsWith('M -15 -34')).toBe(true)
    expect(d.endsWith('105 68')).toBe(true)
  })

  it('degenerates to a straight horizontal line when both ends share a y', () => {
    const d = flowPath(0, 20, 80, 20, 0.5)
    // 所有控制点的 y 都等于 20，画出来就是直线
    expect(d).toBe('M 0 20 C 40 20, 40 20, 80 20')
  })
})
