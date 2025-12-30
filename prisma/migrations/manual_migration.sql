-- 手动迁移脚本：从 NextAuth.js 迁移到 Credentials Auth
-- ⚠️ 警告：此脚本会删除 NextAuth.js 相关的表和数据
-- 执行前请先备份数据库！

-- 步骤 1: 删除 NextAuth.js 相关的表（如果存在）
DROP TABLE IF EXISTS "verification_tokens" CASCADE;
DROP TABLE IF EXISTS "sessions" CASCADE;
DROP TABLE IF EXISTS "accounts" CASCADE;

-- 步骤 2: 如果 Post 表存在但没有 userId 列，需要先处理现有数据
-- 注意：如果有现有 Post 数据，需要先手动分配 userId 或删除这些数据
-- 这里假设 Post 表可能为空，或者你已经处理了现有数据

-- 步骤 3: 修改 users 表结构
-- 先删除旧的约束和索引
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_key";
ALTER TABLE "users" DROP COLUMN IF EXISTS "emailVerified";
ALTER TABLE "users" DROP COLUMN IF EXISTS "image";

-- 添加新字段（如果不存在）
-- 注意：如果 users 表中有现有数据，需要先处理这些数据
-- 这里假设 users 表为空，或者你已经手动处理了数据

-- 如果 users 表不为空，需要先清空或迁移数据
-- 选项 1: 清空 users 表（会丢失所有用户数据）
-- TRUNCATE TABLE "users" CASCADE;

-- 选项 2: 为现有用户创建默认用户名和密码（需要手动处理）
-- 这里不提供自动迁移，因为密码无法从旧系统恢复

-- 添加新字段
ALTER TABLE "users" 
  ADD COLUMN IF NOT EXISTS "username" TEXT,
  ADD COLUMN IF NOT EXISTS "password" TEXT,
  ADD COLUMN IF NOT EXISTS "name" TEXT;

-- 如果 users 表不为空，需要为现有记录设置临时值
-- UPDATE "users" SET "username" = COALESCE("email", 'user_' || "id") WHERE "username" IS NULL;
-- UPDATE "users" SET "password" = '$2a$10$dummy' WHERE "password" IS NULL; -- 临时密码，需要用户重置

-- 设置 NOT NULL 约束（在数据迁移后）
-- ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;
-- ALTER TABLE "users" ALTER COLUMN "password" SET NOT NULL;

-- 添加唯一约束
CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");

-- 步骤 4: 修改 posts 表，添加 userId 列
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- 如果有现有 Post 数据，需要手动分配 userId
-- 例如：UPDATE "posts" SET "userId" = (SELECT "id" FROM "users" LIMIT 1) WHERE "userId" IS NULL;

-- 添加外键约束（在 userId 都有值后）
-- ALTER TABLE "posts" ADD CONSTRAINT "posts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 添加索引
CREATE INDEX IF NOT EXISTS "posts_userId_idx" ON "posts"("userId");

-- 步骤 5: 清理 email 字段（可选，保留作为可选字段）
-- ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;

-- 完成迁移
-- 注意：迁移后需要运行 Prisma 生成客户端
-- npx prisma generate

