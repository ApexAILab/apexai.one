import { describe, expect, it } from "vitest";
import {
  calculateCurrentStreak,
  countWords,
  daysInMonth,
  extractKeywords,
} from "@/lib/stats";

describe("countWords", () => {
  it("counts CJK characters and Latin words consistently", () => {
    expect(countWords("你好世界")).toBe(4);
    expect(countWords("hello better thinking")).toBe(3);
    expect(countWords("记录 idea 2026")).toBe(4);
  });
});

describe("calculateCurrentStreak", () => {
  it("includes today when today has output", () => {
    expect(calculateCurrentStreak(["2026-09-17", "2026-09-18", "2026-09-19"], "2026-09-19")).toBe(3);
  });

  it("keeps a streak alive through yesterday before today has output", () => {
    expect(calculateCurrentStreak(["2026-09-17", "2026-09-18"], "2026-09-19")).toBe(2);
  });

  it("returns zero when neither today nor yesterday has output", () => {
    expect(calculateCurrentStreak(["2026-09-16"], "2026-09-19")).toBe(0);
  });
});

describe("keyword extraction", () => {
  it("orders meaningful repeated terms first", () => {
    const keywords = extractKeywords(["product clarity product", "clarity matters product"], 3);
    expect(keywords[0]).toEqual({ text: "product", count: 3 });
    expect(keywords[1]).toEqual({ text: "clarity", count: 2 });
  });

  it("keeps meaningful Chinese phrases and removes numeric or generic fragments", () => {
    const keywords = extractKeywords([
      "产品开发是这个月份复盘总结的重心，2026 年做了很多的事情。",
      "继续产品开发，复盘总结产品方向。",
      "产品开发要服务真实用户。",
    ]);
    const terms = keywords.map((item) => item.text);

    expect(terms[0]).toBe("产品开发");
    expect(terms).toContain("复盘总结");
    expect(terms).not.toContain("2026");
    expect(terms).not.toContain("事情");
    expect(terms.every((term) => !/\d/u.test(term))).toBe(true);
  });
});

describe("daysInMonth", () => {
  it("handles leap years", () => {
    expect(daysInMonth("2024-02")).toBe(29);
    expect(daysInMonth("2026-02")).toBe(28);
  });
});
