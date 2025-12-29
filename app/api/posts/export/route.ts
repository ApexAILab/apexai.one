import { NextResponse } from 'next/server'
import { config } from 'dotenv'
import { resolve } from 'path'

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
    const databaseUrl = process.env.DATABASE_URL
    
    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL environment variable is not set. ' +
        'Please ensure your .env file is in the project root and contains DATABASE_URL.'
      )
    }
    
    const { prisma } = await import('@/lib/db')
    return prisma
  } catch (error) {
    console.error('Failed to import prisma:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Database connection failed: ${errorMessage}`)
  }
}

/**
 * GET /api/posts/export
 * 导出帖子数据（支持时间范围筛选）
 */
export async function GET(request: Request) {
  try {
    const prisma = await getPrisma()
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') // 可选：开始日期 (ISO string)
    const endDate = searchParams.get('endDate') // 可选：结束日期 (ISO string)

    const where: any = {}
    
    // 如果提供了时间范围，则筛选
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        const start = new Date(startDate)
        start.setHours(0, 0, 0, 0)
        where.createdAt.gte = start
      }
      if (endDate) {
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999)
        where.createdAt.lte = end
      }
    }

    const posts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        content: true,
        tags: true,
        images: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: posts,
      count: posts.length,
    })
  } catch (error) {
    console.error('Export posts error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

