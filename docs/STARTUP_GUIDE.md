# MathAPP 启动网站教程

这份教程用于手动启动 MathAPP 的后端和前端。建议你每次启动时打开两个 PowerShell 窗口：一个跑 Django 后端，一个跑 Vue 前端。

项目目录：

```powershell
C:\Users\15294\Documents\MathAPP
```

## 1. 启动后端

打开第一个 PowerShell 窗口，进入项目根目录：

```powershell
cd C:\Users\15294\Documents\MathAPP
```

激活 Python 虚拟环境：

```powershell
.\.venv\Scripts\Activate.ps1
```

如果 PowerShell 提示不允许运行脚本，先在当前窗口执行：

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

然后重新激活虚拟环境：

```powershell
.\.venv\Scripts\Activate.ps1
```

确认后端依赖已安装：

```powershell
pip install -r requirements.txt
```

执行数据库迁移：

```powershell
python manage.py migrate
```

如果是第一次初始化演示课程内容，可以执行：

```powershell
python manage.py seed_demo_content
```

启动 Django 后端：

```powershell
python manage.py runserver 127.0.0.1:8000
```

看到类似下面的信息，说明后端启动成功：

```text
Starting development server at http://127.0.0.1:8000/
```

这个窗口不要关闭，保持它运行。

## 2. 启动前端

打开第二个 PowerShell 窗口，进入前端目录：

```powershell
cd C:\Users\15294\Documents\MathAPP\frontend
```

第一次启动前，安装前端依赖：

```powershell
pnpm install
```

如果提示找不到 `pnpm`，先确认电脑已经安装 Node.js。安装 Node.js 后，可以尝试：

```powershell
corepack enable
corepack prepare pnpm@latest --activate
```

然后再次执行：

```powershell
pnpm install
```

启动 Vue 前端：

```powershell
pnpm dev --host 127.0.0.1
```

看到类似下面的信息，说明前端启动成功：

```text
Local: http://127.0.0.1:5173/
```

这个窗口也不要关闭，保持它运行。

## 3. 打开网站

前后端都启动后，在浏览器访问：

```text
http://127.0.0.1:5173/
```

常用地址：

- 前台网站：`http://127.0.0.1:5173/`
- 后端接口根地址：`http://127.0.0.1:8000/`
- Django 后台：`http://127.0.0.1:8000/admin/`

## 4. 日常启动最短步骤

后端窗口：

```powershell
cd C:\Users\15294\Documents\MathAPP
.\.venv\Scripts\Activate.ps1
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

前端窗口：

```powershell
cd C:\Users\15294\Documents\MathAPP\frontend
pnpm dev --host 127.0.0.1
```

然后打开：

```text
http://127.0.0.1:5173/
```

## 5. 停止网站

分别回到后端和前端两个 PowerShell 窗口，按：

```text
Ctrl + C
```

如果系统询问是否终止批处理任务，输入：

```text
Y
```

然后按回车。

## 6. 常见问题

### 6.1 后端端口被占用

如果 `8000` 端口被占用，可以换一个端口启动：

```powershell
python manage.py runserver 127.0.0.1:8001
```

注意：前端默认会请求 `127.0.0.1:8000`。如果长期换端口，需要同步修改前端接口配置。

### 6.2 前端端口被占用

如果 `5173` 端口被占用，可以换一个端口启动：

```powershell
pnpm dev --host 127.0.0.1 --port 5174
```

然后访问：

```text
http://127.0.0.1:5174/
```

### 6.3 页面能打开，但课程内容加载失败

先确认后端窗口还在运行，然后检查：

```powershell
cd C:\Users\15294\Documents\MathAPP
.\.venv\Scripts\Activate.ps1
python manage.py check
python manage.py migrate
```

如果是第一次使用，确认已经导入演示内容：

```powershell
python manage.py seed_demo_content
```

### 6.4 修改前端后想确认能不能正式构建

进入前端目录运行：

```powershell
cd C:\Users\15294\Documents\MathAPP\frontend
pnpm build
```

构建成功说明前端代码没有明显编译错误。

### 6.5 修改后端后想确认配置是否正常

进入项目根目录运行：

```powershell
cd C:\Users\15294\Documents\MathAPP
.\.venv\Scripts\Activate.ps1
python manage.py check
```

看到下面结果说明后端基础配置正常：

```text
System check identified no issues (0 silenced).
```
