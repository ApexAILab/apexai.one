// Service Worker for ApexAI PWA
// 缓存策略：网络优先，失败时使用缓存

const CACHE_NAME = 'apexai-v1';
const RUNTIME_CACHE = 'apexai-runtime-v1';

// 需要缓存的静态资源
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/apple-touch-icon.png',
];

// 安装 Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting(); // 立即激活新的 Service Worker
});

// 激活 Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  return self.clients.claim(); // 立即控制所有页面
});

// 拦截网络请求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 跳过非 GET 请求
  if (request.method !== 'GET') {
    return;
  }

  // 跳过 Chrome 扩展
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // 跳过 Service Worker 自身
  if (url.pathname === '/sw.js') {
    return;
  }

  // API 请求：网络优先策略
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // 只缓存成功的 GET 请求
          if (response.ok && request.method === 'GET') {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // 网络失败时，尝试从缓存获取
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // 如果缓存也没有，返回离线页面
            return new Response(
              JSON.stringify({ error: '网络连接失败，请检查网络设置' }),
              {
                status: 503,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          });
        })
    );
    return;
  }

  // 静态资源：缓存优先策略
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((response) => {
          // 只缓存成功的响应
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseToCache);
          });

          return response;
        })
        .catch(() => {
          // 网络失败时，如果是导航请求，返回首页
          if (request.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('网络连接失败', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          });
        })
  );
});

// 处理后台同步（如果需要）
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
});

// 处理推送通知（如果需要）
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  // 可以在这里实现推送通知逻辑
});

