import { NextResponse } from 'next/server'
import { config } from 'dotenv'
import { resolve } from 'path'
import { getCurrentUser } from '@/lib/auth'
import { embedText, serializeEmbedding } from '@/lib/apexmind-embeddings'

export const runtime = 'nodejs'

// 显式加载 .env 文件（与其它 ApexMind API 路由保持一致）
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

type PlanetPost = {
  timestamp: Date
  timestampRaw: string
  text: string
  imageUrls: string[]
  tags: string[]
}

function parsePlanetTimestamp(raw: string): Date | null {
  // raw: "YYYY/MM/DD HH:mm:ss"
  const m =
    /^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2}):(\d{2})$/.exec(raw.trim())
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  const hour = Number(m[4])
  const minute = Number(m[5])
  const second = Number(m[6])
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    !Number.isFinite(second)
  ) {
    return null
  }
  return new Date(year, month - 1, day, hour, minute, second, 0)
}

function extractTagsFromText(text: string): string[] {
  const tagSet = new Set<string>()
  const tagRegex = /#([\p{Letter}\p{Number}_-]+)/gu

  let match: RegExpExecArray | null
  while ((match = tagRegex.exec(text)) !== null) {
    const raw = match[1].trim()
    if (raw) tagSet.add(raw.toLowerCase())
  }

  return Array.from(tagSet)
}

function normalizeInlineCodeTags(text: string) {
  // 将 `#精华` 转为 #精华（去掉反引号，保留内容用于聊天区显示）
  return text.replace(/`(#([^`]+))`/g, '$1')
}

function parsePlanetMarkdown(md: string): PlanetPost[] {
  const text = md.replace(/\r\n/g, '\n')
  const lines = text.split('\n')

  const posts: PlanetPost[] = []

  const tsLineRegex =
    /^\*\*(\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})\*\*$/
  const imageRegex = /!\[[^\]]*]\((https?:\/\/[^\s)]+)\)/g

  let currentTs: Date | null = null
  let currentTsRaw = ''
  let textLines: string[] = []
  let imageUrls: string[] = []
  const tagSet = new Set<string>()

  const flush = () => {
    if (!currentTs) return
    const mergedText = textLines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
    const tags = Array.from(tagSet)
    posts.push({
      timestamp: currentTs,
      timestampRaw: currentTsRaw,
      text: mergedText,
      imageUrls: imageUrls.filter((u) => u && u.trim().length > 0),
      tags,
    })
  }

  for (const rawLine of lines) {
    const line = rawLine ?? ''
    const trimmed = line.trim()

    if (trimmed === '---') {
      continue
    }

    const tsMatch = tsLineRegex.exec(trimmed)
    if (tsMatch) {
      // 开启新帖子：先落库上一条
      flush()

      // reset
      currentTs = null
      currentTsRaw = ''
      textLines = []
      imageUrls = []
      tagSet.clear()

      const tsRaw = tsMatch[1]
      const parsed = parsePlanetTimestamp(tsRaw)
      if (!parsed) continue
      currentTs = parsed
      currentTsRaw = tsRaw
      continue
    }

    // 第一条时间戳前的内容全部忽略（如文件开头的 ---）
    if (!currentTs) continue

    // 处理图片：提取 URL，并从文字中移除图片 markdown
    let rest = line
    let imgMatch: RegExpExecArray | null
    while ((imgMatch = imageRegex.exec(line)) !== null) {
      const url = (imgMatch[1] || '').trim()
      if (url) imageUrls.push(url)
    }
    rest = rest.replace(imageRegex, '').trimEnd()

    // 处理标签行：将 `#精华` 规范化为 #精华
    rest = normalizeInlineCodeTags(rest)

    // 从剩余文本中抽取标签（包含行内的 #xxx）
    for (const t of extractTagsFromText(rest)) {
      if (t) tagSet.add(t)
    }

    // 将文本加入正文（保留空行用于分段）
    if (rest.trim().length === 0) {
      if (trimmed.length === 0) {
        textLines.push('')
      }
      continue
    }

    textLines.push(rest.trimEnd())
  }

  flush()

  return posts
}

/**
 * POST /api/apexmind/import-planet
 *
 * 导入知识星球帖子（特殊格式 Markdown）到当前用户：
 * - 每个时间块 => 1 条 MindIdea + 若干 MindRecordEvent
 * - 图片事件时间按帖子时间依次 +1 秒，保证聊天区顺序稳定
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

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: '缺少文件字段 file' },
        { status: 400 }
      )
    }

    const md = await file.text()
    const posts = parsePlanetMarkdown(md)

    if (!posts.length) {
      return NextResponse.json(
        { success: false, error: '未解析到任何帖子，请确认文件格式' },
        { status: 400 }
      )
    }

    const prisma = await getPrisma()

    let importedIdeas = 0
    let importedRecordEvents = 0
    let importedImages = 0
    const importedIdeaIds: string[] = []

    for (const post of posts) {
      try {
        const idea = await prisma.mindIdea.create({
          data: {
            userId: user.id,
            content: post.text || '',
            tags: post.tags,
            imageUrls: post.imageUrls,
            sourceMeta: {
              importedFrom: 'planet-markdown',
              timestampRaw: post.timestampRaw,
              originalFilename: file.name || null,
            },
            createdAt: post.timestamp,
            updatedAt: post.timestamp,
          },
        })

        importedIdeas += 1
        importedIdeaIds.push(idea.id)

        const groupId = idea.id
        let order = 0

        // 文字事件：用帖子时间
        const hasText = post.text && post.text.trim().length > 0
        if (hasText) {
          await prisma.mindRecordEvent.create({
            data: {
              userId: user.id,
              ideaId: idea.id,
              groupId,
              order: order++,
              kind: 'text',
              content: post.text.trim(),
              tags: post.tags,
              createdAt: post.timestamp,
            },
          })
          importedRecordEvents += 1
        }

        // 图片事件：在帖子时间基础上依次 +1 秒（若无文字，也从 +0 秒开始保证顺序稳定）
        for (let i = 0; i < post.imageUrls.length; i++) {
          const url = post.imageUrls[i]
          if (!url) continue

          const baseOffsetSeconds = hasText ? 1 : 0
          const createdAt = new Date(
            post.timestamp.getTime() + (baseOffsetSeconds + i) * 1000
          )

          await prisma.mindRecordEvent.create({
            data: {
              userId: user.id,
              ideaId: idea.id,
              groupId,
              order: order++,
              kind: 'image',
              content: url,
              tags: [],
              createdAt,
            },
          })
          importedRecordEvents += 1
          importedImages += 1
        }
      } catch (e) {
        console.error('[ApexMind] 导入星球帖子失败，已跳过该条:', e)
      }
    }

    // 异步补齐 Embeddings（不阻塞导入请求）
    ;(async () => {
      try {
        if (importedIdeaIds.length === 0) return
        // 防止一次导入过多帖子导致开发环境连接池压力过大：只对前 N 条做补齐
        const MAX_EMBEDDINGS = 30
        const limitedIdeaIds = importedIdeaIds.slice(0, MAX_EMBEDDINGS)

        const settings = await prisma.mindSettings.findUnique({
          where: { userId: user.id },
        })
        if (!settings) return

        let baseUrl = (settings.baseUrl || '').trim()
        let embeddingModel = (settings.embeddingModel || '').trim()
        let embeddingApiKey = (settings.apiKeyEncrypted || '').trim()

        // 复用多模型配置解析逻辑，优先使用默认模型的 embedding 配置
        if (settings.models) {
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
                embeddingModel: (raw.embeddingModel || '').toString().trim(),
                isDefault: Boolean(raw.isDefault),
              }))
              .filter((m: any) => m.baseUrl && m.embeddingModel)

            if (models.length > 0) {
              const explicitDefault = models.find((m: any) => m.isDefault)
              const defaultModel = explicitDefault || models[0]

              baseUrl = defaultModel.baseUrl || baseUrl
              embeddingModel = defaultModel.embeddingModel || embeddingModel
              // embeddingApiKey 必须显式配置，不复用 apiKey
              embeddingApiKey = defaultModel.embeddingApiKey || ''
            }
          } catch (parseErr) {
            console.error(
              '[ApexMind] 导入星球帖子后解析 MindSettings.models 失败，将回退到顶层设置:',
              parseErr
            )
          }
        }

        if (!baseUrl || !embeddingModel || !embeddingApiKey) return

        const ideasToEmbed = await prisma.mindIdea.findMany({
          where: {
            id: { in: limitedIdeaIds },
            userId: user.id,
          },
        })

        for (const idea of ideasToEmbed) {
          try {
            const input = (idea.content || '').trim()
            if (!input) continue
            const vec = await embedText({
              baseUrl,
              apiKey: embeddingApiKey,
              model: embeddingModel,
              input,
            })
            if (!vec) continue

            await prisma.mindIdeaEmbedding.upsert({
              where: { ideaId: idea.id },
              update: { embedding: serializeEmbedding(vec) },
              create: { ideaId: idea.id, embedding: serializeEmbedding(vec) },
            })
          } catch (e) {
            console.error('[ApexMind] 导入星球帖子后生成 Embedding 失败:', e)
          }
        }
      } catch (e) {
        console.error('[ApexMind] 导入星球帖子后异步补齐 Embeddings 出错:', e)
      }
    })()

    return NextResponse.json({
      success: true,
      data: {
        importedIdeas,
        importedRecordEvents,
        importedImages,
      },
    })
  } catch (error) {
    console.error('[ApexMind] Import planet markdown error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

