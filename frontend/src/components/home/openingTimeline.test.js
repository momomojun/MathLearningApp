import { describe, expect, it } from 'vitest'
import {
  ACTS,
  BELL_BASE,
  END,
  SKIP_HINT_FROM,
  SKIP_TAIL,
  SKIP_TO,
  T,
  applyMatrix,
  bellAt,
  curveAt,
  curveSlopeAt,
  ease,
  matrixAt,
  sampleStage,
  segment,
  windowAt,
} from './openingTimeline'

describe('时间轴结构', () => {
  const order = [
    'lineIn',
    'toCurve',
    'holdCurve',
    'toMatrix',
    'holdMatrix',
    'toBell',
    'holdBell',
    'toBrand',
    'holdBrand',
    'fadeOut',
  ]

  it('各段首尾相接，从 0 开始，没有空隙也没有重叠', () => {
    expect(T.lineIn[0]).toBe(0)
    order.forEach((key, i) => {
      expect(T[key][1]).toBeGreaterThan(T[key][0])
      if (i > 0) expect(T[key][0]).toBe(T[order[i - 1]][1])
    })
    expect(END).toBe(T[order[order.length - 1]][1])
  })

  it('三幕形变的时长一致，节奏才匀', () => {
    const spans = ['toCurve', 'toMatrix', 'toBell'].map((k) => T[k][1] - T[k][0])
    expect(new Set(spans).size).toBe(1)
  })

  it('派生时刻都落在时间轴内，且跳过提示在收束之前', () => {
    const marks = [SKIP_HINT_FROM, SKIP_TO, ...ACTS.flatMap((a) => a.label)]
    marks.forEach((m) => {
      expect(m).toBeGreaterThanOrEqual(0)
      expect(m).toBeLessThanOrEqual(END)
    })
    expect(SKIP_HINT_FROM).toBeLessThan(SKIP_TO)
  })

  it('跳过的尾巴固定在 800ms，且品牌那时已经完整浮现', () => {
    expect(END - SKIP_TO).toBeLessThanOrEqual(SKIP_TAIL)
    // 跳到的那一刻品牌已经落定，不会看到半截字
    expect(SKIP_TO).toBeGreaterThanOrEqual(T.toBrand[1])
    // 线也已经拉平收短
    sampleStage(SKIP_TO, 16).pts.forEach(([, y]) => expect(Math.abs(y)).toBeLessThan(1e-9))
  })

  it('每条幕标都罩在它对应那一幕上，不会串幕', () => {
    const acts = [
      [T.toCurve[0], T.holdCurve[1]],
      [T.toMatrix[0], T.holdMatrix[1]],
      [T.toBell[0], T.holdBell[1]],
    ]
    ACTS.forEach((a, i) => {
      const [start, end] = acts[i]
      // 幕标在这一幕开始之后才进场
      expect(a.label[0]).toBeGreaterThanOrEqual(start)
      // 全亮的那一段落在这一幕之内
      expect(a.label[1]).toBeLessThanOrEqual(end)
    })
  })
})

describe('segment', () => {
  it('在区间内线性推进，区间外夹到 0 / 1', () => {
    expect(segment(-50, [0, 100])).toBe(0)
    expect(segment(0, [0, 100])).toBe(0)
    expect(segment(50, [0, 100])).toBeCloseTo(0.5)
    expect(segment(100, [0, 100])).toBe(1)
    expect(segment(9999, [0, 100])).toBe(1)
  })

  it('零长度区间不会除以零', () => {
    expect(segment(5, [10, 10])).toBe(0)
    expect(segment(10, [10, 10])).toBe(1)
    expect(Number.isNaN(segment(5, [10, 10]))).toBe(false)
  })
})

describe('ease', () => {
  it('两端固定、中点对半，并且单调', () => {
    expect(ease(0)).toBe(0)
    expect(ease(1)).toBe(1)
    expect(ease(0.5)).toBeCloseTo(0.5)
    let prev = -1
    for (let i = 0; i <= 20; i += 1) {
      const v = ease(i / 20)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
  })

  it('越界输入先夹紧，不会跑出 0..1', () => {
    expect(ease(-3)).toBe(0)
    expect(ease(4)).toBe(1)
  })
})

describe('windowAt', () => {
  const w = [100, 200, 300, 400]

  it('淡入、保持、淡出各段取值正确', () => {
    expect(windowAt(50, w)).toBe(0)
    expect(windowAt(150, w)).toBeCloseTo(0.5)
    expect(windowAt(200, w)).toBe(1)
    expect(windowAt(260, w)).toBe(1)
    expect(windowAt(350, w)).toBeCloseTo(0.5)
    expect(windowAt(400, w)).toBe(0)
    expect(windowAt(900, w)).toBe(0)
  })
})

describe('曲线与导数', () => {
  it('三次曲线过原点，并且是奇函数', () => {
    expect(curveAt(0)).toBe(0)
    expect(curveAt(0.4)).toBeCloseTo(-curveAt(-0.4))
  })

  it('斜率就是曲线的导数（跟数值差分一致）', () => {
    const h = 1e-5
    for (const x of [-0.8, -0.3, 0, 0.45, 0.9]) {
      const numeric = (curveAt(x + h) - curveAt(x - h)) / (2 * h)
      expect(curveSlopeAt(x)).toBeCloseTo(numeric, 4)
    }
  })

  it('两个拐点处斜率为零', () => {
    const turning = Math.sqrt(0.7 / 3)
    expect(curveSlopeAt(turning)).toBeCloseTo(0)
    expect(curveSlopeAt(-turning)).toBeCloseTo(0)
  })
})

describe('正态曲线', () => {
  it('峰在 x=0，两侧对称且单调下降到基线以上', () => {
    expect(bellAt(0)).toBeCloseTo(BELL_BASE + 0.5)
    expect(bellAt(0.6)).toBeCloseTo(bellAt(-0.6))
    expect(bellAt(0.3)).toBeGreaterThan(bellAt(0.6))
    expect(bellAt(0.6)).toBeGreaterThan(bellAt(1))
  })
})

describe('matrixAt', () => {
  it('0 是单位矩阵，1 是目标矩阵', () => {
    expect(matrixAt(0)).toEqual([1, 0, 0, 1])
    const m = matrixAt(1)
    expect(m[1]).toBeCloseTo(0.58)
    expect(m[2]).toBeCloseTo(-0.3)
  })

  it('单位矩阵不动点；目标矩阵接近保面积', () => {
    expect(applyMatrix(matrixAt(0), 0.3, -0.7)).toEqual([0.3, -0.7])
    const m = matrixAt(1)
    const det = m[0] * m[3] - m[1] * m[2]
    expect(det).toBeGreaterThan(0.9)
    expect(det).toBeLessThan(1.2)
  })
})

describe('sampleStage', () => {
  it('起点是一条平直的线，且几乎还看不见', () => {
    const s = sampleStage(0, 64)
    expect(s.lineAlpha).toBe(0)
    expect(s.drawn).toBe(0)
    s.pts.forEach(([, y]) => expect(Math.abs(y)).toBeLessThan(1e-9))
  })

  it('线画完之后整条都在、不透明', () => {
    const s = sampleStage(T.lineIn[1], 64)
    expect(s.drawn).toBe(1)
    expect(s.lineAlpha).toBe(1)
  })

  it('曲线段结束时形状就是那条三次曲线', () => {
    const s = sampleStage(T.holdCurve[0], 64)
    const mid = s.pts[20]
    const x = -1 + (2 * 20) / 63
    expect(mid[1]).toBeCloseTo(curveAt(x), 5)
    // 此时还没有线性变换，x 应当没被动过
    expect(mid[0]).toBeCloseTo(x, 5)
  })

  it('切线斜率跟切点处的曲线导数对得上', () => {
    const s = sampleStage(900, 64)
    expect(s.tangent.alpha).toBeGreaterThan(0)
    expect(s.tangent.slope).toBeCloseTo(curveSlopeAt(s.tangent.x) * ease(segment(900, T.toCurve)), 5)
  })

  it('线性变换段：格子和线用的是同一个矩阵', () => {
    const s = sampleStage(T.holdMatrix[0], 64)
    expect(s.lattice).toBeGreaterThan(0.9)
    expect(s.basis).toBeGreaterThan(0.9)
    const i = 30
    const x = -1 + (2 * i) / 63
    const expected = s.apply(x, curveAt(x))
    expect(s.pts[i][0]).toBeCloseTo(expected[0], 5)
    expect(s.pts[i][1]).toBeCloseTo(expected[1], 5)
  })

  it('正态段结束时矩阵已解除、格子已退场、形状是正态曲线', () => {
    const s = sampleStage(T.holdBell[0], 64)
    expect(s.lattice).toBe(0)
    expect(s.basis).toBe(0)
    expect(s.apply(0.4, 0.2)).toEqual([0.4, 0.2])
    const i = 12
    const x = -1 + (2 * i) / 63
    expect(s.pts[i][1]).toBeCloseTo(bellAt(x), 5)
  })

  it('收束时线拉平并横向收短', () => {
    const s = sampleStage(T.toBrand[1], 64)
    s.pts.forEach(([, y]) => expect(Math.abs(y)).toBeLessThan(1e-9))
    const span = s.pts[s.pts.length - 1][0] - s.pts[0][0]
    expect(span).toBeGreaterThan(0.3)
    expect(span).toBeLessThan(0.8)
  })

  it('直方图长满后随收束退场，不会压在品牌底下', () => {
    expect(sampleStage(T.holdBell[1], 16).bars).toBe(1)
    expect(sampleStage(T.toBrand[1], 16).bars).toBe(0)
    expect(sampleStage(END, 16).bars).toBe(0)
  })

  it('全程不会产出 NaN', () => {
    for (let now = 0; now <= END; now += 40) {
      const s = sampleStage(now, 48)
      s.pts.forEach(([x, y]) => {
        expect(Number.isFinite(x)).toBe(true)
        expect(Number.isFinite(y)).toBe(true)
      })
      expect(Number.isFinite(s.tangent.slope)).toBe(true)
      for (const v of [s.drawn, s.lineAlpha, s.lattice, s.basis, s.bars]) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(1)
      }
    }
  })
})

describe('幕标', () => {
  it('三条幕标依次出现，不会两条同时全亮', () => {
    for (let now = 0; now <= END; now += 20) {
      const full = ACTS.filter((a) => windowAt(now, a.label) > 0.85)
      expect(full.length).toBeLessThanOrEqual(1)
    }
  })

  it('每条幕标都真的亮起过，且都在收束之前收掉', () => {
    ACTS.forEach((a) => {
      const peak = Math.max(
        ...Array.from({ length: 200 }, (_, i) => windowAt((i / 199) * END, a.label)),
      )
      expect(peak).toBeGreaterThan(0.98)
      expect(a.label[3]).toBeLessThanOrEqual(T.toBrand[1])
    })
  })
})
