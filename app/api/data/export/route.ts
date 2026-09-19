import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { exportDailyThoughts } from "@/lib/export/daily-thoughts";
import { handleApiError } from "@/lib/http";
import { todayInChina } from "@/lib/time";

export async function GET() {
  try {
    const user = await requireUser();
    const thoughts = await prisma.thought.findMany({
      where: { userId: user.id },
      orderBy: [{ occurredAt: "desc" }, { id: "desc" }],
      include: {
        tags: { include: { tag: true } },
        images: { orderBy: { sortOrder: "asc" } },
      },
    });
    const markdown = exportDailyThoughts(thoughts.map((thought) => ({
      content: thought.content,
      occurredAt: thought.occurredAt,
      tags: thought.tags.map(({ tag }) => tag.name),
      imageUrls: thought.images.map((image) => image.url),
    })));

    return new Response(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": `attachment; filename="ApexMind-${todayInChina()}.md"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
