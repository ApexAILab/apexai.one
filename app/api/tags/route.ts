import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, jsonOk } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireUser();
    const tags = await prisma.tag.findMany({
      where: { userId: user.id, thoughts: { some: {} } },
      select: {
        name: true,
        _count: { select: { thoughts: true } },
      },
      orderBy: { name: "asc" },
    });
    return jsonOk(
      tags
        .map((tag) => ({ name: tag.name, count: tag._count.thoughts }))
        .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "zh-CN")),
    );
  } catch (error) {
    return handleApiError(error);
  }
}
