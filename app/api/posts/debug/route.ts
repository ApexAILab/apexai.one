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

async function getPrisma() {
  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set.')
    }
    const { prisma } = await import('@/lib/db')
    return prisma
  } catch (error) {
    console.error('Failed to import prisma:', error)
    throw error
  }
}

// 调试端点：查看最新的帖子数据
export async function GET() {
  try {
    const prisma = await getPrisma()
    
    // 获取最新的 5 条帖子
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    return NextResponse.json({
      success: true,
      posts: posts.map((post) => ({
        id: post.id,
        content: post.content.substring(0, 50) + '...',
        tags: post.tags,
        tagsType: typeof post.tags,
        tagsIsArray: Array.isArray(post.tags),
        tagsLength: Array.isArray(post.tags) ? post.tags.length : 0,
        images: post.images,
        createdAt: post.createdAt,
      })),
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
