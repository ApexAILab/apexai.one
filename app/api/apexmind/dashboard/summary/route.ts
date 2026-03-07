import { NextResponse } from 'next/server'
import { config } from 'dotenv'
import { resolve } from 'path'
import { getCurrentUser } from '@/lib/auth'

export const runtime = 'nodejs'

// 显式加载 .env 文件（与其它 ApexMind API 路由保持一致）
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

function parseMonth(raw: string | null) {
  // "YYYY-MM"
  if (!raw) return null
  const m = /^(\d{4})-(\d{2})$/.exec(raw.trim())
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null
  if (month < 1 || month > 12) return null
  return { year, month }
}

function getMonthRange(year: number, month: number) {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0)
  const end = new Date(year, month, 1, 0, 0, 0, 0)
  return { start, end }
}

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10)
}

function isUsefulToken(token: string) {
  const t = token.trim()
  if (!t) return false
  if (t.length <= 1) return false
  // 过滤纯数字
  if (/^\d+$/.test(t)) return false
  // 过滤纯标点/符号
  if (/^[\p{P}\p{S}]+$/u.test(t)) return false
  return true
}

const STOPWORDS = new Set(
  [
    '的',
    '了',
    '和',
    '是',
    '在',
    '我',
    '你',
    '他',
    '她',
    '它',
    '我们',
    '你们',
    '他们',
    '这个',
    '那个',
    '一个',
    '一些',
    '这样',
    '那样',
    '因为',
    '所以',
    '但是',
    '如果',
    '然后',
    '其实',
    '自己',
    '就是',
    '不是',
    '没有',
    '可以',
    '可能',
    '应该',
    '现在',
    '今天',
    '昨天',
    '明天',
    '这',
    '那',
    '也',
    '都',
    '很',
    '更',
    '最',
    '又',
    '还',
    '把',
    '被',
    '让',
    '对',
    '与',
    '及',
  ].map((s) => s.toLowerCase())
)

function topKeywords(texts: string[], topN = 10) {
  const counts = new Map<string, number>()

  // Node runtime generally supports Intl.Segmenter
  const segmenter =
    typeof Intl !== 'undefined' && (Intl as any).Segmenter
      ? new (Intl as any).Segmenter('zh', { granularity: 'word' })
      : null

  for (const raw of texts) {
    const text = (raw || '').toString()
    if (!text.trim()) continue

    if (segmenter) {
      for (const part of segmenter.segment(text)) {
        const token = String(part.segment || '').trim()
        if (!isUsefulToken(token)) continue
        const normalized = token.toLowerCase()
        if (STOPWORDS.has(normalized)) continue
        counts.set(normalized, (counts.get(normalized) || 0) + 1)
      }
    } else {
      // fallback：按空白/符号粗分
      const rough = text
        .replace(/[`"'“”‘’]/g, ' ')
        .replace(/[\r\n\t]+/g, ' ')
        .split(/\s+/)
      for (const tokenRaw of rough) {
        const token = tokenRaw.trim()
        if (!isUsefulToken(token)) continue
        const normalized = token.toLowerCase()
        if (STOPWORDS.has(normalized)) continue
        counts.set(normalized, (counts.get(normalized) || 0) + 1)
      }
    }
  }

  const arr = Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }))

  return arr
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录' },
        { status: 401 }
      )
    }

    const prisma = await getPrisma()
    const { searchParams } = new URL(request.url)

    const parsed = parseMonth(searchParams.get('month'))
    const now = new Date()
    const { year, month } = parsed || {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
    }

    const { start, end } = getMonthRange(year, month)

    // 1) 热力图：本月哪些天有“想法”
    const monthIdeas = await prisma.mindIdea.findMany({
      where: {
        userId: user.id,
        createdAt: {
          gte: start,
          lt: end,
        },
      },
      select: {
        createdAt: true,
      },
    })

    const activeDaySet = new Set<string>()
    for (const row of monthIdeas) {
      activeDaySet.add(toDateKey(row.createdAt))
    }
    const activeDays = Array.from(activeDaySet).sort()

    // 2) 统计：累计 + 本月
    // 用 SQL 聚合字数，避免拉全量 content
    const prismaAny: any = prisma

    const [
      ideasAll,
      chatsAll,
      ideasMonth,
      chatsMonth,
    ] = await Promise.all([
      prismaAny.$queryRaw`
        SELECT
          COUNT(*)::int AS count,
          COALESCE(SUM(LENGTH(content)), 0)::int AS chars
        FROM mind_ideas
        WHERE "userId" = ${user.id}
      `,
      prismaAny.$queryRaw`
        SELECT
          COUNT(*) FILTER (WHERE role = 'user')::int AS count,
          COALESCE(SUM(LENGTH(content)), 0)::int AS chars
        FROM mind_chat_messages
        WHERE "userId" = ${user.id}
      `,
      prismaAny.$queryRaw`
        SELECT
          COUNT(*)::int AS count,
          COALESCE(SUM(LENGTH(content)), 0)::int AS chars
        FROM mind_ideas
        WHERE "userId" = ${user.id}
          AND "createdAt" >= ${start}
          AND "createdAt" < ${end}
      `,
      prismaAny.$queryRaw`
        SELECT
          COUNT(*) FILTER (WHERE role = 'user')::int AS count,
          COALESCE(SUM(LENGTH(content)), 0)::int AS chars
        FROM mind_chat_messages
        WHERE "userId" = ${user.id}
          AND "createdAt" >= ${start}
          AND "createdAt" < ${end}
      `,
    ])

    const ideasAllRow = Array.isArray(ideasAll) ? ideasAll[0] : null
    const chatsAllRow = Array.isArray(chatsAll) ? chatsAll[0] : null
    const ideasMonthRow = Array.isArray(ideasMonth) ? ideasMonth[0] : null
    const chatsMonthRow = Array.isArray(chatsMonth) ? chatsMonth[0] : null

    // 3) 关键词 Top10：本周/本月/今年
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const yearStart = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)

    const TEXT_LIMIT = 2000
    const [weekTexts, monthTexts, yearTexts] = await Promise.all([
      Promise.all([
        prisma.mindIdea.findMany({
          where: { userId: user.id, createdAt: { gte: weekStart } },
          orderBy: { createdAt: 'desc' },
          take: TEXT_LIMIT,
          select: { content: true },
        }),
        prisma.mindChatMessage.findMany({
          where: {
            userId: user.id,
            role: 'user',
            createdAt: { gte: weekStart },
          },
          orderBy: { createdAt: 'desc' },
          take: TEXT_LIMIT,
          select: { content: true },
        }),
      ]),
      Promise.all([
        prisma.mindIdea.findMany({
          where: { userId: user.id, createdAt: { gte: start, lt: end } },
          orderBy: { createdAt: 'desc' },
          take: TEXT_LIMIT,
          select: { content: true },
        }),
        prisma.mindChatMessage.findMany({
          where: {
            userId: user.id,
            role: 'user',
            createdAt: { gte: start, lt: end },
          },
          orderBy: { createdAt: 'desc' },
          take: TEXT_LIMIT,
          select: { content: true },
        }),
      ]),
      Promise.all([
        prisma.mindIdea.findMany({
          where: { userId: user.id, createdAt: { gte: yearStart } },
          orderBy: { createdAt: 'desc' },
          take: TEXT_LIMIT,
          select: { content: true },
        }),
        prisma.mindChatMessage.findMany({
          where: {
            userId: user.id,
            role: 'user',
            createdAt: { gte: yearStart },
          },
          orderBy: { createdAt: 'desc' },
          take: TEXT_LIMIT,
          select: { content: true },
        }),
      ]),
    ])

    const flattenTexts = (pair: any[]) => {
      const [ideasPart, chatsPart] = pair
      const a = Array.isArray(ideasPart) ? ideasPart : []
      const b = Array.isArray(chatsPart) ? chatsPart : []
      return [
        ...a.map((x: any) => String(x.content || '')),
        ...b.map((x: any) => String(x.content || '')),
      ]
    }

    const weekTop = topKeywords(flattenTexts(weekTexts), 10)
    const monthTop = topKeywords(flattenTexts(monthTexts), 10)
    const yearTop = topKeywords(flattenTexts(yearTexts), 10)

    return NextResponse.json({
      success: true,
      data: {
        month: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`,
        heatmap: {
          activeDays,
        },
        stats: {
          all: {
            ideas: {
              count: Number(ideasAllRow?.count || 0),
              chars: Number(ideasAllRow?.chars || 0),
            },
            chats: {
              // 用户消息条数
              count: Number(chatsAllRow?.count || 0),
              chars: Number(chatsAllRow?.chars || 0),
            },
          },
          month: {
            ideas: {
              count: Number(ideasMonthRow?.count || 0),
              chars: Number(ideasMonthRow?.chars || 0),
            },
            chats: {
              count: Number(chatsMonthRow?.count || 0),
              chars: Number(chatsMonthRow?.chars || 0),
            },
          },
        },
        keywords: {
          week: weekTop,
          month: monthTop,
          year: yearTop,
        },
      },
    })
  } catch (error) {
    console.error('[ApexMind] Dashboard summary error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

