import { NextRequest, NextResponse } from 'next/server'
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

// DELETE /api/apexmind/ideas/[id] 删除一条完整想法（仅限当前用户）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      )
    }

    const resolved = await params
    const ideaId = (resolved?.id || '').trim()
    if (!ideaId) {
      return NextResponse.json(
        { success: false, error: '缺少想法 ID' },
        { status: 400 }
      )
    }

    const prisma = await getPrisma()

    const result = await prisma.mindIdea.deleteMany({
      where: {
        id: ideaId,
        userId: user.id,
      },
    })

    if (result.count === 0) {
      return NextResponse.json(
        { success: false, error: '想法不存在或无权删除' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: ideaId,
      },
    })
  } catch (error) {
    console.error('[ApexMind] Delete idea error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

