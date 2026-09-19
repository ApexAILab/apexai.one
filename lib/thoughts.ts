import type { Prisma } from "@prisma/client";
import type { ThoughtDto } from "@/types/api";

export const thoughtInclude = {
  tags: {
    include: { tag: true },
  },
  images: {
    orderBy: { sortOrder: "asc" },
  },
} satisfies Prisma.ThoughtInclude;

type ThoughtWithRelations = Prisma.ThoughtGetPayload<{
  include: typeof thoughtInclude;
}>;

export function serializeThought(thought: ThoughtWithRelations): ThoughtDto {
  return {
    id: thought.id,
    content: thought.content,
    occurredAt: thought.occurredAt.toISOString(),
    createdAt: thought.createdAt.toISOString(),
    updatedAt: thought.updatedAt.toISOString(),
    tags: thought.tags.map(({ tag }) => tag.name),
    images: thought.images.map((image) => ({
      id: image.id,
      url: image.url,
      width: image.width,
      height: image.height,
      mimeType: image.mimeType,
      sortOrder: image.sortOrder,
    })),
  };
}

export function normalizeTagName(tag: string) {
  return tag.normalize("NFKC").trim().toLocaleLowerCase("zh-CN");
}
