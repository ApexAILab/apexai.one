import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { handleApiError, jsonOk } from "@/lib/http";
import { statsQuerySchema } from "@/lib/validation";
import { calculateCurrentStreak, countWords, extractKeywords } from "@/lib/stats";
import { chinaMonthBounds, toChinaDayKey, todayInChina } from "@/lib/time";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const { month, keywordScope } = statsQuerySchema.parse(Object.fromEntries(url.searchParams));
    const { start, end } = chinaMonthBounds(month);

    const [allThoughts, monthThoughts] = await Promise.all([
      prisma.thought.findMany({
        where: { userId: user.id },
        select: { content: true, occurredAt: true },
        orderBy: { occurredAt: "asc" },
      }),
      prisma.thought.findMany({
        where: { userId: user.id, occurredAt: { gte: start, lt: end } },
        select: { occurredAt: true },
      }),
    ]);

    const allActiveDays = [...new Set(allThoughts.map((item) => toChinaDayKey(item.occurredAt)))];
    const monthActiveDays = [...new Set(monthThoughts.map((item) => toChinaDayKey(item.occurredAt)))];
    const keywordThoughts = allThoughts.filter((item) => {
      const day = toChinaDayKey(item.occurredAt);
      if (keywordScope === "month") return day.startsWith(month);
      if (keywordScope === "year") return day.startsWith(month.slice(0, 4));
      return true;
    });

    return jsonOk({
      month,
      keywordScope,
      totalThoughts: allThoughts.length,
      totalWords: allThoughts.reduce((sum, item) => sum + countWords(item.content), 0),
      currentStreak: calculateCurrentStreak(allActiveDays, todayInChina()),
      activeDays: monthActiveDays,
      wordCloud: extractKeywords(keywordThoughts.map((item) => item.content)),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
