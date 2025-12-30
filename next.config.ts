import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Vercel Blob Storage 图片域名配置
    // 创建 Blob Store 后，会得到类似 *.public.blob.vercel-storage.com 的域名
    // 需要在这里添加你的 Blob Store 域名
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
        pathname: '/**',
      },
    ],
  },
  // PWA 配置：确保 Service Worker 和 manifest 文件可以被正确访问
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
