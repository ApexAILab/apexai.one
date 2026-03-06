import { NextResponse } from 'next/server'
import { config } from 'dotenv'
import { resolve } from 'path'
import { put } from '@vercel/blob'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'

// 显式加载 .env 文件（与其它 ApexMind API 路由保持一致）
try {
  config({ path: resolve(process.cwd(), '.env') })
} catch (error) {
  console.warn('Failed to load .env file explicitly:', error)
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

/**
 * POST /api/apexmind/upload-image
 *
 * 使用 Vercel Blob 上传一张图片，返回可公开访问的 URL。
 * 请求体：multipart/form-data，字段名为 "file"
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: '缺少文件字段 file' },
        { status: 400 }
      )
    }

    if (!file.type || !file.type.startsWith('image/')) {
      return NextResponse.json(
        { success: false, error: '仅支持图片文件上传' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `图片大小不能超过 ${Math.round(
            MAX_FILE_SIZE_BYTES / 1024 / 1024
          )}MB`,
        },
        { status: 400 }
      )
    }

    // 生成相对稳定、可读的路径前缀，避免所有文件都堆在根目录
    const safeUserId = user.id.replace(/[^a-zA-Z0-9_-]/g, '_')
    const extMatch = file.name.match(/\.[a-zA-Z0-9]+$/)
    const ext = extMatch ? extMatch[0].toLowerCase() : ''
    const baseName = `apexmind/${safeUserId}/${Date.now().toString()}`
    const pathname = `${baseName}${ext}`

    // 使用 Vercel Blob 存储图片，access 设为 public，便于直接在 <img> 中引用
    const blob = await put(pathname, file, {
      access: 'public',
      addRandomSuffix: true,
    })

    return NextResponse.json({
      success: true,
      data: {
        url: blob.url,
      },
    })
  } catch (error) {
    console.error('[ApexMind] 上传图片失败:', error)
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : '上传图片时发生未知错误',
      },
      { status: 500 }
    )
  }
}

