import { del } from "@vercel/blob";
import sharp from "sharp";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { MAX_IMAGE_BYTES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { ApiError, assertSameOrigin, handleApiError, jsonOk } from "@/lib/http";

export const runtime = "nodejs";
export const maxDuration = 30;

const registrationSchema = z.object({
  url: z.url(),
  pathname: z.string().min(1).max(512),
});

const supportedFormats = new Set(["jpeg", "png", "webp", "gif", "heif"]);

function assertOwnedBlob(url: string, pathname: string, userId: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ApiError(400, "图片地址无效", "INVALID_IMAGE_URL");
  }

  const urlPathname = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname.endsWith(".public.blob.vercel-storage.com") ||
    urlPathname !== pathname ||
    !pathname.startsWith(`apexmind/${userId}/`)
  ) {
    throw new ApiError(400, "图片地址无效", "INVALID_IMAGE_URL");
  }
}

export async function POST(request: Request) {
  let uploaded: { url: string; pathname: string } | null = null;
  let verifiedOwner = false;
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new ApiError(503, "图片存储尚未配置", "STORAGE_NOT_CONFIGURED");
    }

    uploaded = registrationSchema.parse(await request.json());
    assertOwnedBlob(uploaded.url, uploaded.pathname, user.id);
    verifiedOwner = true;

    const existing = await prisma.imageAsset.findFirst({
      where: { userId: user.id, url: uploaded.url },
    });
    if (existing) {
      return jsonOk({
        id: existing.id,
        url: existing.url,
        width: existing.width,
        height: existing.height,
        mimeType: existing.mimeType,
        sortOrder: existing.sortOrder,
      });
    }

    const response = await fetch(uploaded.url, {
      redirect: "error",
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new ApiError(400, "图片上传后无法读取，请重试", "IMAGE_UNAVAILABLE");
    const declaredSize = Number(response.headers.get("content-length") ?? 0);
    if (declaredSize > MAX_IMAGE_BYTES) {
      throw new ApiError(400, "单张图片不能超过 10MB", "FILE_TOO_LARGE");
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      throw new ApiError(400, "单张图片不能超过 10MB", "FILE_TOO_LARGE");
    }

    const metadata = await sharp(buffer, { animated: false }).metadata();
    if (!metadata.width || !metadata.height || !metadata.format || !supportedFormats.has(metadata.format)) {
      throw new ApiError(400, "无法读取这张图片", "INVALID_IMAGE");
    }

    const mimeType = metadata.format === "jpeg" ? "image/jpeg" : `image/${metadata.format}`;
    const image = await prisma.imageAsset.create({
      data: {
        userId: user.id,
        url: uploaded.url,
        pathname: uploaded.pathname,
        width: metadata.width,
        height: metadata.height,
        bytes: buffer.byteLength,
        mimeType,
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
    if (uploaded && verifiedOwner && process.env.BLOB_READ_WRITE_TOKEN) {
      await del(uploaded.url).catch((cleanupError) =>
        console.error("[Blob] Failed to remove rejected upload", cleanupError),
      );
    }
    return handleApiError(error);
  }
}
