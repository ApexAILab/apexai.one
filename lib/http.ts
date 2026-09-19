import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "REQUEST_FAILED",
  ) {
    super(message);
  }
}

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      { ok: false, error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: error.issues[0]?.message ?? "提交内容不符合要求",
          issues: error.issues,
        },
      },
      { status: 400 },
    );
  }

  console.error("[API] Unexpected error", error);
  return NextResponse.json(
    {
      ok: false,
      error: { code: "INTERNAL_ERROR", message: "服务暂时不可用，请稍后重试" },
    },
    { status: 500 },
  );
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return;

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  if (!host) throw new ApiError(403, "请求来源无效", "INVALID_ORIGIN");

  const expectedProtocol =
    request.headers.get("x-forwarded-proto") ||
    (process.env.NODE_ENV === "production" ? "https" : "http");
  const expectedOrigin = `${expectedProtocol}://${host}`;

  if (origin !== expectedOrigin) {
    throw new ApiError(403, "请求来源无效", "INVALID_ORIGIN");
  }
}

export function getClientAddress(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
