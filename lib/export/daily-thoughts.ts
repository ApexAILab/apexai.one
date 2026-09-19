import { CHINA_TIME_ZONE } from "@/lib/constants";

export type MarkdownThought = {
  content: string;
  occurredAt: Date | string;
  tags: string[];
  imageUrls: string[];
};

export function formatChinaTimestamp(value: Date | string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CHINA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}/${get("month")}/${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

export function exportDailyThoughts(records: MarkdownThought[]) {
  if (!records.length) return "";
  const sections = records.map((record) => {
    const lines = ["---", "", `**${formatChinaTimestamp(record.occurredAt)}**`];
    if (record.content) lines.push(record.content);
    for (const url of record.imageUrls) lines.push(`![图片](${url})`);
    if (record.tags.length) lines.push(record.tags.map((tag) => `\`#${tag}\``).join(" "));
    return lines.join("\n");
  });
  return `${sections.join("\n\n")}\n\n---\n`;
}
