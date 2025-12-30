import { NextResponse } from "next/server"

/**
 * 调试 API：检查认证相关的环境变量配置
 * 注意：此 API 仅用于开发环境调试，生产环境应移除或保护
 */
export async function GET() {
  // 检查是否在开发环境
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "此 API 仅在开发环境可用" },
      { status: 403 }
    )
  }

  const config = {
    hasAuthSecret: !!process.env.AUTH_SECRET,
    authSecretLength: process.env.AUTH_SECRET?.length || 0,
    nodeEnv: process.env.NODE_ENV,
  }

  // 检查配置完整性
  const issues: string[] = []
  const recommendations: string[] = []

  if (!config.hasAuthSecret) {
    issues.push("AUTH_SECRET 未配置")
    recommendations.push(`在 .env 文件中添加: AUTH_SECRET="运行 openssl rand -base64 32 生成"`)
  } else if (config.authSecretLength < 32) {
    issues.push("AUTH_SECRET 长度不足（应至少 32 字符）")
  }

  return NextResponse.json({
    message: "认证配置检查（Credentials Auth）",
    status: issues.length === 0 ? "✅ 配置完整" : "❌ 配置有问题",
    config,
    issues,
    recommendations,
    tips: {
      authSecret: config.hasAuthSecret
        ? `✅ AUTH_SECRET 已配置 (长度: ${config.authSecretLength})`
        : "❌ AUTH_SECRET 未配置，请运行 openssl rand -base64 32 生成",
    },
    // 提供一个示例 .env 配置
    exampleEnv: `# 复制以下内容到 .env 文件\nAUTH_SECRET="运行 openssl rand -base64 32 生成"`,
  })
}
