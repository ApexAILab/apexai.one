import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Credential, Model } from "@/types/nexus";

/**
 * GET /api/nexus/config
 * 获取当前用户的 Nexus 配置（凭证和模型）
 * 注意：只返回当前登录用户的配置（数据隔离）
 */
export async function GET() {
  try {
    // 验证用户身份
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    // 获取用户的凭证配置
    const credentials = await prisma.nexusCredential.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        baseUrl: true,
        token: true,
      },
    });

    // 获取用户的模型配置
    const models = await prisma.nexusModel.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        credentialId: true,
        name: true,
        createPath: true,
        queryPath: true,
        paths: true,
        bodyTemplate: true,
      },
    });

    // 转换为前端需要的格式
    const credentialsData: Credential[] = credentials.map((c) => ({
      id: c.id,
      name: c.name,
      baseUrl: c.baseUrl,
      token: c.token,
    }));

    const modelsData: Model[] = models.map((m) => ({
      id: m.id,
      credentialId: m.credentialId,
      name: m.name,
      createPath: m.createPath,
      queryPath: m.queryPath,
      paths: m.paths as unknown as Model["paths"],
      bodyTemplate: m.bodyTemplate,
    }));

    return NextResponse.json({
      success: true,
      data: {
        credentials: credentialsData,
        models: modelsData,
      },
    });
  } catch (error) {
    console.error("[Nexus Config] 获取配置失败:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "获取配置失败",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/nexus/config
 * 保存当前用户的 Nexus 配置（凭证和模型）
 * 注意：配置会自动关联到当前登录用户
 */
export async function POST(request: Request) {
  try {
    // 验证用户身份
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "未登录" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { credentials, models } = body as {
      credentials?: Credential[];
      models?: Model[];
    };

    // 使用事务确保数据一致性
    const result = await prisma.$transaction(async (tx) => {
      // 删除用户现有的配置
      await tx.nexusModel.deleteMany({
        where: { userId: user.id },
      });
      await tx.nexusCredential.deleteMany({
        where: { userId: user.id },
      });

      // 保存凭证配置
      const credentialsData = Array.isArray(credentials) ? credentials : [];
      const savedCredentials = await Promise.all(
        credentialsData.map((cred) =>
          tx.nexusCredential.create({
            data: {
              userId: user.id,
              name: cred.name,
              baseUrl: cred.baseUrl,
              token: cred.token,
            },
            select: {
              id: true,
              name: true,
              baseUrl: true,
              token: true,
            },
          })
        )
      );

      // 创建凭证 ID 映射（用于更新模型的 credentialId）
      const credentialIdMap = new Map<string, string>();
      credentialsData.forEach((cred, index) => {
        credentialIdMap.set(cred.id, savedCredentials[index].id);
      });

      // 保存模型配置
      const modelsData = Array.isArray(models) ? models : [];
      const savedModels = await Promise.all(
        modelsData.map((model) => {
          // 映射 credentialId
          const newCredentialId =
            credentialIdMap.get(model.credentialId) || model.credentialId;

          return tx.nexusModel.create({
            data: {
              userId: user.id,
              credentialId: newCredentialId,
              name: model.name,
              createPath: model.createPath,
              queryPath: model.queryPath,
              paths: model.paths,
              bodyTemplate: model.bodyTemplate,
            },
            select: {
              id: true,
              credentialId: true,
              name: true,
              createPath: true,
              queryPath: true,
              paths: true,
              bodyTemplate: true,
            },
          });
        })
      );

      return {
        credentials: savedCredentials.map((c) => ({
          id: c.id,
          name: c.name,
          baseUrl: c.baseUrl,
          token: c.token,
        })),
        models: savedModels.map((m) => ({
          id: m.id,
          credentialId: m.credentialId,
          name: m.name,
          createPath: m.createPath,
          queryPath: m.queryPath,
          paths: m.paths as unknown as Model["paths"],
          bodyTemplate: m.bodyTemplate,
        })),
      };
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[Nexus Config] 保存配置失败:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "保存配置失败",
      },
      { status: 500 }
    );
  }
}

