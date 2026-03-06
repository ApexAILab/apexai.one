import { NextResponse } from 'next/server'
import { config } from 'dotenv'
import { resolve } from 'path'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'

// 显式加载 .env 文件（保持与其他 API 一致）
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
 * GET /api/apexmind/chat/context?messageId=xxx
 * 返回指定 assistant 消息的 RAG 引用信息（用于前端展开查看）
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

    const { searchParams } = new URL(request.url)
    const messageId = (searchParams.get('messageId') || '').trim()
    if (!messageId) {
      return NextResponse.json(
        { success: false, error: 'messageId 不能为空' },
        { status: 400 }
      )
    }

    const prisma = await getPrisma()
    const msg = await prisma.mindChatMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        userId: true,
        role: true,
        meta: true,
      },
    })

    if (!msg || msg.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: '无权限访问该消息' },
        { status: 403 }
      )
    }

    const rag = (msg.meta as any)?.rag
    const ideaCount = Number(rag?.ideaCount || 0) || 0
    const chatCount = Number(rag?.chatCount || 0) || 0
    const contexts = Array.isArray(rag?.contexts) ? rag.contexts : []

    return NextResponse.json({
      success: true,
      data: {
        messageId: msg.id,
        ideaCount,
        chatCount,
        contexts,
      },
    })
  } catch (error) {
    console.error('[ApexMind] Get chat context error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

