import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { MAX_IMAGE_BYTES } from "@/lib/constants";
import { ApiError, assertSameOrigin, handleApiError } from "@/lib/http";

export const runtime = "nodejs";

const allowedContentTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
];

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new ApiError(503, "图片存储尚未配置", "STORAGE_NOT_CONFIGURED");
    }

    const body = (await request.json()) as HandleUploadBody;
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith(`apexmind/${user.id}/`)) {
          throw new ApiError(403, "图片路径无效", "INVALID_IMAGE_PATH");
        }
        return {
          allowedContentTypes,
          maximumSizeInBytes: MAX_IMAGE_BYTES,
          addRandomSuffix: false,
        };
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
