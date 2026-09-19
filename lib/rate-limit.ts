import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/http";

type LimitOptions = {
  action: string;
  key: string;
  limit: number;
  windowMs: number;
  blockMs: number;
};

export async function enforceRateLimit(options: LimitOptions) {
  const now = new Date();
  const keyHash = createHash("sha256").update(options.key).digest("hex");
  const bucket = await prisma.rateLimitBucket.findUnique({
    where: { keyHash_action: { keyHash, action: options.action } },
  });

  if (bucket?.blockedUntil && bucket.blockedUntil > now) {
    throw new ApiError(429, "尝试次数过多，请稍后再试", "RATE_LIMITED");
  }

  const windowExpired =
    !bucket || now.getTime() - bucket.windowStart.getTime() >= options.windowMs;

  if (windowExpired) {
    await prisma.rateLimitBucket.upsert({
      where: { keyHash_action: { keyHash, action: options.action } },
      create: { keyHash, action: options.action, windowStart: now, count: 1 },
      update: { windowStart: now, count: 1, blockedUntil: null },
    });
    return;
  }

  const nextCount = bucket.count + 1;
  const blockedUntil =
    nextCount > options.limit ? new Date(now.getTime() + options.blockMs) : null;

  await prisma.rateLimitBucket.update({
    where: { id: bucket.id },
    data: { count: nextCount, blockedUntil },
  });

  if (blockedUntil) {
    throw new ApiError(429, "尝试次数过多，请稍后再试", "RATE_LIMITED");
  }
}
