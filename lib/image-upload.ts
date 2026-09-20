"use client";

import { upload } from "@vercel/blob/client";
import { MAX_IMAGE_BYTES } from "@/lib/constants";
import { requestJson } from "@/lib/api-client";
import type { ImageAssetDto } from "@/types/api";

const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
};

export async function uploadImage(file: File, userId: string) {
  const extension = imageExtensions[file.type];
  if (!extension) throw new Error("仅支持 JPEG、PNG、WebP、GIF 或 HEIC 图片");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("单张图片不能超过 10MB");

  const pathname = `apexmind/${userId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const blob = await upload(pathname, file, {
    access: "public",
    contentType: file.type,
    handleUploadUrl: "/api/images/upload",
  });

  return requestJson<ImageAssetDto>("/api/images", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: blob.url, pathname: blob.pathname }),
  });
}
