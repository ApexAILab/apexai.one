"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { Github, Sun, Moon, LogIn, LogOut, User, Menu, X } from "lucide-react";
import Link from "next/link";

/**
 * 顶部导航栏组件
 * Apple/OpenAI 风格的极简导航栏
 */
export function Navbar() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<{ id: string; username: string; name: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // 防止 hydration 不匹配
  useEffect(() => {
    setMounted(true);
  }, []);

  // 获取当前用户信息
  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setUser(data.data.user);
          }
        }
      } catch (error) {
        console.error("[Navbar] 获取用户信息失败:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [pathname]); // 当路径变化时重新获取用户信息

  const handleSignOut = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("[Navbar] 登出失败:", error);
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 w-full bg-white/70 dark:bg-black/70 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo 区域 (左侧) */}
            <Link href="/" className="flex items-center gap-2 group" onClick={() => setMobileMenuOpen(false)}>
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
              <span className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                ApexAI
              </span>
            </Link>

            {/* 链接区域 (中部) - 桌面端 */}
            <div className="hidden md:flex items-center gap-8">
            <Link
              href="/secondbrain"
              className={`text-sm font-medium transition-colors ${
                pathname === "/secondbrain"
                  ? "text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
              }`}
            >
              SecondBrain
            </Link>
            <Link
              href="/stream"
              className={`text-sm font-medium transition-colors ${
                pathname === "/stream"
                  ? "text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
              }`}
            >
              StreamDeck
            </Link>
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
            <div className="flex items-center gap-2 sm:gap-4">
              {/* GitHub 图标 - 桌面端 */}
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:block text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
                aria-label="GitHub"
              >
                <Github size={20} />
              </a>

              {/* 主题切换按钮 */}
              {mounted && (
                <button
                  onClick={() =>
                    setTheme(resolvedTheme === "dark" ? "light" : "dark")
                  }
                  className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors p-2 -mr-2 sm:p-0 sm:mr-0 active:opacity-70"
                  aria-label="切换主题"
                >
                  {resolvedTheme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                </button>
              )}

              {/* 分隔线 - 桌面端 */}
              <div className="hidden sm:block h-6 w-px bg-zinc-200 dark:bg-zinc-800" />

              {/* 登录/登出按钮 - 桌面端 */}
              {mounted && !loading && (
                <>
                  {user ? (
                    <div className="hidden sm:flex items-center gap-3">
                      {/* 用户信息 */}
                      <div className="hidden lg:flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                          <User size={14} className="text-zinc-500 dark:text-zinc-400" />
                        </div>
                        <span className="text-zinc-700 dark:text-zinc-300">
                          {user.name || user.username}
                        </span>
                      </div>
                      {/* 登出按钮 */}
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors active:scale-95"
                      >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  ) : (
                    <Link
                      href="/auth/signin"
                      className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 rounded-full hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors active:scale-95"
                    >
                      <LogIn size={16} />
                      <span>Sign In</span>
                    </Link>
                  )}
                </>
              )}

              {/* 移动端菜单按钮 */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="sm:hidden p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors active:opacity-70"
                aria-label="菜单"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* 移动端菜单 */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 pt-16 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl md:hidden">
          <div className="flex flex-col h-full">
            {/* 导航链接 */}
            <div className="flex flex-col px-4 py-4 space-y-1 border-b border-zinc-200 dark:border-zinc-800">
              <Link
                href="/secondbrain"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                  pathname === "/secondbrain"
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                }`}
              >
                SecondBrain
              </Link>
              <Link
                href="/stream"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                  pathname === "/stream"
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                }`}
              >
                StreamDeck
              </Link>
              <Link
                href="/nexus"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                  pathname === "/nexus"
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                }`}
              >
                Nexus
              </Link>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                  pathname === "/dashboard"
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                }`}
              >
                Dashboard
              </Link>
            </div>

            {/* 用户信息和操作 */}
            {mounted && !loading && (
              <div className="flex-1 flex flex-col justify-end px-4 py-4 space-y-3">
                {user ? (
                  <>
                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
                        <User size={16} className="text-zinc-500 dark:text-zinc-400" />
                      </div>
                      <span className="text-base font-medium text-zinc-700 dark:text-zinc-300">
                        {user.name || user.username}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        handleSignOut();
                        setMobileMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 text-base font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors active:scale-95"
                    >
                      <LogOut size={18} />
                      <span>Sign Out</span>
                    </button>
                  </>
                ) : (
                  <Link
                    href="/auth/signin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-base font-medium text-white bg-zinc-900 dark:bg-white dark:text-zinc-900 rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors active:scale-95"
                  >
                    <LogIn size={18} />
                    <span>Sign In</span>
                  </Link>
                )}
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-base font-medium text-zinc-600 dark:text-zinc-400 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors active:opacity-70"
                >
                  <Github size={18} />
                  <span>GitHub</span>
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
