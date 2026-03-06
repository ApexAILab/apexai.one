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
 * GET /api/apexmind/chat/sessions/:sessionId/messages
 *
 * 返回指定会话的消息列表（用于数据后台“对话”Tab）
 */
export async function GET(
  request: Request,
  ctx: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      )
    }

    const prisma = await getPrisma()
    const { sessionId } = await ctx.params

    const { searchParams } = new URL(request.url)
    const rawLimit = parseInt(searchParams.get('limit') || '400', 10)
    const limit = Math.min(Math.max(rawLimit || 400, 1), 2000)

    // 先校验 session 是否属于当前用户
    const session = await prisma.mindChatSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    })
    if (!session || session.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: '会话不存在' },
        { status: 404 }
      )
    }

    const messages = await prisma.mindChatMessage.findMany({
      where: {
        sessionId,
        userId: user.id,
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: {
        id: true,
        role: true,
        content: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('[ApexMind] List session messages error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

