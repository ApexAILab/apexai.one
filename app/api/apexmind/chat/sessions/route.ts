import { NextResponse } from 'next/server'
import { config } from 'dotenv'
import { resolve } from 'path'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'

// 显式加载 .env 文件（与其它 ApexMind API 路由保持一致）
try {
  config({ path: resolve(process.cwd(), '.env') })
} catch (error) {
  console.warn('Failed to load .env file explicitly:', error)
}

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
 * GET /api/apexmind/chat/sessions
 *
 * 返回当前用户的会话列表（用于数据后台“对话”Tab）
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
    const rawTake = parseInt(searchParams.get('take') || '50', 10)
    const take = Math.min(Math.max(rawTake || 50, 1), 200)

    const sessions = await prisma.mindChatSession.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: 'desc' },
      take,
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        title: true,
        _count: {
          select: {
            messages: true,
          },
        },
      },
    })

    const userMsgCounts = await prisma.mindChatMessage.groupBy({
      by: ['sessionId'],
      where: {
        userId: user.id,
        role: 'user',
        sessionId: { in: sessions.map((s) => s.id) },
      },
      _count: { _all: true },
    })

    const countMap = new Map<string, number>()
    for (const row of userMsgCounts) {
      countMap.set(row.sessionId, row._count._all)
    }

    return NextResponse.json({
      success: true,
      data: sessions.map((s) => ({
        id: s.id,
        startedAt: s.startedAt.toISOString(),
        endedAt: s.endedAt ? s.endedAt.toISOString() : null,
        title: s.title,
        messageCount: s._count.messages,
        userMessageCount: countMap.get(s.id) || 0,
      })),
    })
  } catch (error) {
    console.error('[ApexMind] List chat sessions error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

