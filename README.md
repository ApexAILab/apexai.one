# ApexAI

一个现代化的 AI 工作台平台，集成 Nexus 接口，专为创作者打造的私有化 AI 操作系统。

## ✨ 功能特性

### 核心功能
- **用户认证**：基于用户名/密码的凭据登录（Credentials Auth），密码使用 bcrypt 加密存储
- **数据隔离**：不同用户的数据完全隔离，登录后只能看到自己的 SecondBrain 帖子数据
- **路由保护**：SecondBrain 和 Nexus 页面需要登录才能访问
- **Nexus 接口集成**：完整的任务创建、管理和监控系统
- **用户配置隔离**：每个用户的 Nexus 配置（凭证和模型）独立存储，数据完全隔离
- **单任务处理**：支持动态表单配置，根据模型模板自动生成输入字段
- **批量作业**：高效的批量任务处理，支持 CSV 导入/导出
- **任务管理**：实时任务状态追踪、日志查看、结果预览
- **文件上传**：支持图片上传（file-url 和 file-base64 两种模式）
- **SecondBrain**：个人知识管理系统，支持帖子创建、编辑、标签、搜索等功能

### StreamDeck 媒体工具
- **视频下载**：YouTube 视频/音频下载，支持多种清晰度选择，批量解析处理
- **视频拆解**：基于 PySceneDetect + FFmpeg 的智能场景检测，自动提取分镜首帧图片

### 开发工具
- **调试模式**：可切换的调试模式，显示详细日志信息
- **日志管理**：一键清除日志，长文本快速复制
- **配置管理**：凭证和模型的 CRUD 操作，支持导入/导出

### 设计系统
- **Apple/OpenAI 风格**：极简主义设计，商业级 SaaS 质感
- **Bento UI**：现代化的卡片式布局
- **深色模式**：完整的深色/浅色主题支持
- **响应式设计**：完美适配桌面和移动设备
- **PWA 支持**：支持添加到主屏幕，全屏运行，离线缓存

## 🚀 快速开始

### 环境要求
- Node.js 18+ 
- npm / yarn / pnpm
- PostgreSQL 数据库

### 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

### 环境变量配置

在项目根目录创建 `.env` 文件，添加以下环境变量：

```env
# 数据库连接
DATABASE_URL="postgresql://user:password@localhost:5432/apexai"
DIRECT_URL="postgresql://user:password@localhost:5432/apexai"

# 认证配置
AUTH_SECRET="your-secret-key-here"  # 运行 `openssl rand -base64 32` 生成，用于 JWT Token 签名
```

**重要提示：**
- `AUTH_SECRET` 是必需的，用于 JWT Token 的签名和验证。可以使用以下命令生成：
  ```bash
  openssl rand -base64 32
  ```
- 生产环境必须设置一个强随机的 `AUTH_SECRET`

### 数据库迁移

配置好环境变量后，运行数据库迁移：

```bash
npx prisma migrate dev
```

这将创建用户认证所需的表（User）、SecondBrain 相关的表（Post、Conversation）以及 Nexus 配置相关的表（NexusCredential、NexusModel）。

### 运行开发服务器

```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

### 构建生产版本

```bash
npm run build
npm start
```

## 📁 项目结构

```
ApexAI/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   └── proxy/         # 代理路由（解决 CORS）
│   ├── nexus/             # Nexus 功能页面
│   ├── layout.tsx         # 根布局
│   └── page.tsx           # 首页
├── components/            # React 组件
│   ├── layout/           # 布局组件
│   │   └── Navbar.tsx    # 导航栏
│   ├── nexus/            # Nexus 相关组件
│   │   ├── BatchProcessor.tsx    # 批量处理器
│   │   ├── SettingsDialog.tsx    # 设置弹窗
│   │   ├── TaskConfigurator.tsx # 任务配置器
│   │   ├── TaskList.tsx          # 任务列表
│   │   └── TaskViewer.tsx        # 任务查看器
│   └── providers.tsx      # 主题提供者
├── hooks/                # React Hooks
│   └── useTaskEngine.ts  # 任务引擎 Hook
├── lib/                  # 工具库
│   ├── nexus-utils.ts    # Nexus 工具函数
│   └── store.ts          # Zustand 状态管理
├── types/                # TypeScript 类型定义
│   └── nexus.ts          # Nexus 相关类型
└── public/               # 静态资源
```

## 🛠️ 技术栈

- **框架**: Next.js 16 (App Router)
- **语言**: TypeScript
- **样式**: Tailwind CSS v4
- **认证**: 自定义 Credentials Auth（JWT + bcrypt）
- **数据库**: PostgreSQL + Prisma ORM
- **邮件服务**: Resend
- **状态管理**: Zustand (with persist middleware)
- **动画**: Framer Motion
- **图标**: Lucide React
- **主题**: next-themes

## 📖 核心概念

### StreamDeck 媒体工具

StreamDeck 是一个集成的媒体处理工具，提供视频下载和视频拆解两大功能。

#### 视频下载
- 支持 YouTube 视频/音频下载
- 多种清晰度和格式选择
- 支持批量解析和下载
- HTTP 代理支持（解决网络限制）

#### 视频拆解（场景检测）
**纯浏览器端**的智能场景检测工具，可自动分析视频中的镜头切换点，并提取每个分镜的首帧图片。

**功能特点：**
- 🔒 **隐私保护**：完全在浏览器中处理，视频不会上传到任何服务器
- 智能场景检测：使用像素差异算法检测场景切换
- 智能首帧提取：偏移 150ms 避免截取到转场残影或黑屏
- 可调节参数：检测灵敏度（5-60%）和最小场景长度（0.2-3秒）
- 实时预览：处理完成后可预览所有检测到的场景
- 批量输出：所有首帧图片按时间顺序命名（1.jpg, 2.jpg...）并打包为 ZIP

**无需任何依赖安装**，直接访问网站即可使用！

### Nexus 系统

Nexus 是一个统一的 AI 任务处理接口，支持多种 AI 模型和任务类型。

#### 数据模型

- **Credential（凭证）**: 存储 API 密钥和基础 URL
- **Model（模型）**: 定义模型配置、路径映射和请求模板
- **Task（任务）**: 任务实例，包含输入参数、状态、日志和结果

#### 工作流程

1. **配置阶段**: 在设置中配置凭证和模型
2. **创建任务**: 选择模型，填写动态生成的表单字段
3. **提交任务**: 系统自动处理请求和轮询
4. **查看结果**: 实时查看任务状态、日志和最终结果

### 文件上传

支持两种文件上传模式：

- **file-url**: 上传到 catbox.moe，返回 HTTPS URL
- **file-base64**: 转换为 Base64 编码字符串

## 🎨 设计规范

### 色彩系统
- **主色调**: 黑、白、Zinc 灰
- **背景**: `bg-white` (浅色) / `bg-zinc-950` (深色)
- **文字**: `text-zinc-900` (主要) / `text-zinc-500` (次要)

### 组件规范
- **圆角**: `rounded-xl` 或 `rounded-2xl`
- **边框**: 极细边框 `border-zinc-200` / `border-zinc-800`
- **阴影**: `shadow-sm` (轻微阴影)
- **动画**: 使用 Framer Motion 实现流畅过渡

## 🔧 开发指南

### 添加新功能

1. 在 `types/nexus.ts` 中定义类型
2. 在 `lib/store.ts` 中添加状态管理逻辑
3. 在 `components/nexus/` 中创建 UI 组件
4. 在 `app/nexus/page.tsx` 中集成新功能

### 代码规范

- 使用 TypeScript，避免使用 `any`
- 组件必须添加中文注释
- 遵循模块化原则，关注点分离
- UI 组件不直接处理网络请求

## 📱 PWA 功能

ApexAI 已升级为 Progressive Web App (PWA)，支持：

### 功能特性
- ✅ **添加到主屏幕**：在 iPhone、Android 和桌面浏览器上都可以添加到主屏幕
- ✅ **全屏运行**：添加到主屏幕后可以像原生 App 一样全屏运行
- ✅ **离线缓存**：Service Worker 自动缓存静态资源，提升加载速度
- ✅ **智能缓存策略**：API 请求使用网络优先，静态资源使用缓存优先
- ✅ **自动更新**：Service Worker 自动检测并应用更新

### 使用方法

#### iPhone/iPad (Safari)
1. 打开网站后，点击底部的分享按钮（📤）
2. 向下滚动，选择"添加到主屏幕"
3. 点击"添加"完成安装
4. 从主屏幕打开，享受全屏体验

#### Android (Chrome/Edge)
1. 打开网站后，浏览器会自动显示"安装"提示
2. 点击"安装"按钮完成安装
3. 或者点击浏览器菜单中的"添加到主屏幕"

#### 桌面浏览器 (Chrome/Edge)
1. 地址栏右侧会显示"安装"图标
2. 点击图标，选择"安装"
3. 应用会以独立窗口运行

### 技术实现
- **Manifest.json**：定义应用名称、图标、启动 URL 等
- **Service Worker**：实现离线缓存和资源管理
- **响应式图标**：自动生成 192x192、512x512 和 Apple Touch Icon
- **Safe Area 支持**：适配 iPhone X 等设备的刘海屏

## 📝 更新日志

### v0.4.0 (StreamDeck Scene Detect)
- ✅ 视频拆解功能：智能场景检测 + 首帧提取
- ✅ 纯浏览器端处理，无需安装任何依赖
- ✅ 可调节的检测参数（灵敏度、最小场景长度）
- ✅ 智能首帧提取（偏移 150ms 避免转场残影）
- ✅ 实时进度显示 + 场景预览
- ✅ ZIP 打包下载，按时间顺序命名（1.jpg, 2.jpg...）

### v0.3.0 (Nexus User Isolation)
- ✅ Nexus 功能添加登录保护
- ✅ Nexus 配置数据保存到数据库，与用户 ID 绑定
- ✅ 每个用户独立的凭证和模型配置
- ✅ 配置自动同步到数据库

### v0.2.0 (PWA Support)
- ✅ PWA 支持：添加到主屏幕、全屏运行
- ✅ Service Worker 离线缓存
- ✅ 响应式图标生成
- ✅ iPhone safe area 适配

### v0.1.0 (Initial Release)
- ✅ 完整的 Nexus 功能迁移
- ✅ 单任务和批量任务处理
- ✅ 文件上传功能（file-url 和 file-base64）
- ✅ 调试模式和日志管理
- ✅ 深色模式支持
- ✅ 响应式设计

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

Built with ❤️ using Next.js
