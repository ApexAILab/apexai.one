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
 * DELETE /api/apexmind/chat/sessions/:sessionId
 *
 * 删除指定会话及其所有消息（仅限当前用户）
 */
export async function DELETE(
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
    const id = (sessionId || '').trim()

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少会话 ID' },
        { status: 400 }
      )
    }

    // 校验会话归属
    const session = await prisma.mindChatSession.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!session || session.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: '会话不存在或无权删除' },
        { status: 404 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // 先删该会话下的消息 embedding，再删消息，最后删会话本身
      await tx.mindChatMessageEmbedding.deleteMany({
        where: {
          message: {
            sessionId: id,
            userId: user.id,
          },
        },
      })

      await tx.mindChatMessage.deleteMany({
        where: {
          sessionId: id,
          userId: user.id,
        },
      })

      await tx.mindChatSession.delete({
        where: { id },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ApexMind] Delete chat session error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

