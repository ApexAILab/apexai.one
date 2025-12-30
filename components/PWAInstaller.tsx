"use client";

import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";

/**
 * PWA 安装提示组件
 * 在支持的浏览器中显示"添加到主屏幕"提示
 */
export function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 检测是否在 iOS 设备上
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // 检测是否已经以独立模式运行（已添加到主屏幕）
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // iOS 设备：延迟显示提示，给用户时间浏览页面
    if (iOS && !standalone) {
      const hasShownPrompt = localStorage.getItem("pwa-install-prompt-shown");
      if (!hasShownPrompt) {
        // 延迟 3 秒显示提示，避免打扰用户
        const timer = setTimeout(() => {
          setShowInstallPrompt(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    }

    // 监听 beforeinstallprompt 事件（Chrome/Edge）
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // 检查是否已经显示过提示（使用 localStorage）
      const hasShownPrompt = localStorage.getItem("pwa-install-prompt-shown");
      if (!hasShownPrompt && !standalone) {
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      // Chrome/Edge 浏览器
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      setDeferredPrompt(null);
      setShowInstallPrompt(false);
      localStorage.setItem("pwa-install-prompt-shown", "true");
    }
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
    localStorage.setItem("pwa-install-prompt-shown", "true");
  };

  // 如果已经以独立模式运行，不显示提示
  if (isStandalone) {
    return null;
  }

  // iOS 设备显示自定义提示
  if (isIOS && showInstallPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 lg:left-auto lg:right-4 lg:w-96">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                添加到主屏幕
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
                点击 Safari 底部的分享按钮，然后选择"添加到主屏幕"
              </p>
              <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-500">
                <span>1. 点击</span>
                <Download size={12} />
                <span>2. 选择"添加到主屏幕"</span>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors active:scale-95"
              aria-label="关闭"
            >
              <X size={16} className="text-zinc-500 dark:text-zinc-400" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Chrome/Edge 浏览器显示安装提示
  if (deferredPrompt && showInstallPrompt) {
    return (
      <div className="fixed bottom-4 left-4 right-4 z-50 lg:left-auto lg:right-4 lg:w-96">
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                安装 ApexAI
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">
                将 ApexAI 添加到主屏幕，获得更好的使用体验
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors active:scale-95 shrink-0"
              aria-label="关闭"
            >
              <X size={16} className="text-zinc-500 dark:text-zinc-400" />
            </button>
          </div>
          <button
            onClick={handleInstallClick}
            className="w-full mt-3 py-2 px-4 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors active:scale-95"
          >
            安装应用
          </button>
        </div>
      </div>
    );
  }

  return null;
}

