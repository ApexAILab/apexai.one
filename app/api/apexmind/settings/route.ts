import { NextResponse } from 'next/server'
import { config } from 'dotenv'
import { resolve } from 'path'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'

// 显式加载 .env 文件（保持与其他 API 一致）
try {
  config({ path: resolve(process.cwd(), '.env') })
} catch (error) {
  console.warn('Failed to load .env file explicitly:', error)
}

// 动态导入 prisma，避免初始化错误
async function getPrisma() {
  try {
    const { prisma } = await import('@/lib/db')
    return prisma
  } catch (error) {
    console.error('Failed to import prisma:', error)
    throw new Error(
      'Database connection failed. Please check your DATABASE_URL environment variable.'
    )
  }
}

/**
 * 这里为了简单起见，API Key 先明文存储在数据库中，
 * 后续如果需要可以接入专门的加密工具（如 KMS 或本地加密密钥）。
 */

/**
 * GET /api/apexmind/settings
 * 获取当前用户的 ApexMind 设置
 */
export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      )
    }

    const prisma = await getPrisma()
    const settings = await prisma.mindSettings.findUnique({
      where: { userId: user.id },
    })

    if (!settings) {
      return NextResponse.json({
        success: true,
        data: null,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        baseUrl: settings.baseUrl,
        chatModel: settings.chatModel,
        embeddingModel: settings.embeddingModel,
        systemPrompt: settings.systemPrompt,
        ragTopK: settings.ragTopK,
        ragTimeWindowDays: settings.ragTimeWindowDays,
        models: settings.models ?? null,
        // 明文返回（与当前项目其它配置一致）
        apiKey: settings.apiKeyEncrypted ?? null,
      },
    })
  } catch (error) {
    console.error('[ApexMind] Get settings error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

type SettingsInput = {
  apiKey?: string
  baseUrl?: string
  chatModel?: string
  embeddingModel?: string
  systemPrompt?: string
  ragTopK?: number
  ragTimeWindowDays?: number
  models?: {
    id?: string
    name?: string
    baseUrl?: string
    apiKey?: string
    embeddingApiKey?: string
    chatModel?: string
    embeddingModel?: string
    isDefault?: boolean
  }[]
}

/**
 * PUT /api/apexmind/settings
 * 更新当前用户的 ApexMind 设置
 */
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      )
    }

    const prisma = await getPrisma()
    const body = (await request.json()) as SettingsInput

    const data: any = {}

    if (typeof body.apiKey === 'string') {
      const trimmed = body.apiKey.trim()
      if (trimmed.length > 0) {
        data.apiKeyEncrypted = trimmed
      } else {
        data.apiKeyEncrypted = null
      }
    }

    if (typeof body.baseUrl === 'string') {
      data.baseUrl = body.baseUrl.trim() || null
    }

    if (typeof body.chatModel === 'string') {
      data.chatModel = body.chatModel.trim() || null
    }

    if (typeof body.embeddingModel === 'string') {
      data.embeddingModel = body.embeddingModel.trim() || null
    }

    if (typeof body.systemPrompt === 'string') {
      data.systemPrompt = body.systemPrompt.trim() || null
    }

    if (typeof body.ragTopK === 'number' && Number.isFinite(body.ragTopK)) {
      data.ragTopK = body.ragTopK
    }

    if (
      typeof body.ragTimeWindowDays === 'number' &&
      Number.isFinite(body.ragTimeWindowDays)
    ) {
      data.ragTimeWindowDays = body.ragTimeWindowDays
    }

    // 多模型配置：写入 models 字段，并用默认模型同步顶层配置
    if (Array.isArray(body.models)) {
      const models = body.models
        .filter((m) => m && typeof m === 'object')
        .map((raw, index) => ({
          id: raw.id || `model-${index + 1}`,
          name: (raw.name || '').toString().trim(),
          baseUrl: (raw.baseUrl || '').toString().trim(),
          apiKey: (raw.apiKey || '').toString().trim(),
          embeddingApiKey: (raw.embeddingApiKey || '').toString().trim(),
          chatModel: (raw.chatModel || '').toString().trim(),
          embeddingModel: (raw.embeddingModel || '').toString().trim(),
          isDefault: Boolean(raw.isDefault),
        }))
        // 过滤掉没有 baseUrl 或 chatModel 的配置
        .filter((m) => m.baseUrl && m.chatModel)

      // embedding api key 必填（多模型情况下）
      const missingEmbeddingKey = models.find(
        (m) => !m.embeddingApiKey || m.embeddingApiKey.trim().length === 0
      )
      if (missingEmbeddingKey) {
        return NextResponse.json(
          { success: false, error: 'Embedding API Key 为必填项' },
          { status: 400 }
        )
      }

      if (models.length > 0) {
        data.models = models

        const explicitDefault = models.find((m) => m.isDefault)
        const defaultModel = explicitDefault || models[0]

        data.baseUrl = defaultModel.baseUrl
        data.chatModel = defaultModel.chatModel
        data.embeddingModel = defaultModel.embeddingModel || null

        if (defaultModel.apiKey) {
          data.apiKeyEncrypted = defaultModel.apiKey
        }
      } else {
        data.models = null
      }
    }

    const settings = await prisma.mindSettings.upsert({
      where: { userId: user.id },
      update: data,
      create: {
        userId: user.id,
        ...data,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        baseUrl: settings.baseUrl,
        chatModel: settings.chatModel,
        embeddingModel: settings.embeddingModel,
        systemPrompt: settings.systemPrompt,
        ragTopK: settings.ragTopK,
        ragTimeWindowDays: settings.ragTimeWindowDays,
        apiKey: settings.apiKeyEncrypted ?? null,
      },
    })
  } catch (error) {
    console.error('[ApexMind] Update settings error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


