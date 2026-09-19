import { prisma } from "@/lib/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { credentialsSchema } from "@/lib/validation";
import { normalizeUsername } from "@/lib/username";
import {
  ApiError,
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

    await enforceRateLimit({
      action: "login",
      key: `${getClientAddress(request)}:${normalized}`,
      limit: 10,
      windowMs: 15 * 60 * 1000,
      blockMs: 30 * 60 * 1000,
    });

    const user = await prisma.user.findUnique({
      where: { usernameNormalized: normalized },
    });
    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      throw new ApiError(401, "用户名或密码不正确", "INVALID_CREDENTIALS");
    }

    await prisma.session.deleteMany({
      where: { userId: user.id, expiresAt: { lte: new Date() } },
    });
    await createSession(user.id);

    return jsonOk({ id: user.id, username: user.username });
  } catch (error) {
    return handleApiError(error);
  }
}
