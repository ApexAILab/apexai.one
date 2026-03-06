import { NextResponse } from 'next/server'
import { config } from 'dotenv'
import { resolve } from 'path'
import { getCurrentUser } from '@/lib/auth'
import { put } from '@vercel/blob'

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

async function normalizeIdeaImageUrls(ideas: any[], userId: string, prisma: any) {
  const normalized: any[] = []

  for (const idea of ideas) {
    const rawUrls: unknown = idea.imageUrls
    const urls: string[] = Array.isArray(rawUrls)
      ? rawUrls.map((u) => String(u ?? ''))
      : []

    let changed = false
    const nextUrls: string[] = []

    for (let idx = 0; idx < urls.length; idx++) {
      const url = urls[idx]
      if (typeof url === 'string' && url.startsWith('data:image/')) {
        try {
          const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(url)
          if (!match) {
            nextUrls.push(url)
            continue
          }
          const mime = match[1]
          const base64 = match[2]
          const buffer = Buffer.from(base64, 'base64')

          const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_')
          const extFromMime =
            mime === 'image/jpeg'
              ? '.jpg'
              : mime === 'image/png'
              ? '.png'
              : mime === 'image/webp'
              ? '.webp'
              : mime === 'image/gif'
              ? '.gif'
              : ''

          const pathname = `apexmind/${safeUserId}/legacy-${idea.id}-${idx}${extFromMime}`

          const blob = await put(pathname, buffer, {
            access: 'public',
            addRandomSuffix: true,
          })

          nextUrls.push(blob.url)
          changed = true
        } catch (e) {
          console.error(
            '[ApexMind] 导出时迁移 Data URL 图片失败，保留原值:',
            e
          )
          nextUrls.push(url)
        }
      } else {
        nextUrls.push(url)
      }
    }

    if (changed) {
      try {
        await prisma.mindIdea.update({
          where: { id: idea.id },
          data: { imageUrls: nextUrls },
        })
      } catch (e) {
        console.error(
          '[ApexMind] 导出时回写更新后的 imageUrls 失败（不影响导出文件）:',
          e
        )
      }
      normalized.push({
        ...idea,
        imageUrls: nextUrls,
      })
    } else {
      normalized.push(idea)
    }
  }

  return normalized
}

/**
 * GET /api/apexmind/export
 * 导出当前用户的 ApexMind 数据（完整想法 + 聊天消息）
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

    const [rawIdeas, chatMessages] = await Promise.all([
      prisma.mindIdea.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
        include: {
          recordEvents: {
            orderBy: { order: 'asc' },
          },
        },
      }),
      prisma.mindChatMessage.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
        include: {
          session: true,
        },
      }),
    ])

    // 确保导出的图片地址为短 URL：对仍然为 Data URL 的旧数据，导出时自动迁移到对象存储
    const ideas = await normalizeIdeaImageUrls(rawIdeas, user.id, prisma)

    const exportPayload = {
      version: '1.1',
      exportedAt: new Date().toISOString(),
      userId: user.id,
      ideas: ideas.map((idea) => ({
        id: idea.id,
        type: 'idea' as const,
        content: idea.content,
        tags: idea.tags,
        imageUrls: idea.imageUrls,
        createdAt: idea.createdAt.toISOString(),
        updatedAt: idea.updatedAt.toISOString(),
        sourceMeta: idea.sourceMeta ?? null,
        recordEvents: Array.isArray((idea as any).recordEvents)
          ? (idea as any).recordEvents.map((ev: any) => ({
              kind: ev.kind || 'text',
              content: ev.content ?? '',
              tags: Array.isArray(ev.tags) ? ev.tags : [],
              order: typeof ev.order === 'number' ? ev.order : 0,
              createdAt: ev.createdAt?.toISOString?.() ?? idea.createdAt.toISOString(),
            }))
          : [],
      })),
      chats: chatMessages.map((msg) => ({
        id: msg.id,
        sessionId: msg.sessionId,
        sessionStartedAt: msg.session?.startedAt?.toISOString() ?? null,
        sessionEndedAt: msg.session?.endedAt?.toISOString() ?? null,
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
        meta: msg.meta ?? null,
      })),
    }

    const json = JSON.stringify(exportPayload, null, 2)

    return new NextResponse(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="apexmind-export-${new Date()
          .toISOString()
          .replace(/[:.]/g, '-')}.json"`,
      },
    })
  } catch (error) {
    console.error('[ApexMind] Export error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


