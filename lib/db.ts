import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
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
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma =
  globalForPrisma.prisma ?? getPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
