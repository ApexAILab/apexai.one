import { NextResponse } from "next/server";
import { clearAuthCookie } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/auth/logout
 * 用户登出
 */
export async function POST() {
  try {
    await clearAuthCookie();

    return NextResponse.json({
      success: true,
      message: "已成功登出",
    });
  } catch (error) {
    console.error("[Auth] 登出失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "登出失败",
      },
      { status: 500 }
    );
  }
}

