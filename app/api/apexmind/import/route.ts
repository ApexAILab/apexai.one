import { NextResponse } from 'next/server'
import { config } from 'dotenv'
import { resolve } from 'path'
import { getCurrentUser } from '@/lib/auth'
import {
  embedText,
  serializeEmbedding,
} from '@/lib/apexmind-embeddings'

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

type ExportRecordEvent = {
  kind?: string
  content?: string
  tags?: unknown
  order?: number
  createdAt?: string
}

type ExportIdea = {
  id?: string
  type?: string
  content?: string
  tags?: unknown
  imageUrls?: unknown
  createdAt?: string
  updatedAt?: string
  sourceMeta?: unknown
  recordEvents?: ExportRecordEvent[]
}

type ExportChat = {
  id?: string
  sessionId?: string | null
  sessionStartedAt?: string | null
  sessionEndedAt?: string | null
  role?: string
  content?: string
  createdAt?: string
  meta?: unknown
}

/**
 * POST /api/apexmind/import
 *
 * 从导出的 ApexMind JSON 文件中导入数据到当前用户：
 * - 忽略文件中的 userId 和各类 id，全部重建为当前用户的新记录
 * - 保留内容、标签、图片 URL、时间戳等关键信息
 *
 * 请求体：multipart/form-data，字段名为 "file"，内容为导出的 JSON 文件
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

    const text = await file.text()
    let payload: any
    try {
      payload = JSON.parse(text)
    } catch (e) {
      return NextResponse.json(
        { success: false, error: 'JSON 解析失败，请确认文件格式正确' },
        { status: 400 }
      )
    }

    const ideasRaw: ExportIdea[] = Array.isArray(payload.ideas)
      ? payload.ideas
      : []
    const chatsRaw: ExportChat[] = Array.isArray(payload.chats)
      ? payload.chats
      : []

    const prisma = await getPrisma()

    let importedIdeas = 0
    let importedSessions = 0
    let importedMessages = 0
    const importedIdeaIds: string[] = []
    const importedSessionIds: string[] = []

    // 1. 导入完整想法（MindIdea + MindRecordEvent）
    for (const raw of ideasRaw) {
      const content =
        typeof raw.content === 'string' ? raw.content.trim() : ''
      const tags: string[] = Array.isArray(raw.tags)
        ? raw.tags
            .map((t: any) => String(t ?? '').trim())
            .filter((t) => t.length > 0)
        : []
      const imageUrls: string[] = Array.isArray(raw.imageUrls)
        ? raw.imageUrls
            .map((u: any) => String(u ?? '').trim())
            .filter((u) => u.length > 0)
        : []

      // 至少需要 content 或 imageUrls 或 recordEvents
      const recordEventsRaw: ExportRecordEvent[] = Array.isArray(raw.recordEvents)
        ? raw.recordEvents
        : []
      const hasRecordEvents = recordEventsRaw.length > 0
      if (!content && imageUrls.length === 0 && !hasRecordEvents) continue

      const createdAt =
        raw.createdAt && !Number.isNaN(new Date(raw.createdAt).getTime())
          ? new Date(raw.createdAt)
          : new Date()
      const updatedAt =
        raw.updatedAt && !Number.isNaN(new Date(raw.updatedAt).getTime())
          ? new Date(raw.updatedAt)
          : createdAt

      try {
        const sourceMetaValue =
          raw.sourceMeta === undefined ? undefined : (raw.sourceMeta as any)
        const created = await prisma.mindIdea.create({
          data: {
            userId: user.id,
            content: content || '',
            tags,
            imageUrls,
            ...(sourceMetaValue !== undefined ? { sourceMeta: sourceMetaValue } : {}),
            createdAt,
            updatedAt,
          },
        })
        importedIdeas += 1
        importedIdeaIds.push(created.id)

        const groupId = created.id

        if (hasRecordEvents) {
          // 新格式：按 recordEvents 还原，保留顺序、每条的内容与时间
          const sorted = [...recordEventsRaw].sort(
            (a, b) =>
              (typeof a.order === 'number' ? a.order : 0) -
              (typeof b.order === 'number' ? b.order : 0)
          )
          for (let i = 0; i < sorted.length; i++) {
            const ev = sorted[i]
            const kind =
              ev.kind === 'image' ? 'image' : 'text'
            const evContent =
              typeof ev.content === 'string' ? ev.content.trim() : ''
            if (!evContent) continue

            const evTags: string[] = Array.isArray(ev.tags)
              ? (ev.tags as any[])
                  .map((t: any) => String(t ?? '').trim())
                  .filter((t) => t.length > 0)
              : []

            const evCreatedAt =
              ev.createdAt &&
              !Number.isNaN(new Date(ev.createdAt).getTime())
                ? new Date(ev.createdAt)
                : createdAt

            try {
              await prisma.mindRecordEvent.create({
                data: {
                  userId: user.id,
                  ideaId: created.id,
                  groupId,
                  order: i,
                  kind,
                  content: evContent || '',
                  tags: evTags,
                  createdAt: evCreatedAt,
                },
              })
            } catch (evErr) {
              console.error(
                '[ApexMind] 导入 MindRecordEvent 失败:',
                evErr
              )
            }
          }
        } else {
          // 旧格式兼容：从 content + imageUrls 推导
          let order = 0
          if (content.length > 0) {
            try {
              await prisma.mindRecordEvent.create({
                data: {
                  userId: user.id,
                  ideaId: created.id,
                  groupId,
                  order: order++,
                  kind: 'text',
                  content,
                  tags,
                  createdAt,
                },
              })
            } catch (evErr) {
              console.error(
                '[ApexMind] 导入 MindRecordEvent(text) 失败:',
                evErr
              )
            }
          }
          for (const url of imageUrls) {
            try {
              await prisma.mindRecordEvent.create({
                data: {
                  userId: user.id,
                  ideaId: created.id,
                  groupId,
                  order: order++,
                  kind: 'image',
                  content: url,
                  tags: [],
                  createdAt,
                },
              })
            } catch (evErr) {
              console.error(
                '[ApexMind] 导入 MindRecordEvent(image) 失败:',
                evErr
              )
            }
          }
        }
      } catch (e) {
        console.error('[ApexMind] 导入 MindIdea 失败，已跳过该条记录:', e)
      }
    }

    // 2. 导入聊天会话与消息（MindChatSession + MindChatMessage）
    //    先按 sessionId 分组，如果缺失则按消息 id 分组
    const groups = new Map<string, ExportChat[]>()
    chatsRaw.forEach((msg, index) => {
      const key =
        (msg.sessionId && String(msg.sessionId)) ||
        (msg.id && String(msg.id)) ||
        `__single__${index}`
      const arr = groups.get(key)
      if (arr) arr.push(msg)
      else groups.set(key, [msg])
    })

    for (const [, msgs] of groups) {
      // 规范化、按时间排序
      const normalized = msgs
        .map((m) => {
          const createdAt =
            m.createdAt && !Number.isNaN(new Date(m.createdAt).getTime())
              ? new Date(m.createdAt)
              : new Date()
          return { ...m, createdAt }
        })
        .sort(
          (a, b) =>
            (a.createdAt as Date).getTime() -
            (b.createdAt as Date).getTime()
        )

      if (normalized.length === 0) continue

      const startedAtCandidate = normalized.find(
        (m) =>
          m.sessionStartedAt &&
          !Number.isNaN(new Date(m.sessionStartedAt).getTime())
      )
      const endedAtCandidate = normalized.find(
        (m) =>
          m.sessionEndedAt &&
          !Number.isNaN(new Date(m.sessionEndedAt).getTime())
      )

      const startedAt =
        (startedAtCandidate &&
          new Date(startedAtCandidate.sessionStartedAt!)) ||
        (normalized[0].createdAt as Date)
      const endedAt =
        (endedAtCandidate &&
          new Date(endedAtCandidate.sessionEndedAt!)) ||
        (normalized[normalized.length - 1].createdAt as Date)

      let session
      try {
        session = await prisma.mindChatSession.create({
          data: {
            userId: user.id,
            startedAt,
            endedAt,
            title: null,
            meta: {
              importedFrom: 'apexmind-export',
            },
          },
        })
        importedSessions += 1
        importedSessionIds.push(session.id)
      } catch (e) {
        console.error('[ApexMind] 创建导入会话失败，已跳过该组消息:', e)
        continue
      }

      for (const msg of normalized) {
        const content =
          typeof msg.content === 'string' ? msg.content.trim() : ''
        if (!content) continue

        const role =
          msg.role === 'assistant'
            ? 'assistant'
            : msg.role === 'system'
            ? 'system'
            : 'user'

        try {
          const metaValue =
            msg.meta === undefined ? undefined : (msg.meta as any)
          await prisma.mindChatMessage.create({
            data: {
              sessionId: session.id,
              userId: user.id,
              role,
              content,
              createdAt: msg.createdAt as Date,
              ...(metaValue !== undefined ? { meta: metaValue } : {}),
            },
          })
          importedMessages += 1
        } catch (e) {
          console.error(
            '[ApexMind] 导入 MindChatMessage 失败，已跳过该条记录:',
            e
          )
        }
      }
    }

    // 3. 异步补齐导入数据的 Embeddings（不阻塞导入请求）
    ;(async () => {
      try {
        const settings = await prisma.mindSettings.findUnique({
          where: { userId: user.id },
        })
        if (!settings) return

        let baseUrl = (settings.baseUrl || '').trim()
        let embeddingModel = (settings.embeddingModel || '').trim()
        let embeddingApiKey = (settings.apiKeyEncrypted || '').trim()
        let chatModel = (settings.chatModel || '').trim()
        let chatApiKey = (settings.apiKeyEncrypted || '').trim()

        // 复用多模型配置解析逻辑，优先使用默认模型的 embedding / chat 配置
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
                embeddingApiKey: (raw.embeddingApiKey || '')
                  .toString()
                  .trim(),
                chatModel: (raw.chatModel || '').toString().trim(),
                embeddingModel: (raw.embeddingModel || '').toString().trim(),
                isDefault: Boolean(raw.isDefault),
              }))
              .filter(
                (m: any) =>
                  m.baseUrl && (m.chatModel || m.embeddingModel),
              )

            if (models.length > 0) {
              const explicitDefault = models.find((m: any) => m.isDefault)
              const defaultModel = explicitDefault || models[0]

              if (defaultModel.baseUrl) {
                baseUrl = defaultModel.baseUrl
              }
              if (defaultModel.embeddingModel) {
                embeddingModel = defaultModel.embeddingModel
              }
              if (defaultModel.chatModel) {
                chatModel = defaultModel.chatModel
              }
              // embeddingApiKey 必须显式配置，不复用 apiKey
              embeddingApiKey = defaultModel.embeddingApiKey || ''
              if (defaultModel.apiKey) {
                chatApiKey = defaultModel.apiKey
              }
            }
          } catch (parseErr) {
            console.error(
              '[ApexMind] 导入后解析 MindSettings.models 失败，将回退到顶层设置:',
              parseErr,
            )
          }
        }

        if (!baseUrl || !embeddingModel || !embeddingApiKey) return

        // 为导入的完整想法生成 Embedding
        if (importedIdeaIds.length > 0) {
          const ideasToEmbed = await prisma.mindIdea.findMany({
            where: {
              id: { in: importedIdeaIds },
              userId: user.id,
            },
          })

          for (const idea of ideasToEmbed) {
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
                create: {
                  ideaId: idea.id,
                  embedding: serializeEmbedding(vec),
                },
              })
            } catch (e) {
              console.error(
                '[ApexMind] 导入后为 MindIdea 生成 Embedding 失败:',
                e,
              )
            }
          }
        }

        // 为导入的会话生成会话总结 + Embedding（小批量）
        if (importedSessionIds.length > 0 && baseUrl && chatModel && chatApiKey) {
          const prismaAny: any = prisma

          const chatSummaryPromptRaw = (settings as any).chatSummaryPrompt
            ? String((settings as any).chatSummaryPrompt).trim()
            : ''
          const chatSummaryPrompt =
            chatSummaryPromptRaw && chatSummaryPromptRaw.length > 0
              ? chatSummaryPromptRaw
              : '你是一位擅长总结信息的助理。请阅读下面这一组对话记录，用简洁的中文总结出这段对话中最重要的 3-5 个要点（事件、决策、待办事项、结论），不要逐字复述原话，使用条列式输出。'

          const MAX_SESSIONS = 10
          const sessionIdsLimited = importedSessionIds.slice(0, MAX_SESSIONS)

          for (const sid of sessionIdsLimited) {
            try {
              const messagesInSession = await prisma.mindChatMessage.findMany({
                where: { sessionId: sid, userId: user.id },
                orderBy: { createdAt: 'asc' },
              })
              if (!messagesInSession.length) continue

              const convoLines: string[] = []
              for (const m of messagesInSession) {
                const prefix = m.role === 'assistant' ? 'AI' : '用户'
                convoLines.push(`[${prefix} ${m.createdAt.toISOString()}]`)
                convoLines.push(m.content)
                convoLines.push('')
              }
              const convoText = convoLines.join('\n')

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
                  model: chatModel,
                  messages: [
                    { role: 'system', content: chatSummaryPrompt },
                    { role: 'user', content: convoText },
                  ],
                  stream: false,
                }),
              })

              if (!summaryRes.ok) {
                console.error(
                  '[ApexMind] 导入后生成会话总结失败:',
                  sid,
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
                where: { sessionId: sid },
                update: {
                  content: trimmedSummary,
                  ...(summaryEmbedding ? { embedding: summaryEmbedding } : {}),
                },
                create: {
                  sessionId: sid,
                  userId: user.id,
                  content: trimmedSummary,
                  ...(summaryEmbedding ? { embedding: summaryEmbedding } : {}),
                },
              })
            } catch (e) {
              console.error(
                '[ApexMind] 导入后生成会话总结及 Embedding 失败:',
                e,
              )
            }
          }
        }
      } catch (e) {
        console.error('[ApexMind] 导入后异步补齐 Embeddings 出错:', e)
      }
    })()

    return NextResponse.json({
      success: true,
      data: {
        importedIdeas,
        importedSessions,
        importedMessages,
      },
    })
  } catch (error) {
    console.error('[ApexMind] Import error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

