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
 * GET /api/posts/tags
 * 获取所有唯一的标签（只查询 tags 字段，不获取完整内容）
 * 注意：只返回当前用户的帖子标签
 */
export async function GET() {
  try {
    // 验证用户身份
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      )
    }

    const prisma = await getPrisma()
    
    // 只查询 tags 字段，不获取完整内容，提高性能（只查询当前用户的帖子）
    const posts = await prisma.post.findMany({
      where: {
        userId: user.id, // 关键：只查询当前用户的帖子
      },
      select: {
        tags: true,
      },
    })

    // 提取所有唯一的标签
    const tagSet = new Set<string>()
    posts.forEach((post) => {
      if (post.tags && Array.isArray(post.tags) && post.tags.length > 0) {
        post.tags.forEach((tag: any) => {
          const tagStr = String(tag).trim()
          if (tagStr) {
            tagSet.add(tagStr)
          }
        })
      }
    })

    const allTags = Array.from(tagSet).sort()

    return NextResponse.json({
      success: true,
      data: allTags,
    })
  } catch (error) {
    console.error('Get tags error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

