import { prisma } from "@/lib/db";
import { createSession, hashPassword } from "@/lib/auth";
import { credentialsSchema } from "@/lib/validation";
import { normalizeUsername } from "@/lib/username";
import {
  assertSameOrigin,
  getClientAddress,
  handleApiError,
  jsonOk,
} from "@/lib/http";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = credentialsSchema.parse(await request.json());
    const normalized = normalizeUsername(body.username);
    const address = getClientAddress(request);

    await enforceRateLimit({
      action: "register",
      key: address,
      limit: 8,
      windowMs: 60 * 60 * 1000,
      blockMs: 60 * 60 * 1000,
    });

    const existing = await prisma.user.findUnique({
      where: { usernameNormalized: normalized },
      select: { id: true },
    });
    if (existing) {
      return Response.json(
        { ok: false, error: { code: "USERNAME_TAKEN", message: "这个用户名已被使用" } },
        { status: 409 },
      );
    }

    const user = await prisma.user.create({
      data: {
        username: body.username.normalize("NFKC").trim(),
        usernameNormalized: normalized,
        passwordHash: await hashPassword(body.password),
      },
      select: { id: true, username: true },
    });

    await createSession(user.id);
    return jsonOk(user, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
