import { describe, expect, it } from 'vitest'

import { parseTemplate, trimBlank } from './templateParser'

function allItems(page) {
  return page.subsections.flatMap((subsection) => subsection.items)
}

describe('parseTemplate', () => {
  it('parses every supported content directive', () => {
    const source = `@chapter 1 | 函数与极限
@section 1.1 | 数列极限
@subsection 1.1.1 | 核心概念
@text 学习目标
正文与 $x^2$。
@markdown 补充说明
Markdown 正文。
@def 1 | 定义
定义正文。
@theorem 2 | 定理
定理正文。
@solution 证明过程
证明正文。
@corollary 3 | 推论
推论正文。
@proposition 4 | 命题
命题正文。
@problem 训练 1 | 选择题 | 中等 | 极限,连续 | 期末、重点
题目正文。
@solution 完整解析
解析正文。
@image 示意图 | /image.png | 图注 | 替代文字 | small
@figure 旧图 | /old.png | 旧图注 | 旧替代文字 | medium
@table 数值表 | 表格说明
| x | y |
@code 示例 | js | 代码说明
console.log('ok')
@interactive-sine 正弦曲线 | 调整参数
@interactive sine | 正弦交互 | 说明
@interactive function | 二次函数 | 调整系数
expression: a*x*x
a: -2,2,0.1,1
@interactive geogebra | 几何演示 | 拖动点
src: https://example.com/geogebra
@interactive desmos | 函数演示 | 拖动参数
src: https://example.com/desmos
@interactive 自定义模块 | 自定义说明
component: custom
@video 视频 | /video.mp4 | 视频说明 | /poster.jpg | 30 | member`

    const page = parseTemplate(source, '备用标题')
    const items = allItems(page)

    expect(page.chapter).toEqual({ num: '1', title: '函数与极限' })
    expect(page.section).toMatchObject({ num: '1.1', title: '数列极限' })
    expect(page.subsections[0]).toMatchObject({ num: '1.1.1', title: '核心概念' })
    expect(items.map((item) => item.kind)).toEqual([
      'text',
      'text',
      'def',
      'theorem',
      'corollary',
      'proposition',
      'problem',
      'figure',
      'figure',
      'table',
      'code',
      'interactive-sine',
      'interactive-sine',
      'interactive-function',
      'interactive-embed',
      'interactive-embed',
      'interactive',
      'video',
    ])

    const theorem = items.find((item) => item.kind === 'theorem')
    expect(theorem).toMatchObject({ solutionLabel: '证明过程', solution: '证明正文。' })

    const problem = items.find((item) => item.kind === 'problem')
    expect(problem).toMatchObject({
      title: '训练 1',
      problemType: '选择题',
      difficulty: '中等',
      knowledge: ['极限', '连续'],
      tags: ['期末', '重点'],
      solutionLabel: '完整解析',
      solution: '解析正文。',
    })

    expect(items.find((item) => item.title === '示意图')).toMatchObject({
      src: '/image.png',
      caption: '图注',
      alt: '替代文字',
      width: 'small',
    })
    expect(items.find((item) => item.kind === 'interactive-function').config).toEqual({
      expression: 'a*x*x',
      a: '-2,2,0.1,1',
    })
    expect(items.find((item) => item.kind === 'video')).toMatchObject({
      previewSeconds: 30,
      access: 'member',
    })
  })

  it('keeps legacy problem, video and generic content formats compatible', () => {
    const page = parseTemplate(`@problem 旧题目
题干
@solution
答案
@video 旧视频 | /video.mp4 | 说明 | /poster.jpg | member`, '旧内容')
    const items = allItems(page)

    expect(items[0]).toMatchObject({
      kind: 'problem',
      title: '旧题目',
      problemType: '计算题',
      difficulty: '基础',
      solutionLabel: '解析',
      solution: '答案',
    })
    expect(items[1]).toMatchObject({ kind: 'video', previewSeconds: 0, access: 'member' })
  })

  it('handles empty, non-string and malformed input without throwing', () => {
    expect(parseTemplate(null).subsections[0].items[0].body).toBe('')
    expect(parseTemplate(123, '数字正文').subsections[0].items[0].body).toBe('123')

    const malformed = parseTemplate('@solution 没有前置内容\n@unknown value\n普通文本', '容错正文')
    expect(malformed.section.title).toBe('容错正文')
    expect(malformed.subsections[0].items[0].body).toContain('@unknown value')
  })
})

describe('trimBlank', () => {
  it('only removes blank lines at both ends', () => {
    expect(trimBlank('\n\n第一行\n第二行\n')).toBe('第一行\n第二行')
  })
})
