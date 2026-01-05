"use client";

import { useEffect } from "react";

/**
 * Service Worker 注册组件
 * 在客户端注册 Service Worker
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    // 只在生产环境或明确启用时注册 Service Worker
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      // 延迟注册，避免阻塞页面加载
      const registerSW = async () => {
        try {
          // 先取消注册旧的 Service Worker（如果有）
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            if (registration.scope === window.location.origin + "/") {
              await registration.unregister();
            }
          }

          // 注册新的 Service Worker
          const registration = await navigator.serviceWorker.register("/sw.js", {
            scope: "/",
          });

          console.log("[SW] Service Worker registered:", registration.scope);

          // 检查更新
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (
                  newWorker.state === "installed" &&
                  navigator.serviceWorker.controller
                ) {
                  // 有新版本可用，可以提示用户刷新
                  console.log("[SW] New version available");
                }
              });
            }
          });
        } catch (error) {
          console.error("[SW] Service Worker registration failed:", error);
          // 静默失败，不影响应用使用
        }
      };

      // 延迟注册，避免阻塞页面加载
      setTimeout(registerSW, 1000);

      // 监听 Service Worker 更新
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          console.log("[SW] New Service Worker activated, reloading...");
          window.location.reload();
        }
      });
    } else if (process.env.NODE_ENV === "development") {
      // 开发环境：取消所有已注册的 Service Worker
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => {
            registration.unregister();
          });
        });
      }
    }
  }, []);

  return null;
}

