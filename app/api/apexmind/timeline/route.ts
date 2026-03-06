import { NextResponse } from 'next/server'
import { config } from 'dotenv'
import { resolve } from 'path'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'

// 显式加载 .env 文件
try {
  config({ path: resolve(process.cwd(), '.env') })
} catch (error) {
  console.warn('Failed to load .env file explicitly:', error)
}

// 动态导入 prisma
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

type TimelineItem = {
  id: string
  source: 'record' | 'chat'
  mode: 'record' | 'chat'
  role: 'user' | 'assistant' | 'system'
  kind: 'text' | 'image'
  content: string
  createdAt: string
}

/**
 * GET /api/apexmind/timeline
 *
 * 用于在前端重新打开 ApexMind 时，还原上一次使用时的聊天区状态。
 * 返回最近若干条「记录模式条目 + 聊天消息」，按时间从旧到新排序。
 *
 * Query:
 * - limit?: number  总返回条数上限，默认 50，最大 200
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

    const rawLimit = parseInt(searchParams.get('limit') || '50', 10)
    const limit = Math.min(Math.max(rawLimit || 50, 1), 200)

    // 为简单起见：分别从记录事件和聊天消息中各取 limit 条，然后在内存中合并排序
    const perSourceTake = limit

    const prismaAny: any = prisma

    const [recordEvents, chatMessages] = await Promise.all([
      typeof prismaAny.mindRecordEvent?.findMany === 'function'
        ? prismaAny.mindRecordEvent.findMany({
            where: {
              userId: user.id,
            },
            orderBy: { createdAt: 'desc' },
            take: perSourceTake,
          })
        : Promise.resolve([]),
      prismaAny.mindChatMessage.findMany({
        where: {
          userId: user.id,
        },
        orderBy: { createdAt: 'desc' },
        take: perSourceTake,
      }),
    ])

    const merged: TimelineItem[] = []

    for (const ev of recordEvents) {
      const kind =
        ev.kind === 'image'
          ? ('image' as const)
          : ('text' as const)

      merged.push({
        id: `record-${ev.id}`,
        source: 'record',
        mode: 'record',
        role: 'user',
        kind,
        content: ev.content,
        createdAt: ev.createdAt.toISOString(),
      })
    }

    for (const msg of chatMessages) {
      const normalizedRole =
        msg.role === 'user' || msg.role === 'assistant'
          ? (msg.role as 'user' | 'assistant')
          : 'system'

      merged.push({
        id: `chat-${msg.id}`,
        source: 'chat',
        mode: 'chat',
        role: normalizedRole,
        kind: 'text',
        content: msg.content,
        createdAt: msg.createdAt.toISOString(),
      })
    }

    // 按时间从旧到新排序，便于直接按顺序渲染
    merged.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )

    const pageItems = merged.slice(-limit)

    return NextResponse.json({
      success: true,
      data: {
        items: pageItems,
      },
    })
  } catch (error) {
    console.error('[ApexMind] Timeline error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

