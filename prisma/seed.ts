import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error("Set SEED_PASSWORD to at least 8 characters before running db:seed");
  }

  const username = process.env.SEED_USERNAME?.trim() || "apexmind_demo";
  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.upsert({
    where: { usernameNormalized: username.normalize("NFKC").toLocaleLowerCase("zh-CN") },
    update: {},
    create: { username, usernameNormalized: username.normalize("NFKC").toLocaleLowerCase("zh-CN"), passwordHash },
  });

  await prisma.thought.createMany({
    data: [
      {
        userId: user.id,
        content: "清晰比丰富更重要。",
        occurredAt: new Date("2026-09-19T07:23:52.000Z"),
        sourceFingerprint: "seed:apexmind:v1:one",
      },
      {
        userId: user.id,
        content: "把注意力留给真正重要的事。",
        occurredAt: new Date("2026-09-18T01:40:35.000Z"),
        sourceFingerprint: "seed:apexmind:v1:two",
      },
    ],
    skipDuplicates: true,
  });

  console.log(`Seeded development account: ${username}`);
}

main()
  .finally(() => prisma.$disconnect())
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
