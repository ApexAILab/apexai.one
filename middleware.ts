import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth";

/**
 * 中间件：保护需要认证的路由
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 保护 secondbrain 和 nexus 路由
  if (pathname.startsWith("/secondbrain") || pathname.startsWith("/nexus")) {
    // 从请求中获取 Cookie（在 Edge Runtime 中需要手动解析）
    const cookieHeader = request.headers.get("cookie");
    const token = cookieHeader
      ?.split(";")
      .find((c) => c.trim().startsWith("apexai-auth-token="))
      ?.split("=")[1];

    if (!token) {
      // 未登录，重定向到登录页
      const signInUrl = new URL("/auth/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }

    // 验证 Token
    const payload = await verifyToken(token);
    if (!payload) {
      // Token 无效，重定向到登录页
      const signInUrl = new URL("/auth/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.next();
}

// 配置需要匹配的路由
export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了：
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - 公开资源 (public folder)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
