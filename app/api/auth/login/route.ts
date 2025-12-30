import { NextResponse } from "next/server";
import { verifyCredentials, generateToken, setAuthCookie } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/auth/login
 * 用户登录
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password } = body;

    // 验证输入
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    // 验证凭据
    const user = await verifyCredentials(username, password);

    if (!user) {
      return NextResponse.json(
        { success: false, error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    // 生成 Token 并设置 Cookie
    const token = await generateToken(user.id, user.username);
    await setAuthCookie(token);

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
    console.error("[Auth] 登录失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "登录失败，请稍后重试",
      },
      { status: 500 }
    );
  }
}

