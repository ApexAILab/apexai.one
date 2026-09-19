import { describe, expect, it } from "vitest";
import {
  chinaDayBounds,
  chinaLocalInputToIso,
  chinaMonthBounds,
  toChinaDayKey,
} from "@/lib/time";

describe("China time helpers", () => {
  it("uses Asia/Shanghai when calculating day keys", () => {
    expect(toChinaDayKey("2026-09-18T16:30:00.000Z")).toBe("2026-09-19");
  });

  it("builds UTC month boundaries from China local time", () => {
    const bounds = chinaMonthBounds("2026-09");
    expect(bounds.start.toISOString()).toBe("2026-08-31T16:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-09-30T16:00:00.000Z");
  });

  it("builds UTC day boundaries from China local time", () => {
    const bounds = chinaDayBounds("2026-09-20");
    expect(bounds.start.toISOString()).toBe("2026-09-19T16:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-09-20T16:00:00.000Z");
  });

  it("converts datetime-local values to ISO", () => {
    expect(chinaLocalInputToIso("2026-09-19T15:23:52")).toBe("2026-09-19T07:23:52.000Z");
  });
});
