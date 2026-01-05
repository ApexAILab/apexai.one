import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/nexus/config/debug
 * 调试 API：查看当前用户的 Nexus 配置数据（开发环境专用）
 * 注意：此 API 仅用于开发环境调试，生产环境应移除或保护
 */
export async function GET() {
  // 检查是否在开发环境
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "此 API 仅在开发环境可用" },
      { status: 403 }
    );
  }

  try {
    // 验证用户身份
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    // 获取用户的凭证配置（包含所有字段）
    const credentials = await prisma.nexusCredential.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
    });

    // 获取用户的模型配置（包含所有字段）
    const models = await prisma.nexusModel.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      include: {
        credential: {
          select: {
            id: true,
            name: true,
            baseUrl: true,
          },
        },
      },
    });

    // 获取用户信息
    const userInfo = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        name: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "开发环境调试信息",
      user: userInfo,
      stats: {
        credentialsCount: credentials.length,
        modelsCount: models.length,
      },
      data: {
        credentials,
        models,
      },
      tips: [
        "此 API 仅用于开发环境调试",
        "生产环境应移除或保护此 API",
        "配置数据已正确保存到数据库",
      ],
    });
  } catch (error) {
    console.error("[Nexus Config Debug] 获取调试信息失败:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "获取调试信息失败",
      },
      { status: 500 }
    );
  }
}

