import { del } from "@vercel/blob";
import { requireUser } from "@/lib/auth";
import { isOwnedBlobPath } from "@/lib/blob";
import { prisma } from "@/lib/db";
import {
  ApiError,
  assertSameOrigin,
  handleApiError,
  jsonOk,
} from "@/lib/http";
import { thoughtUpdateSchema, uniqueTags } from "@/lib/validation";
import {
  normalizeTagName,
  serializeThought,
  thoughtInclude,
} from "@/lib/thoughts";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const input = thoughtUpdateSchema.parse(await request.json());
    const tags = uniqueTags(input.tags);

    const existing = await prisma.thought.findFirst({
      where: { id, userId: user.id },
      include: { images: true },
    });
    if (!existing) throw new ApiError(404, "这条想法不存在", "NOT_FOUND");

    const candidateImages = await prisma.imageAsset.findMany({
      where: {
        id: { in: input.imageIds },
        userId: user.id,
        OR: [{ thoughtId: null }, { thoughtId: id }],
      },
    });
    if (candidateImages.length !== input.imageIds.length) {
      throw new ApiError(400, "图片状态无效，请重新上传", "INVALID_IMAGES");
    }

    const removedImages = existing.images.filter(
      (image) => !input.imageIds.includes(image.id),
    );

    const thought = await prisma.$transaction(async (tx) => {
      await tx.thought.update({
        where: { id },
        data: {
          content: input.content,
          occurredAt: input.occurredAt ? new Date(input.occurredAt) : existing.occurredAt,
        },
      });

      await tx.thoughtTag.deleteMany({ where: { thoughtId: id } });
      for (const name of tags) {
        const normalizedName = normalizeTagName(name);
        const tag = await tx.tag.upsert({
          where: {
            userId_normalizedName: { userId: user.id, normalizedName },
          },
          create: { userId: user.id, name, normalizedName },
          update: { name },
        });
        await tx.thoughtTag.create({ data: { thoughtId: id, tagId: tag.id } });
      }

      if (removedImages.length) {
        await tx.imageAsset.deleteMany({
          where: { id: { in: removedImages.map((image) => image.id) }, userId: user.id },
        });
      }
      for (const [sortOrder, imageId] of input.imageIds.entries()) {
        await tx.imageAsset.update({
          where: { id: imageId },
          data: { thoughtId: id, sortOrder },
        });
      }

      return tx.thought.findUniqueOrThrow({ where: { id }, include: thoughtInclude });
    }, { maxWait: 10_000, timeout: 30_000 });

    const removedOwnedImageUrls = removedImages
      .filter((image) => isOwnedBlobPath(image.pathname, user.id))
      .map((image) => image.url);
    if (removedOwnedImageUrls.length && process.env.BLOB_READ_WRITE_TOKEN) {
      await del(removedOwnedImageUrls).catch((error) =>
        console.error("[Blob] Failed to remove detached images", error),
      );
    }

    return jsonOk(serializeThought(thought));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const { id } = await context.params;
    const thought = await prisma.thought.findFirst({
      where: { id, userId: user.id },
      include: { images: true },
    });
    if (!thought) throw new ApiError(404, "这条想法不存在", "NOT_FOUND");

    await prisma.thought.delete({ where: { id } });
    const ownedImageUrls = thought.images
      .filter((image) => isOwnedBlobPath(image.pathname, user.id))
      .map((image) => image.url);
    if (ownedImageUrls.length && process.env.BLOB_READ_WRITE_TOKEN) {
      await del(ownedImageUrls).catch((error) =>
        console.error("[Blob] Failed to remove deleted thought images", error),
      );
    }

    return jsonOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
