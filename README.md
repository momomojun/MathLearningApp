# MathAPP

大学数学的讲义、习题与解析放在同一处。微积分、线性代数、概率统计，为期末、考研与竞赛准备。

Django + DRF 负责后端、后台管理、用户系统与支付；Vue 3 + Vite 负责前台。

## 技术栈

| 层 | 选型 |
| --- | --- |
| 后端 | Django 5、Django REST Framework、django-simpleui（后台皮肤） |
| 前端 | Vue 3、Vue Router、Vite、md-editor-v3 |
| 数据库 | 默认 SQLite，可通过环境变量切到 PostgreSQL |
| 测试 | Vitest（单元）、Playwright（端到端）、Django TestCase |

## 快速开始

一键启动（Windows，会依次拉起后端、前端并打开浏览器）：

```
scripts\启动网站.bat
```

手动启动后端：

```powershell
.\.venv\Scripts\Activate.ps1
python manage.py runserver 127.0.0.1:8000
```

手动启动前端：

```powershell
pnpm --dir frontend dev --host 127.0.0.1
```

常用地址：

- 前台 <http://127.0.0.1:5173/>
- 后台 <http://127.0.0.1:8000/admin/>
- 后端根路径会跳转到前台

首次在新机器上跑，需要先准备本地文件，见下面「[本地文件](#本地文件)」。

## Django 应用

- `core` — 用户、会员、支付（`PaymentOrder`、渠道抽象，默认走 mock 渠道）
- `content` — 课程 / 章 / 小节，正文用模板指令书写，后台录入
- `progress` — 登录用户的学习进度、收藏、做题状态与错题本，供多设备同步

接口挂在 `/api/`、`/api/content/`、`/api/progress/`。课程列表与免费小节对未登录开放；会员小节在服务端二次校验权限，不依赖前端隐藏。

## 验证

改完后端：

```powershell
.\.venv\Scripts\Activate.ps1
python manage.py check
python manage.py test
```

改完前端：

```powershell
pnpm --dir frontend test
pnpm --dir frontend build
```

端到端测试需要先装浏览器二进制：

```powershell
pnpm --dir frontend exec playwright install
pnpm --dir frontend test:e2e
```

## 本地文件

下面这些**只存在于本地**，`.gitignore` 已经拦住它们。换机器或重装时要自己准备。

### `backup.json` — 别提交

Django 的数据库导出，里面是**真实用户记录，含密码哈希和邮箱**。属于数据，不属于代码，任何情况下都不要进版本库。

- 重新导出：`python manage.py dumpdata auth.user content progress --indent 2 > backup.json`
- 导入回数据库：`python manage.py loaddata backup.json`

### 其他

| 文件 / 目录 | 怎么准备 |
| --- | --- |
| `.env` | 复制 `.env.example` 再按需填写；不填也能跑，代码里有安全的默认值 |
| `db.sqlite3` | `python manage.py migrate`，需要初始内容时再 `loaddata` |
| `.venv/` | `python -m venv .venv` 后 `pip install -r requirements.txt`（仓库里不含虚拟环境，跨平台请自行创建） |
| `frontend/node_modules/` | `pnpm --dir frontend install` |
| `staticfiles/`、`media/` | `python manage.py collectstatic`；媒体文件按部署环境接对象存储 |

生产环境注意：`PAYMENT_PROVIDER` 不能留成 `mock`，`DJANGO_DEBUG` 要关，`DJANGO_SECRET_KEY` 必须显式设置。

## 文档

- `agent.md` — 项目约定与开发规范
- `docs/TEMPLATE_GUIDE.md` — 讲义正文的模板指令写法
- `docs/FRONTEND_TODO.md` — 前端任务清单与优先级
- `docs/FRONTEND_TECH_PLAN.md` — 前端技术方案
- `docs/FRONTEND_REGRESSION.md` — 回归测试记录
- `docs/STARTUP_GUIDE.md` — 启动与排错
- `docs/IMAGE-CREDITS.md` — 图片来源与授权
