import { z } from "zod";
import {
  MAX_IMAGES_PER_THOUGHT,
  MAX_TAG_LENGTH,
  MAX_TAGS_PER_THOUGHT,
  MAX_THOUGHT_LENGTH,
} from "@/lib/constants";

const usernamePattern = /^[\p{L}\p{N}_-]+$/u;

export const credentialsSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "用户名至少需要 3 个字符")
    .max(24, "用户名最多 24 个字符")
    .regex(usernamePattern, "用户名只能包含文字、数字、下划线和连字符"),
  password: z
    .string()
    .min(8, "密码至少需要 8 个字符")
    .max(128, "密码最多 128 个字符"),
});

const tagSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_TAG_LENGTH)
  .transform((tag) => tag.replace(/^#+/, "").trim())
  .refine((tag) => tag.length > 0, "标签不能为空");

export const thoughtInputSchema = z
  .object({
    content: z.string().trim().max(MAX_THOUGHT_LENGTH),
    tags: z.array(tagSchema).max(MAX_TAGS_PER_THOUGHT).default([]),
    imageIds: z.array(z.string().cuid()).max(MAX_IMAGES_PER_THOUGHT).default([]),
    occurredAt: z.iso.datetime({ offset: true }).optional(),
  })
  .superRefine((value, context) => {
    if (!value.content && value.imageIds.length === 0) {
      context.addIssue({
        code: "custom",
        message: "请输入文字或添加图片",
        path: ["content"],
      });
    }
  });

export const thoughtUpdateSchema = thoughtInputSchema;

export const thoughtsQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  tag: z.string().trim().max(MAX_TAG_LENGTH).optional(),
  hasImages: z.enum(["true"]).optional(),
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const statsQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "月份格式应为 YYYY-MM"),
});

export function uniqueTags(tags: string[]) {
  const seen = new Set<string>();
  return tags.filter((tag) => {
    const key = tag.normalize("NFKC").toLocaleLowerCase("zh-CN");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
