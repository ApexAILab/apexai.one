import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, generateToken, setAuthCookie } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/auth/register
 * 用户注册
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { username, password, name } = body;

    // 验证输入
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    // 验证用户名格式（只允许字母、数字、下划线，3-20个字符）
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json(
        { success: false, error: "用户名只能包含字母、数字和下划线，长度3-20个字符" },
        { status: 400 }
      );
    }

    // 验证密码长度（至少6个字符）
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: "密码长度至少6个字符" },
        { status: 400 }
      );
    }

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "用户名已存在" },
        { status: 400 }
      );
    }

    // 加密密码
    const hashedPassword = await hashPassword(password);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        name: name || null,
      },
      select: {
        id: true,
        username: true,
        name: true,
        createdAt: true,
      },
    });

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
    console.error("[Auth] 注册失败:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "注册失败，请稍后重试",
      },
      { status: 500 }
    );
  }
}

