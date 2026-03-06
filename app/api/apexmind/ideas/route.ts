import { NextResponse } from 'next/server'
import { config } from 'dotenv'
import { resolve } from 'path'
import { getCurrentUser } from '@/lib/auth'
import { embedText, serializeEmbedding } from '@/lib/apexmind-embeddings'

export const runtime = 'nodejs'

// 显式加载 .env 文件（与现有 posts/test-db 路由保持一致）
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

type DraftItem = {
  type: 'text' | 'image'
  content: string
  createdAt?: string
}

/**
 * 从草稿条目中提取标签（以 # 开头的词）
 */
function extractTagsFromItems(items: DraftItem[]): string[] {
  const tagSet = new Set<string>()

  const tagRegex = /#([\p{Letter}\p{Number}_-]+)/gu

  for (const item of items) {
    if (item.type !== 'text' || !item.content) continue
    const text = item.content
    let match: RegExpExecArray | null
    while ((match = tagRegex.exec(text)) !== null) {
      const raw = match[1].trim()
      if (raw) {
        // 标签统一转小写，避免重复
        tagSet.add(raw.toLowerCase())
      }
    }
  }

  return Array.from(tagSet)
}

/**
 * POST /api/apexmind/ideas
 * 将一组草稿碎片打包为一条「完整想法」
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      )
    }

    const prisma = await getPrisma()
    const body = (await request.json()) as { items?: DraftItem[] }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: '打包内容不能为空' },
        { status: 400 }
      )
    }

    const items: DraftItem[] = body.items
      .filter((item) => item && typeof item === 'object')
      .map((raw) => ({
        type: raw.type === 'image' ? 'image' : 'text',
        content: String(raw.content ?? '').toString(),
        createdAt: raw.createdAt,
      }))

    const tagOnlyRegex = /#([\p{Letter}\p{Number}_-]+)/gu

    const textParts = items
      .filter((item) => item.type === 'text')
      .map((item) => String(item.content ?? '').toString())
      .map((raw) => {
        const original = raw.trim()
        if (!original) return ''
        // 去掉所有 #标签 后，如果只剩空白，则视为「纯标签消息」，不进入正文
        const withoutTags = original.replace(tagOnlyRegex, '').trim()
        return withoutTags.length > 0 ? original : ''
      })
      .filter((v) => v.length > 0)

    const imageUrls = items
      .filter((item) => item.type === 'image')
      .map((item) => String(item.content).trim())
      .filter((v) => v.length > 0)

    if (textParts.length === 0 && imageUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: '没有可用的文本或图片内容，无法打包' },
        { status: 400 }
      )
    }

    const mergedContent = textParts
      .join('\n\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    const tags = extractTagsFromItems(items)

    // 先创建 MindIdea，再单独创建 MindRecordEvent，避免长事务超时
    const idea = await prisma.mindIdea.create({
      data: {
        userId: user.id,
        content: mergedContent,
        tags,
        imageUrls,
        sourceMeta: {
          itemCount: items.length,
        },
      },
    })

    // 将本次打包的 DraftItem 列表，转化为 MindRecordEvent，便于未来完整还原为一条条消息
    const baseGroupId = idea.id

    const recordEventsData = items.map((item, index) => {
      const createdAt =
        item.createdAt && new Date(item.createdAt).toString() !== 'Invalid Date'
          ? new Date(item.createdAt)
          : new Date()

      // 简单抽取该条目中的标签，和 ideas 中的规则保持一致
      const tagRegex = /#([\p{Letter}\p{Number}_-]+)/gu
      const tagsForEvent: string[] = []
      let match: RegExpExecArray | null
      while ((match = tagRegex.exec(item.content)) !== null) {
        const raw = match[1].trim()
        if (raw) {
          tagsForEvent.push(raw.toLowerCase())
        }
      }

      return {
        userId: user.id,
        ideaId: idea.id,
        groupId: baseGroupId,
        order: index,
        kind: item.type,
        content: item.content,
        tags: tagsForEvent,
        createdAt,
      }
    })

    if (recordEventsData.length > 0) {
      const prismaAny: any = prisma
      if (typeof prismaAny.mindRecordEvent?.createMany === 'function') {
        await prismaAny.mindRecordEvent.createMany({
          data: recordEventsData,
        })
      }
    }

    // 生成并保存该完整想法的 Embedding（失败不影响主流程）
    try {
      const settings = await prisma.mindSettings.findUnique({
        where: { userId: user.id },
      })

      const baseUrl = settings?.baseUrl?.trim() || ''

      // 从多模型配置中挑选默认模型，支持单独的 embeddingApiKey
      let embeddingModel = settings?.embeddingModel?.trim() || ''
      let embeddingApiKey = settings?.apiKeyEncrypted?.trim() || ''

      if (settings?.models) {
        try {
          const rawModels = Array.isArray(settings.models)
            ? settings.models
            : []
          const models = rawModels
            .filter((m: any) => m && typeof m === 'object')
            .map((raw: any, index: number) => ({
              id: (raw.id || `model-${index + 1}`).toString(),
              baseUrl: (raw.baseUrl || '').toString().trim(),
              apiKey: (raw.apiKey || '').toString().trim(),
              embeddingApiKey: (raw.embeddingApiKey || '').toString().trim(),
              chatModel: (raw.chatModel || '').toString().trim(),
              embeddingModel: (raw.embeddingModel || '').toString().trim(),
              isDefault: Boolean(raw.isDefault),
            }))
            .filter((m: any) => m.baseUrl && (m.chatModel || m.embeddingModel))

          if (models.length > 0) {
            const explicitDefault = models.find((m: any) => m.isDefault)
            const defaultModel = explicitDefault || models[0]

            if (defaultModel.embeddingModel) {
              embeddingModel = defaultModel.embeddingModel
            }
            // embeddingApiKey 必须显式配置，不复用 apiKey
            embeddingApiKey = defaultModel.embeddingApiKey || ''
          }
        } catch (parseErr) {
          console.error(
            '[ApexMind] 解析 MindSettings.models 失败，将回退到顶层 embedding 配置:',
            parseErr
          )
        }
      }

      if (baseUrl && embeddingApiKey && embeddingModel && mergedContent.trim()) {
        const vec = await embedText({
          baseUrl,
          apiKey: embeddingApiKey,
          model: embeddingModel,
          input: mergedContent,
        })

        if (vec) {
          await prisma.mindIdeaEmbedding.upsert({
            where: { ideaId: idea.id },
            update: {
              embedding: serializeEmbedding(vec),
            },
            create: {
              ideaId: idea.id,
              embedding: serializeEmbedding(vec),
            },
          })
        }
      }
    } catch (embedError) {
      console.error('[ApexMind] 创建想法时生成 Embedding 失败:', embedError)
      // 不抛出，保证打包接口对用户始终可用
    }

    // 打包成功后，清空该用户的草稿
    await prisma.mindDraft.deleteMany({
      where: { userId: user.id },
    })

    return NextResponse.json({
      success: true,
      data: idea,
    })
  } catch (error) {
    console.error('[ApexMind] Create idea error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/apexmind/ideas
 * 获取 ApexMind 完整想法列表（支持简单筛选与分页）
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      )
    }

    const prisma = await getPrisma()
    const { searchParams } = new URL(request.url)

    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1)
    let pageSize = parseInt(searchParams.get('pageSize') || '20', 10)
    const MAX_PAGE_SIZE = 100
    if (pageSize > MAX_PAGE_SIZE) pageSize = MAX_PAGE_SIZE
    if (pageSize <= 0) pageSize = 20

    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')
    const keyword = searchParams.get('keyword')?.trim()
    const tagsParam = searchParams.get('tags') // 逗号分隔的标签字符串
    const hasImageParam = searchParams.get('hasImage')

    const where: any = {
      userId: user.id,
    }

    if (startDateStr || endDateStr) {
      const createdAt: any = {}
      if (startDateStr) {
        const start = new Date(startDateStr)
        if (!Number.isNaN(start.getTime())) {
          createdAt.gte = start
        }
      }
      if (endDateStr) {
        const end = new Date(endDateStr)
        if (!Number.isNaN(end.getTime())) {
          createdAt.lte = end
        }
      }
      if (Object.keys(createdAt).length > 0) {
        where.createdAt = createdAt
      }
    }

    if (keyword) {
      where.content = {
        contains: keyword,
        mode: 'insensitive',
      }
    }

    if (tagsParam) {
      const tags = tagsParam
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0)
      if (tags.length > 0) {
        where.tags = {
          hasSome: tags,
        }
      }
    }

    if (hasImageParam === '1') {
      where.imageUrls = {
        isEmpty: false,
      }
    }

    const [items, total] = await Promise.all([
      prisma.mindIdea.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.mindIdea.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: items,
      pagination: {
        page,
        pageSize,
        total,
      },
    })
  } catch (error) {
    console.error('[ApexMind] Get ideas error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


