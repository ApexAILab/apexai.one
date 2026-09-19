import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import sharp from "sharp";

const png = await sharp({
  create: {
    width: 4,
    height: 4,
    channels: 3,
    background: { r: 25, g: 25, b: 25 },
  },
})
  .png()
  .toBuffer();

test("homepage presents the final brand direction", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("APEXAI", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Make space for better thinking/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "ApexMind" })).toBeVisible();
});

test("a new user can record, search, edit, inspect stats, and permanently delete thoughts", async ({ page }) => {
  const username = `e2e_${randomUUID().slice(0, 12)}`;
  await page.goto("/register");
  await page.getByLabel("用户名").fill(username);
  await page.locator('input[name="password"]').fill("ApexMind-Test-2026!");
  await page.getByRole("button", { name: "创建账户" }).click();
  await expect(page).toHaveURL(/\/apexmind$/, { timeout: 30_000 });

  await page.getByLabel("记录想法").fill("测试文字记录：清晰比丰富更重要。");
  await page.getByRole("button", { name: "添加标签" }).click();
  const tagInput = page.locator('input[aria-label="添加标签"]');
  await tagInput.fill("测试");
  await tagInput.press("Enter");
  await page.locator('.composer-card input[type="file"]').setInputFiles({
    name: "apexmind-test.png",
    mimeType: "image/png",
    buffer: png,
  });
  await expect(page.locator(".composer-card .image-tile")).toHaveCount(1, { timeout: 30_000 });
  await page.getByRole("button", { name: "发布想法" }).click();

  const card = page.locator(".thought-card").filter({ hasText: "测试文字记录" }).first();
  await expect(card).toBeVisible({ timeout: 30_000 });
  await expect(card.getByRole("button", { name: "#测试" })).toBeVisible();
  await expect(card.locator(".image-tile")).toHaveCount(1);
  await page.getByRole("button", { name: "图片", exact: true }).click();
  await expect(card).toBeVisible();
  await page.getByRole("button", { name: "全部", exact: true }).click();

  await page.getByRole("button", { name: "搜索" }).click();
  await page.getByLabel("搜索关键词").fill("清晰");
  await expect(card).toBeVisible();

  await card.getByRole("button", { name: "编辑想法" }).click();
  const editDialog = page.getByRole("dialog", { name: "编辑想法" });
  await editDialog.locator("textarea").fill("已编辑的测试想法。");
  await page.getByRole("button", { name: "保存修改" }).click();
  await expect(editDialog).toBeHidden({ timeout: 30_000 });
  await expect(page.getByText("已编辑的测试想法。", { exact: true })).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: "统计" }).click();
  const statsDialog = page.getByRole("dialog", { name: "统计" });
  await expect(statsDialog).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("全部想法", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "导入 Markdown" })).toBeVisible();
  await expect(page.getByRole("button", { name: "导出 Markdown" })).toBeVisible();
  await expect(page.getByRole("button", { name: "删除全部想法" })).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 Markdown" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^ApexMind-.+\.md$/);

  await statsDialog.locator('input[type="file"]').setInputFiles({
    name: "apexmind-import.md",
    mimeType: "text/markdown",
    buffer: Buffer.from("---\n\n**2026/09/18 09:40:35**\n导入功能测试\n`#导入`\n\n---\n"),
  });
  await expect(page.getByText(/已导入 1 条想法/)).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "关闭" }).click();
  await expect(page.getByText("导入功能测试", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "统计" }).click();
  await page.getByRole("button", { name: "删除全部想法" }).click();
  await page.getByRole("button", { name: "确认删除" }).click();
  await expect(page.getByText("已编辑的测试想法。", { exact: true })).toHaveCount(0, { timeout: 30_000 });
  await expect(page.getByText("导入功能测试", { exact: true })).toHaveCount(0);
});
