import { createHash } from "node:crypto";

const ENTRY_HEADER = /^\*\*(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})\*\*\s*$/gm;
const MARKDOWN_IMAGE = /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
const TAG_TOKEN = /`#([^`]+)`/g;
const TAG_ONLY_LINE = /^\s*(?:`#[^`]+`\s*)+$/u;

export type DailyThoughtRecord = {
  occurredAt: string;
  content: string;
  tags: string[];
  imageUrls: string[];
  sourceFingerprint: string;
};

function chinaTimestampToIso(value: string) {
  const iso = `${value.replaceAll("/", "-").replace(" ", "T")}+08:00`;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid source timestamp: ${value}`);
  return date.toISOString();
}

function fingerprint(record: Omit<DailyThoughtRecord, "sourceFingerprint">) {
  return createHash("sha256").update(JSON.stringify(record)).digest("hex");
}

export function parseDailyThoughts(markdown: string): DailyThoughtRecord[] {
  const source = markdown.replaceAll("\r\n", "\n");
  const headers = [...source.matchAll(ENTRY_HEADER)];
  if (!headers.length) throw new Error("No daily-thought entries were found");

  return headers.map((header, index) => {
    const start = (header.index ?? 0) + header[0].length;
    const end = headers[index + 1]?.index ?? source.length;
    let body = source.slice(start, end).replace(/\n\s*---\s*$/u, "").trim();

    const imageUrls = [...body.matchAll(MARKDOWN_IMAGE)].map((match) => match[2]);
    body = body.replace(MARKDOWN_IMAGE, "");

    const tags: string[] = [];
    const contentLines: string[] = [];
    for (const line of body.split("\n")) {
      if (TAG_ONLY_LINE.test(line)) {
        for (const match of line.matchAll(TAG_TOKEN)) {
          const tag = match[1].trim();
          if (tag && !tags.includes(tag)) tags.push(tag);
        }
      } else {
        contentLines.push(line);
      }
    }

    const record = {
      occurredAt: chinaTimestampToIso(header[1]),
      content: contentLines.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
      tags,
      imageUrls,
    };

    if (!record.content && !record.imageUrls.length) {
      throw new Error(`Entry ${header[1]} contains neither text nor images`);
    }

    return { ...record, sourceFingerprint: fingerprint(record) };
  });
}
