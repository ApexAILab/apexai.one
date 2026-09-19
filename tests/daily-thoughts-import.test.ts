import { describe, expect, it } from "vitest";
import { parseDailyThoughts } from "@/lib/import/daily-thoughts";

describe("parseDailyThoughts", () => {
  it("parses timestamps, tags, images, and multiline content", () => {
    const records = parseDailyThoughts(`---

**2026/09/19 15:23:52**
第一行
第二行

![图片](https://example.com/one.png)
\`#精华\`

---

**2026/09/18 09:40:35**
另一条想法
\`#稍后处理\` \`#精华\`
`);

    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      occurredAt: "2026-09-19T07:23:52.000Z",
      content: "第一行\n第二行",
      tags: ["精华"],
      imageUrls: ["https://example.com/one.png"],
    });
    expect(records[0].sourceFingerprint).toHaveLength(64);
    expect(records[1].content).toBe("另一条想法");
    expect(records[1].tags).toEqual(["稍后处理", "精华"]);
  });

  it("round-trips the exported Markdown format", async () => {
    const { exportDailyThoughts } = await import("@/lib/export/daily-thoughts");
    const markdown = exportDailyThoughts([
      {
        occurredAt: "2026-09-19T07:23:52.000Z",
        content: "第一行\n第二行",
        tags: ["精华", "复盘"],
        imageUrls: ["https://example.public.blob.vercel-storage.com/one.png"],
      },
    ]);
    expect(markdown).toBe(`---

**2026/09/19 15:23:52**
第一行
第二行
![图片](https://example.public.blob.vercel-storage.com/one.png)
\`#精华\` \`#复盘\`

---
`);
    expect(parseDailyThoughts(markdown)[0]).toMatchObject({
      content: "第一行\n第二行",
      tags: ["精华", "复盘"],
      imageUrls: ["https://example.public.blob.vercel-storage.com/one.png"],
    });
  });

  it("generates stable fingerprints", () => {
    const markdown = "**2026/09/19 15:23:52**\n同一条记录";
    expect(parseDailyThoughts(markdown)[0].sourceFingerprint).toBe(
      parseDailyThoughts(markdown)[0].sourceFingerprint,
    );
  });
});
