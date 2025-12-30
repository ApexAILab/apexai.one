"use client";

import Link from "next/link";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";

/**
 * 邮件验证提示页面
 * 用户提交邮箱后显示此页面
 */
export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white dark:bg-zinc-950 px-4 py-12">
      <div className="w-full max-w-md">
        {/* 返回首页链接 */}
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>返回首页</span>
        </Link>

        {/* 验证卡片 */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 shadow-sm text-center">
          {/* 图标 */}
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4">
              <Mail size={32} className="text-green-600 dark:text-green-400" />
            </div>
          </div>

          {/* 标题和描述 */}
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 mb-3">
            检查你的邮箱
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6">
            我们已向你的邮箱发送了登录链接。请打开邮件并点击链接完成登录。
          </p>

          {/* 提示信息 */}
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 p-4 mb-6">
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              💡 如果没有收到邮件，请检查垃圾邮件文件夹，或稍后重试。
            </p>
          </div>

          {/* 返回登录按钮 */}
          <Link
            href="/auth/signin"
            className="inline-block px-6 py-2.5 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
          >
            返回登录
          </Link>
        </div>
      </div>
    </div>
  );
}

