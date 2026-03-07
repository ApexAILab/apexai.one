import { NextResponse } from 'next/server'
import { config } from 'dotenv'
import { resolve } from 'path'
import { getCurrentUser } from '@/lib/auth'
import {
  embedText,
  serializeEmbedding,
  deserializeEmbedding,
  cosineSimilarity,
} from '@/lib/apexmind-embeddings'

export const runtime = 'nodejs'

// 显式加载 .env 文件（与其它 API 路由保持一致）
try {
  config({ path: resolve(process.cwd(), '.env') })
} catch (error) {
  console.warn('Failed to load .env file explicitly:', error)
}

// 默认提示词：人设 & RAG 引用说明
const DEFAULT_SYSTEM_PROMPT =
  '你是一位帮助用户整理想法、做决策的个人知识教练，会基于用户的历史想法和对话，给出具体的建议。'

const DEFAULT_RAG_CONTEXT_PROMPT =
  '下面是用户历史中的相关想法与对话片段，请在回答当前问题时将其作为重要上下文参考，但不要逐字复读原文。'

// 动态导入 prisma，避免在构建阶段初始化失败
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

type ChatRequestBody = {
  message?: string
}

type DeleteChatBody = {
  ids?: string[]
}

/**
 * 从纯文本问题中提取以 # 开头的标签（与 ideas 打包时的标签提取规则保持一致）
 */
function extractTagsFromText(text: string): string[] {
  const tagSet = new Set<string>()
  const tagRegex = /#([\p{Letter}\p{Number}_-]+)/gu

  let match: RegExpExecArray | null
  while ((match = tagRegex.exec(text)) !== null) {
    const raw = match[1].trim()
    if (raw) {
      tagSet.add(raw.toLowerCase())
    }
  }

  return Array.from(tagSet)
}

type TimeRange = {
  from: Date
  to: Date
}

/**
 * 从用户问题中解析时间范围（上个月、本月、上周、最近7天等）
 * 注意：这是一个尽量简单、可解释的规则解析，不依赖模型本身。
 */
function parseTimeRangeFromQuery(content: string, now: Date): TimeRange | null {
  const text = content.replace(/\s+/g, '')

  // 最近 N 天
  const recentNDaysMatch = text.match(/最近(\d+|七|七天|三十|三十天|30)天?/)
  if (recentNDaysMatch) {
    const raw = recentNDaysMatch[1]
    let days = Number.parseInt(raw, 10)
    if (!Number.isFinite(days)) {
      if (raw.includes('七')) days = 7
      else if (raw.includes('三十') || raw === '30') days = 30
    }
    if (days > 0) {
      const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
      return { from, to: now }
    }
  }

  const year = now.getFullYear()
  const month = now.getMonth() // 0-based
  const day = now.getDate()

  // 绝对日期：YYYY年M月D日 / YYYY年M月D号
  const absYmd = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})(日|号)?/)
  if (absYmd) {
    const y = Number(absYmd[1])
    const m = Number(absYmd[2]) - 1
    const d = Number(absYmd[3])
    if (Number.isFinite(y) && m >= 0 && m < 12 && d >= 1 && d <= 31) {
      const from = new Date(y, m, d, 0, 0, 0, 0)
      const to = new Date(y, m, d, 23, 59, 59, 999)
      return { from, to }
    }
  }

  // 今年 M 月 D 日
  const thisYearYmd = text.match(/今年(\d{1,2})月(\d{1,2})(日|号)?/)
  if (thisYearYmd) {
    const m = Number(thisYearYmd[1]) - 1
    const d = Number(thisYearYmd[2])
    if (m >= 0 && m < 12 && d >= 1 && d <= 31) {
      const from = new Date(year, m, d, 0, 0, 0, 0)
      const to = new Date(year, m, d, 23, 59, 59, 999)
      return { from, to }
    }
  }

  // 去年 M 月 D 日
  const lastYearYmd = text.match(/去年(\d{1,2})月(\d{1,2})(日|号)?/)
  if (lastYearYmd) {
    const m = Number(lastYearYmd[1]) - 1
    const d = Number(lastYearYmd[2])
    if (m >= 0 && m < 12 && d >= 1 && d <= 31) {
      const from = new Date(year - 1, m, d, 0, 0, 0, 0)
      const to = new Date(year - 1, m, d, 23, 59, 59, 999)
      return { from, to }
    }
  }

  // 仅月日：M月D日/号（默认当前年份）
  const mdOnly = text.match(/(\d{1,2})月(\d{1,2})(日|号)?/)
  if (mdOnly) {
    const m = Number(mdOnly[1]) - 1
    const d = Number(mdOnly[2])
    if (m >= 0 && m < 12 && d >= 1 && d <= 31) {
      const from = new Date(year, m, d, 0, 0, 0, 0)
      const to = new Date(year, m, d, 23, 59, 59, 999)
      return { from, to }
    }
  }

  // 绝对月份：YYYY年M月
  const absYm = text.match(/(\d{4})年(\d{1,2})月/)
  if (absYm) {
    const y = Number(absYm[1])
    const m = Number(absYm[2]) - 1
    if (Number.isFinite(y) && m >= 0 && m < 12) {
      const from = new Date(y, m, 1, 0, 0, 0, 0)
      const to = new Date(y, m + 1, 0, 23, 59, 59, 999)
      return { from, to }
    }
  }

  // 今年 M 月
  const thisYearMonth = text.match(/今年(\d{1,2})月/)
  if (thisYearMonth) {
    const m = Number(thisYearMonth[1]) - 1
    if (m >= 0 && m < 12) {
      const from = new Date(year, m, 1, 0, 0, 0, 0)
      const to = new Date(year, m + 1, 0, 23, 59, 59, 999)
      return { from, to }
    }
  }

  // 去年 M 月
  const lastYearMonth = text.match(/去年(\d{1,2})月/)
  if (lastYearMonth) {
    const m = Number(lastYearMonth[1]) - 1
    if (m >= 0 && m < 12) {
      const from = new Date(year - 1, m, 1, 0, 0, 0, 0)
      const to = new Date(year - 1, m + 1, 0, 23, 59, 59, 999)
      return { from, to }
    }
  }

  // 仅月份：M月（不带“本月 / 上月”等前缀，默认按当前年份整月处理）
  const bareMonth = text.match(/(\d{1,2})月(?![天日号])/)
  if (bareMonth) {
    const m = Number(bareMonth[1]) - 1
    if (m >= 0 && m < 12) {
      const from = new Date(year, m, 1, 0, 0, 0, 0)
      const to = new Date(year, m + 1, 0, 23, 59, 59, 999)
      return { from, to }
    }
  }

  // 本月 / 这个月
  if (/(本月|这个月|这月|本月份)/.test(text)) {
    const from = new Date(year, month, 1, 0, 0, 0, 0)
    return { from, to: now }
  }

  // 上个月
  if (/(上个月|上月|前一个月)/.test(text)) {
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year
    const from = new Date(prevYear, prevMonth, 1, 0, 0, 0, 0)
    const to = new Date(prevYear, prevMonth + 1, 0, 23, 59, 59, 999)
    return { from, to }
  }

  // 今年
  if (/(今年|本年)/.test(text)) {
    const from = new Date(year, 0, 1, 0, 0, 0, 0)
    return { from, to: now }
  }

  // 本周 / 这周（按周一为起点）
  if (/(本周|这周|这个星期)/.test(text)) {
    const jsDay = now.getDay() // 0: Sunday
    const offsetToMonday = jsDay === 0 ? -6 : 1 - jsDay
    const from = new Date(
      year,
      month,
      day + offsetToMonday,
      0,
      0,
      0,
      0,
    )
    return { from, to: now }
  }

  // 上周（按周一～周日）
  if (/(上周|上星期|前一周)/.test(text)) {
    const jsDay = now.getDay()
    const offsetToMondayThisWeek = jsDay === 0 ? -6 : 1 - jsDay
    const mondayThisWeek = new Date(
      year,
      month,
      day + offsetToMondayThisWeek,
      0,
      0,
      0,
      0,
    )
    const mondayLastWeek = new Date(
      mondayThisWeek.getTime() - 7 * 24 * 60 * 60 * 1000,
    )
    const sundayLastWeek = new Date(
      mondayLastWeek.getTime() + 6 * 24 * 60 * 60 * 1000,
    )
    sundayLastWeek.setHours(23, 59, 59, 999)
    return { from: mondayLastWeek, to: sundayLastWeek }
  }

  return null
}

/**
 * 根据「最近一条消息时间」和 30 分钟规则，获取或创建当前会话
 */
async function getOrCreateSession(prisma: any, userId: string) {
  // 查找该用户最近一条聊天消息
  const lastMessage = await prisma.mindChatMessage.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      createdAt: true,
      sessionId: true,
      session: {
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
        },
      },
    },
  })

  const now = new Date()

  if (!lastMessage) {
    // 没有历史消息，新建一个 Session
    return prisma.mindChatSession.create({
      data: {
        userId,
        startedAt: now,
      },
    })
  }

  const diffMs = now.getTime() - lastMessage.createdAt.getTime()
  const THIRTY_MINUTES_MS = 30 * 60 * 1000

  if (diffMs > THIRTY_MINUTES_MS) {
    // 超过 30 分钟，开启新 Session，并且可以顺带更新旧 Session 的 endedAt
    if (lastMessage.sessionId) {
      await prisma.mindChatSession.updateMany({
        where: { id: lastMessage.sessionId, endedAt: null },
        data: { endedAt: lastMessage.createdAt },
      })
    }

    return prisma.mindChatSession.create({
      data: {
        userId,
        startedAt: now,
      },
    })
  }

  // 继续使用最近一次会话
  if (lastMessage.session) {
    return lastMessage.session
  }

  // 理论上不会到这里，兜底再查一次
  return prisma.mindChatSession.findUniqueOrThrow({
    where: { id: lastMessage.sessionId },
  })
}

/**
 * POST /api/apexmind/chat
 * 基础聊天接口：
 * - 负责 session 划分
 * - 保存用户消息 & AI 回复
 * - 使用 ApexMind Settings 中配置的模型调用上游接口（当前为非流式简单实现）
 *
 * 说明：当前版本暂未接入 RAG，只是一个「将来可以挂 RAG 的 Chat 骨架」，
 * 后续会在这里接入向量检索与上下文注入。
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
    const body = (await request.json()) as ChatRequestBody
    const content = body.message?.trim()

    if (!content) {
      return NextResponse.json(
        { success: false, error: '消息内容不能为空' },
        { status: 400 }
      )
    }

    // 读取 ApexMind 设置
    const settings = await prisma.mindSettings.findUnique({
      where: { userId: user.id },
    })

    if (!settings) {
      return NextResponse.json(
        {
          success: false,
          error:
            '尚未配置 ApexMind 模型，请先在设置中填写 Base URL、API Key 和 Chat Model',
        },
        { status: 400 }
      )
    }

    let baseUrl = (settings.baseUrl || '').trim()
    let chatApiKey = (settings.apiKeyEncrypted || '').trim()
    let model = (settings.chatModel || '').trim()
    let embeddingModel = (settings.embeddingModel || '').trim()
    let embeddingApiKey = (settings.apiKeyEncrypted || '').trim()

    const systemPromptRaw = settings.systemPrompt?.trim()
    const systemPrompt =
      systemPromptRaw && systemPromptRaw.length > 0
        ? systemPromptRaw
        : DEFAULT_SYSTEM_PROMPT

    const ragContextPromptRaw = (settings as any).ragContextPrompt
      ? String((settings as any).ragContextPrompt).trim()
      : ''
    const ragContextPrompt =
      ragContextPromptRaw && ragContextPromptRaw.length > 0
        ? ragContextPromptRaw
        : DEFAULT_RAG_CONTEXT_PROMPT

    // 如果存在多模型配置，则优先使用默认模型的信息，并允许为 embedding 设置单独的 key
    if (settings.models) {
      try {
        const rawModels = Array.isArray(settings.models) ? settings.models : []
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

          baseUrl = defaultModel.baseUrl || baseUrl
          model = defaultModel.chatModel || model
          embeddingModel = defaultModel.embeddingModel || embeddingModel

          if (defaultModel.apiKey) {
            chatApiKey = defaultModel.apiKey
          }
          // embeddingApiKey 必须显式配置，不复用 apiKey
          if (defaultModel.embeddingApiKey) {
            embeddingApiKey = defaultModel.embeddingApiKey
          } else {
            embeddingApiKey = ''
          }
        }
      } catch (parseErr) {
        console.error(
          '[ApexMind] 解析 MindSettings.models 失败，将回退到顶层设置:',
          parseErr
        )
      }
    }

    if (!baseUrl || !chatApiKey || !model) {
      return NextResponse.json(
        {
          success: false,
          error:
            'ApexMind 未完整配置 Base URL / ChatModel / API Key，请先在设置中填写。',
        },
        { status: 400 }
      )
    }

    const now = new Date()

    // 1. 根据 30 分钟规则获取 / 创建 Session
    const session = await getOrCreateSession(prisma, user.id)

    // 2. 保存用户消息
    const userMessage = await prisma.mindChatMessage.create({
      data: {
        sessionId: session.id,
        userId: user.id,
        role: 'user',
        content,
      },
    })

    // 3. 为当前问题生成向量，用于后续 RAG 检索
    let queryEmbedding: Float32Array | null = null
    if (embeddingModel && baseUrl && embeddingApiKey) {
      try {
        queryEmbedding = await embedText({
          baseUrl,
          apiKey: embeddingApiKey,
          model: embeddingModel,
          input: content,
        })
      } catch (embedErr) {
        console.error('[ApexMind] 为当前问题生成 Embedding 失败:', embedErr)
        queryEmbedding = null
      }
    }

    // 4. 基于 Embedding 做 RAG 检索（完整想法 + 历史聊天）
    const ragTopK = settings.ragTopK ?? 8
    const ragTimeWindowDays = settings.ragTimeWindowDays ?? 180

    const chatWeightRaw = (settings as any).chatWeight
    const chatWeight =
      typeof chatWeightRaw === 'number' && Number.isFinite(chatWeightRaw)
        ? chatWeightRaw
        : 0.5
    const useChatContexts =
      (settings as any).useChatContexts === false ? false : true

    const chatSummaryPromptRaw = (settings as any).chatSummaryPrompt
      ? String((settings as any).chatSummaryPrompt).trim()
      : ''
    const chatSummaryPrompt =
      chatSummaryPromptRaw && chatSummaryPromptRaw.length > 0
        ? chatSummaryPromptRaw
        : '你是一位擅长总结信息的助理。请阅读下面这一组对话记录，用简洁的中文总结出这段对话中最重要的 3-5 个要点（事件、决策、待办事项、结论），不要逐字复述原话，使用条列式输出。'

    // 从用户问题中尝试解析时间范围（例如“上个月”、“这周”、“最近7天”等）
    const parsedTimeRange = parseTimeRangeFromQuery(content, now)

    let contextText = ''
    let ragContexts: Array<{
      kind: 'idea' | 'chat'
      createdAt: string
      score: number
      tags?: string[]
      content: string
    }> = []

    if (queryEmbedding && ragTopK > 0 && ragTimeWindowDays > 0) {
      const fallbackFromDate =
        ragTimeWindowDays > 0
          ? new Date(now.getTime() - ragTimeWindowDays * 24 * 60 * 60 * 1000)
          : new Date(0)

      const fromDate = parsedTimeRange?.from ?? fallbackFromDate
      const toDate = parsedTimeRange?.to ?? now

      // 先尝试为该时间窗口内缺少 Embedding 的历史想法做一次自动补齐（懒加载）
      if (embeddingModel && baseUrl && embeddingApiKey) {
        try {
          const BACKFILL_LIMIT = 10
          const ideasToBackfill = await prisma.mindIdea.findMany({
            where: {
              userId: user.id,
              createdAt: { gte: fromDate, lte: toDate },
              embedding: null,
            },
            orderBy: { createdAt: 'desc' },
            take: BACKFILL_LIMIT,
          })

          // 为缺失的 MindIdea 生成 Embedding
          for (const idea of ideasToBackfill) {
            try {
              const vec = await embedText({
                baseUrl,
                apiKey: embeddingApiKey,
                model: embeddingModel,
                input: idea.content,
              })
              if (!vec) continue

              await prisma.mindIdeaEmbedding.upsert({
                where: { ideaId: idea.id },
                update: { embedding: serializeEmbedding(vec) },
                create: { ideaId: idea.id, embedding: serializeEmbedding(vec) },
              })
            } catch (e) {
              console.error(
                '[ApexMind] Backfill MindIdeaEmbedding 失败:',
                e
              )
            }
          }

        } catch (backfillErr) {
          console.error('[ApexMind] Backfill embeddings 出错:', backfillErr)
        }
      }

      // 从当前问题中抽取 #标签，用于过滤 MindIdea
      const queryTags = extractTagsFromText(content)

      try {
        const ideaWhere: any = {
          userId: user.id,
          createdAt: { gte: fromDate, lte: toDate },
        }

        if (queryTags.length > 0) {
          ideaWhere.tags = {
            hasSome: queryTags,
          }
        }

        // 1) 获取想法向量
        const ideaEmbeddings = await prisma.mindIdeaEmbedding.findMany({
          where: {
            idea: ideaWhere,
          },
          orderBy: { createdAt: 'desc' },
          take: 200,
          include: {
            idea: true,
          },
        })

        // 2) 懒加载生成会话总结（小批量）
        let chatSummaries: any[] = []
        if (useChatContexts && embeddingModel && baseUrl && embeddingApiKey) {
          const prismaAny: any = prisma
          const existingSummaries = await prismaAny.mindChatSummary.findMany({
            where: {
              userId: user.id,
              createdAt: { gte: fromDate, lte: toDate },
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
          })

          const summarizedSessionIds = new Set<string>(
            existingSummaries.map((s: any) => String(s.sessionId)),
          )

          const SESSIONS_BACKFILL_LIMIT = 2
          const sessionsToSummarize = await prisma.mindChatSession.findMany({
            where: {
              userId: user.id,
              startedAt: { gte: fromDate, lte: toDate },
              id: { notIn: Array.from(summarizedSessionIds) },
            },
            orderBy: { startedAt: 'desc' },
            take: SESSIONS_BACKFILL_LIMIT,
          })

          for (const s of sessionsToSummarize) {
            try {
              const messagesInSession = await prisma.mindChatMessage.findMany({
                where: { sessionId: s.id, userId: user.id },
                orderBy: { createdAt: 'asc' },
              })

              if (!messagesInSession.length) continue

              const convoTextLines: string[] = []
              for (const m of messagesInSession) {
                const prefix = m.role === 'assistant' ? 'AI: ' : '用户: '
                convoTextLines.push(prefix + m.content)
              }
              const convoText = convoTextLines.join('\n\n')

              const endpoint = `${baseUrl.replace(
                /\/$/,
                '',
              )}/v1/chat/completions`

              const summaryRes = await fetch(endpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${chatApiKey}`,
                },
                body: JSON.stringify({
                  model,
                  messages: [
                    { role: 'system', content: chatSummaryPrompt },
                    { role: 'user', content: convoText },
                  ],
                  stream: false,
                }),
              })

              if (!summaryRes.ok) {
                console.error(
                  '[ApexMind] 生成会话总结失败:',
                  s.id,
                  await summaryRes.text().catch(() => ''),
                )
                continue
              }

              const summaryJson = await summaryRes.json().catch(() => null)
              const summaryContent: string =
                summaryJson?.choices?.[0]?.message?.content || ''
              const trimmedSummary = String(summaryContent || '').trim()
              if (!trimmedSummary) continue

              const summaryVec = await embedText({
                baseUrl,
                apiKey: embeddingApiKey,
                model: embeddingModel,
                input: trimmedSummary,
              })

              const summaryEmbedding = summaryVec
                ? serializeEmbedding(summaryVec)
                : null

              await prismaAny.mindChatSummary.upsert({
                where: { sessionId: s.id },
                update: {
                  content: trimmedSummary,
                  ...(summaryEmbedding ? { embedding: summaryEmbedding } : {}),
                },
                create: {
                  sessionId: s.id,
                  userId: user.id,
                  content: trimmedSummary,
                  ...(summaryEmbedding ? { embedding: summaryEmbedding } : {}),
                },
              })
            } catch (e) {
              console.error('[ApexMind] 生成会话总结异常:', e)
            }
          }

          chatSummaries = await prismaAny.mindChatSummary.findMany({
            where: {
              userId: user.id,
              createdAt: { gte: fromDate, lte: toDate },
              embedding: { not: null },
            },
            orderBy: { createdAt: 'desc' },
            take: 200,
          })
        }

        type RankedContext = {
          score: number
          kind: 'idea' | 'chat'
          content: string
          createdAt: Date
          tags?: string[]
          sessionId?: string // 对话总结对应的会话
        }

        const ranked: RankedContext[] = []

        for (const row of ideaEmbeddings) {
          const vec = deserializeEmbedding(row.embedding)
          if (!vec) continue
          const score = cosineSimilarity(queryEmbedding, vec)
          if (!Number.isFinite(score) || score <= 0) continue

          ranked.push({
            score,
            kind: 'idea',
            content: row.idea.content,
            createdAt: row.idea.createdAt,
            tags: row.idea.tags,
          })
        }

        if (useChatContexts) {
          for (const row of chatSummaries) {
            if (!row.embedding) continue
            const vec = deserializeEmbedding(row.embedding)
            if (!vec) continue
            let score = cosineSimilarity(queryEmbedding, vec)
            if (!Number.isFinite(score) || score <= 0) continue
            score *= chatWeight

            ranked.push({
              score,
              kind: 'chat',
              content: row.content,
              createdAt: row.createdAt,
              sessionId: row.sessionId,
            })
          }
        }

        if (ranked.length > 0) {
          ranked.sort((a, b) => b.score - a.score)
          const top = ranked.slice(0, ragTopK)

          const lines: string[] = []
          ragContexts = []
          for (const item of top) {
            const ts = item.createdAt.toISOString()
            if (item.kind === 'idea') {
              const tagPart =
                item.tags && item.tags.length > 0
                  ? ` #${item.tags.join(' #')}`
                  : ''
              lines.push(
                `[想法 ${ts}${tagPart}]`,
                item.content,
                '',
              )

              ragContexts.push({
                kind: 'idea',
                createdAt: ts,
                score: item.score,
                tags: item.tags,
                content: item.content,
              })
            } else if (item.sessionId) {
              // 对话：用 summary 做检索，但在引用和上下文里使用原始对话内容
              try {
                const sessionMessages = await prisma.mindChatMessage.findMany({
                  where: {
                    sessionId: item.sessionId,
                    userId: user.id,
                  },
                  orderBy: { createdAt: 'asc' },
                })

                if (sessionMessages.length > 0) {
                  const convoLines: string[] = []
                  for (const m of sessionMessages) {
                    const prefix = m.role === 'assistant' ? 'AI' : '用户'
                    convoLines.push(`[${prefix} ${m.createdAt.toISOString()}]`)
                    convoLines.push(m.content)
                    convoLines.push('')
                  }

                  const convoText = convoLines.join('\n')
                  lines.push(`[历史对话 ${ts}]`, convoText, '')

                  ragContexts.push({
                    kind: 'chat',
                    createdAt: ts,
                    score: item.score,
                    tags: [],
                    content: convoText,
                  })
                }
              } catch (e) {
                console.error(
                  '[ApexMind] 加载会话原始对话用于 RAG 引用失败:',
                  e,
                )
              }
            }
          }

          contextText = lines.join('\n')
        }
      } catch (ragErr) {
        console.error('[ApexMind] RAG 检索失败，将回退为普通对话:', ragErr)
        contextText = ''
      }
    }

    // 5. 流式调用上游 Chat 接口（OpenAI 兼容 /v1/chat/completions，使用 stream: true）
    const endpoint = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`

    const messages: Array<{ role: 'system' | 'user'; content: string }> = []

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }

    if (contextText) {
      messages.push({
        role: 'system',
        content:
          `${ragContextPrompt}\n\n${contextText}`,
      })
    }

    messages.push({ role: 'user', content })

    const upstreamRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${chatApiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
      }),
    })

    if (!upstreamRes.ok || !upstreamRes.body) {
      const text = await upstreamRes.text().catch(() => '')
      console.error('[ApexMind] Upstream chat error:', upstreamRes.status, text)
      return NextResponse.json(
        {
          success: false,
          error: '上游模型调用失败，请检查模型配置或稍后重试',
        },
        { status: 502 }
      )
    }

    const ragIdeaCount = ragContexts.filter((c) => c.kind === 'idea').length
    const ragChatCount = ragContexts.filter((c) => c.kind === 'chat').length

    // 为本次回答创建一个占位消息，用于存储引用信息，最终在流结束时写入 content
    const assistantMessage = await prisma.mindChatMessage.create({
      data: {
        sessionId: session.id,
        userId: user.id,
        role: 'assistant',
        content: '',
        meta: {
          rag: {
            ideaCount: ragIdeaCount,
            chatCount: ragChatCount,
            contexts: ragContexts,
          },
        },
      },
    })

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const upstreamReader = upstreamRes.body.getReader()

    let buffer = ''
    let fullContent = ''

    // 防御性：确保无论以何种方式结束（正常结束 / [DONE] / 超时 / 取消 / 异常）
    // 都只保存一次最终内容，并关闭下游流，避免前端长期卡在「发送中」且数据库不落盘。
    let finalized = false
    let inactivityTimer: ReturnType<typeof setTimeout> | null = null

    const clearInactivityTimer = () => {
      if (inactivityTimer) {
        clearTimeout(inactivityTimer)
        inactivityTimer = null
      }
    }

    const finalizeOnce = async (reason: string) => {
      if (finalized) return
      finalized = true
      clearInactivityTimer()

      try {
        const finalContent =
          fullContent.trim().length > 0
            ? fullContent
            : '（模型未返回内容）'

        await prisma.mindChatMessage.update({
          where: { id: assistantMessage.id },
          data: { content: finalContent },
        })
      } catch (saveErr) {
        console.error(
          '[ApexMind] 保存流式 AI 回复失败（不影响前端显示）:',
          saveErr,
          'reason=',
          reason
        )
      }
    }

    const armInactivityTimer = (
      controller: ReadableStreamDefaultController<Uint8Array>,
    ) => {
      clearInactivityTimer()
      // 若上游在 15 秒内没有新 token（常见于部分供应商不发 [DONE] 且保持长连接），
      // 则认为回答已经结束，直接落盘并关闭流，避免前端长时间挂起。
      inactivityTimer = setTimeout(async () => {
        console.warn(
          '[ApexMind] 上游流在 15s 内无新数据，触发超时结束（将使用当前已累积内容）',
        )
        await finalizeOnce('idle-timeout')
        controller.close()
        try {
          await upstreamReader.cancel()
        } catch {}
      }, 15_000)
    }

    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        try {
          const { done, value } = await upstreamReader.read()
          if (done) {
            await finalizeOnce('upstream-done')
            controller.close()
            return
          }

          const chunk = decoder.decode(value, { stream: true })
          buffer += chunk

          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue

            const dataPart = trimmed.slice(5).trim()
            if (!dataPart) {
              continue
            }

            // OpenAI 兼容流以 [DONE] 结尾，这里主动结束下游流，避免连接长时间悬挂
            if (dataPart === '[DONE]') {
              await finalizeOnce('upstream-done-flag')
              controller.close()
              await upstreamReader.cancel().catch(() => {})
              return
            }

            let parsed: any
            try {
              parsed = JSON.parse(dataPart)
            } catch {
              continue
            }

            const delta: string =
              parsed?.choices?.[0]?.delta?.content ?? ''
            if (!delta) continue

            fullContent += delta
            controller.enqueue(encoder.encode(delta))

            // 只要有新 token，就重置「无活动超时」计时
            armInactivityTimer(controller)
          }

          // 处理极端情况：上游最后一个 chunk 没有换行，导致 buffer 里残留 "data: [DONE]"
          const tail = buffer.trim()
          if (
            tail === 'data: [DONE]' ||
            tail === 'data:[DONE]' ||
            tail === '[DONE]'
          ) {
            await finalizeOnce('upstream-done-flag-tail')
            controller.close()
            await upstreamReader.cancel().catch(() => {})
            buffer = ''
            return
          }
        } catch (err) {
          console.error('[ApexMind] 处理流式上游响应失败:', err)
          try {
            await finalizeOnce('upstream-error')
            await upstreamReader.cancel()
          } catch {}
          clearInactivityTimer()
          controller.error(err)
        }
      },
      async cancel() {
        // 前端中断连接（例如用户刷新页面），仍然尝试用当前已累积内容落盘，避免丢失
        await finalizeOnce('downstream-cancel')
        clearInactivityTimer()
        await upstreamReader.cancel().catch(() => {})
      },
    })

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-ApexMind-Assistant-Message-Id': assistantMessage.id,
        'X-ApexMind-Rag-Idea-Count': String(ragIdeaCount),
        'X-ApexMind-Rag-Chat-Count': String(ragChatCount),
      },
    })
  } catch (error) {
    console.error('[ApexMind] Chat error:', error)
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
 * DELETE /api/apexmind/chat
 * 批量删除当前用户的聊天消息（仅聊天，不影响想法数据）
 */
export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      )
    }

    const prisma = await getPrisma()
    const body = (await request.json()) as DeleteChatBody
    const rawIds = Array.isArray(body.ids) ? body.ids : []
    const ids = rawIds
      .map((id) => (typeof id === 'string' ? id.trim() : ''))
      .filter((id) => id.length > 0)

    if (ids.length === 0) {
      return NextResponse.json(
        { success: false, error: '要删除的消息列表不能为空' },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      await tx.mindChatMessageEmbedding.deleteMany({
        where: {
          messageId: { in: ids },
        },
      })

      await tx.mindChatMessage.deleteMany({
        where: {
          id: { in: ids },
          userId: user.id,
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ApexMind] Delete chat messages error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


