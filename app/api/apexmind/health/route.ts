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

/**
 * GET /api/apexmind/health
 * 返回当前用户 ApexMind 相关数据的统计，用于快速检查「是否正确写入 & 建好向量」
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

    const [
      ideaCount,
      ideaEmbeddingCount,
      chatMessageCount,
      chatUserMessageCount,
      chatEmbeddingCount,
    ] = await Promise.all([
      prisma.mindIdea.count({ where: { userId: user.id } }),
      prisma.mindIdeaEmbedding.count({
        where: { idea: { userId: user.id } },
      }),
      prisma.mindChatMessage.count({ where: { userId: user.id } }),
      prisma.mindChatMessage.count({
        where: { userId: user.id, role: 'user' },
      }),
      prisma.mindChatMessageEmbedding.count({
        where: {
          message: {
            userId: user.id,
          },
        },
      }),
    ])

    const ideaEmbeddingCoverage =
      ideaCount > 0 ? ideaEmbeddingCount / ideaCount : null
    const chatEmbeddingCoverage =
      chatUserMessageCount > 0 ? chatEmbeddingCount / chatUserMessageCount : null

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        ideas: {
          total: ideaCount,
          withEmbedding: ideaEmbeddingCount,
          embeddingCoverage: ideaEmbeddingCoverage,
        },
        chats: {
          totalMessages: chatMessageCount,
          userMessages: chatUserMessageCount,
          withEmbedding: chatEmbeddingCount,
          embeddingCoverage: chatEmbeddingCoverage,
        },
      },
    })
  } catch (error) {
    console.error('[ApexMind] Health endpoint error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

