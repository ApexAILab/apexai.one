"use client";

import { ThemeProvider } from "next-themes";
import { ReactNode } from "react";

/**
 * 全局 Provider 组件
 * 提供主题切换功能（黑白模式）
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </ThemeProvider>
  );
}
