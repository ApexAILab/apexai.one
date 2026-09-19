import { del } from "@vercel/blob";
import { requireUser } from "@/lib/auth";
import { isOwnedBlobPath } from "@/lib/blob";
import { prisma } from "@/lib/db";
import { ApiError, assertSameOrigin, handleApiError, jsonOk } from "@/lib/http";

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const image = await prisma.imageAsset.findFirst({
      where: { id, userId: user.id },
    });
    if (!image) throw new ApiError(404, "图片不存在", "NOT_FOUND");
    if (image.thoughtId) {
      throw new ApiError(409, "已发布图片需要通过编辑想法删除", "IMAGE_IN_USE");
    }

    await prisma.imageAsset.delete({ where: { id } });
    if (process.env.BLOB_READ_WRITE_TOKEN && isOwnedBlobPath(image.pathname, user.id)) {
      await del(image.url).catch((error) =>
        console.error("[Blob] Failed to remove pending image", error),
      );
    }
    return jsonOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
