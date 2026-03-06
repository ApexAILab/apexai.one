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
 * DELETE /api/apexmind/purge
 *
 * 彻底清空当前账号的 ApexMind 数据：
 * - 完整想法 / 想法向量 / 记录事件
 * - 聊天会话 / 聊天消息 / 聊天向量
 * - 草稿 / 设置
 */
export async function DELETE() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      )
    }

    const prisma = await getPrisma()

    // 依次执行独立的 deleteMany，避免长事务超时
    const deletedChatMessageEmbeddings =
      await prisma.mindChatMessageEmbedding.deleteMany({
        where: {
          message: {
            userId: user.id,
          },
        },
      })

    const deletedChatMessages = await prisma.mindChatMessage.deleteMany({
      where: {
        userId: user.id,
      },
    })

    const deletedChatSessions = await prisma.mindChatSession.deleteMany({
      where: {
        userId: user.id,
      },
    })

    const deletedIdeaEmbeddings = await prisma.mindIdeaEmbedding.deleteMany({
      where: {
        idea: {
          userId: user.id,
        },
      },
    })

    const deletedRecordEvents = await prisma.mindRecordEvent.deleteMany({
      where: {
        userId: user.id,
      },
    })

    const deletedIdeas = await prisma.mindIdea.deleteMany({
      where: {
        userId: user.id,
      },
    })

    const deletedDrafts = await prisma.mindDraft.deleteMany({
      where: {
        userId: user.id,
      },
    })

    const result = {
      ideas: deletedIdeas.count,
      ideaEmbeddings: deletedIdeaEmbeddings.count,
      recordEvents: deletedRecordEvents.count,
      chatSessions: deletedChatSessions.count,
      chatMessages: deletedChatMessages.count,
      chatMessageEmbeddings: deletedChatMessageEmbeddings.count,
      drafts: deletedDrafts.count,
    }

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('[ApexMind] Purge error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

