import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export const runtime = 'nodejs'
// 增加请求体大小限制（最大 100MB）
export const maxDuration = 300; // 5分钟超时，用于大文件上传

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

    // 总大小限制：100MB（防止上传超大文件）
    const absoluteMaxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > absoluteMaxSize) {
      return NextResponse.json(
        { error: `文件大小超过限制（最大 100MB），当前文件：${(file.size / 1024 / 1024).toFixed(2)}MB` },
        { status: 400 }
      );
    }

    // Vercel Blob 免费版限制 4.5MB
    const vercelBlobMaxSize = 4.5 * 1024 * 1024; // 4.5MB
    const isLargeFile = file.size > vercelBlobMaxSize;

    // 对于大文件，直接使用备选方案；小文件先尝试 Vercel Blob
    if (!isLargeFile) {
      try {
        const blob = await put(file.name || `image-${Date.now()}.${file.type.split('/')[1] || 'jpg'}`, file, {
          access: 'public',
          addRandomSuffix: true, // 添加随机后缀，避免文件名冲突
        });

        return NextResponse.json({ url: blob.url });
      } catch (blobError) {
        console.error('Vercel Blob upload error:', blobError);
        // 如果 Vercel Blob 失败，继续尝试备选方案
      }
    } else {
      console.log(`文件大小 ${(file.size / 1024 / 1024).toFixed(2)}MB 超过 Vercel Blob 限制，使用备选方案`);
    }

    // 如果 Vercel Blob 失败或文件太大，回退到免费图床（作为备选方案）
    const errors: string[] = [];
    
    // 备选方案1: catbox.moe (免费图床，支持大文件)
    const tryCatbox = async (): Promise<string> => {
      const form = new FormData();
      form.append("reqtype", "fileupload");
      form.append("fileToUpload", file, file.name || "upload.bin");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120秒超时，大文件需要更长时间
      
      try {
        const res = await fetch("https://catbox.moe/user/api.php", {
          method: "POST",
          body: form,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        
        const text = await res.text();
        if (!res.ok || !text.trim().startsWith("http")) {
          throw new Error(`catbox失败(${res.status}): ${text.substring(0, 100)}`);
        }
        return text.trim();
      } catch (err) {
        clearTimeout(timeoutId);
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`catbox: ${errorMsg}`);
        throw err;
      }
    };

    // 备选方案2: imgbb.com (通过 API，需要免费 API key，但可以先尝试)
    const tryImgBB = async (): Promise<string> => {
      // 注意：imgbb 需要 API key，这里先跳过，如果其他服务都失败再考虑
      throw new Error("imgbb 需要配置 API key");
    };

    // 备选方案3: transfer.sh (临时文件分享，14天有效)
    const tryTransferSh = async (): Promise<string> => {
      const form = new FormData();
      form.append("file", file, file.name || "upload.bin");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120秒超时
      
      try {
        const res = await fetch(`https://transfer.sh/${file.name || "upload.bin"}`, {
          method: "PUT",
          body: file,
          signal: controller.signal,
          headers: {
            "Max-Downloads": "1",
            "Max-Days": "7",
          },
        });
        clearTimeout(timeoutId);
        
        const text = await res.text();
        if (!res.ok || !text.trim().startsWith("https://transfer.sh/")) {
          throw new Error(`transfer.sh失败(${res.status}): ${text.substring(0, 100)}`);
        }
        return text.trim();
      } catch (err) {
        clearTimeout(timeoutId);
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`transfer.sh: ${errorMsg}`);
        throw err;
      }
    };

    // 备选方案4: uguu.se (免费图床)
    const tryUguu = async (): Promise<string> => {
      const form = new FormData();
      form.append("file", file, file.name || "upload.bin");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // 120秒超时
      
      try {
        const res = await fetch("https://uguu.se/api.php?d=upload-tool", {
          method: "POST",
          body: form,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        
        const text = await res.text();
        if (!res.ok || !text.trim().startsWith("http")) {
          throw new Error(`uguu失败(${res.status}): ${text.substring(0, 100)}`);
        }
        return text.trim();
      } catch (err) {
        clearTimeout(timeoutId);
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`uguu: ${errorMsg}`);
        throw err;
      }
    };

    // 尝试所有备选方案（按可靠性排序）
    try {
      const url = await tryCatbox();
      return NextResponse.json({ url, fallback: true });
    } catch (errCatbox) {
      try {
        const url = await tryTransferSh();
        return NextResponse.json({ url, fallback: true });
      } catch (errTransfer) {
        try {
          const url = await tryUguu();
          return NextResponse.json({ url, fallback: true });
        } catch (errUguu) {
          // 所有方案都失败，返回详细错误信息
          const detailedError = `所有上传方案都失败了。错误详情：${errors.join('; ')}。\n\n建议：\n1. 检查网络连接\n2. 尝试使用 Base64 编码模式（文件需小于 10MB）\n3. 或手动上传到图床后粘贴链接`;
          console.error('所有上传方案都失败:', errors);
          throw new Error(detailedError);
        }
      }
    }
  } catch (error) {
    console.error('Upload error:', error);
    const message = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
