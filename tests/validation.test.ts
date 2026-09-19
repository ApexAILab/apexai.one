import { describe, expect, it } from "vitest";
import {
  credentialsSchema,
  thoughtInputSchema,
  thoughtsQuerySchema,
  uniqueTags,
} from "@/lib/validation";

describe("credentialsSchema", () => {
  it("accepts Chinese usernames and strong-enough passwords", () => {
    expect(credentialsSchema.parse({ username: "山顶_2026", password: "eight-chars" })).toEqual({
      username: "山顶_2026",
      password: "eight-chars",
    });
  });

  it("rejects short passwords", () => {
    expect(() => credentialsSchema.parse({ username: "apex", password: "short" })).toThrow();
  });
});

describe("thoughtInputSchema", () => {
  it("requires text or at least one image", () => {
    expect(() => thoughtInputSchema.parse({ content: "", tags: [], imageIds: [] })).toThrow();
  });

  it("accepts an image-only thought", () => {
    const result = thoughtInputSchema.parse({
      content: "",
      tags: ["影像"],
      imageIds: ["cm12345678901234567890123"],
    });
    expect(result.tags).toEqual(["影像"]);
  });
});

describe("uniqueTags", () => {
  it("deduplicates tags case-insensitively while preserving display text", () => {
    expect(uniqueTags(["Product", "product", "思考", "思考"])).toEqual(["Product", "思考"]);
  });
});

describe("thoughtsQuerySchema", () => {
  it("accepts the built-in image filter", () => {
    expect(thoughtsQuerySchema.parse({ hasImages: "true" }).hasImages).toBe("true");
  });

  it("rejects ambiguous image filter values", () => {
    expect(() => thoughtsQuerySchema.parse({ hasImages: "false" })).toThrow();
  });
});
