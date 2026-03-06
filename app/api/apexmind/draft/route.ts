import { NextResponse } from 'next/server'
import { config } from 'dotenv'
import { resolve } from 'path'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'

// 显式加载 .env 文件（与现有 posts/test-db 路由保持一致）
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
 * 草稿条目类型（Record Mode 未打包的碎片）
 */
type DraftItem = {
  type: 'text' | 'image'
  content: string
  createdAt?: string
}

/**
 * GET /api/apexmind/draft
 * 获取当前用户的 ApexMind 草稿分组
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
    const draft = await prisma.mindDraft.findUnique({
      where: { userId: user.id },
    })

    return NextResponse.json({
      success: true,
      data: draft ? { items: draft.items } : null,
    })
  } catch (error) {
    console.error('[ApexMind] Get draft error:', error)
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
 * PUT /api/apexmind/draft
 * 保存 / 更新当前用户的 ApexMind 草稿分组
 */
export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      )
    }

    const prisma = await getPrisma()
    const body = (await request.json()) as { items?: unknown }

    if (!body.items || !Array.isArray(body.items)) {
      return NextResponse.json(
        { success: false, error: 'items 必须是数组' },
        { status: 400 }
      )
    }

    // 只保留结构合法的条目，避免脏数据
    const items: DraftItem[] = (body.items as any[])
      .filter((item) => item && typeof item === 'object')
      .map(
        (raw): DraftItem => ({
          type: raw.type === 'image' ? 'image' : 'text',
          content: String(raw.content ?? '').toString(),
          createdAt: raw.createdAt,
        })
      )
      .filter((item) => item.content.trim().length > 0)

    await prisma.mindDraft.upsert({
      where: { userId: user.id },
      update: { items },
      create: {
        userId: user.id,
        items,
      },
    })

    return NextResponse.json({
      success: true,
      data: { items },
    })
  } catch (error) {
    console.error('[ApexMind] Update draft error:', error)
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
 * DELETE /api/apexmind/draft
 * 清空当前用户的 ApexMind 草稿分组
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
    await prisma.mindDraft.deleteMany({
      where: { userId: user.id },
    })

    return NextResponse.json({
      success: true,
      message: '草稿已清空',
    })
  } catch (error) {
    console.error('[ApexMind] Delete draft error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}


