import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function withPrismaPoolParams(databaseUrl: string) {
  try {
    const url = new URL(databaseUrl)
    // 在 Next dev / Turbopack 场景下容易出现并发连接激增，这里显式限制连接池，避免把数据库打爆
    if (!url.searchParams.has('connection_limit')) {
      url.searchParams.set('connection_limit', '5')
    }
    if (!url.searchParams.has('pool_timeout')) {
      url.searchParams.set('pool_timeout', '20')
    }
    return url.toString()
  } catch {
    // URL 解析失败则原样返回
    return databaseUrl
  }
}

function getPrismaClient() {
  // 使用 DATABASE_URL (Vercel Postgres/Neon 配置)
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error('Environment variables:', {
      DATABASE_URL: process.env.DATABASE_URL ? 'set' : 'not set',
      DIRECT_URL: process.env.DIRECT_URL ? 'set' : 'not set',
      NODE_ENV: process.env.NODE_ENV,
    })
    throw new Error(
      'DATABASE_URL environment variable is not set. ' +
      'Please check your .env file and restart the development server.'
    )
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: withPrismaPoolParams(databaseUrl),
      },
    },
    // dev 下 query log 很容易放大压力，这里只保留 warn/error
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma =
  globalForPrisma.prisma ?? getPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
