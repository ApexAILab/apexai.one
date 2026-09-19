import { readFile } from "node:fs/promises";
import { Prisma, PrismaClient } from "@prisma/client";
import sharp from "sharp";
import { parseDailyThoughts } from "../lib/import/daily-thoughts";

const prisma = new PrismaClient();

function option(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function normalizedUsername(username: string) {
  return username.normalize("NFKC").trim().toLocaleLowerCase("zh-CN");
}

async function resolveUser(username: string, adoptLegacy: boolean) {
  const normalized = normalizedUsername(username);
  const current = await prisma.user.findUnique({ where: { usernameNormalized: normalized } });
  if (current) return current;
  if (!adoptLegacy) {
    throw new Error(`Account ${username} does not exist. Register it first or pass --adopt-legacy-user.`);
  }

  const legacyTable = await prisma.$queryRaw<Array<{ name: string | null }>>`
    SELECT to_regclass('public.users')::text AS name
  `;
  if (!legacyTable[0]?.name) throw new Error("The legacy public.users table is not available in this database");

  const legacyUsers = await prisma.$queryRaw<Array<{ username: string; password: string }>>`
    SELECT username, password
    FROM public.users
    WHERE lower(username) = lower(${username})
    LIMIT 1
  `;
  const legacy = legacyUsers[0];
  if (!legacy) throw new Error(`Legacy account ${username} was not found`);

  return prisma.user.create({
    data: {
      username: legacy.username,
      usernameNormalized: normalizedUsername(legacy.username),
      passwordHash: legacy.password,
    },
  });
}

async function inspectRemoteImage(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Could not read source image (${response.status}): ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height) throw new Error(`Could not determine source image size: ${url}`);
  const parsed = new URL(url);
  return {
    url,
    pathname: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
    width: metadata.width,
    height: metadata.height,
    bytes: buffer.byteLength,
    mimeType: response.headers.get("content-type")?.split(";")[0] || `image/${metadata.format || "jpeg"}`,
  };
}

async function main() {
  const sourcePath = option("--source") || process.env.SOURCE_PATH;
  const username = option("--username") || process.env.IMPORT_USERNAME;
  const apply = process.argv.includes("--apply");
  const adoptLegacy = process.argv.includes("--adopt-legacy-user");
  if (!sourcePath) throw new Error("Pass --source <path> or set SOURCE_PATH");

  const records = parseDailyThoughts(await readFile(sourcePath, "utf8"));
  const summary = {
    records: records.length,
    withImages: records.filter((record) => record.imageUrls.length > 0).length,
    images: records.reduce((sum, record) => sum + record.imageUrls.length, 0),
    tagged: records.filter((record) => record.tags.length > 0).length,
    maxContentLength: Math.max(...records.map((record) => record.content.length)),
    first: records.at(-1)?.occurredAt,
    last: records[0]?.occurredAt,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!apply) {
    console.log("Dry run complete. Add --apply and --username <name> to write data.");
    return;
  }
  if (!username) throw new Error("Pass --username <name> or set IMPORT_USERNAME when using --apply");

  const user = await resolveUser(username, adoptLegacy);
  for (let offset = 0; offset < records.length; offset += 200) {
    await prisma.thought.createMany({
      data: records.slice(offset, offset + 200).map((record) => ({
        userId: user.id,
        content: record.content,
        occurredAt: new Date(record.occurredAt),
        sourceFingerprint: record.sourceFingerprint,
      })),
      skipDuplicates: true,
    });
  }

  const thoughts = await prisma.thought.findMany({
    where: { userId: user.id, sourceFingerprint: { in: records.map((record) => record.sourceFingerprint) } },
    select: { id: true, sourceFingerprint: true },
  });
  const thoughtByFingerprint = new Map(thoughts.map((thought) => [thought.sourceFingerprint, thought.id]));

  const tagNames = [...new Set(records.flatMap((record) => record.tags))];
  await prisma.tag.createMany({
    data: tagNames.map((name) => ({
      userId: user.id,
      name,
      normalizedName: name.normalize("NFKC").toLocaleLowerCase("zh-CN"),
    })),
    skipDuplicates: true,
  });
  const tags = await prisma.tag.findMany({ where: { userId: user.id, name: { in: tagNames } } });
  const tagByName = new Map(tags.map((tag) => [tag.name, tag.id]));
  await prisma.thoughtTag.createMany({
    data: records.flatMap((record) => {
      const thoughtId = thoughtByFingerprint.get(record.sourceFingerprint);
      if (!thoughtId) throw new Error(`Imported thought was not found: ${record.sourceFingerprint}`);
      return record.tags.map((name) => {
        const tagId = tagByName.get(name);
        if (!tagId) throw new Error(`Imported tag was not found: ${name}`);
        return { thoughtId, tagId };
      });
    }),
    skipDuplicates: true,
  });

  let importedImages = 0;
  for (const record of records.filter((item) => item.imageUrls.length > 0)) {
    const thoughtId = thoughtByFingerprint.get(record.sourceFingerprint);
    if (!thoughtId) continue;
    for (const [sortOrder, url] of record.imageUrls.entries()) {
      const exists = await prisma.imageAsset.findFirst({ where: { userId: user.id, thoughtId, url } });
      if (exists) continue;
      const image = await inspectRemoteImage(url);
      await prisma.imageAsset.create({ data: { ...image, userId: user.id, thoughtId, sortOrder } });
      importedImages += 1;
    }
  }

  console.log(JSON.stringify({ account: user.username, thoughts: thoughts.length, importedImages }, null, 2));
}

main()
  .catch((error) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(`Database error ${error.code}: ${error.message}`);
    } else {
      console.error(error instanceof Error ? error.message : error);
    }
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
