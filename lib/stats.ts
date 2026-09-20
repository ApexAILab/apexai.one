const STOP_WORDS = new Set([
  "的", "了", "和", "是", "在", "我", "有", "也", "就", "都", "而", "及", "与", "着", "或", "一个",
  "没有", "我们", "你", "他", "她", "它", "这", "那", "要", "会", "可以", "把", "让", "对", "中", "很",
  "自己", "什么", "怎么", "这个", "那个", "这些", "那些", "因为", "所以", "如果", "但是", "然后", "已经",
  "还是", "可能", "需要", "觉得", "感觉", "开始", "现在", "今天", "最近", "事情", "问题", "方面", "时候",
  "东西", "进行", "以及", "还有", "之后", "之前", "月份", "很多", "做了", "the", "a", "an", "and", "or", "to", "of",
  "in", "is", "it", "for", "on", "with", "this", "that", "i", "we", "you", "my", "our", "be", "are",
]);

const WORD = /^\p{L}+(?:[-'’]\p{L}+)*$/u;
const CJK = /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+$/u;
const segmenter = new Intl.Segmenter("zh-CN", { granularity: "word" });

export function countWords(content: string) {
  const cjkCount = (content.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu) ?? []).length;
  const latinWords = content
    .replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu, " ")
    .match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
  return cjkCount + latinWords;
}

type KeywordCandidate = { text: string; count: number; phrase: boolean };

function segmentedWord(value: string) {
  const text = value.normalize("NFKC").toLocaleLowerCase("zh-CN");
  if (!WORD.test(text) || STOP_WORDS.has(text)) return null;
  if (!CJK.test(text) && text.length < 2) return null;
  return text;
}

export function extractKeywords(contents: string[], limit = 25) {
  const wordCounts = new Map<string, number>();
  const phraseCounts = new Map<string, number>();

  for (const rawContent of contents) {
    const content = rawContent.normalize("NFKC").toLocaleLowerCase("zh-CN");
    let recent: Array<{ text: string; end: number }> = [];

    for (const part of segmenter.segment(content)) {
      if (!part.isWordLike) {
        if (/[^\s]/u.test(part.segment)) recent = [];
        continue;
      }

      const text = segmentedWord(part.segment);
      if (!text) {
        recent = [];
        continue;
      }

      if (!CJK.test(text) || [...text].length >= 2) {
        wordCounts.set(text, (wordCounts.get(text) ?? 0) + 1);
      }

      const current = { text, end: part.index + part.segment.length };
      if (recent.at(-1)?.end !== part.index) recent = [];
      if (CJK.test(text)) {
        for (const size of [1, 2]) {
          const prefix = recent.slice(-size);
          if (prefix.length !== size || prefix.some((item) => !CJK.test(item.text))) continue;
          const phrase = `${prefix.map((item) => item.text).join("")}${text}`;
          if ([...phrase].length <= 8) {
            phraseCounts.set(phrase, (phraseCounts.get(phrase) ?? 0) + 1);
          }
        }
      }
      recent = [...recent, current].slice(-2);
    }
  }

  const candidates: KeywordCandidate[] = [
    ...[...wordCounts.entries()].map(([text, count]) => ({ text, count, phrase: false })),
    ...[...phraseCounts.entries()]
      .filter(([, count]) => count >= 2)
      .map(([text, count]) => ({ text, count, phrase: true })),
  ];

  candidates.sort((a, b) =>
    b.count * (b.phrase ? 1.35 : 1) - a.count * (a.phrase ? 1.35 : 1) ||
    b.count - a.count ||
    Number(b.phrase) - Number(a.phrase) ||
    [...b.text].length - [...a.text].length ||
    a.text.localeCompare(b.text, "zh-CN"),
  );

  const selected: KeywordCandidate[] = [];
  for (const candidate of candidates) {
    const covered = selected.some(
      (item) => item.text.includes(candidate.text) && item.count >= candidate.count * 0.65,
    );
    if (!covered) selected.push(candidate);
    if (selected.length === limit) break;
  }

  return selected.map(({ text, count }) => ({ text, count }));
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
