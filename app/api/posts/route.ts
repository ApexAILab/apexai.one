import { NextResponse } from 'next/server'
import { config } from 'dotenv'
import { resolve } from 'path'
import { getCurrentUser } from '@/lib/auth'

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
    const databaseUrl = process.env.DATABASE_URL
    
    if (!databaseUrl) {
      // 输出所有相关的环境变量用于调试
      const envKeys = Object.keys(process.env)
      const relevantKeys = envKeys.filter(k => 
        k.includes('DATABASE') || 
        k.includes('DIRECT') || 
        k.includes('POSTGRES')
      )
      console.error('DATABASE_URL is not set in process.env')
      console.error('Relevant env vars found:', relevantKeys)
      console.error('All env vars count:', envKeys.length)
      console.error('Current working directory:', process.cwd())
      
      throw new Error(
        'DATABASE_URL environment variable is not set. ' +
        'Please ensure your .env file is in the project root and contains DATABASE_URL. ' +
        'Then restart the development server. ' +
        'Visit /api/debug-env for more details.'
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
 * GET /api/posts
 * 获取帖子列表（可按日期分页）
 * 注意：只返回当前登录用户的帖子（数据隔离）
 */
export async function GET(request: Request) {
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
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') // 可选：按日期筛选
    const search = searchParams.get('search') // 可选：搜索关键词
    let limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    // 限制最大查询数量，防止超时和内存问题
    const MAX_LIMIT = 5000
    if (limit > MAX_LIMIT) {
      limit = MAX_LIMIT
    }

    // 只查询当前用户的帖子（数据隔离）
    const where: any = {
      userId: user.id, // 关键：只查询当前用户的帖子
    }
    if (date) {
      const startDate = new Date(date)
      startDate.setHours(0, 0, 0, 0)
      const endDate = new Date(date)
      endDate.setHours(23, 59, 59, 999)
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      }
    }

    // 搜索功能：在内容和标签中搜索
    // 如果有搜索关键词，需要获取所有帖子进行服务端筛选（因为标签搜索需要部分匹配）
    let posts: any[] = []
    let total = 0

    if (search && search.trim()) {
      // 搜索模式：获取所有帖子，然后在服务端进行筛选
      // 限制最大查询数量，防止超时
      const searchTerm = search.trim().toLowerCase()
      // 搜索模式：只查询当前用户的帖子
      const searchWhere: any = {
        userId: user.id, // 关键：只查询当前用户的帖子
      }
      if (date) {
        const startDate = new Date(date)
        startDate.setHours(0, 0, 0, 0)
        const endDate = new Date(date)
        endDate.setHours(23, 59, 59, 999)
        searchWhere.createdAt = {
          gte: startDate,
          lte: endDate,
        }
      }
      const allPosts = await prisma.post.findMany({
        where: searchWhere,
        orderBy: { createdAt: 'desc' },
        take: MAX_LIMIT, // 限制最大查询数量
        select: {
          id: true,
          title: true,
          content: true,
          type: true,
          tags: true,
          images: true,
          createdAt: true,
          updatedAt: true,
        },
      })

      // 在服务端进行内容和标签的筛选
      posts = allPosts.filter((post) => {
        const contentMatch = post.content.toLowerCase().includes(searchTerm)
        const tagMatch = Array.isArray(post.tags) && 
          post.tags.some((tag) => String(tag).toLowerCase().includes(searchTerm))
        return contentMatch || tagMatch
      })
      total = posts.length
    } else {
      // 普通模式：使用 Prisma 查询和分页
      posts = await prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          title: true,
          content: true,
          type: true,
          tags: true,
          images: true,
          createdAt: true,
          updatedAt: true,
        },
      })
      total = await prisma.post.count({ where })
    }

    return NextResponse.json({
      success: true,
      data: posts,
      total,
    })
  } catch (error) {
    console.error('Get posts error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/posts
 * 创建新帖子
 * 注意：帖子会自动关联到当前登录用户
 */
export async function POST(request: Request) {
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
    const body = await request.json()
    
    const { content, title, type, tags, images, createdAt } = body

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: '内容不能为空' },
        { status: 400 }
      )
    }

    // 确保 tags 是字符串数组
    const tagsArray = Array.isArray(tags)
      ? tags.filter((t) => t != null && String(t).trim()).map((t) => String(t).trim())
      : []

    const postData: any = {
      userId: user.id, // 关键：关联到当前用户
      content: content.trim(),
      title: title?.trim() || null,
      type: type || 'THOUGHT',
      tags: tagsArray,
      images: Array.isArray(images) ? images : [],
    }

    // 可选：设置创建时间（用于导入功能）
    if (createdAt) {
      const customDate = new Date(createdAt)
      if (!Number.isNaN(customDate.getTime())) {
        postData.createdAt = customDate
      }
    }

    const post = await prisma.post.create({
      data: postData,
      select: {
        id: true,
        title: true,
        content: true,
        type: true,
        tags: true,
        images: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: post,
    })
  } catch (error) {
    console.error('Create post error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/posts
 * 更新帖子（当前支持：内容、标签、发布时间、图片）
 * 注意：只能更新当前用户自己的帖子
 */
export async function PATCH(request: Request) {
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
    const body = await request.json()
    const { id, content, tags, createdAt, images } = body as {
      id?: string
      content?: string
      tags?: unknown
      createdAt?: string
      images?: unknown
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: '帖子 ID 不能为空' },
        { status: 400 }
      )
    }

    // 验证帖子是否属于当前用户
    const existingPost = await prisma.post.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!existingPost) {
      return NextResponse.json(
        { success: false, error: '帖子不存在' },
        { status: 404 }
      )
    }

    if (existingPost.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: '无权访问此帖子' },
        { status: 403 }
      )
    }

    const data: Record<string, unknown> = {}

    // 可选：更新内容
    if (content !== undefined && content !== null) {
      data.content = String(content).trim()
    }

    // 可选：更新标签
    if (Array.isArray(tags)) {
      const tagsArray = tags
        .filter((t) => t != null && String(t).trim())
        .map((t) => String(t).trim())
      data.tags = tagsArray
    }

    // 可选：更新发布时间
    if (createdAt) {
      const newDate = new Date(createdAt)
      if (Number.isNaN(newDate.getTime())) {
        return NextResponse.json(
          { success: false, error: '无效的 createdAt 时间格式' },
          { status: 400 }
        )
      }
      data.createdAt = newDate
    }

    // 可选：更新图片
    if (Array.isArray(images)) {
      const imageArray = images
        .filter((v) => typeof v === 'string' && v.trim())
        .map((v) => (v as string).trim())
      data.images = imageArray
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { success: false, error: '没有可更新的字段' },
        { status: 400 }
      )
    }

    const updated = await prisma.post.update({
      where: { id },
      data,
      select: {
        id: true,
        title: true,
        content: true,
        type: true,
        tags: true,
        images: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return NextResponse.json({
      success: true,
      data: updated,
    })
  } catch (error) {
    console.error('Update post error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/posts
 * 删除帖子
 * 注意：只能删除当前用户自己的帖子
 */
export async function DELETE(request: Request) {
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
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: '帖子 ID 不能为空' },
        { status: 400 }
      )
    }

    // 验证帖子是否属于当前用户
    const existingPost = await prisma.post.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!existingPost) {
      return NextResponse.json(
        { success: false, error: '帖子不存在' },
        { status: 404 }
      )
    }

    if (existingPost.userId !== user.id) {
      return NextResponse.json(
        { success: false, error: '无权删除此帖子' },
        { status: 403 }
      )
    }

    await prisma.post.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: '帖子已删除',
    })
  } catch (error) {
    console.error('Delete post error:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
