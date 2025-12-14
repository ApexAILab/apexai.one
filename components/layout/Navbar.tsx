"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { usePathname } from "next/navigation";
import { Github, Sun, Moon } from "lucide-react";
import Link from "next/link";

/**
 * 顶部导航栏组件
 * Apple/OpenAI 风格的极简导航栏
 */
export function Navbar() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // 防止 hydration 不匹配
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 w-full bg-white/70 dark:bg-black/70 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo 区域 (左侧) */}
          <Link href="/" className="flex items-center gap-2 group">
            {/* SVG Logo - 极简三角形 (Apex/顶点概念) */}
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="text-zinc-900 dark:text-zinc-50 transition-colors"
            >
              <path
                d="M12 2L22 20H2L12 2Z"
                fill="currentColor"
                className="group-hover:opacity-80 transition-opacity"
              />
            </svg>
            <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              ApexAI
            </span>
          </Link>

          {/* 链接区域 (中部) */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/nexus"
              className={`text-sm font-medium transition-colors ${
                pathname === "/nexus"
                  ? "text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
              }`}
            >
              Nexus
            </Link>
            <Link
              href="/dashboard"
              className={`text-sm font-medium transition-colors ${
                pathname === "/dashboard"
                  ? "text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
              }`}
            >
              Dashboard
            </Link>
          </div>

          {/* 控制区域 (右侧) */}
          <div className="flex items-center gap-4">
            {/* GitHub 图标 */}
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
              aria-label="GitHub"
            >
              <Github size={20} />
            </a>

            {/* 主题切换按钮 */}
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
                aria-label="切换主题"
              >
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            )}

            {/* 分隔线 */}
            <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-800" />

            {/* CTA 按钮 */}
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
            >
              Launch Console
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
