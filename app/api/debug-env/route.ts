import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export const runtime = 'nodejs'

export async function GET() {
  try {
    // 检查 process.env
    const envVars = {
      DATABASE_URL: process.env.DATABASE_URL ? 'SET (length: ' + process.env.DATABASE_URL.length + ')' : 'NOT SET',
      DIRECT_URL: process.env.DIRECT_URL ? 'SET (length: ' + process.env.DIRECT_URL.length + ')' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
    }

    // 尝试直接读取 .env 文件
    let envFileContent = 'Unable to read'
    try {
      const envPath = join(process.cwd(), '.env')
      envFileContent = readFileSync(envPath, 'utf-8')
    } catch (error) {
      envFileContent = `Error reading .env: ${error instanceof Error ? error.message : 'Unknown'}`
    }

    // 列出所有包含 DATABASE 或 DIRECT 的环境变量
    const allEnvKeys = Object.keys(process.env)
    const relevantKeys = allEnvKeys.filter(k => 
      k.includes('DATABASE') || 
      k.includes('DIRECT') || 
      k.includes('POSTGRES')
    )

    return NextResponse.json({
      processEnv: envVars,
      envFileExists: envFileContent !== 'Unable to read',
      envFilePreview: envFileContent.substring(0, 200) + '...',
      relevantEnvKeys: relevantKeys,
      allEnvKeysCount: allEnvKeys.length,
      cwd: process.cwd(),
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 })
  }
}
