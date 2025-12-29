import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const incoming = await request.formData();
    const file = incoming.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { error: "缺少文件" },
        { status: 400 }
      );
    }

    // 检查文件大小（Vercel Blob 免费版限制 4.5MB）
    const maxSize = 4.5 * 1024 * 1024; // 4.5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `文件大小超过限制（最大 4.5MB），当前文件：${(file.size / 1024 / 1024).toFixed(2)}MB` },
        { status: 400 }
      );
    }

    // 使用 Vercel Blob Storage 上传
    try {
      const blob = await put(file.name || `image-${Date.now()}.${file.type.split('/')[1] || 'jpg'}`, file, {
        access: 'public',
        addRandomSuffix: true, // 添加随机后缀，避免文件名冲突
      });

      return NextResponse.json({ url: blob.url });
    } catch (blobError) {
      console.error('Vercel Blob upload error:', blobError);
      
      // 如果 Vercel Blob 失败，回退到免费图床（作为备选方案）
      const tryImageProxy = async () => {
        const form = new FormData();
        form.append("file", file, file.name || "upload.bin");
        const res = await fetch("https://imageproxy.zhongzhuan.chat/api/upload", {
          method: "POST",
          body: form,
        });
        const json = await res.json();
        if (!res.ok || !json?.url) {
          throw new Error(`imageproxy失败(${res.status}): ${JSON.stringify(json)}`);
        }
        return String(json.url).trim();
      };

      const try0x0 = async () => {
        const form = new FormData();
        form.append("file", file, file.name || "upload.bin");
        const res = await fetch("https://0x0.st", {
          method: "POST",
          body: form,
        });
        const text = await res.text();
        if (!res.ok || !text.trim().startsWith("https://0x0.st/")) {
          throw new Error(`0x0.st失败(${res.status}): ${text}`);
        }
        return text.trim();
      };

      try {
        const url = await tryImageProxy();
        return NextResponse.json({ url, fallback: true }); // 标记为回退方案
      } catch (errImg) {
        try {
          const url = await try0x0();
          return NextResponse.json({ url, fallback: true });
        } catch (err0x0) {
          throw new Error('所有上传方案都失败了');
        }
      }
    }
  } catch (error) {
    console.error('Upload error:', error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
