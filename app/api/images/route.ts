import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";
import sharp from "sharp";
import { requireUser } from "@/lib/auth";
import { MAX_IMAGE_BYTES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { ApiError, assertSameOrigin, handleApiError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 30;

const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
};

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new ApiError(503, "图片存储尚未配置", "STORAGE_NOT_CONFIGURED");
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "请选择图片", "FILE_REQUIRED");

    const extension = extensions[file.type];
    if (!extension) {
      throw new ApiError(400, "仅支持 JPEG、PNG、WebP、GIF 或 HEIC 图片", "INVALID_FILE_TYPE");
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new ApiError(400, "单张图片不能超过 4MB", "FILE_TOO_LARGE");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(buffer, { animated: false }).metadata();
    if (!metadata.width || !metadata.height) {
      throw new ApiError(400, "无法读取这张图片", "INVALID_IMAGE");
    }

    const pathname = `apexmind/${user.id}/${Date.now()}-${randomUUID()}.${extension}`;
    const blob = await put(pathname, buffer, {
      access: "public",
      contentType: file.type,
      addRandomSuffix: false,
    });

    const image = await prisma.imageAsset.create({
      data: {
        userId: user.id,
        url: blob.url,
        pathname: blob.pathname,
        width: metadata.width,
        height: metadata.height,
        bytes: buffer.byteLength,
        mimeType: file.type,
      },
    });

    return jsonOk(
      {
        id: image.id,
        url: image.url,
        width: image.width,
        height: image.height,
        mimeType: image.mimeType,
        sortOrder: image.sortOrder,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
