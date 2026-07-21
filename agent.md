# MathAPP 项目说明

## 项目概览

MathAPP 是一个 Django + Vue 项目。

- Django 负责后端、后台管理、用户系统、数据库和后续接口服务。
- Django 后台已安装并启用 `django-simpleui`。
- Vue 负责前台网站，用来替代 Django 默认前台页面。

## 启动方式

一键启动（推荐）：双击 `scripts\启动网站.bat`，会自动依次启动 Django 后端、Vue 前端，并打开浏览器。

手动启动 Django 后端：

```powershell
.\.venv\Scripts\Activate.ps1
python manage.py runserver 127.0.0.1:8000
```

手动启动 Vue 前端：

```powershell
.\scripts\start-frontend.ps1
```

常用访问地址：

- Vue 前台：http://127.0.0.1:5173/
- Django 根路径：http://127.0.0.1:8000/ 会跳转到 Vue 前台
- Django 后台：http://127.0.0.1:8000/admin/

## 重要文件

- `manage.py`：Django 命令入口。
- `mathapp/settings.py`：Django 项目配置，包括应用注册、语言、时区等。
- `mathapp/urls.py`：Django 根路由配置。
- `core/views.py`：当前包含前台跳转视图。
- `requirements.txt`：Python 依赖列表。
- `frontend/`：Vue + Vite 前端项目目录。
- `frontend/src/App.vue`：Vue 前台主页面。
- `frontend/src/style.css`：Vue 全局样式。
- `docs/`：项目文档（`TEMPLATE_GUIDE.md` 内容录入说明、`FRONTEND_TODO.md` 前端任务清单、`FRONTEND_TECH_PLAN.md` 前端技术方案）。
- `scripts/`：启动和运维脚本（`启动网站.bat` 一键启动、`start-frontend.ps1` 前端启动脚本、`注册/取消会员到期检查计划任务.bat` 定时任务）。

## 后端配置

当前已注册的主要 Django 应用：

- `core`：用户、会员、支付。
- `content`：课程内容（课程/章/小节），后台录入见 `docs/TEMPLATE_GUIDE.md`。
- `progress`：登录用户的学习进度、收藏、做题状态和错题本，接口在 `/api/progress/`，供前端多设备同步。
- `simpleui`
- Django 自带的 `admin`、`auth`、`sessions`、`staticfiles` 等应用

语言和时区：

- 默认语言：`zh-hans`
- 默认时区：`Asia/Shanghai`

后台超级管理员账号：

- `001gxl`
- `002zj`

后续不要在文档、代码或提交记录中明文保存密码。

## 前端配置

前端位于 `frontend/`，技术栈为 Vue 3 + Vite。

如果当前机器没有全局安装 `node` 和 `npm`，优先在项目根目录运行：

```powershell
.\scripts\start-frontend.ps1
```

如果已安装 Node 环境，也可以进入前端目录后运行：

```powershell
cd frontend
pnpm dev --host 127.0.0.1
```

前端生产构建命令：

```powershell
cd frontend
pnpm build
```

## 验证命令

修改后端后，建议运行：

```powershell
.\.venv\Scripts\Activate.ps1
python manage.py check
```

修改前端后，建议运行：

```powershell
cd frontend
pnpm build
```

## 开发约定

- `/admin/` 保留给 Django 后台管理。
- 面向普通用户的前台页面放在 Vue 中开发。
- 后端业务逻辑优先放入 Django 应用中，目前可以先从 `core` 开始。
- 如果后续功能变复杂，可以按业务边界拆分新的 Django 应用。
- Vue 需要后端数据时，优先通过 Django 接口提供。
- 后续如果需要更完整的前后端接口层，可以引入 Django REST Framework。
- 不要把 `.venv/`、`node_modules/`、`frontend/dist/` 等生成目录提交到版本控制。

## 前端设计质量约定

- 已安装 Codex skill：`design-taste-frontend`（来源：`Leonxlnx/taste-skill`）。
- 当任务涉及首页、会员页、营销转化页、作品展示页、视觉改版或前台体验打磨时，先按该 skill 做一次设计审读：页面类型、目标用户、视觉语气、保留/改动范围。
- MathAPP 是已有产品，默认按“保留式改版”处理：保留现有路由、导航含义、课程/习题/会员核心流程和 Django 后台入口，只逐步优化字体、间距、颜色、动效和关键区块结构。
- 该 skill 不用于后台管理、密集表格、多步骤表单或纯业务逻辑页面；这些场景优先追求清晰、稳定、可维护。
- 前台页面交付前额外检查：首屏不溢出、按钮文字不换行、对比度可读、移动端布局明确、视觉资产真实可见、不要套用泛紫渐变/三等分卡片/无意义动效。
