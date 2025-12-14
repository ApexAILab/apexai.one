import Link from "next/link";
import { ArrowRight, Network, Image as ImageIcon, Settings } from "lucide-react";

/**
 * 首页
 * 包含 Hero Section 和 Bento Grid 功能区
 */
export default function Home() {
  return (
    <>
      {/* Hero Section */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden pt-32 pb-20">
      {/* 背景光斑效果 - 模糊的淡紫色/蓝色光斑 */}
      <div className="absolute inset-0 -z-10 flex items-center justify-center">
        <div className="absolute h-[600px] w-[600px] rounded-full bg-purple-400/20 blur-3xl dark:bg-blue-500/20" />
        <div className="absolute h-[800px] w-[800px] rounded-full bg-blue-400/15 blur-3xl dark:bg-purple-500/15" />
      </div>

      {/* 内容区域 */}
      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        {/* 主标题 - 带渐变效果 */}
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
          <span className="bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 bg-clip-text text-transparent dark:from-zinc-50 dark:via-zinc-300 dark:to-zinc-50">
            Your Personal AI
          </span>
          <br />
          <span className="bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 bg-clip-text text-transparent dark:from-zinc-50 dark:via-zinc-300 dark:to-zinc-50">
            Operating System
          </span>
        </h1>

        {/* 副标题 */}
        <p className="mx-auto mt-6 max-w-2xl text-xl text-zinc-500 dark:text-zinc-400">
          集成 Nexus 接口，专为创作者打造的私有化 AI 工作台
        </p>

        {/* 按钮组 */}
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          {/* 主按钮 - Start Building */}
          <Link
            href="/dashboard"
            className="group flex items-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-base font-medium text-white transition-all hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            Start Building
            <ArrowRight
              size={18}
              className="transition-transform group-hover:translate-x-1"
            />
          </Link>

          {/* 次按钮 - View Components */}
          <Link
            href="#components"
            className="rounded-full border border-zinc-300 px-6 py-3 text-base font-medium text-zinc-700 transition-all hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
          >
            View Components
          </Link>
        </div>
      </div>
      </section>

      {/* Bento Grid 功能区 */}
      <section id="components" className="relative w-full py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Grid 布局 - 3列 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* 核心卡片 - Nexus Interface (跨2列) */}
            <Link
              href="/nexus"
              className="group col-span-1 flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 p-6 transition-all hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/50 md:col-span-2"
            >
              <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-center">
                {/* 左侧：文字内容 */}
                <div className="flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <Network className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                    <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                      Nexus Interface
                    </h3>
                  </div>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    统一的 AI 接口管理平台，支持多模型切换、批量处理和任务编排
                  </p>
                </div>
                {/* 右侧：示意图/图标 */}
                <div className="flex items-center justify-center md:ml-4">
                  <div className="flex h-24 w-24 items-center justify-center rounded-xl bg-zinc-200/50 dark:bg-zinc-800/50">
                    <Network className="h-12 w-12 text-zinc-400 dark:text-zinc-600" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Image Tools 卡片 */}
            <div className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 p-6 transition-all hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="mb-2 flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                  Image Tools
                </h3>
              </div>
              <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                图像生成与处理工具集
              </p>
              <span className="inline-flex w-fit items-center rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                Coming Soon
              </span>
            </div>

            {/* Settings 卡片 */}
            <div className="group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 p-6 transition-all hover:-translate-y-1 hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="mb-2 flex items-center gap-2">
                <Settings className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
                <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                  Settings
                </h3>
              </div>
              <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                系统配置与偏好设置
              </p>
              <span className="inline-flex w-fit items-center rounded-full bg-zinc-200 px-3 py-1 text-xs font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                Coming Soon
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
