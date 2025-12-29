import { NextResponse } from 'next/server'
import { config } from 'dotenv'
import { resolve } from 'path'

export const runtime = 'nodejs'

// 显式加载 .env 文件（作为备选方案）
try {
  config({ path: resolve(process.cwd(), '.env') })
} catch (error) {
  console.warn('Failed to load .env file explicitly:', error)
}

// 动态导入 prisma，避免初始化错误
async function getPrisma() {
  try {
    // 检查环境变量
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL is not set in process.env')
      console.error('Current working directory:', process.cwd())
      throw new Error('DATABASE_URL environment variable is not set. Please check your .env file and restart the server.')
    }
    const { prisma } = await import('@/lib/db')
    return prisma
  } catch (error) {
    console.error('Failed to import prisma:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Database connection failed: ${errorMessage}`)
  }
}

// 获取日历数据（哪些日期有帖子）
export async function GET() {
  try {
    const prisma = await getPrisma()
    const today = new Date()
    const year = today.getFullYear()
    const month = today.getMonth()
    
    // 获取当月第一天和最后一天
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    // 查询当月所有有帖子的日期
    const posts = await prisma.post.findMany({
      where: {
        createdAt: {
          gte: firstDay,
          lte: lastDay,
        },
      },
      select: {
        createdAt: true,
      },
    })
    
    // 将日期转换为 YYYY-MM-DD 格式的 Set，用于快速查找
    const datesWithPosts = new Set(
      posts.map((post) => {
        const date = new Date(post.createdAt)
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      })
    )
    
    return NextResponse.json({
      success: true,
      data: Array.from(datesWithPosts),
    })
  } catch (error) {
    console.error('Get calendar error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
