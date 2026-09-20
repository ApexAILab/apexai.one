import sharp from "sharp";
import { requireUser } from "@/lib/auth";
import {
  MAX_IMAGES_PER_THOUGHT,
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_THOUGHT,
  MAX_THOUGHT_LENGTH,
} from "@/lib/constants";
import { prisma } from "@/lib/db";
import { ApiError, assertSameOrigin, handleApiError, jsonOk } from "@/lib/http";
import { parseDailyThoughts } from "@/lib/import/daily-thoughts";
import { normalizeTagName } from "@/lib/thoughts";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_MARKDOWN_BYTES = 5 * 1024 * 1024;
const MAX_IMPORT_RECORDS = 5_000;
const MAX_REMOTE_IMAGE_BYTES = 15 * 1024 * 1024;

type RemoteImage = {
  url: string;
  pathname: string;
  width: number;
  height: number;
  bytes: number;
  mimeType: string;
};

function assertImportable(records: ReturnType<typeof parseDailyThoughts>) {
  if (records.length > MAX_IMPORT_RECORDS) {
    throw new ApiError(400, `一次最多导入 ${MAX_IMPORT_RECORDS} 条想法`, "TOO_MANY_RECORDS");
  }
  for (const record of records) {
    if (record.content.length > MAX_THOUGHT_LENGTH) {
      throw new ApiError(400, "文件中有想法超过字数限制", "CONTENT_TOO_LONG");
    }
    if (record.tags.length > MAX_TAGS_PER_THOUGHT || record.tags.some((tag) => tag.length > MAX_TAG_LENGTH)) {
      throw new ApiError(400, "文件中有标签超过数量或长度限制", "INVALID_TAGS");
    }
    if (record.imageUrls.length > MAX_IMAGES_PER_THOUGHT) {
      throw new ApiError(400, `每条想法最多包含 ${MAX_IMAGES_PER_THOUGHT} 张图片`, "TOO_MANY_IMAGES");
    }
  }
}

async function inspectRemoteImage(url: string): Promise<RemoteImage> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ApiError(400, "Markdown 中包含无效图片地址", "INVALID_IMAGE_URL");
  }
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".public.blob.vercel-storage.com")) {
    throw new ApiError(400, "仅支持导入 ApexMind 导出的图片地址", "UNSUPPORTED_IMAGE_HOST");
  }

  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new ApiError(400, "Markdown 中有图片已无法访问", "IMAGE_UNAVAILABLE");
  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_REMOTE_IMAGE_BYTES) {
    throw new ApiError(400, "Markdown 中有图片超过大小限制", "IMAGE_TOO_LARGE");
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_REMOTE_IMAGE_BYTES) {
    throw new ApiError(400, "Markdown 中有图片超过大小限制", "IMAGE_TOO_LARGE");
  }
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height) {
    throw new ApiError(400, "Markdown 中有图片无法识别", "INVALID_IMAGE");
  }
  return {
    url,
    pathname: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
    width: metadata.width,
    height: metadata.height,
    bytes: buffer.byteLength,
    mimeType: response.headers.get("content-type")?.split(";")[0] || `image/${metadata.format || "jpeg"}`,
  };
}

async function inspectImages(urls: string[]) {
  const results = new Map<string, RemoteImage>();
  const unavailable = new Set<string>();
  let cursor = 0;
  async function worker() {
    while (cursor < urls.length) {
      const url = urls[cursor++];
      try {
        results.set(url, await inspectRemoteImage(url));
      } catch (error) {
        if (error instanceof ApiError) {
          unavailable.add(url);
          continue;
        }
        throw error;
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(6, urls.length) }, worker));
  return { results, unavailable };
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "请选择 Markdown 文件", "FILE_REQUIRED");
    if (file.size > MAX_MARKDOWN_BYTES) throw new ApiError(400, "Markdown 文件不能超过 5MB", "FILE_TOO_LARGE");

    let records: ReturnType<typeof parseDailyThoughts>;
    try {
      records = parseDailyThoughts(await file.text());
    } catch {
      throw new ApiError(400, "无法识别这个 Markdown 文件", "INVALID_MARKDOWN");
    }
    assertImportable(records);

    const imageUrls = [...new Set(records.flatMap((record) => record.imageUrls))];
    const { results: metadata, unavailable } = await inspectImages(imageUrls);
    if (unavailable.size) {
      throw new ApiError(
        400,
        `Markdown 中有 ${unavailable.size} 张图片无法访问，请先修复图片链接后重试`,
        "IMAGE_UNAVAILABLE",
      );
    }

    const created = await prisma.thought.createMany({
      data: records.map((record) => ({
        userId: user.id,
        content: record.content,
        occurredAt: new Date(record.occurredAt),
        sourceFingerprint: record.sourceFingerprint,
      })),
      skipDuplicates: true,
    });
    const thoughts = await prisma.thought.findMany({
      where: { userId: user.id, sourceFingerprint: { in: records.map((record) => record.sourceFingerprint) } },
      select: { id: true, sourceFingerprint: true },
    });
    const thoughtByFingerprint = new Map(thoughts.map((thought) => [thought.sourceFingerprint, thought.id]));

    const tagByNormalizedName = new Map<string, string>();
    for (const tag of records.flatMap((record) => record.tags)) {
      const normalized = normalizeTagName(tag);
      if (!tagByNormalizedName.has(normalized)) tagByNormalizedName.set(normalized, tag);
    }
    if (tagByNormalizedName.size) {
      await prisma.tag.createMany({
        data: [...tagByNormalizedName].map(([normalizedName, name]) => ({ userId: user.id, name, normalizedName })),
        skipDuplicates: true,
      });
    }
    const tags = await prisma.tag.findMany({
      where: { userId: user.id, normalizedName: { in: [...tagByNormalizedName.keys()] } },
      select: { id: true, normalizedName: true },
    });
    const tagIds = new Map(tags.map((tag) => [tag.normalizedName, tag.id]));
    const joins = records.flatMap((record) => {
      const thoughtId = thoughtByFingerprint.get(record.sourceFingerprint);
      if (!thoughtId) return [];
      return record.tags.flatMap((name) => {
        const tagId = tagIds.get(normalizeTagName(name));
        return tagId ? [{ thoughtId, tagId }] : [];
      });
    });
    if (joins.length) await prisma.thoughtTag.createMany({ data: joins, skipDuplicates: true });

    const existingImages = await prisma.imageAsset.findMany({
      where: { userId: user.id, thoughtId: { in: thoughts.map((thought) => thought.id) } },
      select: { thoughtId: true, url: true },
    });
    const existing = new Set(existingImages.map((image) => `${image.thoughtId}\u0000${image.url}`));
    const images = records.flatMap((record) => {
      const thoughtId = thoughtByFingerprint.get(record.sourceFingerprint);
      if (!thoughtId) return [];
      return record.imageUrls.flatMap((url, sortOrder) => {
        if (existing.has(`${thoughtId}\u0000${url}`)) return [];
        const image = metadata.get(url);
        return image ? [{ ...image, userId: user.id, thoughtId, sortOrder }] : [];
      });
    });
    if (images.length) await prisma.imageAsset.createMany({ data: images });

    return jsonOk({
      total: records.length,
      imported: created.count,
      skipped: records.length - created.count,
      images: images.length,
      unavailableImages: 0,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
