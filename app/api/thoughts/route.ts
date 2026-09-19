import { Prisma } from "@prisma/client";
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
import {
  thoughtInputSchema,
  thoughtsQuerySchema,
  uniqueTags,
} from "@/lib/validation";
import {
  normalizeTagName,
  serializeThought,
  thoughtInclude,
} from "@/lib/thoughts";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const query = thoughtsQuerySchema.parse(Object.fromEntries(url.searchParams));

    const where: Prisma.ThoughtWhereInput = { userId: user.id };
    if (query.q) {
      where.OR = [
        { content: { contains: query.q, mode: "insensitive" } },
        {
          tags: {
            some: { tag: { name: { contains: query.q, mode: "insensitive" } } },
          },
        },
      ];
    }
    if (query.tag) {
      where.tags = {
        some: { tag: { normalizedName: normalizeTagName(query.tag) } },
      };
    }
    if (query.hasImages) {
      where.images = { some: {} };
    }

    const rows = await prisma.thought.findMany({
      where,
      include: thoughtInclude,
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
    });

    const hasMore = rows.length > query.limit;
    const items = hasMore ? rows.slice(0, query.limit) : rows;
    return jsonOk({
      items: items.map(serializeThought),
      nextCursor: hasMore ? items.at(-1)?.id ?? null : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const input = thoughtInputSchema.parse(await request.json());
    const tags = uniqueTags(input.tags);

    const thought = await prisma.$transaction(async (tx) => {
      if (input.imageIds.length) {
        const ownedImages = await tx.imageAsset.count({
          where: {
            id: { in: input.imageIds },
            userId: user.id,
            thoughtId: null,
          },
        });
        if (ownedImages !== input.imageIds.length) {
          throw new ApiError(400, "图片状态无效，请重新上传", "INVALID_IMAGES");
        }
      }

      const created = await tx.thought.create({
        data: {
          userId: user.id,
          content: input.content,
          occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
        },
      });

      for (const name of tags) {
        const normalizedName = normalizeTagName(name);
        const tag = await tx.tag.upsert({
          where: {
            userId_normalizedName: { userId: user.id, normalizedName },
          },
          create: { userId: user.id, name, normalizedName },
          update: { name },
        });
        await tx.thoughtTag.create({
          data: { thoughtId: created.id, tagId: tag.id },
        });
      }

      for (const [sortOrder, imageId] of input.imageIds.entries()) {
        await tx.imageAsset.update({
          where: { id: imageId },
          data: { thoughtId: created.id, sortOrder },
        });
      }

      return tx.thought.findUniqueOrThrow({
        where: { id: created.id },
        include: thoughtInclude,
      });
    }, { maxWait: 10_000, timeout: 30_000 });

    return jsonOk(serializeThought(thought), { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser();
    const images = await prisma.imageAsset.findMany({
      where: { userId: user.id },
      select: { url: true, pathname: true },
    });
    const deleted = await prisma.$transaction(async (tx) => {
      const thoughts = await tx.thought.deleteMany({ where: { userId: user.id } });
      await tx.imageAsset.deleteMany({ where: { userId: user.id } });
      await tx.tag.deleteMany({ where: { userId: user.id } });
      return thoughts.count;
    });
    const ownedImageUrls = images
      .filter((image) => isOwnedBlobPath(image.pathname, user.id))
      .map((image) => image.url);
    if (ownedImageUrls.length && process.env.BLOB_READ_WRITE_TOKEN) {
      await del(ownedImageUrls).catch((error) =>
        console.error("[Blob] Failed to remove account images", error),
      );
    }
    return jsonOk({ deleted });
  } catch (error) {
    return handleApiError(error);
  }
}
