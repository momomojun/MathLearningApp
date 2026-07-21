import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const user = {
  username: 'e2e-user',
  nickname: '测试用户',
  email: 'e2e@example.com',
  is_member: false,
  membership_days_remaining: 0,
}

const courses = [
  {
    id: 1,
    slug: 'test-course',
    title: '测试课程',
    subtitle: '关键流程测试',
    audience: '测试用户',
    description: '用于浏览器自动化测试',
    exercise_count_label: '2 题',
  },
]

const courseDetail = {
  ...courses[0],
  chapters: [
    {
      id: 1,
      kind: 'knowledge',
      title: '第一章',
      order: 1,
      sections: [
        { id: 1, slug: 'test-first', title: '第一节', access: 'free', order: 1 },
        { id: 2, slug: 'test-second', title: '第二节', access: 'free', order: 2 },
      ],
    },
  ],
  exercises: [],
}

const sectionSources = {
  'test-first': '@chapter 1 | 第一章\n@section 1.1 | 第一节\n@subsection 1.1.1 | 基础\n@text 正文\n第一节内容\n$$\\frac{x^{12}+x^{11}+x^{10}+x^9+x^8+x^7+x^6+x^5+x^4+x^3+x^2+x+1}{x^6+x^5+x^4+x^3+x^2+x+1}$$',
  'test-second': '@chapter 1 | 第一章\n@section 1.2 | 第二节\n@subsection 1.2.1 | 进阶\n@text 正文\n第二节内容',
}

test('登录后打开课程、切换小节并标记学习状态', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url())
    const path = url.pathname

    if (path.endsWith('/auth/login/')) {
      await route.fulfill({ json: { token: 'e2e-token', user } })
      return
    }
    if (path.endsWith('/auth/me/')) {
      await route.fulfill({ json: user })
      return
    }
    if (path.endsWith('/content/courses/')) {
      await route.fulfill({ json: courses })
      return
    }
    if (path.endsWith('/content/courses/test-course/')) {
      await route.fulfill({ json: courseDetail })
      return
    }

    const sectionMatch = path.match(/\/content\/sections\/([^/]+)\/$/)
    if (sectionMatch && sectionSources[sectionMatch[1]]) {
      await route.fulfill({
        json: {
          slug: sectionMatch[1],
          title: sectionMatch[1] === 'test-first' ? '第一节' : '第二节',
          content: sectionSources[sectionMatch[1]],
        },
      })
      return
    }

    await route.fulfill({ status: 404, json: { detail: '测试接口未配置' } })
  })

  await page.goto('/login')
  await page.getByLabel('账号').fill('e2e-user')
  await page.getByLabel('密码').fill('test-password')
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page).toHaveURL('/profile')
  await expect(page.getByRole('heading', { name: '你好，测试用户' })).toBeVisible()

  await page.getByRole('link', { name: '知识库', exact: true }).click()
  await page.getByRole('button', { name: '进入课程' }).click()
  await expect(page).toHaveURL('/knowledge?course=test-course&section=test-first')
  await expect(page.getByRole('heading', { name: 'Section 1.1 第一节' })).toBeVisible()

  await page.getByRole('button', { name: '第二节 第二个知识点', exact: true }).click()
  await expect(page).toHaveURL('/knowledge?course=test-course&section=test-second')
  await expect(page.getByRole('heading', { name: 'Section 1.2 第二节' })).toBeVisible()
  await expect(page.getByRole('button', { name: '全部展开', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '全部折叠', exact: true })).toBeVisible()

  const progress = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('mathapp_learning_progress_v1')),
  )
  expect(progress.read['test-second']).toBe(true)
  expect(progress.favorites['test-second']).toBeUndefined()

  const accessibility = await new AxeBuilder({ page }).analyze()
  expect(accessibility.violations).toEqual([])
})

test('学习页在四档视口下无页面级横向溢出', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/content/courses/')) {
      await route.fulfill({ json: courses })
      return
    }
    if (path.endsWith('/content/courses/test-course/')) {
      await route.fulfill({ json: courseDetail })
      return
    }
    if (path.endsWith('/content/sections/test-first/')) {
      await route.fulfill({
        json: { slug: 'test-first', title: '第一节', content: sectionSources['test-first'] },
      })
      return
    }
    await route.fulfill({ status: 404, json: { detail: '测试接口未配置' } })
  })

  for (const width of [360, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/knowledge?course=test-course&section=test-first')
    await expect(page.getByRole('heading', { name: 'Section 1.1 第一节' })).toBeVisible()

    const layout = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      topbarDirection: getComputedStyle(document.querySelector('.topbar')).flexDirection,
    }))
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth)
    expect(layout.topbarDirection).toBe(width <= 900 ? 'column' : 'row')
  }
})

test('键盘导航具有可见焦点', async ({ page }) => {
  await page.goto('/login')
  await page.keyboard.press('Tab')
  const focus = await page.evaluate(() => {
    const active = document.activeElement
    const style = getComputedStyle(active)
    return {
      tagName: active?.tagName,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
    }
  })

  expect(focus.tagName).not.toBe('BODY')
  expect(
    focus.outlineStyle !== 'none' || focus.outlineWidth !== '0px' || focus.boxShadow !== 'none',
  ).toBe(true)
})
