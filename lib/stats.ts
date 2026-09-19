const STOP_WORDS = new Set([
  "的", "了", "和", "是", "在", "我", "有", "也", "就", "都", "而", "及", "与", "着", "或", "一个",
  "没有", "我们", "你", "他", "她", "它", "这", "那", "要", "会", "可以", "把", "让", "对", "中", "很",
  "the", "a", "an", "and", "or", "to", "of", "in", "is", "it", "for", "on", "with", "this", "that",
]);

export function countWords(content: string) {
  const cjkCount = (content.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu) ?? []).length;
  const latinWords = content
    .replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu, " ")
    .match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
  return cjkCount + latinWords;
}

export function extractKeywords(contents: string[], limit = 36) {
  const counts = new Map<string, number>();
  const source = contents.join("\n").normalize("NFKC").toLocaleLowerCase("zh-CN");
  const latin = source.match(/[a-z0-9][a-z0-9-]{1,30}/g) ?? [];
  const cjkRuns = source.match(/[\p{Script=Han}]{2,8}/gu) ?? [];

  for (const token of [...latin, ...cjkRuns]) {
    if (STOP_WORDS.has(token)) continue;
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-CN"))
    .slice(0, limit)
    .map(([text, count]) => ({ text, count }));
}

function addDays(dayKey: string, delta: number) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + delta));
  return date.toISOString().slice(0, 10);
}

export function calculateCurrentStreak(activeDays: string[], today: string) {
  const active = new Set(activeDays);
  let cursor = active.has(today) ? today : addDays(today, -1);
  let streak = 0;

  while (active.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return streak;
}

export function daysInMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}
