import Link from "next/link";
import { ArrowRight, Network, Image as ImageIcon, Settings, Play } from "lucide-react";

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
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          <span className="bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 bg-clip-text text-transparent dark:from-zinc-50 dark:via-zinc-300 dark:to-zinc-50">
            Your Personal AI
          </span>
          <br />
          <span className="bg-gradient-to-r from-zinc-900 via-zinc-700 to-zinc-900 bg-clip-text text-transparent dark:from-zinc-50 dark:via-zinc-300 dark:to-zinc-50">
            Operating System
          </span>
        </h1>

        {/* 副标题 */}
        <p className="mx-auto mt-4 sm:mt-6 max-w-2xl text-base sm:text-lg md:text-xl text-zinc-500 dark:text-zinc-400 px-2">
          集成 Nexus 接口，专为创作者打造的私有化 AI 工作台
        </p>

        {/* 按钮组 */}
        <div className="mt-8 sm:mt-10 flex flex-col items-stretch sm:items-center justify-center gap-3 sm:gap-4 sm:flex-row px-4">
          {/* 主按钮 - Start Building */}
          <Link
            href="/dashboard"
            className="group flex items-center justify-center gap-2 rounded-full bg-zinc-900 px-6 py-3 text-sm sm:text-base font-medium text-white transition-all hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 active:scale-95"
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
            className="rounded-full border border-zinc-300 px-6 py-3 text-sm sm:text-base font-medium text-zinc-700 transition-all hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-900 active:scale-95"
          >
            View Components
          </Link>
        </div>
      </div>
      </section>

      {/* Bento Grid 功能区 */}
      <section id="components" className="relative w-full py-12 sm:py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Grid 布局 */}
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
            {/* StreamDeck 卡片 */}
            <Link
              href="/stream"
              className="group flex flex-col overflow-hidden rounded-xl sm:rounded-2xl border border-zinc-200 bg-white/80 p-4 sm:p-6 shadow-sm ring-1 ring-transparent transition-all hover:-translate-y-1 hover:shadow-lg hover:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-900/70 dark:hover:ring-zinc-700 active:scale-[0.98]"
            >
              <div className="flex flex-1 flex-col gap-3 sm:gap-4 md:flex-row md:items-center">
                <div className="flex-1 space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-zinc-900 text-white px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-medium dark:bg-zinc-50 dark:text-zinc-900">
                    <Play size={12} className="sm:w-[14px] sm:h-[14px]" />
                    <span>StreamDeck</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    YouTube 视频 · 音频一站式下载
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                    批量解析 YouTube 链接，选择清晰度与码率，一键直存本地，零配置、零 API Key。
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-zinc-400 dark:text-zinc-500">
                    <span>多行批量解析</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                    <span>代理可配置</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                    <span>前后端分离</span>
                  </div>
                </div>
                <div className="flex items-center justify-center md:ml-4 shrink-0">
                  <div className="relative h-20 w-32 sm:h-24 sm:w-40 rounded-xl sm:rounded-2xl border border-zinc-200 bg-zinc-50/60 shadow-inner dark:border-zinc-800 dark:bg-zinc-900/60">
                    <div className="absolute inset-x-3 sm:inset-x-4 top-2.5 sm:top-3 h-3 sm:h-4 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                    <div className="absolute inset-x-3 sm:inset-x-4 top-7 sm:top-9 h-7 sm:h-9 rounded-lg sm:rounded-xl bg-zinc-900 text-[9px] sm:text-[11px] text-zinc-100 flex items-center justify-center gap-1.5 sm:gap-2 dark:bg-zinc-50 dark:text-zinc-900">
                      <Play size={10} className="sm:w-3 sm:h-3" />
                      <span className="truncate">Download video & audio</span>
                    </div>
                    <div className="absolute inset-x-3 sm:inset-x-4 bottom-2.5 sm:bottom-3 h-3 sm:h-4 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Nexus Interface 卡片 */}
            <Link
              href="/nexus"
              className="group flex flex-col overflow-hidden rounded-xl sm:rounded-2xl border border-zinc-200 bg-white/80 p-4 sm:p-6 shadow-sm ring-1 ring-transparent transition-all hover:-translate-y-1 hover:shadow-lg hover:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-900/70 dark:hover:ring-zinc-700 active:scale-[0.98]"
            >
              <div className="flex flex-1 flex-col gap-3 sm:gap-4 md:flex-row md:items-center">
                <div className="flex-1 space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-zinc-900 text-white px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-medium dark:bg-zinc-50 dark:text-zinc-900">
                    <Network size={12} className="sm:w-[14px] sm:h-[14px]" />
                    <span>Nexus Interface</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    多模型 · 多任务的统一控制台
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                    定义模型、凭证和任务模板的中枢工作台，覆盖单任务、批量任务与配置管理。
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-zinc-400 dark:text-zinc-500">
                    <span>动态表单</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                    <span>轮询日志</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                    <span>Bento UI</span>
                  </div>
                </div>
                <div className="flex items-center justify-center md:ml-4 shrink-0">
                  <div className="relative h-20 w-32 sm:h-24 sm:w-40 rounded-xl sm:rounded-2xl border border-zinc-200 bg-zinc-50/60 shadow-inner dark:border-zinc-800 dark:bg-zinc-900/60">
                    <div className="absolute inset-x-3 sm:inset-x-4 top-2.5 sm:top-3 h-3 sm:h-4 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                    <div className="absolute inset-x-3 sm:inset-x-4 top-7 sm:top-9 h-7 sm:h-9 rounded-lg sm:rounded-xl bg-zinc-900 text-[9px] sm:text-[11px] text-zinc-100 flex items-center justify-center gap-1.5 sm:gap-2 dark:bg-zinc-50 dark:text-zinc-900">
                      <Network size={10} className="sm:w-3 sm:h-3" />
                      <span className="truncate">Tasks · Models · Logs</span>
                    </div>
                    <div className="absolute inset-x-3 sm:inset-x-4 bottom-2.5 sm:bottom-3 h-3 sm:h-4 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                  </div>
                </div>
              </div>
            </Link>

            {/* Image Tools 卡片 */}
            <div className="group flex flex-col overflow-hidden rounded-xl sm:rounded-2xl border border-zinc-200 bg-white/80 p-4 sm:p-6 shadow-sm ring-1 ring-transparent transition-all hover:-translate-y-1 hover:shadow-lg hover:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-900/70 dark:hover:ring-zinc-700">
              <div className="flex flex-1 flex-col gap-3 sm:gap-4 md:flex-row md:items-center">
                <div className="flex-1 space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-zinc-900 text-white px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-medium dark:bg-zinc-50 dark:text-zinc-900">
                    <ImageIcon size={12} className="sm:w-[14px] sm:h-[14px]" />
                    <span>Image Tools</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    图像生成与编辑工作台
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                    规划中的统一图像能力面板，支持生成、编辑、批量导出，并与 Nexus 任务打通。
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-zinc-400 dark:text-zinc-500">
                    <span>Prompt 预设</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                    <span>批量处理</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                    <span>Coming Soon</span>
                  </div>
                </div>
                <div className="flex items-center justify-center md:ml-4 shrink-0">
                  <div className="relative h-20 w-32 sm:h-24 sm:w-40 rounded-xl sm:rounded-2xl border border-zinc-200 bg-zinc-50/60 shadow-inner dark:border-zinc-800 dark:bg-zinc-900/60">
                    <div className="absolute inset-x-3 sm:inset-x-4 top-3 sm:top-4 h-3 sm:h-4 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                    <div className="absolute inset-x-3 sm:inset-x-4 top-8 sm:top-10 h-3 sm:h-4 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                    <div className="absolute inset-x-3 sm:inset-x-4 bottom-3 sm:bottom-4 h-3 sm:h-4 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                  </div>
                </div>
              </div>
            </div>

            {/* Settings 卡片 */}
            <div className="group flex flex-col overflow-hidden rounded-xl sm:rounded-2xl border border-zinc-200 bg-white/80 p-4 sm:p-6 shadow-sm ring-1 ring-transparent transition-all hover:-translate-y-1 hover:shadow-lg hover:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-900/70 dark:hover:ring-zinc-700">
              <div className="flex flex-1 flex-col gap-3 sm:gap-4 md:flex-row md:items-center">
                <div className="flex-1 space-y-2">
                  <div className="inline-flex items-center gap-2 rounded-full bg-zinc-900 text-white px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-medium dark:bg-zinc-50 dark:text-zinc-900">
                    <Settings size={12} className="sm:w-[14px] sm:h-[14px]" />
                    <span>Settings</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    系统配置与偏好中心
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                    集中管理主题、网络、代理与实验性功能，为所有工作台提供统一配置源。
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-zinc-400 dark:text-zinc-500">
                    <span>全局主题</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                    <span>网络与代理</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                    <span>Labs 开关</span>
                  </div>
                </div>
                <div className="flex items-center justify-center md:ml-4 shrink-0">
                  <div className="relative h-20 w-32 sm:h-24 sm:w-40 rounded-xl sm:rounded-2xl border border-zinc-200 bg-zinc-50/60 shadow-inner dark:border-zinc-800 dark:bg-zinc-900/60">
                    <div className="absolute inset-x-3 sm:inset-x-4 top-3 sm:top-4 h-3 sm:h-4 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                    <div className="absolute inset-x-3 sm:inset-x-4 top-8 sm:top-10 h-3 sm:h-4 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                    <div className="absolute inset-x-3 sm:inset-x-4 bottom-3 sm:bottom-4 h-3 sm:h-4 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
