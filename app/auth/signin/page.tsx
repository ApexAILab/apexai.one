"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, User, Lock, Loader2 } from "lucide-react";

/**
 * 登录表单组件（内部组件，使用 useSearchParams）
 */
function SignInForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.error || "登录失败，请重试");
        return;
      }

      // 登录成功，跳转
      router.push(callbackUrl);
      router.refresh(); // 刷新页面以更新认证状态
    } catch (err) {
      console.error("[SignIn] 登录异常:", err);
      setError(`登录失败: ${err instanceof Error ? err.message : "未知错误"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950 px-4 py-8 sm:py-12">
      <div className="w-full max-w-md">
        {/* 返回首页链接 */}
          <Link
          href="/"
          className="mb-6 sm:mb-8 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors active:opacity-70"
        >
          <ArrowLeft size={16} />
          <span>返回首页</span>
        </Link>

        {/* 登录卡片 */}
        <div className="rounded-xl sm:rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-sm">
          {/* 标题 */}
          <div className="mb-8 text-center">
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              登录
            </h1>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              使用用户名和密码登录
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* 登录表单 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                用户名
              </label>
              <div className="relative">
                <User
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                />
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  required
                  disabled={loading}
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-3 sm:py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
              >
                密码
              </label>
              <div className="relative">
                <Lock
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
                />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                  className="w-full pl-10 pr-4 py-3 sm:py-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-50 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-3 sm:py-2.5 px-4 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-[0.98] text-base"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>登录中...</span>
                </>
              ) : (
                "登录"
              )}
            </button>
          </form>

          {/* 注册链接 */}
          <div className="mt-6 text-center">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              还没有账号？{" "}
              <Link
                href="/auth/register"
                className="text-zinc-900 dark:text-zinc-50 font-medium hover:underline"
              >
                立即注册
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 登录页面（外层组件，包裹 Suspense）
 */
export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950">
          <div className="text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-zinc-900 dark:border-zinc-50 border-r-transparent"></div>
            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">加载中...</p>
          </div>
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
