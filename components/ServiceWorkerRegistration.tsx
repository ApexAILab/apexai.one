"use client";

import { useEffect } from "react";

/**
 * Service Worker 注册组件
 * 在客户端注册 Service Worker
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // 注册 Service Worker
      navigator.serviceWorker
        .register("/sw.js", {
          scope: "/",
        })
        .then((registration) => {
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
        })
        .catch((error) => {
          console.error("[SW] Service Worker registration failed:", error);
        });

      // 监听 Service Worker 更新
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          console.log("[SW] New Service Worker activated, reloading...");
          window.location.reload();
        }
      });
    }
  }, []);

  return null;
}

