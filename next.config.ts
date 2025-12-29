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
};

export default nextConfig;
