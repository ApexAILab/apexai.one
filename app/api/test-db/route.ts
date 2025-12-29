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
    const { prisma } = await import('@/lib/db')
    return prisma
  } catch (error) {
    console.error('Failed to import prisma:', error)
    throw new Error('Database connection failed. Please check your environment variables.')
  }
}

export async function GET() {
  try {
    const prisma = await getPrisma()
    const postCount = await prisma.post.count()
    const conversationCount = await prisma.conversation.count()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Database connected successfully!',
      stats: {
        posts: postCount,
        conversations: conversationCount,
      }
    })
  } catch (error) {
    console.error('Database connection error:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      hint: '请确保已配置 DATABASE_URL 环境变量'
    }, { status: 500 })
  }
}
