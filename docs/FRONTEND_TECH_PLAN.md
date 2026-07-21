# MathAPP 前端框架与功能实现方案

这份文档用尽量直白的方式解释：MathAPP 前端应该用什么框架、为什么这么选、各个功能怎么实现。

## 1. 一句话结论

MathAPP 当前最适合继续使用：

```text
Django 后端 + Vue 3 前端 + Vite 构建工具 + 自定义数学内容渲染器
```

不要现在改成 Next.js、VitePress 或纯静态 Markdown 网站。

原因很简单：

- 项目已经有 Django 后端，能做用户、会员、支付。
- 项目已经有 Vue 3 前端，知识库、习题库、会员页都已经有雏形。
- 项目已经有一套模板内容渲染方式，可以继续升级。
- 现在换框架会浪费已有工作，而且会引入大量新问题。

## 2. 先解释几个基础概念

如果你刚接触 Web 开发，可以这样理解：

### 2.1 后端是什么

后端就是“服务器里的管家”。

它负责：

- 用户注册登录。
- 判断是不是会员。
- 创建支付订单。
- 保存数据。
- 给前端提供接口。

本项目后端用的是 Django。

### 2.2 前端是什么

前端就是“用户看到的网页”。

它负责：

- 首页长什么样。
- 知识库怎么展示。
- 题目怎么展开解析。
- 视频怎么播放。
- 按钮点击后发生什么。

本项目前端用的是 Vue 3。

### 2.3 Vite 是什么

Vite 是前端开发工具。

你可以把它理解成：

- 开发时帮你启动网页。
- 修改代码后自动刷新。
- 上线前帮你把前端代码打包成浏览器能高效加载的文件。

### 2.4 Markdown 是什么

Markdown 是一种很简单的文本写作格式。

例如：

```text
# 大标题

这是正文。

- 第一条
- 第二条
```

它适合写讲义、知识点、题目解析。

### 2.5 LaTeX 是什么

LaTeX 是数学公式写法。

例如：

```text
$$
\lim_{x\to 0}\frac{\sin x}{x}=1
$$
```

数学网站必须支持它。

### 2.6 内容渲染器是什么

内容渲染器就是“把你写的课程文本变成漂亮网页”的工具。

比如你写：

```text
@problem 例题 1
求极限：
$$
\lim_{x\to1}\frac{x^2-1}{x-1}
$$

@solution 解析
因式分解后答案为 2。
```

前端渲染器会把它变成：

- 一个题目卡片。
- 一个公式区域。
- 一个可以展开的解析区域。

## 3. 推荐前端技术栈

### 3.1 主框架：Vue 3

继续使用 Vue 3。

它负责：

- 页面组件。
- 用户交互。
- 知识库页面。
- 习题库页面。
- 会员页。
- 登录注册页。

为什么适合当前项目：

- 项目已经在用 Vue 3。
- Vue 对中文项目和个人维护比较友好。
- 学习曲线比 React + Next.js 更平缓。
- 当前功能不需要为了框架而重写。

### 3.2 构建工具：Vite

继续使用 Vite。

它负责：

- 本地开发启动。
- 前端代码打包。
- 自动刷新页面。

为什么适合当前项目：

- 项目已经配置好。
- 启动快。
- 和 Vue 3 配合很好。

### 3.3 路由：Vue Router

继续使用 Vue Router。

它负责页面地址：

```text
/                  首页
/knowledge         知识库
/exercises         习题库
/membership        会员页
/profile           我的页面
/login             登录
/register          注册
```

简单说，用户访问不同网址时，Vue Router 决定显示哪个页面。

### 3.4 Markdown 渲染：继续使用 md-editor-v3，必要时接 KaTeX

当前项目已经使用 `md-editor-v3` 预览 Markdown 内容。

它负责：

- 普通文字。
- 标题。
- 列表。
- 表格。
- 代码块。
- 部分 Markdown 预览样式。

数学公式建议最终统一走 KaTeX。

KaTeX 的作用：

- 专门把 LaTeX 数学公式变成网页公式。
- 渲染速度快。
- 适合数学学习网站。

### 3.5 UI 组件库：暂时不全量引入

不建议现在全量引入 Element Plus、Vant、Tailwind、shadcn。

原因：

- 当前是学习网站，最重要的是阅读体验。
- 大型组件库容易让页面变得像后台管理系统。
- 现在已有 CSS 基础，可以先继续优化。

什么时候再引入 Element Plus？

- 做后台课程管理时。
- 做复杂表单、表格、弹窗时。
- 做管理员内容编辑系统时。

前台用户页面建议继续用自定义组件。

## 4. 推荐项目结构

当前前端主要在：

```text
frontend/src/
  App.vue
  router.js
  style.css
  api.js
  auth.js
  views/
  components/
  data/catalog.js
```

建议逐步升级成：

```text
frontend/src/
  App.vue
  router.js
  style.css
  api.js
  auth.js

  views/
    HomePage.vue
    KnowledgePage.vue
    ExercisesPage.vue
    MembershipPage.vue
    ProfilePage.vue
    LoginPage.vue
    RegisterPage.vue

  components/
    layout/
      SubjectSidebar.vue
      LockedContent.vue
    lesson/
      TemplateLesson.vue
      LessonBlock.vue
      ProblemBlock.vue
      FigureBlock.vue
      VideoBlock.vue
      TheoremBlock.vue
      InteractiveBlock.vue
    interactive/
      InteractiveSine.vue
      FunctionExplorer.vue

  content/
    courses.js
    calculus/
      limits-sequence.math.md
      limits-function.math.md
      exercises-limit-basic.math.md

  utils/
    templateParser.js
    contentLoader.js
```

## 5. 核心功能怎么实现

下面按功能解释。

## 5.1 首页

首页的作用不是讲完整课程，而是告诉用户：

- 这是一个数学学习平台。
- 有哪些课程。
- 可以学知识点。
- 可以刷题。
- 会员能解锁什么。

实现方式：

- Vue 页面：`HomePage.vue`
- 数据来源：课程目录 `courses.js`
- 样式：继续用 `style.css`

首页应该展示：

- 平台名称。
- 课程方向：微积分、线性代数、概率统计等。
- 知识库入口。
- 习题库入口。
- 会员权益入口。

## 5.2 知识库

知识库的作用是展示课程讲义。

页面结构建议：

```text
左侧：课程章节目录
中间：正文、公式、例题、图片、视频、交互演示
右侧：当前页面目录
```

实现方式：

- 页面：`KnowledgePage.vue`
- 左侧目录：`SubjectSidebar.vue`
- 内容渲染：`TemplateLesson.vue`
- 内容文件：`.math.md`

内容写法示例：

```text
@chapter 1 | 函数与极限
@section 1.1 | 数列极限
@subsection 1.1.1 | 核心概念

@text 学习目标
数列极限描述的是：当项数不断增大时，数列项是否靠近某个确定的数。

@def 1 | 数列极限
如果对任意 $\varepsilon>0$，总存在正整数 $N$，使得当 $n>N$ 时：
$$
|a_n-A|<\varepsilon
$$
则称数列收敛于 $A$。

@problem 例题 1
求：
$$
\lim_{n\to\infty}\frac{2n+1}{n+3}
$$

@solution 解析
分子分母同时除以 $n$，结果为 2。
```

## 5.3 习题库

习题库的作用是让用户刷题。

第一版可以先做到：

- 显示题目。
- 展开解析。
- 区分免费题和会员题。

第二版再做：

- 做题状态。
- 错题本。
- 收藏题目。
- 按知识点筛选。

实现方式：

- 页面：`ExercisesPage.vue`
- 题目内容：`.math.md`
- 题目块：`ProblemBlock.vue`
- 状态保存：先用浏览器本地存储，后期接后端。

题目写法可以继续用：

```text
@problem 训练 1
求极限：
$$
\lim_{x\to1}\frac{x^2-1}{x-1}
$$

@solution 解析
因为 $x^2-1=(x-1)(x+1)$，所以极限为 2。
```

## 5.4 会员权限

会员权限就是判断：

- 用户是否登录。
- 用户是不是会员。
- 当前内容是不是会员专享。

当前项目已经有：

```js
access: 'member'
```

也有：

```js
authState.user?.is_member
```

推荐继续沿用。

流程可以理解为：

```text
用户打开内容
  ↓
判断这个内容是否 member
  ↓
如果不是会员内容：直接显示
  ↓
如果是会员内容：判断用户是否是会员
  ↓
是会员：显示完整内容
  ↓
不是会员：显示锁定提示和开通会员按钮
```

## 5.5 图片展示

图片用于展示图像、几何图、函数图、证明辅助图。

内容写法：

```text
@image 数列趋近示意图 | /images/limit.png | 图 1：数列项逐步靠近 A。 | 数列趋近示意图 | wide
```

字段含义：

```text
标题 | 图片地址 | 图注 | 替代文字 | 宽度
```

实现组件：

```text
FigureBlock.vue
```

第一版：

- 显示图片。
- 显示图注。
- 支持 small、medium、wide。

第二版：

- 点击放大。
- 图片懒加载。
- 图片加载失败时显示提示。

## 5.6 视频展示

视频用于课程讲解。

内容写法：

```text
@video 数列极限视频讲解 | /videos/limit.mp4 | 本节讲解数列极限。 | /images/limit-cover.jpg
```

也可以是 B 站 iframe：

```text
@video 数列极限视频讲解 | https://player.bilibili.com/player.html?bvid=xxx | 本节讲解数列极限。
```

实现组件：

```text
VideoBlock.vue
```

第一版：

- mp4 用 `<video controls>`。
- iframe 用 `<iframe>`。
- 没有地址时显示占位窗口。

第二版：

- 支持封面图。
- 支持试看。
- 支持播放进度记录。

## 5.7 交互滑块

交互滑块是数学网站的亮点。

它能让用户拖动参数，看到函数图像变化。

第一版先做正弦函数：

```text
@interactive sine | 正弦曲线交互 | 拖动滑块观察振幅和频率变化。
```

第二版做通用函数图像：

```text
@interactive function | 二次函数参数变化
expression: a*x*x + b*x + c
a: -5,5,0.1,1
b: -5,5,0.1,0
c: -5,5,0.1,0
```

实现组件：

```text
InteractiveSine.vue
FunctionExplorer.vue
```

后期可选：

- Desmos：适合专业函数图像。
- GeoGebra：适合几何作图。
- Canvas/SVG：适合自己控制简单图形。

建议顺序：

1. 先用 SVG 自己画简单函数。
2. 再接 Desmos。
3. 几何题多起来后再接 GeoGebra。

## 5.8 搜索

搜索用于快速找到知识点和题目。

第一版：

- 前端本地搜索。
- 搜索课程标题、章节标题、正文关键词。

第二版：

- 后端搜索。
- 支持标签、难度、知识点。

推荐第一版先用简单数组搜索，不急着上复杂搜索引擎。

## 5.9 学习进度

学习进度用于记录用户学到哪里。

第一版：

- 浏览器本地保存。
- 记录已读章节、收藏、最近学习。

第二版：

- 登录后保存到 Django 后端。
- 支持换电脑继续学习。

## 5.10 错题本

错题本用于保存做错的题。

第一版：

- 用户点击“加入错题本”。
- 用浏览器本地存储保存题目 ID。

第二版：

- 保存到后端数据库。
- 支持按课程、知识点、时间筛选。

## 6. 内容系统设计

内容系统是整个项目最重要的部分。

推荐分成两层：

### 6.1 目录数据

目录数据负责告诉网页：

- 有哪些课程。
- 每门课有哪些章节。
- 每个章节对应哪个内容文件。
- 哪些内容是会员专享。

示例：

```js
export const courseCatalog = [
  {
    id: 'calculus',
    title: '微积分',
    subtitle: '极限、导数、积分与级数',
    chapters: [
      {
        title: '第一章 极限与连续',
        sections: [
          {
            id: 'limits-sequence',
            title: '数列极限',
            source: 'calculus/limits-sequence.math.md',
          },
          {
            id: 'limits-function',
            title: '函数极限',
            source: 'calculus/limits-function.math.md',
            access: 'member',
          },
        ],
      },
    ],
  },
]
```

### 6.2 正文内容

正文内容只负责写讲义。

示例文件：

```text
frontend/src/content/calculus/limits-sequence.math.md
```

里面写：

```text
@chapter 1 | 函数与极限
@section 1.1 | 数列极限

@text 学习目标
这里写正文。

@problem 例题 1
这里写题目。

@solution 解析
这里写解析。
```

这样做的好处：

- 修改课程时不用改 Vue 组件。
- 课程内容更容易查找。
- 后期可以把 `.math.md` 文件迁移到后台或数据库。

## 7. 为什么不选其他方案

### 7.1 为什么不现在用 Next.js

Next.js 很强，但当前不适合马上迁移。

原因：

- 当前项目已经用 Vue 做了很多页面。
- 后端已经是 Django。
- 迁移到 Next.js 意味着前端几乎重写。
- 对 Web 新手来说学习成本更高。

可以以后再考虑，但不是现在最优先。

### 7.2 为什么不直接用 VitePress

VitePress 很适合文档站，但 MathAPP 不是纯文档站。

MathAPP 需要：

- 登录。
- 会员权限。
- 支付。
- 题库。
- 错题本。
- 学习进度。
- 交互演示。

这些功能用普通 Vue 应用更灵活。

### 7.3 为什么不一开始用数据库管理全部课程

数据库管理内容很正式，但早期会变复杂。

早期更推荐：

- 用 `.math.md` 文件维护内容。
- 结构清楚。
- 容易备份。
- 容易用 Git 管理修改记录。

等内容量变大，再做后台编辑和数据库。

### 7.4 为什么不马上用大型 UI 库

大型 UI 库适合后台，不一定适合学习阅读页面。

当前前台更需要：

- 清楚。
- 安静。
- 公式好读。
- 题目层次明显。
- 手机和电脑都舒服。

所以先用自定义组件更合适。

## 8. 最小可行版本

如果要尽快做出一个能正式展示的版本，建议 MVP 包含：

- 首页。
- 课程选择。
- 知识库阅读。
- 习题库阅读。
- Markdown + LaTeX。
- 图片模块。
- 视频模块。
- 正弦函数交互模块。
- 会员锁定。
- 登录注册。
- 会员购买入口。

暂时不做：

- 复杂判题。
- AI 答疑。
- 个性化推荐。
- 完整后台编辑器。
- 视频加密。

## 9. 最终推荐路线

最终路线可以概括为：

```text
第一步：稳住现有 Vue 前端
第二步：把内容从 catalog.js 拆成 .math.md 文件
第三步：把 TemplateLesson.vue 拆成 parser + 多个内容组件
第四步：完善公式、图片、视频、交互模块
第五步：升级习题库为可刷题系统
第六步：做搜索、错题本、学习进度
第七步：最后再做后台内容管理
```

这条路线最适合当前项目，因为它不会浪费已有成果，也不会让 Web 开发新手一下子掉进过度复杂的工程里。
