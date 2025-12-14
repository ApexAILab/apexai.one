# ApexAI

一个现代化的 AI 工作台平台，集成 Nexus 接口，专为创作者打造的私有化 AI 操作系统。

## ✨ 功能特性

### 核心功能
- **Nexus 接口集成**：完整的任务创建、管理和监控系统
- **单任务处理**：支持动态表单配置，根据模型模板自动生成输入字段
- **批量作业**：高效的批量任务处理，支持 CSV 导入/导出
- **任务管理**：实时任务状态追踪、日志查看、结果预览
- **文件上传**：支持图片上传（file-url 和 file-base64 两种模式）

### 开发工具
- **调试模式**：可切换的调试模式，显示详细日志信息
- **日志管理**：一键清除日志，长文本快速复制
- **配置管理**：凭证和模型的 CRUD 操作，支持导入/导出

### 设计系统
- **Apple/OpenAI 风格**：极简主义设计，商业级 SaaS 质感
- **Bento UI**：现代化的卡片式布局
- **深色模式**：完整的深色/浅色主题支持
- **响应式设计**：完美适配桌面和移动设备

## 🚀 快速开始

### 环境要求
- Node.js 18+ 
- npm / yarn / pnpm

### 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

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
- **状态管理**: Zustand (with persist middleware)
- **动画**: Framer Motion
- **图标**: Lucide React
- **主题**: next-themes

## 📖 核心概念

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

## 📝 更新日志

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
