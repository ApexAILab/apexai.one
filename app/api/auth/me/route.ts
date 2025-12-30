import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * GET /api/auth/me
 * 获取当前登录用户信息
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
        },
      },
    });
  } catch (error) {
    console.error("[Auth] 获取用户信息失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "获取用户信息失败",
      },
      { status: 500 }
    );
  }
}

